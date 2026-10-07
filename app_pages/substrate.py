import pandas as pd
import streamlit as st

from agroclimatic.science.calculations import leaching_fraction
from agroclimatic.ui import charts
from agroclimatic.ui.common import BatchIndex, by_date_desc, fmt, header, iso, num, record_table, save, store, today

s = store()
idx = BatchIndex(s)
header("Substrate & nutrients", "Leachate (pour-through) tests and substrate mix recipes.")
tests = by_date_desc(s.list("leachateTests"))
mixes = sorted(s.list("substrateMixes"), key=lambda m: m["name"])


def lf(t):
    return (
        leaching_fraction(t["volumeMl"], t["appliedMl"])
        if t.get("volumeMl") is not None and t.get("appliedMl")
        else None
    )


leach_tab, mix_tab = st.tabs([":material/science: Leachate tests", ":material/layers: Substrate mixes"])

with leach_tab:
    if tests:
        t = tests[0]
        c = st.columns(4)
        c[0].metric("EC out", fmt(t.get("ecOut"), 2, "mS cm⁻¹"), help=t["date"])
        c[1].metric(
            "ΔEC (out − in)",
            fmt(t["ecOut"] - t["ecIn"], 2, "mS cm⁻¹") if t.get("ecOut") is not None else "—",
            help="A rising ΔEC suggests salt build-up in the substrate",
        )
        c[2].metric("pH out", fmt(t.get("phOut"), 2))
        c[3].metric("Leaching fraction", fmt(lf(t), 2), help="Drainage volume / applied volume")
    series = list(reversed(tests))[-40:]
    if len(series) >= 2:
        dates = [t["date"] for t in series]
        c = st.columns(2)
        with c[0]:
            st.markdown("**Electrical conductivity**")
            charts.show(
                charts.lines(
                    dates,
                    {"EC in": [t["ecIn"] for t in series], "EC out": [t.get("ecOut") for t in series]},
                    "EC (mS cm⁻¹)",
                    height=260,
                )
            )
        with c[1]:
            st.markdown("**pH**")
            fig = charts.lines(
                dates,
                {"pH in": [t["phIn"] for t in series], "pH out": [t.get("phOut") for t in series]},
                "pH",
                height=260,
            )
            fig.update_yaxes(rangemode="normal")
            charts.show(fig)
    with st.expander("New leachate test", icon=":material/add:", expanded=not tests):
        with st.form("leach", clear_on_submit=True):
            c = st.columns(2)
            d = c[0].date_input("Date", today(), format="YYYY-MM-DD")
            with c[1]:
                batch = idx.select("Batch", "leach-batch")
            st.markdown("**Irrigation water (in)**")
            c = st.columns(3)
            ph_in = c[0].number_input("pH in", min_value=0.0, max_value=14.0, step=0.01, value=None, placeholder="6.5")
            ec_in = c[1].number_input("EC in (mS cm⁻¹)", min_value=0.0, step=0.01, value=None, placeholder="1.2")
            applied = c[2].number_input("Volume applied (mL)", min_value=0.0, step=1.0, value=None)
            st.markdown("**Leachate (out)**")
            c = st.columns(3)
            ph_out = c[0].number_input(
                "pH out", min_value=0.0, max_value=14.0, step=0.01, value=None, placeholder="5.8"
            )
            ec_out = c[1].number_input("EC out (mS cm⁻¹)", min_value=0.0, step=0.01, value=None, placeholder="2.4")
            vol = c[2].number_input("Volume collected (mL)", min_value=0.0, step=1.0, value=None)
            if st.form_submit_button("Save test", type="primary"):
                if not batch:
                    st.error("Select the batch that was tested.")
                elif ph_in is None or ec_in is None:
                    st.error("Enter the pH and EC of the irrigation water.")
                elif save(
                    lambda: s.add(
                        "leachateTests",
                        {
                            "date": iso(d),
                            "batchId": batch,
                            "phIn": ph_in,
                            "ecIn": ec_in,
                            "phOut": num(ph_out),
                            "ecOut": num(ec_out),
                            "volumeMl": num(vol),
                            "appliedMl": num(applied) or None,
                        },
                    ),
                    "Test saved",
                ):
                    st.rerun()
    record_table(
        tests,
        {
            "Date": "date",
            "Batch": lambda t: idx.label(t.get("batchId"), t.get("legacyBatchLabel")),
            "pH in": "phIn",
            "pH out": "phOut",
            "EC in": "ecIn",
            "EC out": "ecOut",
            "ΔEC": lambda t: round(t["ecOut"] - t["ecIn"], 2) if t.get("ecOut") is not None else None,
            "Leachate (mL)": "volumeMl",
            "Applied (mL)": "appliedMl",
            "LF": lambda t: round(v, 2) if (v := lf(t)) is not None else None,
        },
        "leachateTests",
        "leach",
        empty="No leachate tests yet. Record irrigation-water and leachate pH and EC to track "
        "salt build-up and root-zone pH.",
    )

with mix_tab:
    record_table(
        mixes,
        {
            "Mix": "name",
            "Components (by volume)": lambda m: " · ".join(f"{c['name']} {c['pct']:g} %" for c in m["components"]),
            "CEC (cmol(+) kg⁻¹)": "cec",
        },
        "substrateMixes",
        "mixes",
        empty="No substrate mixes yet. Save mix recipes by volume share so batches can refer to them.",
    )
    with st.expander("New substrate mix", icon=":material/add:", expanded=not mixes):
        name = st.text_input("Mix name", placeholder="Standard conifer mix", key="mix-name")
        st.caption("Components by volume — edit the table; add or remove rows as needed.")
        comps = st.data_editor(
            pd.DataFrame({"Component": ["Peat", "Coco coir", "Perlite"], "Share (%)": [30.0, 50.0, 20.0]}),
            num_rows="dynamic",
            hide_index=True,
            key="mix-components",
            column_config={"Share (%)": st.column_config.NumberColumn(min_value=0.0, max_value=100.0, step=1.0)},
        )
        comps = comps.dropna(how="all")
        total = float(comps["Share (%)"].fillna(0).sum())
        (st.success if abs(total - 100) < 0.5 else st.warning)(f"Total {total:g} % of 100 %")
        cec = st.number_input(
            "Cation exchange capacity (cmol(+) kg⁻¹)", min_value=0.0, step=0.1, value=None, key="mix-cec"
        )
        if st.button("Save mix", type="primary"):
            components = [
                {"name": str(r["Component"] or ""), "pct": float(r["Share (%)"] or 0)} for _, r in comps.iterrows()
            ]
            if save(
                lambda: s.add("substrateMixes", {"name": name, "components": components, "cec": num(cec)}), "Mix saved"
            ):
                for k in ("mix-name", "mix-components", "mix-cec"):
                    st.session_state.pop(k, None)
                st.rerun()
