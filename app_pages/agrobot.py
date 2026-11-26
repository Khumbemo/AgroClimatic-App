import streamlit as st

from agroclimatic.services.ai import ai_enabled, generate_text, model
from agroclimatic.services.nursery_context import Snapshot, build_context, offline_answer
from agroclimatic.ui.common import header, store

SYSTEM = """You are AgroBot, a research assistant for forest nurseries: seed science, silviculture, greenhouse climate and experimental design.
- Use the NURSERY RECORDS block for anything about this nursery. If a fact is not there, say it is not in the records; never invent batch numbers, counts or measurements.
- For general science, give established knowledge and name the method or source type (e.g. ISTA rules, Tetens equation).
- Decline questions unrelated to forestry, agronomy, ecology or nursery practice.
- Be concise. Write binomial names in italics (*Genus species*) and give units."""
STARTERS = [
    "Report on batch NB-2024-001",
    "Seed lot SL-001",
    "What VPD suits seedlings?",
    "Explain mean germination time",
    "Explain RCBD for nursery trials",
]

live = ai_enabled()
header(
    "AgroBot",
    f"Research assistant grounded in your records · Google Gemini ({model()})"
    if live
    else "Offline mode: answers come from your records and a small built-in reference. Add GEMINI_API_KEY for open questions.",
)

messages: list[dict] = st.session_state.setdefault("chat", [])
for m in messages:
    with st.chat_message(m["role"], avatar=":material/smart_toy:" if m["role"] == "assistant" else None):
        # Markdown is rendered without HTML, so model or record text cannot inject markup.
        st.markdown(m["content"])


def ask(q: str) -> None:
    st.session_state["_starter"] = q


# The chat box is pinned to the bottom wherever it is called; reading it (and any clicked
# suggestion, set by its callback before this run) first lets the suggestions disappear as soon
# as a question is asked.
prompt = st.chat_input("Ask about your batches, seed lots or nursery science")
question = prompt or st.session_state.pop("_starter", None)
if not messages and not question:
    st.caption("Try one of these:")
    with st.container(horizontal=True, gap="small"):  # wraps on narrow screens
        for i, q in enumerate(STARTERS):
            st.button(q, key=f"starter-{i}", on_click=ask, args=(q,))

if question:
    messages.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)
    snapshot = Snapshot.from_store(store())
    with st.chat_message("assistant", avatar=":material/smart_toy:"):
        if not live:
            reply = offline_answer(question, snapshot)
        else:
            history = "\n".join(
                f"{'User' if m['role'] == 'user' else 'Assistant'}: {m['content']}" for m in messages[-7:-1]
            )
            with st.spinner("Thinking…"):
                try:
                    reply = generate_text(
                        f"{build_context(snapshot)}\n\n"
                        + (f"CONVERSATION SO FAR\n{history}\n\n" if history else "")
                        + f"QUESTION: {question}",
                        system=SYSTEM,
                    )
                except Exception as e:  # network or API error
                    reply = f"Could not reach the model: {e}"
        st.markdown(reply)
    messages.append({"role": "assistant", "content": reply})

if messages and st.button("Clear conversation", icon=":material/delete_sweep:"):
    st.session_state["chat"] = []
    st.rerun()
