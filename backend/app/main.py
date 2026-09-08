from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import Base, engine
from app.routers.chat import router as chat_router
from app.routers.citizen_report import UPLOAD_DIR, router as citizen_report_router
from app.routers.halte import router as halte_router
from app.routers.route import router as route_router
from app.routers.task import router as task_router
from app.services.pedestrian_graph import get_graph


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Builds the pedestrian graph (osmnx/Overpass, a multi-second call) once
    # here so it's warm before the first real /route/safe-halte request,
    # instead of that first citizen's request paying for it.
    get_graph()
    # There is no migration tool in this project -- halte_survey was created
    # by geopandas' to_postgis(), not the ORM. maintenance_task has no such
    # pipeline (it's written to directly by the API, not derived from a
    # GeoDataFrame), so create_all() is how it comes into existence. This is
    # a no-op against tables that already exist (checkfirst=True by default).
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="TransConnect Semarang API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(halte_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(route_router, prefix="/api/v1")
app.include_router(task_router, prefix="/api/v1")
app.include_router(citizen_report_router, prefix="/api/v1")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
