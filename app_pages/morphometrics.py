import streamlit as st

from agroclimatic.science.calculations import (
    days_after_sowing,
    dickson_quality_index,
    relative_growth_rate,
    sturdiness_quotient,
)
from agroclimatic.ui import charts
from agroclimatic.ui.common import (
    BatchIndex,
    by_date_desc,
    example_note,
    fmt,
    header,
    iso,
    num,
    record_table,
    save,
    store,
    today,
)

s = store()
idx = BatchIndex(s)
items = s.list("growthMeasurements")
header("Morphometrics", "Seedling height, root-collar diameter and biomass, with quality indices.")

if not idx.batches:
    st.info("Measurements belong to a sowing batch. Create a batch first.", icon=":material/potted_plant:")
    st.stop()

recent = by_date_desc(items)
default = recent[0].get("batchId") if recent else None
batch_id = idx.select("Batch", "morph-batch", value=st.session_state.get("morph-batch", default))
rows = by_date_desc(g for g in items if not batch_id or g.get("batchId") == batch_id)
series = list(reversed(rows))


def dqi(g):
    return (
        dickson_quality_index(g["avgHeightCm"], g["avgRCDmm"], g["shootDryWeight"], g["rootDryWeight"])
        if g.get("shootDryWeight") and g.get("rootDryWeight")
        else None
    )


if rows:
    latest, first = rows[0], series[0]
    span = days_after_sowing(latest["date"], first["date"])
    rgr = relative_growth_rate(first["avgHeightCm"], latest["avgHeightCm"], span) if span > 0 else None
    with_mass = next((g for g in rows if dqi(g) is not None), None)
    c = st.columns(3)
    c[0].metric("Height", fmt(latest["avgHeightCm"], 1, "cm"), help=f"n = {latest['sampleSize']} · {latest['date']}")
    c[1].metric("Root-collar diameter", fmt(latest["avgRCDmm"], 2, "mm"))
    c[2].metric("Sturdiness H/D", fmt(sturdiness_quotient(latest["avgHeightCm"], latest["avgRCDmm"]), 1, "cm mm⁻¹"))
    c = st.columns(3)
    c[0].metric(
        "RGR (height)",
        fmt(rgr, 3, "d⁻¹"),
        help=f"(ln H₂ − ln H₁)/Δt over {span} days" if span > 0 else "Needs two measurement dates",
    )
    c[1].metric(
        "Shoot : root (dry)", fmt(with_mass["shootDryWeight"] / with_mass["rootDryWeight"], 2) if with_mass else "—"
    )
    c[2].metric(
        "Dickson quality index",
        fmt(dqi(with_mass), 2) if with_mass else "—",
        help="Total dry mass / (H/D + shoot/root), Dickson et al. (1960)"
        + (f" · {with_mass['date']}" if with_mass else " · needs dry masses"),
    )

if batch_id and len(series) >= 2:
    dates = [g["date"] for g in series]
    c = st.columns(2)
    with c[0]:
        st.markdown("**Mean height**")
        charts.show(
            charts.lines(
                dates, {"Height": [g["avgHeightCm"] for g in series]}, "Height (cm)", hover_unit=" cm", height=260
            )
        )
    with c[1]:
        st.markdown("**Mean root-collar diameter**")
        charts.show(
            charts.lines(dates, {"RCD": [g["avgRCDmm"] for g in series]}, "RCD (mm)", hover_unit=" mm", height=260)
        )
elif not batch_id and rows:
    st.caption("Select a batch to see its growth curves.")

with st.expander("New measurement", icon=":material/add:", expanded=not items):
    with st.form("growth", clear_on_submit=True):
        c = st.columns(3)
        with c[0]:
            b = idx.select("Batch", "growth-batch", value=batch_id)
        d = c[1].date_input("Date", today(), format="YYYY-MM-DD")
        n = c[2].number_input("Sample size (n)", min_value=1, step=1, value=30)
        st.markdown("**Non-destructive (means per seedling)**")
        c = st.columns(5)
        h = c[0].number_input("Height (cm)", min_value=0.0, step=0.1, value=None, placeholder="15.2")
        rcd = c[1].number_input("Root-collar Ø (mm)", min_value=0.0, step=0.01, value=None, placeholder="4.20")
        leaves = c[2].number_input("Leaves (count)", min_value=0.0, step=1.0, value=None)
        spad = c[3].number_input("SPAD", min_value=0.0, max_value=100.0, step=0.1, value=None)
        lai = c[4].number_input("Leaf area index", min_value=0.0, step=0.01, value=None)
        st.markdown(
            "**Destructive sample (optional)** · mean mass per seedling; dry mass after oven-drying to constant weight"
        )
        c = st.columns(4)
        sfw = c[0].number_input("Shoot fresh (g)", min_value=0.0, step=0.001, value=None, format="%.3f")
        rfw = c[1].number_input("Root fresh (g)", min_value=0.0, step=0.001, value=None, format="%.3f")
        sdw = c[2].number_input("Shoot dry (g)", min_value=0.0, step=0.001, value=None, format="%.3f")
        rdw = c[3].number_input("Root dry (g)", min_value=0.0, step=0.001, value=None, format="%.3f")
        if st.form_submit_button("Save measurement", type="primary"):
            if not b:
                st.error("Select the batch you measured.")
            elif h is None or rcd is None:
                st.error("Enter the mean height and root-collar diameter.")
            elif save(
                lambda: s.add(
                    "growthMeasurements",
                    {
                        "batchId": b,
                        "date": iso(d),
                        "sampleSize": int(n),
                        "avgHeightCm": h,
                        "avgRCDmm": rcd,
                        "avgLeaves": num(leaves),
                        "leafAreaIndex": num(lai),
                        "spadValue": num(spad),
                        "shootFreshWeight": num(sfw) or None,
                        "rootFreshWeight": num(rfw) or None,
                        "shootDryWeight": num(sdw) or None,
                        "rootDryWeight": num(rdw) or None,
                    },
                ),
                "Measurement saved",
            ):
                st.rerun()

record_table(
    rows,
    {
        "Date": "date",
        "Batch": lambda g: idx.label(g.get("batchId"), g.get("legacyBatchLabel")),
        "n": "sampleSize",
        "Height (cm)": "avgHeightCm",
        "RCD (mm)": "avgRCDmm",
        "H/D": lambda g: round(sq, 1) if (sq := sturdiness_quotient(g["avgHeightCm"], g["avgRCDmm"])) else None,
        "Shoot dry (g)": "shootDryWeight",
        "Root dry (g)": "rootDryWeight",
        "DQI": lambda g: round(q, 3) if (q := dqi(g)) is not None else None,
        "SPAD": "spadValue",
        "LAI": "leafAreaIndex",
    },
    "growthMeasurements",
    "growth",
    empty="No measurements yet. Measure a sample of seedlings (e.g. n = 30) and record "
    "the means. Add dry masses after destructive sampling to get the Dickson index.",
)
example_note(rows)
