import uuid

from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentAuth, get_current_auth, require_csrf
from app.db.session import get_db
from app.models.entities import KeepAliveProject
from app.schemas.keepalive import (
    KeepAliveProjectCreate,
    KeepAliveProjectList,
    KeepAliveProjectResponse,
    KeepAliveProjectUpdate,
)
from app.services.keepalive import KeepAliveService

router = APIRouter(prefix="/keepalive-projects", tags=["keepalive-projects"])


@router.get("", response_model=KeepAliveProjectList)
async def list_projects(
    auth: CurrentAuth = Depends(get_current_auth), db: AsyncSession = Depends(get_db)
) -> KeepAliveProjectList:
    projects = await KeepAliveService(db).list(auth.user)
    return KeepAliveProjectList(
        items=[KeepAliveProjectResponse.model_validate(project) for project in projects]
    )


@router.post("", response_model=KeepAliveProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: KeepAliveProjectCreate,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
) -> KeepAliveProject:
    return await KeepAliveService(db).create(auth.user, payload)


@router.patch("/{project_id}", response_model=KeepAliveProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    payload: KeepAliveProjectUpdate,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
) -> KeepAliveProject:
    return await KeepAliveService(db).set_enabled(
        auth.user, project_id, enabled=payload.enabled
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await KeepAliveService(db).delete(auth.user, project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
