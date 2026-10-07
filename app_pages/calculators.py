import pandas as pd
import streamlit as st

from agroclimatic.science.calculations import (
    daily_light_integral,
    dew_point,
    dickson_quality_index,
    fertilizer_mass_g,
    growing_degree_days,
    leaching_fraction,
    saturation_vapour_pressure,
    sturdiness_quotient,
    vpd,
    vpd_band,
)
from agroclimatic.ui.common import fmt, header

header("Calculators", "Standard greenhouse and seed-testing equations.")

tabs = st.tabs(
    [
        "VPD & dew point",
        "Germination speed",
        "Fertiliser dose",
        "Light integral",
        "Seedling quality",
        "Leaching fraction",
        "Degree days",
    ]
)

with tabs[0]:
    st.caption("Tetens equation for saturation vapour pressure; Magnus formula for dew point.")
    c = st.columns(2)
    t = c[0].number_input("Air temperature (°C)", value=25.0, step=0.1, key="vpd-t")
    rh = c[1].number_input("Relative humidity (%)", value=60.0, min_value=0.0, max_value=100.0, step=1.0, key="vpd-rh")
    v = vpd(t, rh)
    c = st.columns(3)
    c[0].metric("VPD", fmt(v, 2, "kPa"))
    c[1].metric("Saturation vapour pressure", fmt(saturation_vapour_pressure(t), 3, "kPa"))
    c[2].metric("Dew point", fmt(dew_point(t, rh), 1, "°C"))
    st.info(
        f"Guidance band: **{vpd_band(v).label}** (0.4–0.8 kPa propagation, 0.8–1.2 kPa optimal vegetative).",
        icon=":material/eco:",
    )
    st.code("VPD = 0.61078·exp(17.27·T / (T + 237.3)) × (1 − RH/100)", language=None)

with tabs[1]:
    st.caption("Maguire (1962) speed of germination index.")
    counts = st.data_editor(
        pd.DataFrame({"Day tᵢ": [3, 5, 7, 10], "New germinants Gᵢ": [4, 18, 22, 6]}),
        num_rows="dynamic",
        hide_index=True,
        key="gsi-table",
        column_config={
            "Day tᵢ": st.column_config.NumberColumn(min_value=1, step=1),
            "New germinants Gᵢ": st.column_config.NumberColumn(min_value=0, step=1),
        },
    )
    rows = counts.dropna()
    gsi = sum(g / d for d, g in zip(rows["Day tᵢ"], rows["New germinants Gᵢ"], strict=True) if d > 0)
    total = rows["New germinants Gᵢ"].sum()
    mgt = (rows["Day tᵢ"] * rows["New germinants Gᵢ"]).sum() / total if total else None
    c = st.columns(2)
    c[0].metric("Speed index (GSI)", fmt(gsi, 2, "seeds d⁻¹"))
    c[1].metric("Mean germination time", fmt(mgt, 2, "days"))
    st.code("GSI = Σ (Gᵢ / tᵢ)      MGT = Σ (tᵢ·Gᵢ) / Σ Gᵢ", language=None)

with tabs[2]:
    st.caption("Dry fertiliser mass for a target element concentration in solution.")
    c = st.columns(3)
    ppm = c[0].number_input("Target concentration (mg L⁻¹ = ppm)", value=150.0, min_value=0.0, step=1.0)
    vol = c[1].number_input("Solution volume (L)", value=10.0, min_value=0.0, step=0.1)
    pct = c[2].number_input("Element in product (% w/w)", value=20.0, min_value=0.0, max_value=100.0, step=0.1)
    st.metric("Required dry mass", fmt(fertilizer_mass_g(ppm, vol, pct), 2, "g"))
    st.code("mass (g) = ppm × volume (L) / (element % × 10)", language=None)
    st.caption(
        "For P and K on fertiliser labels given as P₂O₅ and K₂O, convert first: P = P₂O₅ × 0.4364; K = K₂O × 0.8301."
    )

with tabs[3]:
    c = st.columns(2)
    par = c[0].number_input("Mean PAR (µmol m⁻² s⁻¹)", value=400.0, min_value=0.0, step=10.0)
    hours = c[1].number_input("Photoperiod (h)", value=12.0, min_value=0.0, max_value=24.0, step=0.5)
    st.metric("Daily light integral", fmt(daily_light_integral(par, hours), 2, "mol m⁻² d⁻¹"))
    st.code("DLI = PAR × photoperiod × 3600 / 10⁶", language=None)

with tabs[4]:
    c = st.columns(4)
    h = c[0].number_input("Height (cm)", value=20.0, min_value=0.0, step=0.1)
    d = c[1].number_input("Root-collar Ø (mm)", value=4.0, min_value=0.0, step=0.01)
    sdw = c[2].number_input("Shoot dry mass (g)", value=3.0, min_value=0.0, step=0.01)
    rdw = c[3].number_input("Root dry mass (g)", value=1.5, min_value=0.0, step=0.01)
    c = st.columns(3)
    c[0].metric("Sturdiness H/D", fmt(sturdiness_quotient(h, d), 2, "cm mm⁻¹"))
    c[1].metric("Shoot : root", fmt(sdw / rdw if rdw > 0 else None, 2))
    c[2].metric("Dickson quality index", fmt(dickson_quality_index(h, d, sdw, rdw), 3))
    st.code("DQI = (shoot + root dry mass) / (H/D + shoot/root)   — Dickson, Leaf & Hosner (1960)", language=None)

with tabs[5]:
    c = st.columns(2)
    applied = c[0].number_input("Volume applied (mL)", value=1000.0, min_value=0.0, step=10.0)
    drained = c[1].number_input("Volume drained (mL)", value=200.0, min_value=0.0, step=10.0)
    st.metric("Leaching fraction", fmt(leaching_fraction(drained, applied), 2))
    st.code("LF = drainage volume / applied volume", language=None)

with tabs[6]:
    c = st.columns(3)
    tmax = c[0].number_input("T max (°C)", value=28.0, step=0.1)
    tmin = c[1].number_input("T min (°C)", value=12.0, step=0.1)
    base = c[2].number_input("Base temperature (°C)", value=10.0, step=0.5)
    st.metric("Growing degree days", fmt(growing_degree_days(tmax, tmin, base), 1, "°C·d"))
    st.code("GDD = max(0, (Tmax + Tmin)/2 − Tbase)", language=None)
