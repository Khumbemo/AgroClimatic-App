"""JSON backup and restore, in the same format as the earlier app's backups."""

from __future__ import annotations

from dataclasses import dataclass, field

from .schema import COLLECTIONS, RecordInvalid
from .store import Store, utc_now

BACKUP_FORMAT = "agroclimatic-backup"
BACKUP_VERSION = 2


def export_backup(store: Store, now: str | None = None) -> dict:
    """Snapshot every collection into one JSON-serialisable object."""
    return {
        "format": BACKUP_FORMAT,
        "version": BACKUP_VERSION,
        "exportedAt": now or utc_now(),
        "collections": {col: store.list(col) for col in COLLECTIONS},
    }


@dataclass
class RestoreReport:
    restored: int = 0
    skipped: list[tuple[str, str, str]] = field(default_factory=list)
    """(collection, id, reason) for each record that failed validation."""


def restore_backup(store: Store, raw: object) -> RestoreReport:
    """
    Restore records from a backup. Records are validated and upserted by id, so restoring the
    same file twice duplicates nothing and existing records not in the file are kept.
    """
    if not isinstance(raw, dict) or raw.get("format") != BACKUP_FORMAT:
        raise ValueError("This file is not an AgroClimatic backup.")
    version = raw.get("version")
    if not isinstance(version, int) or version > BACKUP_VERSION:
        raise ValueError("This backup was made by a newer version of the app.")
    collections = raw.get("collections") if isinstance(raw.get("collections"), dict) else {}
    report = RestoreReport()
    for col in COLLECTIONS:  # reference data first so links resolve in order
        rows = collections.get(col)
        if not isinstance(rows, list):
            continue
        for row in rows:
            rid = str(row.get("id", "?")) if isinstance(row, dict) else "?"
            try:
                if not isinstance(row, dict):
                    raise ValueError("not a record")
                store.put(col, row)
                report.restored += 1
            except RecordInvalid as e:
                report.skipped.append((col, rid, str(e)))
            except (ValueError, TypeError) as e:
                report.skipped.append((col, rid, str(e)))
    return report
