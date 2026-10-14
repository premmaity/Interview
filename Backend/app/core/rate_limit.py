import asyncio
import time
from collections import defaultdict

import structlog
from redis.asyncio import Redis

from app.core.errors import RateLimitError

logger = structlog.get_logger()


class RateLimiter:
    def __init__(self, redis: Redis | None) -> None:
        self.redis = redis
        self._fallback: dict[str, list[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def check(self, key: str, *, limit: int, window_seconds: int) -> None:
        if self.redis is not None:
            redis_key = f"rate:{key}:{int(time.time() // window_seconds)}"
            try:
                count = await self.redis.incr(redis_key)
                if count == 1:
                    await self.redis.expire(redis_key, window_seconds + 1)
                if count > limit:
                    raise RateLimitError("Too many requests; try again later")
                return
            except RateLimitError:
                raise
            except Exception as error:
                logger.warning("rate_limit_redis_unavailable", error_type=type(error).__name__)

        cutoff = time.monotonic() - window_seconds
        async with self._lock:
            entries = [stamp for stamp in self._fallback[key] if stamp >= cutoff]
            if len(entries) >= limit:
                raise RateLimitError("Too many requests; try again later")
            entries.append(time.monotonic())
            self._fallback[key] = entries
