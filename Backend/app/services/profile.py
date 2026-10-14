from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import CandidateProfile, User
from app.schemas.profile import ProfileUpdate


class ProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_or_create(self, user: User) -> CandidateProfile:
        profile = await self.db.scalar(
            select(CandidateProfile).where(CandidateProfile.user_id == user.id)
        )
        if profile is None:
            profile = CandidateProfile(user_id=user.id)
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)
        return profile

    async def update(self, user: User, payload: ProfileUpdate) -> CandidateProfile:
        profile = await self.get_or_create(user)
        for key, value in payload.model_dump().items():
            setattr(profile, key, value)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
