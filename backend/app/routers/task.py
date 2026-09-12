"""Policy & Task Dispatcher Dashboard (PRD roadmap item, after Safe Transit
Navigator).

Every task is created from a specific surveyed halte (see POST /tasks) so it
always traces back to a real field finding -- condition_score, catatan_lapangan
-- rather than being an unlinked ad-hoc to-do. "assigned_to" is a plain text
field, not a foreign key to a staff account: this project has no login/account
system (see AppHeader's own history note on the fake "Sesi Aktif (Admin)"
profile menu it removed for exactly this reason), so a real relation here
would just be a differently-shaped version of the same fabrication.
"""

import json
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models.citizen_report import CitizenReport
from app.models.halte import HalteSurvey
from app.models.task import MaintenanceTask
from app.routers.citizen_report import (
    PHOTO_CONTENT_TYPE_TO_EXT,
    VIDEO_CONTENT_TYPE_TO_EXT,
    _collect_photo_uploads,
    _photo_list,
    _save_upload,
)
from app.schemas.task import ApprovedRepairPhoto, FacilityState, TaskCreate, TaskOut, TaskStatusUpdate
from app.services.condition_score import FACILITY_VARIABLES, compute_condition_score
from app.services.upload_cleanup import remove_if_unreferenced

router = APIRouter()

MAX_TECHNICIAN_PHOTO_BYTES = 15 * 1024 * 1024  # 15 MB, same cap as citizen_report's photo
MAX_TECHNICIAN_VIDEO_BYTES = 25 * 1024 * 1024  # 25 MB, same cap as citizen_report's video


def _task_photo_urls(task: MaintenanceTask) -> list[str]:
    """Every repair-photo path on this task, in submission order.

    `technician_photo_urls` is authoritative. The scalar `technician_photo_url`
    is folded in as well so a task reported before multi-photo uploads existed
    still has its single photo published, approved and cleaned up exactly as
    before -- for rows written since, the scalar is just the first entry and
    the membership check keeps it from being counted twice.
    """
    urls = [u for u in (task.technician_photo_urls or []) if u]
    if task.technician_photo_url and task.technician_photo_url not in urls:
        urls.append(task.technician_photo_url)
    return urls


def _withdraw_from_halte_media(task: MaintenanceTask, halte: HalteSurvey, urls: set[str]) -> int:
    """Take the given upload paths back out of halte_survey.media.

    Needed because the technician's video and photos reach the public by two
    separate routes: the approval flags on the task, and this gallery, where
    approve_facility_update copies them. Turning one down has to close both, or
    the item stays visible on the halte page after being rejected.

    The catch is the revert snapshot. approve_facility_update records how many
    items it PREPENDED and revert_facility_update later drops that many from the
    front of the list -- so removing an item here without touching that count
    would make a later revert eat one of the halte's own survey photos, silently
    and permanently. The count is reduced by however many of the removed items
    were part of that prepended block.
    """
    media = list(halte.media or [])
    snapshot = task.facility_updates_snapshot
    prepended = snapshot.get("media_prepended_count", 0) if isinstance(snapshot, dict) else 0

    kept: list[dict] = []
    removed_from_prefix = 0
    for index, item in enumerate(media):
        if isinstance(item, dict) and item.get("url") in urls:
            if index < prepended:
                removed_from_prefix += 1
            continue
        kept.append(item)

    if len(kept) == len(media):
        return 0

    # Reassign rather than mutate: SQLAlchemy does not track in-place changes
    # inside a JSONB value (same reasoning as the other writes in this file).
    halte.media = kept
    if removed_from_prefix and isinstance(snapshot, dict):
        task.facility_updates_snapshot = {
            **snapshot,
            "media_prepended_count": max(0, prepended - removed_from_prefix),
        }
    return len(media) - len(kept)


def _to_out(task: MaintenanceTask, halte: HalteSurvey) -> TaskOut:
    return TaskOut(
        task_id=task.task_id,
        halte_id=task.halte_id,
        citizen_report_id=task.citizen_report_id,
        nama_halte=halte.nama_halte,
        kelurahan=halte.kelurahan,
        condition_label=halte.condition_label,
        description=task.description,
        assigned_to=task.assigned_to,
        status=task.status,
        technician_report=task.technician_report,
        technician_photo_url=task.technician_photo_url,
        technician_photo_urls=_task_photo_urls(task),
        technician_video_url=task.technician_video_url,
        approved_for_public=task.approved_for_public,
        technician_photo_rejected=task.technician_photo_rejected,
        technician_video_rejected=task.technician_video_rejected,
        facility_updates=task.facility_updates,
        facility_updates_approved=task.facility_updates_approved,
        facility_updates_rejected=task.facility_updates_rejected,
        facility_updates_revertible=task.facility_updates_approved and task.facility_updates_snapshot is not None,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


@router.get("/tasks", response_model=list[TaskOut])
async def list_tasks(halte_id: str | None = None, session: AsyncSession = Depends(get_session)) -> list[TaskOut]:
    query = (
        select(MaintenanceTask, HalteSurvey)
        .join(HalteSurvey, MaintenanceTask.halte_id == HalteSurvey.halte_id)
        .order_by(MaintenanceTask.created_at.desc())
    )
    if halte_id is not None:
        query = query.where(MaintenanceTask.halte_id == halte_id)
    result = await session.execute(query)
    return [_to_out(task, halte) for task, halte in result.all()]


@router.get("/halte/{halte_id}/repair-photos", response_model=list[ApprovedRepairPhoto])
async def list_approved_repair_photos(
    halte_id: str, session: AsyncSession = Depends(get_session)
) -> list[ApprovedRepairPhoto]:
    """Public-facing (HaltePublicModal) -- only DISHUB-approved technician
    photos for this halte, none of the surrounding task/dispatch detail."""
    result = await session.execute(
        select(MaintenanceTask)
        .where(MaintenanceTask.halte_id == halte_id, MaintenanceTask.approved_for_public.is_(True))
        .order_by(MaintenanceTask.updated_at.desc())
    )
    return [
        ApprovedRepairPhoto(
            technician_report=task.technician_report or "",
            technician_photo_url=task.technician_photo_url,
            technician_photo_urls=_task_photo_urls(task),
            updated_at=task.updated_at,
        )
        for task in result.scalars().all()
        if task.technician_photo_url
    ]


@router.post("/tasks", response_model=TaskOut, status_code=201)
async def create_task(body: TaskCreate, session: AsyncSession = Depends(get_session)) -> TaskOut:
    halte = await session.get(HalteSurvey, body.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    citizen_report = None
    if body.citizen_report_id is not None:
        citizen_report = await session.get(CitizenReport, body.citizen_report_id)
        if citizen_report is None:
            raise HTTPException(status_code=404, detail="Laporan warga tidak ditemukan.")

    task = MaintenanceTask(
        task_id=str(uuid.uuid4()),
        halte_id=body.halte_id,
        citizen_report_id=body.citizen_report_id,
        description=body.description,
        assigned_to=body.assigned_to,
    )
    session.add(task)

    # Marks the report "diproses" so the dashboard map marker (BusStopLayer)
    # and CitizenReportSection both know it's been dispatched, not just sitting
    # unactioned -- see update_task_status below for what happens when this
    # task is later marked done.
    if citizen_report is not None:
        citizen_report.status = "diproses"

    await session.commit()
    await session.refresh(task)
    return _to_out(task, halte)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task_status(
    task_id: str, body: TaskStatusUpdate, session: AsyncSession = Depends(get_session)
) -> TaskOut:
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")

    task.status = body.status

    # Closing the loop DISHUB asked for: once a task dispatched from a
    # citizen report is marked done, the report itself is done being tracked
    # -- delete it outright so it drops off both the map marker and
    # CitizenReportSection's list, rather than lingering in a third status.
    # citizen_report_id must be cleared on the task first: it's a foreign key
    # into citizen_report, so deleting the row it still points to violates
    # that constraint otherwise. TaskOut keeps the field on the response as
    # None here rather than the id that's no longer resolvable to anything.
    # Uploaded files outlive their rows unless something removes them: this
    # app had no os.remove anywhere, so a deleted report left its photo (and
    # the detector's annotated copy) sitting in the publicly-served uploads
    # directory, still downloadable by anyone holding the URL. Collected
    # BEFORE the delete so the values are still readable, removed AFTER the
    # commit so the row being deleted doesn't count as a live reference to
    # itself.
    report_uploads: list[str | None] = []
    if body.status == "selesai" and task.citizen_report_id is not None:
        citizen_report = await session.get(CitizenReport, task.citizen_report_id)
        task.citizen_report_id = None
        if citizen_report is not None:
            # Every photo with its annotated twin, not just the scalar pair: a
            # report can carry several photos now, and collecting only the
            # first would strand the rest in the publicly-served directory
            # forever -- which is the exact leak this cleanup exists to close.
            report_uploads = [
                path
                for photo in _photo_list(citizen_report)
                for path in (photo.url, photo.annotated_url)
            ]
            await session.delete(citizen_report)

    await session.commit()
    await session.refresh(task)

    # Each is only removed if nothing else refers to it -- a photo already
    # approved into halte_survey.media is referenced from there too, and that
    # reference must win.
    for upload in report_uploads:
        await remove_if_unreferenced(session, upload)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


def _parse_facility_updates(raw: str) -> dict[str, FacilityState]:
    try:
        parsed = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="Format data fasilitas tidak valid.") from exc

    if not isinstance(parsed, dict) or not parsed:
        raise HTTPException(
            status_code=400, detail="Pilih minimal satu fasilitas yang statusnya dilaporkan berubah."
        )

    for key, value in parsed.items():
        if key not in FACILITY_VARIABLES:
            raise HTTPException(status_code=400, detail=f"Fasilitas '{key}' tidak dikenali.")
        if value not in ("ada", "tidak"):
            raise HTTPException(
                status_code=400, detail=f"Status fasilitas '{key}' harus 'ada' atau 'tidak'."
            )

    return parsed


@router.patch("/tasks/{task_id}/report", response_model=TaskOut)
async def submit_technician_report(
    task_id: str,
    report: str = Form(...),
    facility_updates: str = Form(...),
    video: UploadFile = File(...),
    # Repeated multipart parts named "photos". `photo` (singular) is the
    # pre-existing single-photo field, kept so a cached dashboard bundle can
    # still submit; _collect_photo_uploads folds the two together, with the
    # same 15 MB-per-file and 5-photo caps either way.
    photos: list[UploadFile] | None = File(None),
    photo: UploadFile | None = File(None),
    session: AsyncSession = Depends(get_session),
) -> TaskOut:
    """Technician's own report on a task in progress/done -- separate from
    the dispatcher's original description (what needs fixing). A report is
    only considered complete with proof: video is required (photos stay
    optional, as before, but there can now be several of them, each up to
    15 MB). facility_updates is the technician's own read of
    which of the 5 survey facilities changed and to what -- neither this nor
    the video/photos take effect on halte_survey immediately; DISHUB reviews
    and applies them via PATCH /tasks/{task_id}/approve-facility-update.
    Submitting new photos here does NOT make them public on their own either;
    see /approve below (a separate, narrower gate that predates this one).
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not report.strip():
        raise HTTPException(status_code=400, detail="Laporan petugas tidak boleh kosong.")
    if not video.filename:
        raise HTTPException(status_code=400, detail="Video laporan wajib dilampirkan.")

    parsed_facility_updates = _parse_facility_updates(facility_updates)

    task.technician_report = report.strip()
    task.technician_video_url = await _save_upload(
        video,
        VIDEO_CONTENT_TYPE_TO_EXT,
        MAX_TECHNICIAN_VIDEO_BYTES,
        "Format video harus MP4, WebM, atau MOV.",
        "Ukuran video maksimal 25 MB.",
    )
    task.facility_updates = parsed_facility_updates
    # A freshly submitted video is a new decision, same reasoning as the photo
    # flags below: the old verdict was about the previous video. Without this,
    # a technician resubmitting after a rejection could never get the new video
    # published.
    task.technician_video_rejected = False
    # A freshly submitted batch always needs a fresh look from DISHUB, even
    # if an earlier batch on this same task was already approved -- or
    # already turned down, since this is a different set of values.
    task.facility_updates_approved = False
    task.facility_updates_rejected = False

    photo_uploads = _collect_photo_uploads(photos, photo)
    if photo_uploads:
        saved: list[str] = []
        for upload in photo_uploads:
            saved.append(
                await _save_upload(
                    upload,
                    PHOTO_CONTENT_TYPE_TO_EXT,
                    MAX_TECHNICIAN_PHOTO_BYTES,
                    "Format foto harus JPEG, PNG, atau WebP.",
                    "Ukuran foto maksimal 15 MB.",
                )
            )
        # REPLACES the previous set rather than adding to it: this is one
        # report's evidence and a resubmission is a new report. Appending
        # would quietly grow the task's gallery with superseded shots that
        # DISHUB would then have to approve all over again -- and that the
        # public strip would show next to the current ones.
        task.technician_photo_urls = saved
        task.technician_photo_url = saved[0]
        # A newly submitted photo needs re-approval before it goes public --
        # otherwise a technician could quietly swap the photo an admin
        # already approved. Same for a rejection: that verdict was about the
        # previous image, so it doesn't carry over to this one.
        task.approved_for_public = False
        task.technician_photo_rejected = False

    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


@router.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: str, session: AsyncSession = Depends(get_session)) -> None:
    """Lets DISHUB clear a "selesai" task off the board once it's been dealt
    with -- see TaskBoard.tsx's delete button, shown only in that column.
    Not restricted to "selesai" here: the dashboard is the one place that
    decides when deleting makes sense, this endpoint just performs it.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")

    # Read the paths before the row goes, remove the files only after the
    # commit. remove_if_unreferenced re-checks the whole database, which is
    # what keeps an approval from being undone by a delete: once a facility
    # batch is approved, this task's photos and video were also copied into
    # halte_survey.media, so those files have a second owner and must survive.
    # Every photo, not just the primary one -- the rest have no other row
    # pointing at them and would otherwise be stranded in a public directory.
    task_uploads = [*_task_photo_urls(task), task.technician_video_url]

    await session.delete(task)
    await session.commit()

    for upload in task_uploads:
        await remove_if_unreferenced(session, upload)


@router.patch("/tasks/{task_id}/approve", response_model=TaskOut)
async def approve_technician_photo(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB's explicit approval step -- only after this does the
    technician's photo appear on the public map (HaltePublicModal shows
    approved_for_public photos alongside the halte's own survey media).
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.technician_photo_url:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya foto laporan petugas.")

    task.approved_for_public = True
    # A later approval overrides an earlier rejection -- the two flags are
    # mutually exclusive states of one decision, and leaving the rejection
    # set would make the review block show "ditolak" for a photo the public
    # page is currently displaying.
    task.technician_photo_rejected = False
    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/reject", response_model=TaskOut)
async def reject_technician_photo(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB's explicit NO for the technician's photo -- the counterpart to
    /approve above, so a reviewer has a way to close the question instead of
    leaving it open forever.

    Only the public-strip decision changes: the photo stays on the task
    (deleting the file would destroy the record of what was submitted and
    why it was turned down), and it was never on the public page anyway
    unless something had approved it first -- if it had, this takes it back
    off (list_approved_repair_photos reads approved_for_public, which this
    clears).

    Withdrawing is also why this works on an ALREADY approved photo, not just a
    pending one: "setuju" is not a one-way door, and a reviewer who changes
    their mind needs a way back. The photo is copied into halte_survey.media by
    approve_facility_update, so that copy is withdrawn too -- otherwise the
    photo would disappear from the public repair strip while staying on the
    halte page, which is not what "tolak" means to anyone reading it.

    Reversible: /approve clears this flag, so a change of mind costs one
    click and no data.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.technician_photo_url:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya foto laporan petugas.")

    halte = await session.get(HalteSurvey, task.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    task.approved_for_public = False
    task.technician_photo_rejected = True
    _withdraw_from_halte_media(task, halte, set(_task_photo_urls(task)))

    await session.commit()
    await session.refresh(task)

    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/reject-video", response_model=TaskOut)
async def reject_technician_video(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB turns down the repair video on its own, keeping the photos.

    The video has no approval flag of its own the way the photos do
    (approved_for_public governs the public repair strip, which is photos
    only) -- it reaches the public purely through halte_survey.media, where
    approve_facility_update copies it. So "tolak" here has to do two things:
    record the decision, and take the video back out of that gallery. Doing
    only the first would leave the rejected video playing on the halte page.

    Reversible via /approve-video below.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.technician_video_url:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya video laporan petugas.")

    halte = await session.get(HalteSurvey, task.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    task.technician_video_rejected = True
    _withdraw_from_halte_media(task, halte, {task.technician_video_url})

    await session.commit()
    await session.refresh(task)

    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/approve-video", response_model=TaskOut)
async def approve_technician_video(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """Undo reject_technician_video.

    Clears the rejection so the video is eligible again, but does NOT push it
    straight back into halte_survey.media: that gallery is written by the
    facility-approval step, and re-adding items to it here would put the
    revert snapshot's count out of step with the list. Approving the facility
    batch again (or a fresh one) is what puts the video back on the halte page,
    and the review block says so.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.technician_video_url:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya video laporan petugas.")

    task.technician_video_rejected = False
    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/approve-facility-update", response_model=TaskOut)
async def approve_facility_update(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB's approval for the technician's proposed facility ada/tidak
    values (see submit_technician_report) -- a separate, broader gate from
    /approve above, which only ever governs the public repair-photo strip.
    Approving here is what actually writes the technician's findings onto
    halte_survey: the facility values themselves, the recomputed condition
    score, and the technician's photo/video prepended to halte.media so the
    halte's own display reflects the latest known state rather than the
    original survey photos alone.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.facility_updates:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya usulan perubahan fasilitas.")

    halte = await session.get(HalteSurvey, task.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    # Snapshot halte's exact state right before this approval overwrites it,
    # so a mis-click (or a DISHUB reviewer changing their mind) can be undone
    # via revert_facility_update below -- otherwise the prior facility
    # values/score/media are gone with no trace the moment this commits.
    facility_snapshot = {facility: getattr(halte, facility) for facility in task.facility_updates}
    source_snapshot = {f: (halte.facility_sources or {}).get(f) for f in task.facility_updates}
    prev_score, prev_label = halte.condition_score, halte.condition_label

    for facility, value in task.facility_updates.items():
        setattr(halte, facility, value)

    halte.condition_score, halte.condition_label = compute_condition_score(
        {facility: getattr(halte, facility) for facility in FACILITY_VARIABLES}
    )
    # Reassign the whole dicts/lists: SQLAlchemy does not track changes made
    # in-place inside a JSONB value, so mutating them directly would not
    # persist (same reasoning as _apply_to_survey in citizen_report.py).
    halte.facility_sources = {
        **(halte.facility_sources or {}),
        **{f: "manual" for f in task.facility_updates},
    }

    existing_urls = {m.get("url") for m in (halte.media or [])}
    new_media: list[dict] = []
    # A rejected video or photo must not ride into the public gallery on the
    # back of a facility approval -- the rejection is a decision about what the
    # public may see, and publishing it here would quietly reverse that.
    if (
        task.technician_video_url
        and not task.technician_video_rejected
        and task.technician_video_url not in existing_urls
    ):
        new_media.append({"url": task.technician_video_url, "type": "video"})
    # ALL the repair photos, not just the first. Approving the batch is
    # approving the evidence that came with it, and the halte's own gallery is
    # the only place that evidence reaches the public -- publishing one shot
    # and dropping the rest would misrepresent what the technician submitted.
    # existing_urls is re-checked per photo so re-approving after a revert
    # does not stack duplicates.
    if not task.technician_photo_rejected:
        for url in _task_photo_urls(task):
            if url not in existing_urls:
                new_media.append({"url": url, "type": "photo"})
    if new_media:
        halte.media = [*new_media, *(halte.media or [])]

    task.facility_updates_approved = True
    # Approving overrides an earlier rejection of the same batch (rejecting
    # then approving is a legitimate change of mind; leaving both flags set
    # would make the review block claim the batch was turned down while
    # halte_survey carries its values).
    task.facility_updates_rejected = False
    task.facility_updates_snapshot = {
        "facility_values": facility_snapshot,
        "facility_sources": source_snapshot,
        "condition_score": prev_score,
        "condition_label": prev_label,
        "media_prepended_count": len(new_media),
    }

    await session.commit()
    await session.refresh(task)
    await session.refresh(halte)

    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/revert-facility-update", response_model=TaskOut)
async def revert_facility_update(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """Undoes one approve_facility_update -- for a dispatcher mis-click, or
    a reviewer who changes their mind after approving. Restores halte_survey's
    exact facility values, provenance, condition score, and media list from
    the snapshot approve_facility_update took right before it overwrote them.

    The snapshot is cleared afterwards rather than kept for a second revert:
    once undone, the task's facility_updates themselves are still sitting
    there unapproved (facility_updates_approved goes back to False), so
    DISHUB can review and approve them again from scratch if this was
    reverted by mistake -- that fresh approval takes a new, current snapshot.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.facility_updates_approved or not task.facility_updates_snapshot:
        raise HTTPException(status_code=400, detail="Tidak ada perubahan fasilitas yang bisa dikembalikan.")

    halte = await session.get(HalteSurvey, task.halte_id)
    if halte is None:
        raise HTTPException(status_code=404, detail="Halte tidak ditemukan.")

    snapshot = task.facility_updates_snapshot
    for facility, value in snapshot["facility_values"].items():
        setattr(halte, facility, value)

    halte.condition_score = snapshot["condition_score"]
    halte.condition_label = snapshot["condition_label"]

    restored_sources = dict(halte.facility_sources or {})
    for facility, prev_source in snapshot["facility_sources"].items():
        if prev_source is None:
            restored_sources.pop(facility, None)
        else:
            restored_sources[facility] = prev_source
    halte.facility_sources = restored_sources

    media_prepended_count = snapshot.get("media_prepended_count", 0)
    if media_prepended_count and halte.media:
        halte.media = halte.media[media_prepended_count:]

    task.facility_updates_approved = False
    task.facility_updates_snapshot = None
    # The reverted batch is surfaced for review again, so any earlier "no"
    # must not stick to it -- otherwise it would reappear already marked
    # rejected and DISHUB could not approve it a second time.
    task.facility_updates_rejected = False

    await session.commit()
    await session.refresh(task)
    await session.refresh(halte)

    return _to_out(task, halte)


@router.patch("/tasks/{task_id}/reject-facility-update", response_model=TaskOut)
async def reject_facility_update(task_id: str, session: AsyncSession = Depends(get_session)) -> TaskOut:
    """DISHUB reviewed the technician's proposed facility values and turned
    them down -- the counterpart to approve-facility-update, so a proposal
    can be closed out instead of sitting in the review block as pending
    forever.

    Writes NOTHING to halte_survey. That asymmetry with the approve path is
    the point: rejecting is the safe direction, so the surveyed values, the
    condition score and the halte's media stay exactly as the team recorded
    them, and only the task's own review state changes. The proposal itself
    is kept on the task (facility_updates is untouched) so the decision
    remains auditable and DISHUB can change its mind via
    approve-facility-update, which clears this flag.

    Refused once the batch has already been approved (400): in that state
    halte_survey already carries the technician's values, so "rejecting"
    would really mean undoing an applied change -- which is precisely what
    revert-facility-update does, snapshot and all. Choosing between the two
    here would silently leave the halte's data disagreeing with the task.
    """
    task = await session.get(MaintenanceTask, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Tugas tidak ditemukan.")
    if not task.facility_updates:
        raise HTTPException(status_code=400, detail="Tugas ini belum punya usulan perubahan fasilitas.")
    if task.facility_updates_approved:
        raise HTTPException(
            status_code=400,
            detail="Usulan ini sudah disetujui dan sudah tertulis di data halte. "
            "Pakai \"Kembalikan Perubahan Sebelumnya\" dulu, baru tolak.",
        )

    task.facility_updates_rejected = True
    task.facility_updates_approved = False

    await session.commit()
    await session.refresh(task)

    halte = await session.get(HalteSurvey, task.halte_id)
    return _to_out(task, halte)
