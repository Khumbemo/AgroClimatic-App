"""Shared Streamlit helpers: the store, batch pickers, forms, record tables and number formatting."""

from __future__ import annotations

import os
from collections.abc import Callable, Iterable, Sequence
from datetime import date

import pandas as pd
import streamlit as st

from ..data.schema import RecordInvalid
from ..data.seed import seed_once
from ..data.store import DEFAULT_PATH, Store

# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------


@st.cache_resource(show_spinner=False)
def _open_store(path: str) -> Store:
    store = Store(path)
    seed_once(store, examples=os.environ.get("AGROCLIMATIC_EXAMPLES", "1") != "0")
    return store


def store() -> Store:
    return _open_store(str(DEFAULT_PATH))


# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------


def fmt(v, digits: int = 1, unit: str = "", dash: str = "—") -> str:
    """Number with fixed decimals and an optional unit; dash for missing values."""
    if v is None or (isinstance(v, float) and v != v):
        return dash
    if isinstance(v, (int, float)):
        text = f"{v:,.{digits}f}" if isinstance(v, float) or digits else f"{v:,}"
        return f"{text} {unit}".rstrip() if unit else text
    return str(v)


def today() -> date:
    return date.today()


def iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def parse_date(s: str | None) -> date | None:
    try:
        return date.fromisoformat(s) if s else None
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Batches
# ---------------------------------------------------------------------------


class BatchIndex:
    """Batch and species lookups for labels and pickers."""

    def __init__(self, s: Store):
        self.batches = s.list("batches")
        self.by_id = {b["id"]: b for b in self.batches}
        self.species = {sp["id"]: sp for sp in s.list("species")}

    def species_name(self, species_id: str | None) -> str | None:
        sp = self.species.get(species_id) if species_id else None
        return sp["botanicalName"] if sp else None

    def label(self, batch_id: str | None, legacy: str | None = None, whole: str = "Whole nursery") -> str:
        if batch_id and batch_id in self.by_id:
            b = self.by_id[batch_id]
            sp = self.species_name(b.get("speciesId"))
            return f"{b['batchNumber']} · {sp}" if sp else b["batchNumber"]
        if batch_id:
            return "Deleted batch"
        return legacy or whole

    def select(
        self, label: str, key: str, value: str | None = None, allow_whole: bool = False, required: bool = False
    ) -> str | None:
        """Selectbox of batches (newest number first); returns the batch id or None."""
        ordered = sorted(self.batches, key=lambda b: b["batchNumber"], reverse=True)
        options: list[str | None] = ([] if required and not allow_whole else [None]) + [b["id"] for b in ordered]
        none_label = "Whole nursery" if allow_whole else "Select a batch"
        index = options.index(value) if value in options else 0

        def name(bid):
            if bid is None:
                return none_label
            suffix = " (needs review)" if self.by_id[bid].get("needsReview") else ""
            return self.label(bid) + suffix

        return st.selectbox(label, options, index=index, format_func=name, key=key)


def seed_lot_select(s: Store, label: str, key: str, value: str | None = None) -> str | None:
    lots = sorted(s.list("seedLots"), key=lambda x: x["lotNumber"])
    idx = BatchIndex(s)
    options: list[str | None] = [None] + [x["id"] for x in lots]
    names = {
        x["id"]: x["lotNumber"] + (f" · {idx.species_name(x.get('speciesId'))}" if x.get("speciesId") else "")
        for x in lots
    }
    return st.selectbox(
        label,
        options,
        index=options.index(value) if value in options else 0,
        format_func=lambda v: "Not linked" if v is None else names[v],
        key=key,
    )


def species_select(s: Store, label: str, key: str, value: str | None = None) -> str | None:
    species = sorted(s.list("species"), key=lambda x: x["botanicalName"])
    options: list[str | None] = [None] + [x["id"] for x in species]
    names = {x["id"]: x["botanicalName"] for x in species}
    return st.selectbox(
        label,
        options,
        index=options.index(value) if value in options else 0,
        format_func=lambda v: "Not set" if v is None else names[v],
        key=key,
    )


# ---------------------------------------------------------------------------
# Saving and record tables
# ---------------------------------------------------------------------------


def save(action: Callable[[], object], success: str = "Saved") -> bool:
    """Run a store write; show field errors on validation failure. Returns True on success."""
    try:
        action()
    except RecordInvalid as e:
        lines = "\n".join(f"- **{field or 'Record'}**: {msg}" for field, msg in e.issues)
        st.error(f"Not saved. Please correct:\n{lines}")
        return False
    except (ValueError, KeyError) as e:
        st.error(f"Not saved: {e}")
        return False
    st.toast(success, icon=":material/check_circle:")
    return True


def flash(message: str) -> None:
    """Show a message after the next rerun (st.rerun clears normal output)."""
    st.session_state["_flash"] = message


def show_flash() -> None:
    msg = st.session_state.pop("_flash", None)
    if msg:
        st.success(msg, icon=":material/check_circle:")


def record_table(
    rows: Sequence[dict],
    columns: dict[str, str | tuple],
    collection: str,
    key: str,
    empty: str = "No records yet.",
    on_delete: Callable[[str], None] | None = None,
    height: int | str = "auto",
) -> None:
    """
    Records as a sortable table (with CSV download in its toolbar). Select rows to delete them.
    `columns` maps a table heading to a field name or to (callable(row) -> value).
    """
    if not rows:
        st.info(empty, icon=":material/info:")
        return
    data = []
    for r in rows:
        line = {}
        for heading, src in columns.items():
            line[heading] = src(r) if callable(src) else r.get(src)
        if any(x.get("isExample") for x in rows):
            line["Example"] = "yes" if r.get("isExample") else ""
        data.append(line)
    df = pd.DataFrame(data)
    for col in df.columns:  # blank instead of "None" in text columns; numeric gaps stay empty (NaN)
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna("")
    event = st.dataframe(
        df, hide_index=True, on_select="rerun", selection_mode="multi-row", key=f"{key}-table", height=height
    )
    selected = [rows[i]["id"] for i in event.selection.rows] if event and event.selection else []
    if selected:
        c1, c2 = st.columns([3, 1], vertical_alignment="center")
        c1.warning(
            f"Delete {len(selected)} selected record{'s' if len(selected) > 1 else ''}? This can't be undone.",
            icon=":material/delete:",
        )
        if c2.button("Delete", type="primary", key=f"{key}-delete"):
            s = store()
            for rid in selected:
                (on_delete or (lambda i: s.remove(collection, i)))(rid)
            flash(f"Deleted {len(selected)} record{'s' if len(selected) > 1 else ''}.")
            st.rerun()
    else:
        st.caption("Select rows to delete them. Use the table toolbar to search or download CSV.")


def by_date_desc(rows: Iterable[dict], field: str = "date") -> list[dict]:
    return sorted(rows, key=lambda r: (r.get(field) or "", r.get("createdAt", "")), reverse=True)


def header(title: str, subtitle: str | None = None) -> None:
    st.title(title)
    if subtitle:
        st.caption(subtitle)
    show_flash()


def example_note(rows: Iterable[dict]) -> None:
    if any(r.get("isExample") for r in rows):
        st.caption(
            ":material/science: Some records are examples included with the app. "
            "Remove them all in Settings when you start real recording."
        )


def num(v):
    """number_input value → float or None."""
    return None if v is None else float(v)


def whole(v):
    return None if v is None else int(v)
