"""Signed sign-in tokens for the optional shared password."""

from agroclimatic.ui.auth import make_token, token_valid

NOW = 1_800_000_000.0


def test_a_fresh_token_is_valid_for_thirty_days():
    t = make_token("correct horse", now=NOW)
    assert token_valid("correct horse", t, now=NOW)
    assert token_valid("correct horse", t, now=NOW + 29 * 86_400)
    assert not token_valid("correct horse", t, now=NOW + 31 * 86_400)


def test_tokens_cannot_be_forged_or_reused_after_a_password_change():
    t = make_token("correct horse", now=NOW)
    expires, sig = t.split(".")
    assert not token_valid("new password", t, now=NOW)  # changing the password signs everyone out
    assert not token_valid("correct horse", f"{int(expires) + 10**6}.{sig}", now=NOW)  # extended expiry
    assert not token_valid("correct horse", f"{expires}.{'0' * len(sig)}", now=NOW)
    for junk in (None, "", "abc", "123", ".", "x.y"):
        assert not token_valid("correct horse", junk, now=NOW)


def test_the_token_does_not_contain_the_password():
    assert "horse" not in make_token("correct horse", now=NOW)
