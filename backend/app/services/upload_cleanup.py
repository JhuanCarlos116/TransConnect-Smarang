"""Finding and removing uploaded files that nothing points at any more.

Why this module exists
----------------------
The API deletes database ROWS (a citizen report once its task is marked done,
a task itself) but nothing ever removed the files those rows had uploaded --
`grep -rn "os.remove\|unlink" app/` returned nothing. The result on this
deployment: 9 files sat in backend/uploads with only 2 of them referenced by
any row. And because /uploads is mounted as StaticFiles with no auth, every one
of those 7 orphans still answered HTTP 200 to anyone holding its URL. For
photos submitted by citizens whose reports had been deleted, that is the part
that actually matters -- the wasted disk was incidental.

What "orphan" means here is decided by this file and nothing else: an uploaded
file with no row in any table referring to it. The reference check is
deliberately GENERIC -- it scans every text-ish column of every table for the
file's name instead of consulting a hand-maintained list of "the columns that
hold uploads". A list works right up until somebody adds a column, at which
point the check silently reports "unreferenced" and a live file gets deleted.
Introspection cannot go stale, and at this data size it costs milliseconds.

Why removal is always conditional
---------------------------------
The technician's repair photo is the reason. Once DISHUB approves a facility
batch, the same file is referenced TWICE: by
maintenance_task.technician_photo_url AND by halte_survey.media (see
approve_facility_update, which prepends the photo/video into the halte's own
media list). So the obvious rule -- "the task is gone, delete its files" --
would blank out a halte's gallery. Every removal here re-checks the whole
database first, and a lingering reference always wins.
"""
from __future__ import annotations

import json
import logging
import shutil
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"

# Anything that could plausibly hold a URL/path. `decimal`/`bytea`/etc. are
# skipped -- a filename can only ever be stored as text.
_TEXTUAL_TYPES = "'character varying', 'text', 'jsonb', 'json'"

# PostGIS's own bookkeeping. They hold geometry and id columns, never app data,
# and scanning them would add hundreds of tables for nothing. Deliberately an
# EXCLUSION list rather than "just the schemas we know about": the app's tables
# currently sit in `public` while the BRT reference layer lives in
# `trans_semarang`, and a schema the check forgets to look at means a live
# reference is missed and a file still in use gets deleted. Missing a schema is
# the dangerous direction, so the scan is as broad as it can safely be.
_IGNORED_SCHEMAS = ("information_schema", "topology", "tiger", "tiger_data")


async def _searchable_columns(session: AsyncSession) -> list[tuple[str, str]]:
    """Every (schema, table, column) whose values could contain a filename.

    Read from information_schema so a column added later is covered without
    anyone remembering to update this module -- and so is a whole new schema.
    """
    rows = (
        await session.execute(
            text(
                f"""
                SELECT table_schema, table_name, column_name
                FROM information_schema.columns
                WHERE data_type IN ({_TEXTUAL_TYPES})
                  AND table_schema NOT LIKE 'pg\\_%'
                  AND table_schema NOT IN {_IGNORED_SCHEMAS}
                ORDER BY table_schema, table_name, column_name
                """
            )
        )
    ).all()
    return [(s, t, c) for s, t, c in rows]


async def _matching_values(session: AsyncSession, pattern: str, limit: int | None = None) -> list[str]:
    """Every value in the database matching `pattern`, as ONE query.

    A UNION ALL over all candidate columns rather than a query per column, so
    the per-delete cost stays a single round trip.
    """
    columns = await _searchable_columns(session)
    if not columns:
        return []
    pieces = [
        f'SELECT {column}::text AS v FROM "{schema}"."{table}" WHERE {column}::text LIKE :pat'
        for schema, table, column in columns
    ]
    sql = "SELECT v FROM (" + " UNION ALL ".join(pieces) + ") AS hits"
    if limit is not None:
        sql += f" LIMIT {int(limit)}"
    rows = (await session.execute(text(sql), {"pat": pattern})).all()
    return [r[0] for r in rows if r[0]]


async def is_referenced(session: AsyncSession, name: str) -> bool:
    """True if any row anywhere still mentions this file.

    Matches on the bare filename, so it catches rows storing a full path, a
    relative `/uploads/...` URL and an absolute CDN URL alike -- the same file
    is written in different shapes depending on which code path saved it.

    LIKE treats `_` as a single-character wildcard and filenames contain
    underscores, so a match here can be marginally too permissive. That
    direction is the safe one: an over-match keeps a file that could have been
    deleted, while a missed match would delete a file still in use.
    """
    if not name:
        return False
    return bool(await _matching_values(session, f"%{name}%", limit=1))


async def referenced_upload_names(session: AsyncSession) -> set[str]:
    """Every uploaded filename that some row refers to, in one pass."""
    names: set[str] = set()
    for value in await _matching_values(session, "%/uploads/%"):
        # Values look like "/uploads/<uuid>.jpg" or "http://host/uploads/<uuid>.jpg".
        tail = value.split("/uploads/", 1)[-1]
        tail = tail.split("?")[0].split("#")[0].strip().strip('"')
        if tail:
            names.add(Path(tail).name)
    return names


def _local_files() -> list[str]:
    if not UPLOAD_DIR.is_dir():
        return []
    return sorted(p.name for p in UPLOAD_DIR.iterdir() if p.is_file())


async def orphan_uploads(session: AsyncSession) -> list[str]:
    """Uploaded files with no database row referring to them."""
    referenced = await referenced_upload_names(session)
    return [name for name in _local_files() if name not in referenced]


async def remove_if_unreferenced(
    session: AsyncSession, url_or_path: str | None, *, dry_run: bool = False
) -> bool:
    """Delete one uploaded file, but only if nothing else refers to it.

    Call AFTER the row that referenced it has been deleted and committed --
    otherwise that row itself counts as a live reference and the file is
    (correctly, but uselessly) kept.

    Never raises: losing a cleanup is a housekeeping problem, while a failed
    request because a file could not be tidied is a real one.
    """
    if not url_or_path:
        return False
    name = Path(url_or_path).name
    path = UPLOAD_DIR / name
    if not path.is_file():
        return False
    try:
        if await is_referenced(session, name):
            logger.info("upload %s is still referenced elsewhere -- kept", name)
            return False
        if dry_run:
            return True
        path.unlink()
        logger.info("upload %s deleted (no rows referred to it)", name)
        return True
    except Exception:  # noqa: BLE001 -- housekeeping must not break the request
        logger.warning("could not clean up upload %s", name, exc_info=True)
        return False


async def quarantine_orphans(session: AsyncSession, dest: Path, *, apply: bool = False) -> dict:
    """Move every orphan out of the publicly-served directory.

    Moving rather than deleting, and to a directory OUTSIDE the /uploads mount,
    is the point: the URL stops resolving immediately (which is the actual fix)
    while the bytes survive in case someone turns out to need them.

    Returns a manifest describing what was found and what was done, so the
    decision can be audited afterwards.
    """
    orphans = await orphan_uploads(session)
    dest.mkdir(parents=True, exist_ok=True)
    moved = []
    for name in orphans:
        src = UPLOAD_DIR / name
        record = {
            "name": name,
            "bytes": src.stat().st_size,
            "modified": datetime.fromtimestamp(src.stat().st_mtime, timezone.utc).isoformat(),
        }
        if apply:
            shutil.move(str(src), str(dest / name))
            record["action"] = "moved"
        else:
            record["action"] = "would-move"
        moved.append(record)

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "applied": apply,
        "upload_dir": str(UPLOAD_DIR),
        "quarantine_dir": str(dest),
        "files_on_disk": len(_local_files()) + (len(moved) if apply else 0),
        "orphans_found": len(moved),
        "orphan_bytes": sum(r["bytes"] for r in moved),
        "files": moved,
    }
    # Only a run that actually moved something writes the audit record. A dry
    # run used to overwrite manifest.json too, which meant "check what would
    # happen" quietly destroyed the record of what DID happen -- including the
    # only provenance for files now sitting in quarantine with no rows pointing
    # at them. Kept timestamped as well, so a later move does not erase the
    # earlier one.
    if apply and moved:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        blob = json.dumps(manifest, indent=2)
        (dest / f"manifest-{stamp}.json").write_text(blob, encoding="utf-8")
        (dest / "manifest.json").write_text(blob, encoding="utf-8")
    return manifest


async def _main() -> None:
    """CLI: python -m app.services.upload_cleanup [--apply] [--dest DIR]

    Dry run by default -- prints what it would move and writes no manifest
    unless --apply is given.
    """
    import argparse

    from app.db import async_session

    parser = argparse.ArgumentParser(description="Quarantine uploaded files no row refers to.")
    parser.add_argument("--apply", action="store_true", help="actually move the files (default: report only)")
    parser.add_argument("--dest", default="/app/uploads-quarantine", help="where to move them")
    args = parser.parse_args()

    async with async_session() as session:
        manifest = await quarantine_orphans(session, Path(args.dest), apply=args.apply)

    print(json.dumps({k: v for k, v in manifest.items() if k != "files"}, indent=2))
    for record in manifest["files"]:
        print(f"  {record['action']:12s} {record['bytes']:>9,} B  {record['name']}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(_main())
