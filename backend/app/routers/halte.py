from fastapi import APIRouter, Depends
from geoalchemy2.shape import to_shape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.halte import HalteSurvey
from app.schemas.halte import HalteFeature, HalteFeatureCollection, HalteProperties, PointGeometry

router = APIRouter()


@router.get("/halte-survey", response_model=HalteFeatureCollection)
async def get_halte_survey(session: AsyncSession = Depends(get_session)) -> HalteFeatureCollection:
    result = await session.execute(select(HalteSurvey))
    rows = result.scalars().all()

    features = []
    for row in rows:
        point = to_shape(row.geom)
        features.append(
            HalteFeature(
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
                    photo_url=row.photo_url,
                    survey_date=str(row.survey_date) if row.survey_date else None,
                    catatan_lapangan=row.catatan_lapangan,
                    condition_score=row.condition_score,
                    condition_label=row.condition_label,
                ),
            )
        )

    return HalteFeatureCollection(features=features)
