"""
Validated record storage in a single SQLite file.

Each record is stored as JSON under (collection, id). Every write is validated against the
collection schema first, so invalid data never reaches the database.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import uuid
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path

from .schema import COLLECTIONS, validate

DEFAULT_PATH = Path(os.environ.get("AGROCLIMATIC_DB", Path(__file__).resolve().parents[2] / "data" / "agroclimatic.db"))


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class Store:
    def __init__(self, path: str | Path = DEFAULT_PATH, now: Callable[[], str] = utc_now):
        self.path = str(path)
        self.now = now
        if self.path != ":memory:":
            Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._conn = sqlite3.connect(self.path, check_same_thread=False, isolation_level=None)
        self._conn.execute("PRAGMA journal_mode=WAL" if self.path != ":memory:" else "PRAGMA journal_mode=MEMORY")
        self._conn.execute(
            "CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,"
            " created_at TEXT NOT NULL, PRIMARY KEY (collection, id))"
        )
        self._conn.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")

    @contextmanager
    def transaction(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            self._conn.execute("BEGIN")
            try:
                yield self._conn
            except BaseException:
                self._conn.execute("ROLLBACK")
                raise
            self._conn.execute("COMMIT")

    # -- reads -------------------------------------------------------------

    def list(self, collection: str) -> list[dict]:
        _check(collection)
        with self._lock:
            rows = self._conn.execute(
                "SELECT data FROM records WHERE collection = ? ORDER BY created_at, id", (collection,)
            ).fetchall()
        return [json.loads(r[0]) for r in rows]

    def get(self, collection: str, record_id: str) -> dict | None:
        _check(collection)
        with self._lock:
            row = self._conn.execute(
                "SELECT data FROM records WHERE collection = ? AND id = ?", (collection, record_id)
            ).fetchone()
        return json.loads(row[0]) if row else None

    def count(self, collection: str) -> int:
        _check(collection)
        with self._lock:
            return self._conn.execute("SELECT COUNT(*) FROM records WHERE collection = ?", (collection,)).fetchone()[0]

    # -- writes ------------------------------------------------------------

    def put(self, collection: str, record: dict) -> dict:
        """Insert or replace a complete record, keeping its id and timestamps."""
        _check(collection)
        clean = validate(collection, record)
        with self._lock:
            self._conn.execute(
                "INSERT INTO records (collection, id, data, created_at) VALUES (?, ?, ?, ?)"
                " ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data",
                (collection, clean["id"], json.dumps(clean, ensure_ascii=False), clean["createdAt"]),
            )
        return clean

    def add(self, collection: str, data: dict) -> dict:
        ts = self.now()
        return self.put(collection, {**data, "id": str(uuid.uuid4()), "createdAt": ts, "updatedAt": ts})

    def update(self, collection: str, record_id: str, patch: dict) -> dict:
        existing = self.get(collection, record_id)
        if existing is None:
            raise KeyError(f"No {collection} record with id {record_id}")
        return self.put(
            collection,
            {**existing, **patch, "id": record_id, "createdAt": existing["createdAt"], "updatedAt": self.now()},
        )

    def remove(self, collection: str, record_id: str) -> None:
        _check(collection)
        with self._lock:
            self._conn.execute("DELETE FROM records WHERE collection = ? AND id = ?", (collection, record_id))

    def clear(self) -> None:
        with self._lock:
            self._conn.execute("DELETE FROM records")
            self._conn.execute("DELETE FROM meta")

    # -- one-off flags -----------------------------------------------------

    def get_meta(self, key: str) -> str | None:
        with self._lock:
            row = self._conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def set_meta(self, key: str, value: str) -> None:
        with self._lock:
            self._conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", (key, value))


def _check(collection: str) -> None:
    if collection not in COLLECTIONS:
        raise KeyError(f"Unknown collection: {collection}")
