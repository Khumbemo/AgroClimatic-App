"""AgroClimatic: nursery and greenhouse research app. Run with `streamlit run app.py`."""

import streamlit as st

st.set_page_config(page_title="AgroClimatic", page_icon="assets/icon.svg", layout="wide", initial_sidebar_state="auto")

from agroclimatic.ui.auth import require_password  # noqa: E402

require_password()

P = "app_pages/"
pages = {
    "": [
        st.Page(P + "home.py", title="Home", icon=":material/home:", default=True),
    ],
    "Nursery records": [
        st.Page(P + "batches.py", title="Nursery batches", icon=":material/potted_plant:"),
        st.Page(P + "seed_lots.py", title="Seed lots", icon=":material/inventory_2:"),
        st.Page(P + "species.py", title="Species database", icon=":material/menu_book:"),
    ],
    "Measurements": [
        st.Page(P + "environment.py", title="Environmental logs", icon=":material/thermostat:"),
        st.Page(P + "germination.py", title="Germination tracker", icon=":material/eco:"),
        st.Page(P + "treatments.py", title="Treatment logs", icon=":material/science:"),
        st.Page(P + "irrigation.py", title="Irrigation log", icon=":material/water_drop:"),
        st.Page(P + "morphometrics.py", title="Morphometrics", icon=":material/straighten:"),
        st.Page(P + "spatial.py", title="Spatial mapping", icon=":material/grid_view:"),
    ],
    "Research & QA": [
        st.Page(P + "experiments.py", title="Experimental design", icon=":material/experiment:"),
        st.Page(P + "substrate.py", title="Substrate & nutrients", icon=":material/compost:"),
        st.Page(P + "provenance.py", title="Provenance & lineage", icon=":material/location_on:"),
        st.Page(P + "mortality.py", title="Mortality diagnostics", icon=":material/heart_broken:"),
        st.Page(P + "audit.py", title="Data quality & audit", icon=":material/verified:"),
    ],
    "Assist": [
        st.Page(P + "calculators.py", title="Calculators", icon=":material/calculate:"),
        st.Page(P + "agrobot.py", title="AgroBot", icon=":material/smart_toy:"),
        st.Page(P + "settings.py", title="Settings", icon=":material/settings:"),
    ],
}

# Keep lines and tables readable on wide desktop monitors; phones and tablets use the full width.
# On touch screens, give the 16 px "?" help icons (formulas, units) a 40 px tap area without moving them.
st.html(
    """<style>
[data-testid='stMainBlockContainer'] { max-width: 1280px; margin: 0 auto; }
@media (pointer: coarse) {
  [data-testid='stTooltipHoverTarget'] button { position: relative; }
  [data-testid='stTooltipHoverTarget'] button::after { content: ''; position: absolute; inset: -12px; }
}
</style>"""
)
st.logo("assets/logo.svg", icon_image="assets/icon.svg", size="large")
# Top navigation: section menus across the top on tablets and laptops, so the content gets the full
# screen width; on phones Streamlit folds the same menu into a slide-out panel.
st.navigation(pages, position="top").run()
