from datetime import date, timedelta

import streamlit as st

from agroclimatic.data.schema import IRRIGATION_METHODS
from agroclimatic.ui.common import BatchIndex, by_date_desc, header, iso, num, record_table, save, store, today

METHOD_LABELS = {
    "overhead": "Overhead sprinkler",
    "drip": "Drip",
    "sub-irrigation": "Sub-irrigation (ebb & flow)",
    "mist": "Mist",
    "hand": "Hand watering",
}

s = store()
idx = BatchIndex(s)
events = by_date_desc(s.list("irrigationEvents"))
header("Irrigation log", "Water applied per batch or for the whole nursery.")

if events:
    latest = events[0]["date"]
    since = (date.fromisoformat(latest) - timedelta(days=6)).isoformat()
    week = [e for e in events if e["date"] >= since]
    c = st.columns(3)
    c[0].metric("Last irrigation", latest, help=METHOD_LABELS[events[0]["method"]])
    c[1].metric(
        "Water, last 7 days", f"{sum(e['volumeL'] for e in week):.1f} L", help=f"{len(week)} events up to {latest}"
    )
    c[2].metric("Events recorded", len(events))

with st.expander("New irrigation", icon=":material/add:", expanded=not events):
    with st.form("irr", clear_on_submit=True):
        c = st.columns(2)
        d = c[0].date_input("Date", today(), format="YYYY-MM-DD")
        with c[1]:
            batch = idx.select("Applied to", "irr-batch", allow_whole=True)
        method = st.selectbox("Method", IRRIGATION_METHODS, format_func=METHOD_LABELS.get)
        c = st.columns(2)
        vol = c[0].number_input("Volume (L)", min_value=0.0, step=0.1, value=None)
        dur = c[1].number_input("Duration (min)", min_value=0.0, max_value=1440.0, step=1.0, value=None)
        notes = st.text_area("Notes", height=70)
        if st.form_submit_button("Save", type="primary"):
            if vol is None:
                st.error("Enter the volume applied.")
            elif save(
                lambda: s.add(
                    "irrigationEvents",
                    {
                        "date": iso(d),
                        "batchId": batch,
                        "method": method,
                        "volumeL": vol,
                        "durationMin": num(dur),
                        "notes": notes,
                    },
                ),
                "Irrigation saved",
            ):
                st.rerun()

record_table(
    events,
    {
        "Date": "date",
        "Applied to": lambda e: idx.label(e.get("batchId"), e.get("legacyBatchLabel")),
        "Method": lambda e: METHOD_LABELS[e["method"]],
        "Volume (L)": "volumeL",
        "Duration (min)": "durationMin",
        "Notes": "notes",
    },
    "irrigationEvents",
    "irr",
    empty="No irrigation recorded. Log each irrigation with the volume applied; use leachate "
    "tests in Substrate & nutrients to check the leaching fraction.",
)
