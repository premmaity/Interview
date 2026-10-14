import asyncio
import json
import signal
import time
import uuid
from typing import cast

import structlog
from redis.asyncio import Redis
from sqlalchemy import select

from app.api.dependencies import get_ai_provider
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import SessionFactory
from app.models.entities import InterviewSession, InterviewStatus, User
from app.services.interviews import InterviewService

settings = get_settings()
configure_logging(settings.log_level)
logger = structlog.get_logger()


def retry_delay_seconds(attempt: int) -> int:
    bounded_attempt = max(0, min(attempt, 4))
    return min(60, 5 * (1 << bounded_attempt))


async def process_job(redis: Redis, raw: str) -> None:
    job = json.loads(raw)
    session_id = uuid.UUID(job["session_id"])
    attempt = int(job.get("attempt", 0))
    try:
        async with SessionFactory() as db:
            session = await db.scalar(
                select(InterviewSession).where(InterviewSession.id == session_id)
            )
            if session is None or session.status != InterviewStatus.EVALUATING:
                return
            user = await db.scalar(select(User).where(User.id == session.user_id))
            if user is None:
                return
            await InterviewService(db, settings, get_ai_provider()).evaluate(user, session_id)
        logger.info("evaluation_completed", session_id=str(session_id))
    except Exception as error:
        logger.error(
            "evaluation_failed",
            session_id=str(session_id),
            attempt=attempt,
            error_type=type(error).__name__,
        )
        if attempt < 2:
            job["attempt"] = attempt + 1
            delay_seconds = retry_delay_seconds(attempt)
            await redis.zadd(
                "interview:evaluation:retries",
                {json.dumps(job): time.time() + delay_seconds},
            )
        else:
            await redis.lpush("interview:evaluation:failed", raw)
            async with SessionFactory() as db:
                session = await db.scalar(
                    select(InterviewSession).where(InterviewSession.id == session_id)
                )
                if session is not None and session.status == InterviewStatus.EVALUATING:
                    session.status = InterviewStatus.FAILED
                    session.failure_code = "evaluation_failed"
                    await db.commit()


async def run() -> None:
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    stopping = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signum in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signum, stopping.set)
    logger.info("worker_started")
    try:
        while not stopping.is_set():
            due = cast(
                list[str | bytes],
                await redis.zrangebyscore(
                    "interview:evaluation:retries", min=0, max=time.time(), start=0, num=25
                ),
            )
            for retry in due:
                raw_retry = retry.decode() if isinstance(retry, bytes) else retry
                if await redis.zrem("interview:evaluation:retries", retry):
                    await redis.lpush("interview:evaluation:jobs", raw_retry)
            item = await redis.brpop("interview:evaluation:jobs", timeout=5)
            if item is not None:
                raw = item[1].decode() if isinstance(item[1], bytes) else item[1]
                await process_job(redis, raw)
    finally:
        await redis.aclose()
        logger.info("worker_stopped")


if __name__ == "__main__":
    asyncio.run(run())
