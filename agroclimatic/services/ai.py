"""
Gemini access through the public REST API.

`gemini-flash-latest` is Google's alias for the current Flash model, so the app keeps working
when a numbered model is retired. Configure with GEMINI_API_KEY (and optionally GEMINI_MODEL)
as an environment variable or in .streamlit/secrets.toml. The key stays on the server.
"""

from __future__ import annotations

import json
import os

import requests

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _setting(name: str) -> str | None:
    value = os.environ.get(name)
    if value:
        return value
    try:
        import streamlit as st

        return st.secrets.get(name)  # type: ignore[no-any-return]
    except Exception:  # no secrets file, or not running under Streamlit
        return None


def api_key() -> str | None:
    key = _setting("GEMINI_API_KEY")
    return key if key and key != "your_api_key" else None


def model() -> str:
    return _setting("GEMINI_MODEL") or "gemini-flash-latest"


def ai_enabled() -> bool:
    return api_key() is not None


class AiUnavailable(RuntimeError):
    def __init__(self):
        super().__init__("AI features need a Gemini API key (GEMINI_API_KEY).")


def generate_text(prompt: str, system: str | None = None, as_json: bool = False, timeout: float = 60) -> str:
    """One-shot generation. Raises AiUnavailable without a key and RuntimeError on API failure."""
    key = api_key()
    if not key:
        raise AiUnavailable()
    body: dict = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    if as_json:
        body["generationConfig"] = {"responseMimeType": "application/json"}
    try:
        res = requests.post(
            API_URL.format(model=requests.utils.quote(model(), safe="")),
            json=body,
            headers={"x-goog-api-key": key},
            timeout=timeout,
        )
    except requests.RequestException as e:
        raise RuntimeError(f"Could not reach Gemini: {e}") from None
    try:
        data = res.json()
    except ValueError:
        data = None
    if not res.ok:
        message = (data or {}).get("error", {}).get("message") if isinstance(data, dict) else None
        raise RuntimeError(message or f"Gemini request failed (HTTP {res.status_code})")
    try:
        text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"])
    except (KeyError, IndexError, TypeError):
        text = ""
    if not text:
        raise RuntimeError("The model returned no text.")
    return text


def suggest_design(request: str) -> dict:
    text = generate_text(
        f'Suggest a nursery experiment for this request: "{request}".\n'
        'Return JSON: {"name": string, "designType": "CRD" | "RCBD" | "Latin_Square" | "Split_Plot", '
        '"replicates": number, "treatments": string[], "subTreatments": string[]}.\n'
        "Use subTreatments only for Split_Plot (sub-plot factor levels). For Latin_Square, replicates equals the "
        "number of treatments.",
        system="You are an experimental-design specialist for forest nursery trials. Be conservative and practical.",
        as_json=True,
    )
    data = json.loads(text)
    if not isinstance(data, dict):
        raise RuntimeError("The model did not return a design.")
    return data


def interpret(summary: str) -> str:
    return generate_text(
        "Interpret this nursery data in one short paragraph. State what the numbers show, one practical next step, "
        f"and any caveat about sample size: {summary}",
        system="You are a seed and nursery scientist. Do not invent data that is not in the summary.",
    )
