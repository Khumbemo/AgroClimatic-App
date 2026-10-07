import pandas as pd
import streamlit as st

from agroclimatic.ui.common import BatchIndex, header, iso, num, record_table, save, seed_lot_select, store, today

ASPECTS = ["", "N", "NE", "E", "SE", "S", "SW", "W", "NW", "Flat"]
s = store()
idx = BatchIndex(s)
lots = {x["id"]: x["lotNumber"] for x in s.list("seedLots")}
records = sorted(s.list("provenanceRecords"), key=lambda r: r["collectionDate"], reverse=True)
header("Provenance & lineage", "Where and how seed was collected, linked to seed lots.")

if records:
    st.markdown("**Collection sites**")
    st.map(pd.DataFrame({"lat": [r["lat"] for r in records], "lon": [r["lng"] for r in records]}), size=60, zoom=4)


def title(r):
    if r.get("seedLotId"):
        return f"Seed lot {lots.get(r['seedLotId'], '(deleted)')}"
    return idx.label(r["batchId"], r.get("legacyBatchLabel")) if r.get("batchId") else "No seed lot linked"


record_table(
    records,
    {
        "Source": title,
        "Collected": "collectionDate",
        "Collector": "collectorName",
        "Latitude": lambda r: round(r["lat"], 5),
        "Longitude": lambda r: round(r["lng"], 5),
        "Elevation (m)": "elevation",
        "Aspect": "aspect",
        "Mother trees": "motherTreeCount",
        "Climate zone": "climateZone",
        "Canopy": "canopyPosition",
        "Phenotype": "phenotypeTraits",
        "Genotype markers": "genotypeMarkers",
        "Notes": "notes",
    },
    "provenanceRecords",
    "prov",
    empty="No provenance records yet. Record the collection site (decimal degrees, WGS 84), "
    "elevation and number of mother trees for each seed lot.",
)

with st.expander("New provenance record", icon=":material/add:", expanded=not records):
    with st.form("prov", clear_on_submit=True):
        c = st.columns(2)
        with c[0]:
            lot = seed_lot_select(s, "Seed lot", "prov-lot")
        d = c[1].date_input("Collection date", today(), format="YYYY-MM-DD")
        collector = st.text_input("Collector")
        st.markdown("**Site (WGS 84, decimal degrees)**")
        c = st.columns(4)
        lat = c[0].number_input(
            "Latitude (° N)",
            min_value=-90.0,
            max_value=90.0,
            step=0.000001,
            format="%.6f",
            value=None,
            placeholder="30.7333",
            help="Negative for south",
        )
        lng = c[1].number_input(
            "Longitude (° E)",
            min_value=-180.0,
            max_value=180.0,
            step=0.000001,
            format="%.6f",
            value=None,
            placeholder="79.0667",
            help="Negative for west",
        )
        elev = c[2].number_input("Elevation (m a.s.l.)", step=1.0, value=None)
        aspect = c[3].selectbox("Aspect", ASPECTS, format_func=lambda a: a or "Not recorded")
        zone = st.text_input("Climate zone", placeholder="e.g. Köppen Cwb")
        c = st.columns(2)
        trees = c[0].number_input("Mother trees", min_value=1, step=1, value=1)
        canopy = c[1].text_input("Canopy position", placeholder="Upper crown")
        pheno = st.text_input("Phenotype traits")
        geno = st.text_input("Genotype markers")
        notes = st.text_area("Notes", height=70)
        if st.form_submit_button("Save record", type="primary"):
            if lat is None or lng is None:
                st.error("Enter the latitude and longitude.")
            elif save(
                lambda: s.add(
                    "provenanceRecords",
                    {
                        "seedLotId": lot,
                        "batchId": None,
                        "collectorName": collector,
                        "collectionDate": iso(d),
                        "lat": lat,
                        "lng": lng,
                        "elevation": num(elev),
                        "aspect": aspect,
                        "climateZone": zone,
                        "canopyPosition": canopy,
                        "motherTreeCount": int(trees),
                        "genotypeMarkers": geno,
                        "phenotypeTraits": pheno,
                        "notes": notes,
                    },
                ),
                "Provenance saved",
            ):
                st.rerun()
