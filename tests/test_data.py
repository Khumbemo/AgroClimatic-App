import json
from datetime import date

import pytest

from agroclimatic.data.backup import export_backup, restore_backup
from agroclimatic.data.schema import RecordInvalid
from agroclimatic.data.seed import load_examples, remove_examples, seed_once
from agroclimatic.data.store import Store


@pytest.fixture
def store():
    ticks = iter(f"2024-05-01T00:00:{i:02d}.000Z" for i in range(60))
    return Store(":memory:", now=lambda: next(ticks))


def test_add_update_remove(store):
    b = store.add("batches", {"batchNumber": " NB-1 ", "status": "sown", "seedsSown": 100})
    assert b["batchNumber"] == "NB-1" and b["createdAt"] == b["updatedAt"]
    u = store.update("batches", b["id"], {"status": "growing"})
    assert u["status"] == "growing" and u["createdAt"] == b["createdAt"] and u["updatedAt"] > b["updatedAt"]
    assert store.list("batches") == [u]
    store.remove("batches", b["id"])
    assert store.list("batches") == []


def test_invalid_records_never_reach_the_database(store):
    with pytest.raises(RecordInvalid) as e:
        store.add("batches", {"batchNumber": "", "status": "sown", "sowingDate": "2024-02-31"})
    fields = dict(e.value.issues)
    assert fields["batchNumber"] == "is required"
    assert fields["sowingDate"] == "Not a valid calendar date"
    with pytest.raises(RecordInvalid, match="Minimum temperature"):
        store.add(
            "climateReadings",
            {
                "date": "2024-01-01",
                "tempMin": 20,
                "tempMax": 10,
                "tempMean": 15,
                "humidity": 50,
                "lightIntensity": 0,
                "photoperiod": 12,
            },
        )
    with pytest.raises(RecordInvalid, match="add up to 100"):
        store.add("substrateMixes", {"name": "Mix", "components": [{"name": "Peat", "pct": 60}]})
    assert store.count("batches") == 0


def test_seed_once_is_idempotent_and_examples_are_removable(store):
    seed_once(store, examples=True, today=date(2026, 10, 7))
    seed_once(store, examples=True, today=date(2026, 10, 7))
    assert store.count("species") == 3
    assert store.count("batches") == 2 and store.count("climateReadings") == 7
    assert store.list("climateReadings")[-1]["date"] == "2026-10-07"
    assert store.count("trialVariables") == 1
    removed = remove_examples(store)
    assert removed > 0 and store.count("batches") == 0 and store.count("species") == 3


def test_examples_do_not_touch_existing_records(store):
    store.add("batches", {"batchNumber": "MINE", "status": "sown"})
    load_examples(store)
    assert [b["batchNumber"] for b in store.list("batches")] == ["MINE"]


def test_backup_round_trip(store):
    seed_once(store, examples=True, today=date(2026, 10, 7))
    backup = json.loads(json.dumps(export_backup(store, now="2026-10-07T00:00:00Z")))
    other = Store(":memory:")
    report = restore_backup(other, backup)
    assert report.skipped == [] and report.restored == sum(len(v) for v in backup["collections"].values())
    assert restore_backup(other, backup).restored == report.restored  # upsert, no duplicates
    assert other.count("batches") == 2


def test_restore_reports_invalid_rows_and_rejects_other_files(store):
    report = restore_backup(
        store,
        {
            "format": "agroclimatic-backup",
            "version": 2,
            "collections": {
                "batches": [
                    {"id": "a", "createdAt": "t", "updatedAt": "t", "batchNumber": "OK", "status": "sown"},
                    {"id": "b", "createdAt": "t", "updatedAt": "t", "batchNumber": "", "status": "sown"},
                ]
            },
        },
    )
    assert report.restored == 1 and report.skipped[0][:2] == ("batches", "b")
    with pytest.raises(ValueError, match="not an AgroClimatic backup"):
        restore_backup(store, {"hello": 1})
    with pytest.raises(ValueError, match="newer version"):
        restore_backup(store, {"format": "agroclimatic-backup", "version": 99})


def test_backup_from_the_previous_javascript_app_imports_completely(store):
    """tests/js-backup.json was exported by the React version of the app."""
    from pathlib import Path

    raw = json.loads((Path(__file__).parent / "js-backup.json").read_text())
    report = restore_backup(store, raw)
    assert report.skipped == []
    assert report.restored == sum(len(v) for v in raw["collections"].values())
    gh = store.list("greenhouses")[0]
    assert gh["placements"][0]["batchId"] == "ex-nb-2024-001"
