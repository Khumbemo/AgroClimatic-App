"""
Optional shared password (APP_PASSWORD in env or Streamlit secrets) for hosted deployments.

After a correct password the browser keeps a signed sign-in cookie for 30 days, so reloading a
page or opening a link does not ask again. The cookie holds only an expiry time and an
HMAC-SHA256 signature keyed with the password: it reveals nothing about the password, cannot be
forged without it, and changing APP_PASSWORD signs everyone out.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import time

import streamlit as st

COOKIE = "agroclimatic_auth"
DAYS = 30


def _password() -> str | None:
    value = os.environ.get("APP_PASSWORD")
    if value:
        return value
    try:
        return st.secrets.get("APP_PASSWORD")
    except Exception:
        return None


def password_enabled() -> bool:
    return bool(_password())


def _signature(password: str, expires: int) -> str:
    return hmac.new(password.encode(), f"agroclimatic-sign-in:{expires}".encode(), hashlib.sha256).hexdigest()


def make_token(password: str, now: float | None = None, days: int = DAYS) -> str:
    """Sign-in token "expiry.signature" valid for `days`."""
    expires = int((now if now is not None else time.time()) + days * 86_400)
    return f"{expires}.{_signature(password, expires)}"


def token_valid(password: str, token: str | None, now: float | None = None) -> bool:
    """True for an unexpired token signed with this password."""
    try:
        expires_text, sig = (token or "").split(".", 1)
        expires = int(expires_text)
    except ValueError:
        return False
    if expires < (now if now is not None else time.time()):
        return False
    return hmac.compare_digest(sig, _signature(password, expires))


def _write_cookie(value: str, max_age: int) -> None:
    # Runs in the page: SameSite=Strict, Secure on HTTPS; max_age 0 deletes the cookie.
    st.html(
        f"""<script>
document.cookie = {json.dumps(COOKIE)} + "=" + {json.dumps(value)} + "; Max-Age={max_age}; Path=/; SameSite=Strict"
  + (location.protocol === "https:" ? "; Secure" : "");
</script>""",
        unsafe_allow_javascript=True,
    )


def require_password() -> None:
    expected = _password()
    if not expected:
        return
    if st.session_state.get("_authenticated"):
        token = st.session_state.pop("_set_cookie", None)
        if token:  # just signed in: remember it in this browser
            _write_cookie(token, DAYS * 86_400)
        return
    signed_out = st.session_state.get("_signed_out", False)
    if not signed_out and token_valid(expected, st.context.cookies.get(COOKIE)):
        st.session_state["_authenticated"] = True
        return
    if signed_out:
        _write_cookie("", 0)
    st.title(":material/potted_plant: AgroClimatic")
    with st.form("login"):
        entered = st.text_input("Password", type="password")
        ok = st.form_submit_button("Sign in", type="primary")
    if ok:
        if hmac.compare_digest(entered.encode(), expected.encode()):
            st.session_state.update(_authenticated=True, _signed_out=False, _set_cookie=make_token(expected))
            st.rerun()
        st.error("Incorrect password.")
    st.stop()


def sign_out() -> None:
    """Forget the sign-in in this session and browser."""
    st.session_state.update(_authenticated=False, _signed_out=True)
    st.rerun()
