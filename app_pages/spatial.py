import pandas as pd
import streamlit as st

from agroclimatic.data.schema import PLACEMENT_STATUSES
from agroclimatic.ui.common import BatchIndex, flash, header, save, store

STATUS_LABEL = {
    "empty": "Empty",
    "sown": "Sown",
    "germinating": "Germinating",
    "growing": "Growing",
    "hardening": "Hardening",
    "ready": "Ready",
}
# Translucent fills read on both light and dark backgrounds; stage is also written in each cell.
STATUS_FILL = {
    "sown": "rgba(237,161,0,0.28)",
    "germinating": "rgba(27,175,122,0.22)",
    "growing": "rgba(0,131,0,0.32)",
    "hardening": "rgba(42,120,214,0.28)",
    "ready": "rgba(0,131,0,0.55)",
}

s = store()
idx = BatchIndex(s)
layouts = sorted(s.list("greenhouses"), key=lambda g: g["name"])
header("Spatial mapping", "Bench layouts per greenhouse, linked to batches.")

with st.expander("New greenhouse layout", icon=":material/add:", expanded=not layouts):
    with st.form("gh", clear_on_submit=True):
        name = st.text_input("Greenhouse name", placeholder="GH-01 propagation house")
        c = st.columns(2)
        rows = c[0].number_input("Benches (rows)", min_value=1, max_value=50, step=1, value=4)
        cols = c[1].number_input("Positions per bench", min_value=1, max_value=50, step=1, value=6)
        if st.form_submit_button("Create layout", type="primary"):
            created = {}
            if save(
                lambda: created.update(
                    s.add("greenhouses", {"name": name, "rows": int(rows), "cols": int(cols), "placements": []})
                ),
                "Layout created",
            ):
                st.session_state["gh-pick"] = created["id"]
                st.rerun()

if not layouts:
    st.stop()

ids = [g["id"] for g in layouts]
if st.session_state.get("gh-pick") not in ids:
    st.session_state["gh-pick"] = ids[0]
gh_id = st.selectbox(
    "Greenhouse", ids, format_func=lambda i: next(g["name"] for g in layouts if g["id"] == i), key="gh-pick"
)
gh = next(g for g in layouts if g["id"] == gh_id)
at = {(p["row"], p["col"]): p for p in gh["placements"]}


def cell_text(p: dict | None) -> str:
    if not p:
        return "—"
    b = idx.by_id.get(p.get("batchId")) if p.get("batchId") else None
    number = b["batchNumber"] if b else (p.get("legacyBatchLabel") or "—")
    sp = (idx.species_name(b.get("speciesId")) if b else None) or p.get("legacySpecies") or ""
    return f"{number}\n{sp}\n{STATUS_LABEL[p['status']]}".strip()


grid = pd.DataFrame(
    [[cell_text(at.get((r, c))) for c in range(gh["cols"])] for r in range(gh["rows"])],
    index=[f"B{r + 1}" for r in range(gh["rows"])],
    columns=[f"P{c + 1}" for c in range(gh["cols"])],
)
fills = pd.DataFrame(
    [
        [f"background-color: {STATUS_FILL[at[(r, c)]['status']]}" if (r, c) in at else "" for c in range(gh["cols"])]
        for r in range(gh["rows"])
    ],
    index=grid.index,
    columns=grid.columns,
)
st.markdown(f"**{gh['name']}** · {gh['rows']} × {gh['cols']} · {len(at)}/{gh['rows'] * gh['cols']} positions occupied")
st.dataframe(grid.style.apply(lambda _: fills, axis=None), row_height=72, height=min(72 * gh["rows"] + 40, 760))
st.caption(
    "Rows are benches (B), columns positions (P). Each occupied cell shows batch, species and stage; "
    "fill shade also marks the stage."
)

with st.form("cell"):
    st.markdown("**Place a batch or change a position**")
    c = st.columns(4)
    r = c[0].number_input("Bench", min_value=1, max_value=gh["rows"], step=1, value=1)
    p = c[1].number_input("Position", min_value=1, max_value=gh["cols"], step=1, value=1)
    stage = c[2].selectbox(
        "Stage", ["empty", *PLACEMENT_STATUSES], format_func=STATUS_LABEL.get, help="Choose Empty to clear the position"
    )
    with c[3]:
        batch = idx.select("Batch", "cell-batch")
    if st.form_submit_button("Save position", type="primary"):
        key = (int(r) - 1, int(p) - 1)
        others = [x for x in gh["placements"] if (x["row"], x["col"]) != key]
        if stage != "empty" and not batch:
            st.error("Select the batch on this position.")
        else:
            new = others + (
                [{"row": key[0], "col": key[1], "batchId": batch, "status": stage}] if stage != "empty" else []
            )
            if save(lambda: s.update("greenhouses", gh_id, {"placements": new}), "Position saved"):
                st.rerun()

with st.popover("Delete layout", icon=":material/delete:"):
    st.write(f"Delete **{gh['name']}**? Batches are not affected.")
    if st.button("Delete", type="primary", key="gh-del"):
        s.remove("greenhouses", gh_id)
        st.session_state.pop("gh-pick", None)
        flash(f"{gh['name']} deleted.")
        st.rerun()
