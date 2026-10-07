from datetime import date

import streamlit as st

from agroclimatic.ui.common import header, iso, record_table, save, store, today

INSTRUMENTS = [
    "pH meter",
    "EC meter",
    "SPAD meter",
    "PAR / quantum sensor",
    "Thermometer",
    "Hygrometer",
    "Balance",
    "Digital calipers",
    "Moisture meter",
    "Other",
]
s = store()
logs = sorted(s.list("calibrations"), key=lambda l: l["calibrationDate"], reverse=True)
header("Data quality & audit", "Instrument calibration log and due dates.")


def status(next_due: str | None) -> tuple[str, int]:
    if not next_due:
        return "No due date", 2
    days = (date.fromisoformat(next_due) - date.today()).days
    if days < 0:
        return f"Overdue {-days} d", 0
    if days <= 14:
        return f"Due in {days} d", 1
    return "Valid", 3


# Only the latest calibration per instrument counts towards status.
latest: dict[str, dict] = {}
for l in reversed(logs):
    latest[l["instrumentName"].strip().lower()] = l
ranks = [status(l.get("nextDueDate"))[1] for l in latest.values()]
if latest:
    c = st.columns(3)
    c[0].metric("Overdue", ranks.count(0), help="instruments")
    c[1].metric("Due within 14 days", ranks.count(1), help="instruments")
    c[2].metric("Valid", ranks.count(3), help=f"of {len(latest)} instruments")
    if ranks.count(0):
        st.error(
            "Some instruments are overdue for calibration; readings taken with them may be unreliable.",
            icon=":material/error:",
        )

record_table(
    logs,
    {
        "Instrument": "instrumentName",
        "Type": "instrumentType",
        "Calibrated": "calibrationDate",
        "Next due": "nextDueDate",
        "Status": lambda l: (
            status(l.get("nextDueDate"))[0] if latest.get(l["instrumentName"].strip().lower()) is l else "Superseded"
        ),
        "Standard": "standardUsed",
        "By": "calibratedBy",
        "Notes": "notes",
    },
    "calibrations",
    "cal",
    empty="No calibrations recorded. Log each calibration with the reference standard (e.g. pH "
    "4.01 / 7.00 buffers, 1.413 mS cm⁻¹ EC solution) and the next due date.",
)

with st.expander("New calibration", icon=":material/add:", expanded=not logs):
    with st.form("cal", clear_on_submit=True):
        name = st.text_input("Instrument (name or serial)", placeholder="EC-01 / SN 12345")
        kind = st.selectbox("Type", INSTRUMENTS)
        c = st.columns(2)
        on = c[0].date_input("Calibrated on", today(), format="YYYY-MM-DD")
        due = c[1].date_input("Next due", value=None, format="YYYY-MM-DD")
        std = st.text_input("Reference standard", placeholder="pH 4.01 / 7.00 buffers")
        by = st.text_input("Calibrated by")
        notes = st.text_area("Notes", placeholder="Slope / offset, drift found, adjustments", height=70)
        if st.form_submit_button("Save calibration", type="primary"):
            if due and due < on:
                st.error("The next due date is before the calibration date.")
            elif save(
                lambda: s.add(
                    "calibrations",
                    {
                        "instrumentName": name,
                        "instrumentType": kind,
                        "calibrationDate": iso(on),
                        "nextDueDate": iso(due),
                        "standardUsed": std,
                        "calibratedBy": by,
                        "notes": notes,
                    },
                ),
                "Calibration saved",
            ):
                st.rerun()
