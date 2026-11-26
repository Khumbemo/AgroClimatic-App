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


def test_example_survey_shows_ivi_and_diversity():
    at = run("app_pages/surveys.py")
    assert not at.exception, [e.value for e in at.exception]
    text = " ".join(m.value for m in at.markdown)
    assert "Importance Value Index" in text and "Phytosociological attributes" in text
    assert any(m.label == "Shannon H′" for m in at.metric)


def test_every_survey_method_can_be_created_from_the_page():
    from agroclimatic.science.sampling import METHODS

    for method in METHODS:
        at = run("app_pages/surveys.py")
        at.selectbox(key="survey-method").set_value(method).run()
        at.text_input(key="sv-name").set_value(f"Test {method}")
        next(b for b in at.button if b.label == "Create layout").click().run()
        assert not at.exception, (method, [e.value for e in at.exception])
        assert not at.error, (method, [e.value for e in at.error])
        assert at.subheader[0].value == f"Test {method}"


def test_method_guide_hands_the_choice_to_the_survey_page():
    at = run("app_pages/method_guide.py")
    at.radio(key="mg-objective").set_value("trees").run()
    assert any("Point-centred quarter" in h.value for h in at.subheader)
    next(b for b in at.button if b.label == "Set up this survey").click().run()
    assert not at.exception
    assert at.session_state["survey-method"] == "pcq"


def test_design_chosen_in_the_guide_opens_without_widget_warnings(monkeypatch):
    """Guide → "Set up this experiment" → the form shows that design, with no widget-state warning."""
    from streamlit.elements.lib import policies

    warnings: list[str] = []
    monkeypatch.setattr(policies, "_shown_default_value_warning", False)  # Streamlit warns once per process
    monkeypatch.setattr(policies._LOGGER, "warning", lambda msg, *args, **kw: warnings.append(msg % args))
    at = run("app_pages/method_guide.py")
    at.radio(key="mg-objective").set_value("compare").run()
    at.selectbox[0].set_value(2).run()  # two crossing gradients → Latin square
    next(b for b in at.button if b.label == "Set up this experiment").click().run()
    assert not at.exception, [e.value for e in at.exception]
    assert at.title[0].value == "Experimental design"
    assert at.selectbox(key="exp-design").value == "Latin_Square"
    assert not [w for w in warnings if "created with a default value" in w]
