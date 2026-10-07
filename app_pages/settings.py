import json
from datetime import date

import streamlit as st

from agroclimatic import __version__
from agroclimatic.data.backup import export_backup, restore_backup
from agroclimatic.data.schema import COLLECTIONS
from agroclimatic.data.seed import load_examples, remove_examples
from agroclimatic.services.ai import ai_enabled, model
from agroclimatic.ui.common import flash, header, store

s = store()
header("Settings")

st.subheader("Data", anchor=False)
st.write(
    f"Records are stored in a SQLite database on the server running this app (`{s.path}`). "
    "Keep regular backups; on hosts with temporary disks (such as Streamlit Community Cloud) the database is reset "
    "when the app restarts."
)
counts = {c: s.count(c) for c in COLLECTIONS}
st.caption(f"{sum(counts.values())} records in {sum(1 for n in counts.values() if n)} collections.")

c = st.columns(2)
with c[0]:
    st.download_button(
        "Download backup (JSON)",
        json.dumps(export_backup(s), ensure_ascii=False, indent=2),
        file_name=f"agroclimatic-backup-{date.today().isoformat()}.json",
        mime="application/json",
        icon=":material/download:",
        type="primary",
    )
with c[1]:
    upload = st.file_uploader(
        "Restore from a backup file",
        type=["json"],
        help="Adds or updates records by id; records not in the file are kept. Backups from the "
        "earlier web/Android version of AgroClimatic are accepted.",
    )
if upload is not None and st.button("Restore this file", icon=":material/upload:"):
    try:
        report = restore_backup(s, json.loads(upload.getvalue().decode("utf-8")))
    except json.JSONDecodeError:
        st.error("That file is not valid JSON.")
    except ValueError as e:
        st.error(str(e))
    else:
        msg = f"Restored {report.restored} record{'s' if report.restored != 1 else ''}."
        if report.skipped:
            col, rid, reason = report.skipped[0]
            msg += f" {len(report.skipped)} skipped because of invalid values (first: {col} {rid}: {reason})."
        flash(msg)
        st.rerun()

st.subheader("Example records", anchor=False)
n_examples = sum(1 for col in COLLECTIONS for r in s.list(col) if r.get("isExample"))
if n_examples:
    st.write(f"{n_examples} example records are included so every tool can be explored.")
    with st.popover("Remove example records", icon=":material/delete:"):
        st.write("Delete every record marked as an example? Your own records are kept.")
        if st.button("Remove", type="primary"):
            flash(f"Removed {remove_examples(s)} example records.")
            st.rerun()
else:
    st.write("No example records.")
    if st.button("Load example records", help="Adds examples only to collections that are empty."):
        load_examples(s)
        flash("Example records loaded.")
        st.rerun()

st.subheader("AgroBot", anchor=False)
st.write(
    f"Connected to Google Gemini (`{model()}`). Questions include a summary of your records."
    if ai_enabled()
    else "Offline: answers come from your records and a small built-in reference. Set GEMINI_API_KEY (environment "
    "variable or `.streamlit/secrets.toml`) to enable open questions."
)

st.subheader("Appearance", anchor=False)
st.write("Light and dark themes: open the ⋮ menu (top right) → Settings → Theme.")

st.subheader("About", anchor=False)
st.caption(f"AgroClimatic {__version__} · Python / Streamlit · units: SI (°C, kPa, mS cm⁻¹, mm, cm, g).")
