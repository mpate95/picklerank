from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.matches import router as matches_router
from app.api.routes.players import router as players_router
from app.api.routes.rankings import router as rankings_router
from app.api.routes.sessions import router as sessions_router
from app.api.routes.settings import router as settings_router
from app.api.routes.stats import router as stats_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(health_router)
api_router.include_router(matches_router)
api_router.include_router(players_router)
api_router.include_router(rankings_router)
api_router.include_router(sessions_router)
api_router.include_router(settings_router)
api_router.include_router(stats_router)
