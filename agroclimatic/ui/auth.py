"""Optional shared password (APP_PASSWORD in env or Streamlit secrets) for hosted deployments."""

from __future__ import annotations

import hmac
import os

import streamlit as st


def _password() -> str | None:
    value = os.environ.get("APP_PASSWORD")
    if value:
        return value
    try:
        return st.secrets.get("APP_PASSWORD")
    except Exception:
        return None


def require_password() -> None:
    expected = _password()
    if not expected or st.session_state.get("_authenticated"):
        return
    st.title(":material/potted_plant: AgroClimatic")
    with st.form("login"):
        entered = st.text_input("Password", type="password")
        ok = st.form_submit_button("Sign in", type="primary")
    if ok:
        if hmac.compare_digest(entered.encode(), expected.encode()):
            st.session_state["_authenticated"] = True
            st.rerun()
        st.error("Incorrect password.")
    st.stop()
