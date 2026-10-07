import streamlit as st

from agroclimatic.science.calculations import (
    cumulative_germination,
    days_after_sowing,
    germination_energy,
    germination_percent,
    germination_speed_index,
    mean_germination_time,
)
from agroclimatic.services.ai import ai_enabled, interpret
from agroclimatic.ui import charts
from agroclimatic.ui.common import BatchIndex, by_date_desc, fmt, header, iso, record_table, save, store, today

s = store()
idx = BatchIndex(s)
all_counts = s.list("germinationCounts")
header("Germination tracker", "Daily emergence counts per batch, with standard germination indices.")

if not idx.batches:
    st.info("Germination counts belong to a sowing batch. Create a batch first.", icon=":material/potted_plant:")
    st.page_link("app_pages/batches.py", label="Create a batch", icon=":material/add:")
    st.stop()

# Default to the batch with the most recent count, else the newest batch.
recent = by_date_desc(all_counts)
default = (recent[0].get("batchId") if recent else None) or sorted(idx.batches, key=lambda b: b["batchNumber"])[-1][
    "id"
]
batch_id = idx.select("Batch", "germ-batch", value=st.session_state.get("germ-batch", default), required=True)
batch = idx.by_id.get(batch_id)
if not batch:
    st.stop()

counts = sorted((c for c in all_counts if c.get("batchId") == batch_id), key=lambda c: (c["date"], c["createdAt"]))
n0, sowing = batch.get("seedsSown") or 0, batch.get("sowingDate")
c = st.columns(2)
c[0].caption(f"Seeds sown (N): **{n0 or '—'}**")
c[1].caption(f"Sowing date: **{sowing or '—'}**")
if not batch.get("seedsSown"):
    with st.form("seeds"):
        n = st.number_input("Enter seeds sown for this batch", min_value=1, step=1, value=None)
        if st.form_submit_button("Save") and n:
            if save(lambda: s.update("batches", batch_id, {"seedsSown": int(n)})):
                st.rerun()
if not sowing:
    st.warning(
        "No sowing date on this batch, so timing indices can't be calculated. Add it on the batch page.",
        icon=":material/warning:",
    )

total = sum(c["count"] for c in counts)
gp = germination_percent(counts, n0)
ge = germination_energy(counts, n0, sowing, 7) if sowing else None
gsi = germination_speed_index(counts, sowing) if sowing and counts else None
mgt = mean_germination_time(counts, sowing) if sowing else None
m = st.columns(4)
m[0].metric("Germination", fmt(gp, 1, "%"), help=f"Σn / N × 100 · {total} seeds")
m[1].metric("Energy (day 7)", fmt(ge, 1, "%"), help="% of seeds sown that germinated by day 7 after sowing")
m[2].metric("Speed index", fmt(gsi, 2, "seeds d⁻¹"), help="Maguire (1962): Σ(nᵢ / tᵢ)")
m[3].metric("Mean germination time", fmt(mgt, 1, "days"), help="Σ(tᵢ·nᵢ) / Σnᵢ")

with st.form("new-count", clear_on_submit=True):
    st.markdown(f"**New count · {batch['batchNumber']}**")
    c = st.columns([1, 1, 1], vertical_alignment="bottom")
    d = c[0].date_input("Count date", today(), format="YYYY-MM-DD")
    n = c[1].number_input("Newly germinated since last count", min_value=0, step=1, value=None, placeholder="0")
    if c[2].form_submit_button("Save count", type="primary"):
        if n is None:
            st.error("Enter the number of newly germinated seeds.")
        elif sowing and days_after_sowing(iso(d), sowing) < 0:
            st.error("The count date is before the batch was sown.")
        elif save(
            lambda: s.add("germinationCounts", {"batchId": batch_id, "date": iso(d), "count": int(n)}), "Count saved"
        ):
            st.rerun()

if counts:
    labels = [f"D{days_after_sowing(c['date'], sowing)}" if sowing else c["date"] for c in counts]
    x_title = "Days after sowing" if sowing else "Date"
    cum = cumulative_germination(counts, n0)
    c = st.columns(2)
    with c[0]:
        st.markdown("**New germinants per count**")
        charts.show(charts.bar(labels, [c["count"] for c in counts], "Seeds", x_title, hover="%{y} seeds"))
    with c[1]:
        st.markdown("**Cumulative germination**")
        if n0:
            charts.show(
                charts.lines(
                    labels,
                    {"Cumulative": [round(x, 1) for x in cum]},
                    "Germination (% of sown)",
                    x_title,
                    hover_unit=" %",
                )
            )
        else:
            st.caption("Needs seeds sown.")
    if ai_enabled():
        if st.button("Interpret with AI", icon=":material/auto_awesome:"):
            with st.spinner("Asking Gemini…"):
                daily = ", ".join(f"{c['date']} +{c['count']}" for c in counts)
                try:
                    st.info(
                        interpret(
                            f"Batch {batch['batchNumber']}: {n0} seeds sown on {sowing}. Final germination {fmt(gp)} %, "
                            f"germination energy (day 7) {fmt(ge)} %, speed index {fmt(gsi, 2)} seeds/day, mean germination "
                            f"time {fmt(mgt)} days. Daily counts: {daily}."
                        )
                    )
                except Exception as e:  # network or API error
                    st.error(f"Could not get an interpretation: {e}")

    cum_by_id = {c["id"]: cum[i] for i, c in enumerate(sorted(counts, key=lambda c: c["date"]))}
    record_table(
        list(reversed(counts)),
        {
            "Date": "date",
            "Day after sowing": lambda c: days_after_sowing(c["date"], sowing) if sowing else None,
            "New germinants": "count",
            "Cumulative (%)": lambda c: round(cum_by_id[c["id"]], 1) if n0 else None,
        },
        "germinationCounts",
        "counts",
    )
else:
    st.info(
        "No counts for this batch yet. Count newly emerged seedlings at regular intervals (e.g. every 2–3 days).",
        icon=":material/eco:",
    )
