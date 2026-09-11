from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.halte import HalteSurvey
from app.schemas.halte import FacilityUpdate, HalteFeature, HalteFeatureCollection, HalteProperties, PointGeometry
from app.services.condition_score import FACILITY_VARIABLES, compute_condition_score

router = APIRouter()


def _to_feature(row: HalteSurvey) -> HalteFeature:
    """One survey row as a GeoJSON feature.

    Shared by the list endpoint and the manual-correction endpoint so a
    corrected halte comes back in exactly the shape the dashboard already
    knows how to render -- the frontend can replace one feature in its state
    instead of refetching all 42.
    """
    point = to_shape(row.geom)
    return HalteFeature(
        geometry=PointGeometry(coordinates=(point.x, point.y)),
        properties=HalteProperties(
            halte_id=row.halte_id,
            nama_halte=row.nama_halte,
            kelurahan=row.kelurahan,
            kecamatan=row.kecamatan,
            cctv=row.cctv,
            lighting=row.lighting,
            sidewalk_condition=row.sidewalk_condition,
            route_info_signage=row.route_info_signage,
            canopy=row.canopy,
            media=row.media,
            survey_date=str(row.survey_date) if row.survey_date else None,
            catatan_lapangan=row.catatan_lapangan,
            condition_score=row.condition_score,
            condition_label=row.condition_label,
            facility_sources={k: v for k, v in (row.facility_sources or {}).items() if k in FACILITY_VARIABLES},
        ),
    )


@router.get("/halte-survey", response_model=HalteFeatureCollection)
async def get_halte_survey(session: AsyncSession = Depends(get_session)) -> HalteFeatureCollection:
    result = await session.execute(select(HalteSurvey))
    return HalteFeatureCollection(features=[_to_feature(row) for row in result.scalars().all()])


@router.patch("/halte-survey/{halte_id}/facilities", response_model=HalteFeature)
async def update_halte_facilities(
    halte_id: str,
    body: FacilityUpdate,
    session: AsyncSession = Depends(get_session),
) -> HalteFeature:
    """Let DISHUB correct a halte's facility availability by hand.

    The detector is still error-prone -- 15 epochs at 416 px, and it can only
    ever prove PRESENCE, so it can fill a variable but never clear one -- and
    a wrongly-cleared variable would silently move the condition score. So a
    human overrule has to be possible, and has to be recorded: every variable
    written here is marked `"manual"` in facility_sources, which is how the
    dashboard can tell a machine-written value from a surveyed one.

    The score is recomputed from the five variables exactly as the detector
    path does, so both writers agree on what a given state is worth.
    """
    halte = await session.get(HalteSurvey, halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan yang dikirim.")

    sources = dict(halte.facility_sources or {})
    for variable, value in changes.items():
        setattr(halte, variable, value)
        sources[variable] = "manual"
    # Reassign rather than mutate in place: SQLAlchemy does not track changes
    # inside a JSONB value, so an in-place edit would quietly never persist.
    halte.facility_sources = sources

    halte.condition_score, halte.condition_label = compute_condition_score(
        {variable: getattr(halte, variable) for variable in FACILITY_VARIABLES}
    )

    await session.commit()
    await session.refresh(halte)
    return _to_feature(halte)
