import streamlit as st

from agroclimatic.data.schema import STORAGE_BEHAVIOURS
from agroclimatic.ui.common import header, record_table, save, store

s = store()
species = sorted(s.list("species"), key=lambda x: x["botanicalName"])
header("Species database", "Taxonomy and seed storage behaviour.")

query = st.text_input(
    "Search", placeholder="Binomial, common name or family", label_visibility="collapsed", icon=":material/search:"
)
q = query.strip().lower()
shown = [
    x for x in species if not q or any(q in (x.get(f) or "").lower() for f in ("botanicalName", "commonName", "family"))
]


def guarded_delete(species_id: str) -> None:
    users = [r for col in ("batches", "seedLots") for r in s.list(col) if r.get("speciesId") == species_id]
    if users:
        st.error("Not deleted: batches or seed lots refer to this species.")
        st.stop()
    s.remove("species", species_id)


if q and not shown:
    st.info(f"No species match “{query}”.")
else:
    record_table(
        shown,
        {
            "Botanical name": "botanicalName",
            "Common name": "commonName",
            "Family": "family",
            "Seed storage": "storageBehaviour",
            "Notes": "notes",
        },
        "species",
        "species",
        on_delete=guarded_delete,
    )
    st.caption(
        "Seed storage behaviour: orthodox seed tolerates drying and sub-zero storage; recalcitrant seed is "
        "killed by drying; intermediate and sub-orthodox lie between (Roberts 1973; Hong & Ellis 1996)."
    )

with st.expander("Add species", icon=":material/add:"):
    with st.form("new-species", clear_on_submit=True):
        name = st.text_input("Botanical name", placeholder="Quercus semecarpifolia")
        c = st.columns(3)
        common = c[0].text_input("Common name")
        family = c[1].text_input("Family")
        storage = c[2].selectbox(
            "Seed storage behaviour", STORAGE_BEHAVIOURS, index=STORAGE_BEHAVIOURS.index("unknown")
        )
        notes = st.text_area("Notes", height=70)
        if st.form_submit_button("Save species", type="primary"):
            if save(
                lambda: s.add(
                    "species",
                    {
                        "botanicalName": name,
                        "commonName": common,
                        "family": family,
                        "storageBehaviour": storage,
                        "notes": notes or None,
                    },
                ),
                "Species saved",
            ):
                st.rerun()
