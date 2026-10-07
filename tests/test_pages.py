"""Runs every page of the Streamlit app headlessly and fails on any exception."""

import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "app_pages").glob("*.py"))


@pytest.fixture(scope="module", autouse=True)
def isolated_db(tmp_path_factory):
    os.environ["AGROCLIMATIC_DB"] = str(tmp_path_factory.mktemp("db") / "test.db")
    os.environ.pop("APP_PASSWORD", None)
    os.environ.pop("GEMINI_API_KEY", None)
    import agroclimatic.data.store as store_mod

    old = store_mod.DEFAULT_PATH
    store_mod.DEFAULT_PATH = Path(os.environ["AGROCLIMATIC_DB"])
    import agroclimatic.ui.common as common

    common.DEFAULT_PATH = store_mod.DEFAULT_PATH
    yield
    store_mod.DEFAULT_PATH = old
    common.DEFAULT_PATH = old


def run(page: str, query: dict | None = None):
    from streamlit.testing.v1 import AppTest

    at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=30)
    if query:
        at.query_params.update(query)
    at.switch_page(page)
    at.run()
    return at


@pytest.mark.parametrize("page", PAGES)
def test_page_renders_without_errors(page):
    at = run(page)
    assert not at.exception, [e.value for e in at.exception]
    assert at.title, "page has no title"


def test_batch_detail_renders():
    at = run("app_pages/batches.py", {"batch": "ex-nb-2024-001"})
    assert not at.exception, [e.value for e in at.exception]
    assert at.title[0].value == "NB-2024-001"


def test_example_trial_shows_anova_and_assumption_checks():
    at = run("app_pages/experiments.py")
    text = " ".join(m.value for m in at.markdown)
    assert "Analysis of variance" in text and "Tukey HSD" in text and "Shapiro–Wilk" in text


def test_create_batch_then_record_a_germination_count():
    at = run("app_pages/batches.py")
    at.text_input[0].set_value("NB-TEST-777")
    at.number_input[0].set_value(400)
    at.button(key="FormSubmitter:bf-new-Create batch").click().run()
    assert not at.exception, [e.value for e in at.exception]
    batch_id = at.query_params["batch"]
    assert batch_id
    assert at.title[0].value == "NB-TEST-777"

    at = run("app_pages/germination.py")
    at.selectbox(key="germ-batch").set_value(batch_id).run()
    at.number_input[0].set_value(100)
    at.button(key="FormSubmitter:new-count-Save count").click().run()
    assert not at.exception, [e.value for e in at.exception]
    assert any("25.0 %" in m.value for m in at.metric)


def test_invalid_input_is_reported_not_saved():
    at = run("app_pages/batches.py")
    at.text_input[0].set_value("   ")
    at.button(key="FormSubmitter:bf-new-Create batch").click().run()
    assert any("Batch number" in e.value or "batchNumber" in e.value for e in at.error)


def test_agrobot_offline_answers_from_records():
    at = run("app_pages/agrobot.py")
    at.chat_input[0].set_value("Report on batch NB-2024-001").run()
    assert not at.exception
    replies = [m.value for m in at.markdown if "germination" in m.value]
    assert replies and "640 seeds" in replies[-1]  # 120 + 300 + 180 + 40 example counts


def test_new_trial_variable_is_selected_after_saving():
    at = run("app_pages/experiments.py")
    radio = at.radio(key="var-ex-exp-1")
    radio.set_value("New variable").run()
    at.text_input(key="vn-ex-exp-1-New variable").set_value("Root-collar diameter")
    at.text_input(key="vu-ex-exp-1-New variable").set_value("mm")
    at.button(key="vs-ex-exp-1-New variable").click().run()
    assert not at.exception, [e.value for e in at.exception]
    chosen = at.radio(key="var-ex-exp-1")
    assert chosen.value != "New variable"
    assert "Root-collar diameter" in chosen.format_func(chosen.value)
    assert any("Enter values for more plots" in i.value for i in at.info)  # no values entered yet
