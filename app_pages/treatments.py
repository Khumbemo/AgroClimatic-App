import streamlit as st

from agroclimatic.data.schema import PRESOWING_TYPES
from agroclimatic.ui.common import BatchIndex, by_date_desc, header, iso, num, record_table, save, store, today

s = store()
idx = BatchIndex(s)
header("Treatment logs", "Fertigation, pest and disease scouting, and seed pre-treatments.")

TREATMENT_LABELS = {
    "stratification_cold": "Cold stratification",
    "stratification_warm": "Warm stratification",
    "scarification_mechanical": "Mechanical scarification",
    "scarification_chemical": "Chemical scarification",
    "soaking": "Soaking / imbibition",
    "hormonal": "Hormonal (e.g. GA₃)",
    "other": "Other",
}
SEVERITY = ["trace", "slight", "moderate", "severe", "very severe"]

fert_tab, pest_tab, pre_tab = st.tabs(
    [":material/science: Fertigation", ":material/bug_report: Pests & disease", ":material/shield: Pre-sowing"]
)

with fert_tab:
    with st.expander("New fertigation event", icon=":material/add:"):
        with st.form("fert", clear_on_submit=True):
            c = st.columns(2)
            d = c[0].date_input("Date", today(), format="YYYY-MM-DD")
            npk = c[1].text_input("N-P-K ratio", placeholder="20-20-20")
            batch = idx.select("Applied to", "fert-batch", allow_whole=True)
            c = st.columns(3)
            dose = c[0].number_input("Dose (mg L⁻¹)", min_value=0.0, step=0.1, value=None)
            ph = c[1].number_input("pH", min_value=0.0, max_value=14.0, step=0.1, value=None)
            ec = c[2].number_input("EC (mS cm⁻¹)", min_value=0.0, step=0.01, value=None)
            if st.form_submit_button("Save event", type="primary"):
                if dose is None:
                    st.error("Enter the dose.")
                elif save(
                    lambda: s.add(
                        "fertigationEvents",
                        {
                            "date": iso(d),
                            "batchId": batch,
                            "npkRatio": npk,
                            "dosage": dose,
                            "ph": num(ph),
                            "ec": num(ec),
                        },
                    ),
                    "Event saved",
                ):
                    st.rerun()
    record_table(
        by_date_desc(s.list("fertigationEvents")),
        {
            "Date": "date",
            "Applied to": lambda r: idx.label(r.get("batchId"), r.get("legacyBatchLabel")),
            "N-P-K": "npkRatio",
            "Dose (mg L⁻¹)": "dosage",
            "pH": "ph",
            "EC (mS cm⁻¹)": "ec",
        },
        "fertigationEvents",
        "fert",
        empty="No fertigation events yet.",
    )

with pest_tab:
    with st.expander("New pest or disease observation", icon=":material/add:"):
        with st.form("pest", clear_on_submit=True):
            c = st.columns(2)
            d = c[0].date_input("Date", today(), format="YYYY-MM-DD")
            with c[1]:
                batch = idx.select("Batch", "pest-batch", allow_whole=True)
            name = st.text_input("Pest or disease", placeholder="Damping-off (Pythium spp.)")
            c = st.columns(2)
            inc = c[0].number_input("Incidence (% plants)", min_value=0.0, max_value=100.0, step=0.1, value=None)
            sev = c[1].selectbox("Severity", [1, 2, 3, 4, 5], format_func=lambda n: f"{n} – {SEVERITY[n - 1]}")
            chem = st.text_input("Treatment applied", placeholder="Product and rate, if any")
            if st.form_submit_button("Save observation", type="primary"):
                if inc is None:
                    st.error("Enter the incidence.")
                elif save(
                    lambda: s.add(
                        "pestObservations",
                        {
                            "date": iso(d),
                            "batchId": batch,
                            "pestDiseaseName": name,
                            "incidencePercentage": inc,
                            "severityScale": sev,
                            "treatmentChemical": chem or None,
                        },
                    ),
                    "Observation saved",
                ):
                    st.rerun()
    record_table(
        by_date_desc(s.list("pestObservations")),
        {
            "Date": "date",
            "Pest or disease": "pestDiseaseName",
            "Batch": lambda r: idx.label(r.get("batchId"), r.get("legacyBatchLabel")),
            "Incidence (%)": "incidencePercentage",
            "Severity": lambda r: f"{r['severityScale']}/5 {SEVERITY[r['severityScale'] - 1]}",
            "Treatment": "treatmentChemical",
        },
        "pestObservations",
        "pest",
        empty="No pest or disease observations yet.",
    )

with pre_tab:
    with st.expander("New pre-sowing treatment", icon=":material/add:"):
        with st.form("pre", clear_on_submit=True):
            c = st.columns(2)
            d = c[0].date_input("Date", today(), format="YYYY-MM-DD")
            with c[1]:
                batch = idx.select("Batch", "pre-batch")
            kind = st.selectbox(
                "Treatment", PRESOWING_TYPES, index=PRESOWING_TYPES.index("soaking"), format_func=TREATMENT_LABELS.get
            )
            c = st.columns(2)
            duration = c[0].text_input("Duration", placeholder="30 days at 4 °C")
            conc = c[1].text_input("Concentration", placeholder="250 ppm")
            notes = st.text_area("Notes", height=70)
            if st.form_submit_button("Save treatment", type="primary"):
                if not batch:
                    st.error("Select the batch whose seed was treated.")
                elif save(
                    lambda: s.add(
                        "preSowingTreatments",
                        {
                            "date": iso(d),
                            "batchId": batch,
                            "treatmentType": kind,
                            "duration": duration,
                            "concentration": conc,
                            "notes": notes,
                        },
                    ),
                    "Treatment saved",
                ):
                    st.rerun()
    record_table(
        by_date_desc(s.list("preSowingTreatments")),
        {
            "Date": "date",
            "Treatment": lambda r: TREATMENT_LABELS[r["treatmentType"]],
            "Batch": lambda r: idx.label(r.get("batchId"), r.get("legacyBatchLabel")),
            "Duration": "duration",
            "Concentration": "concentration",
            "Notes": "notes",
        },
        "preSowingTreatments",
        "pre",
        empty="No pre-sowing treatments yet.",
    )
