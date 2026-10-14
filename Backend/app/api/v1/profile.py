from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentAuth, get_current_auth, require_csrf
from app.db.session import get_db
from app.models.entities import CandidateProfile
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.services.profile import ProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(
    auth: CurrentAuth = Depends(get_current_auth), db: AsyncSession = Depends(get_db)
) -> CandidateProfile:
    return await ProfileService(db).get_or_create(auth.user)


@router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
) -> CandidateProfile:
    return await ProfileService(db).update(auth.user, payload)
