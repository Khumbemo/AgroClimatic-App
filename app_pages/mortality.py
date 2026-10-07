from collections import Counter

import streamlit as st

from agroclimatic.science.calculations import days_after_sowing
from agroclimatic.ui import charts
from agroclimatic.ui.common import BatchIndex, by_date_desc, header, iso, record_table, save, store, today

CAUSES = [
    "Damping-off (Pythium/Rhizoctonia)",
    "Root rot (Fusarium)",
    "Desiccation",
    "Chlorosis / nutrient disorder",
    "Nutrient or salt toxicity",
    "Herbivory / insects",
    "Mechanical damage",
    "Frost or heat injury",
    "Unknown",
]

s = store()
idx = BatchIndex(s)
all_events = s.list("mortalityEvents")
header("Mortality diagnostics", "Seedling losses by cause and survival per batch.")

if not idx.batches:
    st.info("Mortality is recorded against a sowing batch. Create a batch first.", icon=":material/potted_plant:")
    st.stop()

recent = by_date_desc(all_events)
default = (recent[0].get("batchId") if recent else None) or idx.batches[0]["id"]
batch_id = idx.select("Batch", "mort-batch", value=st.session_state.get("mort-batch", default), required=True)
batch = idx.by_id[batch_id]
events = by_date_desc(e for e in all_events if e.get("batchId") == batch_id)
germinated = sum(c["count"] for c in s.list("germinationCounts") if c.get("batchId") == batch_id)
dead = sum(e["count"] for e in events)
# Survival refers to emerged seedlings; seeds that never germinated are not deaths.
base = germinated or (batch.get("seedsSown") or 0)
base_label = "of emerged seedlings" if germinated else "of seeds sown (no germination counts yet)"
survival = (base - dead) / base * 100 if base else None
by_cause = Counter()
for e in events:
    by_cause[e["causeCode"]] += e["count"]

c = st.columns(3)
c[0].caption(f"Seeds sown: **{batch.get('seedsSown') or '—'}**")
c[1].caption(f"Emerged: **{germinated}**")
c[2].caption(f"Sowing date: **{batch.get('sowingDate') or '—'}**")
m = st.columns(3)
m[0].metric(
    "Survival",
    f"{survival:.1f} %" if survival is not None else "—",
    help=f"(N − deaths) / N, {base_label}" if base else "Add seeds sown or germination counts",
)
m[1].metric("Deaths", f"{dead} seedlings")
top = by_cause.most_common(1)
m[2].metric("Main cause", top[0][0].split(" (")[0] if top else "—", help=f"{top[0][1]} of {dead}" if top else None)
if survival is not None and survival < 80:
    st.warning("Survival is below 80 %.", icon=":material/warning:")

if by_cause:
    st.markdown("**Losses by cause** (% of recorded deaths)")
    causes = by_cause.most_common()
    charts.show(
        charts.hbar(
            [c for c, _ in causes], [round(n / dead * 100, 1) for _, n in causes], "% of deaths", hover="%{x} %"
        )
    )

with st.form("mort", clear_on_submit=True):
    st.markdown(f"**Record losses · {batch['batchNumber']}**")
    c = st.columns(2)
    d = c[0].date_input("Inspection date", today(), format="YYYY-MM-DD")
    n = c[1].number_input("Dead seedlings", min_value=1, step=1, value=None)
    sown = None
    if not batch.get("sowingDate"):
        st.info("This batch has no sowing date. Enter it here and it will be saved to the batch.")
        sown = st.date_input("Sowing date", value=None, format="YYYY-MM-DD")
    cause = st.selectbox("Most likely cause", CAUSES)
    notes = st.text_area("Symptoms / notes", placeholder="e.g. collapse at soil line, white mycelium", height=70)
    if st.form_submit_button("Save", type="primary"):
        sowing = batch.get("sowingDate") or iso(sown)
        if n is None:
            st.error("Enter the number of dead seedlings.")
        elif not sowing:
            st.error("Enter the sowing date so days to death can be calculated.")
        elif days_after_sowing(iso(d), sowing) < 0:
            st.error("The event date is before the sowing date.")
        else:

            def write():
                if not batch.get("sowingDate"):
                    s.update("batches", batch_id, {"sowingDate": sowing})
                s.add(
                    "mortalityEvents",
                    {
                        "batchId": batch_id,
                        "date": iso(d),
                        "sowingDate": sowing,
                        "count": int(n),
                        "causeCode": cause,
                        "daysToDeath": days_after_sowing(iso(d), sowing),
                        "notes": notes,
                    },
                )

            if save(write, "Losses recorded"):
                st.rerun()

record_table(
    events,
    {"Date": "date", "Cause": "causeCode", "Dead": "count", "Days after sowing": "daysToDeath", "Notes": "notes"},
    "mortalityEvents",
    "mort",
    empty="No losses recorded for this batch. Record dead seedlings at each inspection with the most likely cause.",
)
