import streamlit as st

from agroclimatic.ui.common import (
    BatchIndex,
    example_note,
    fmt,
    header,
    iso,
    num,
    record_table,
    save,
    species_select,
    store,
)

s = store()
idx = BatchIndex(s)
lots = sorted(s.list("seedLots"), key=lambda x: x["lotNumber"], reverse=True)
provenance = s.list("provenanceRecords")

header("Seed lots", "Seed stock with moisture content, viability and thousand-seed weight.")

if lots:
    c = st.columns(3)
    c[0].metric("Lots", len(lots))
    c[1].metric("In stock", sum(1 for x in lots if (x.get("stockKg") or 0) > 0))
    c[2].metric("Total stock", fmt(sum(x.get("stockKg") or 0 for x in lots), 2, "kg"))


def origin(lot):
    p = next((p for p in provenance if p.get("seedLotId") == lot["id"]), None)
    return f"{p['lat']:.2f}, {p['lng']:.2f}" if p else None


def guarded_delete(lot_id: str) -> None:
    in_use = [b["batchNumber"] for b in s.list("batches") if b.get("seedLotId") == lot_id]
    if in_use:
        st.error(f"Not deleted: batches {', '.join(in_use)} use this lot.")
        st.stop()
    s.remove("seedLots", lot_id)


record_table(
    lots,
    {
        "Lot": "lotNumber",
        "Species": lambda x: idx.species_name(x.get("speciesId")) or "Not set",
        "Collected": "collectionDate",
        "Stock (kg)": "stockKg",
        "Moisture (%)": "moistureContentPct",
        "Viability (%)": "viabilityPct",
        "1000-seed wt (g)": "thousandSeedWeightG",
        "Origin (lat, lng)": origin,
    },
    "seedLots",
    "lots",
    empty="No seed lots yet. Add one below, then link batches and provenance records to it.",
    on_delete=guarded_delete,
)
example_note(lots)

with st.expander("New seed lot", icon=":material/add:", expanded=not lots):
    with st.form("new-lot", clear_on_submit=True):
        c = st.columns(2)
        number = c[0].text_input("Lot number", placeholder="SL-003")
        collected = c[1].date_input("Collection date", value=None, format="YYYY-MM-DD")
        species = species_select(s, "Species", "lot-sp")
        c = st.columns(4)
        stock = c[0].number_input("Stock (kg)", min_value=0.0, step=0.01, value=None)
        tsw = c[1].number_input("1000-seed weight (g)", min_value=0.0, step=0.01, value=None)
        mc = c[2].number_input("Moisture content (%)", min_value=0.0, max_value=100.0, step=0.1, value=None)
        via = c[3].number_input("Viability (%)", min_value=0.0, max_value=100.0, step=0.1, value=None)
        notes = st.text_area("Notes", height=70)
        if st.form_submit_button("Save seed lot", type="primary"):
            if save(
                lambda: s.add(
                    "seedLots",
                    {
                        "lotNumber": number,
                        "speciesId": species,
                        "collectionDate": iso(collected),
                        "stockKg": num(stock),
                        "thousandSeedWeightG": num(tsw) or None,
                        "moistureContentPct": num(mc),
                        "viabilityPct": num(via),
                        "notes": notes or None,
                    },
                ),
                "Seed lot saved",
            ):
                st.rerun()
