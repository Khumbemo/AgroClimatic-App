import math

import numpy as np
import pandas as pd
import streamlit as st
from scipy import stats as sps

from agroclimatic.science.anova import AnalysisError, AnovaResult, analyse
from agroclimatic.science.trial_design import DESIGN_LABELS, DESIGN_TYPES, design_problem, generate_layout, new_seed
from agroclimatic.services.ai import ai_enabled, suggest_design
from agroclimatic.ui import charts
from agroclimatic.ui.common import flash, header, save, store

s = store()
header("Experimental design", "Randomised layouts for CRD, RCBD, Latin square and split-plot trials, with ANOVA.")


def fmt_p(p):
    return "" if p is None else ("< 0.001" if p < 0.001 else f"{p:.3f}")


def stars(p):
    return "" if p is None else "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "ns"


def sig(v, d=4):
    if v is None or not math.isfinite(v):
        return float("nan")  # shown as an empty cell
    return round(v, 1) if abs(v) >= 1000 else float(f"{v:.{d}g}")


def plots_of(exp):
    """Plots in field order with a stable plot number (older layouts had none stored)."""
    return [{**a, "plotNo": a.get("plot") or i + 1} for i, a in enumerate(exp["assignments"])]


# ---------------------------------------------------------------------------
# New experiment
# ---------------------------------------------------------------------------

with st.expander("New experiment", icon=":material/add:", expanded=not s.count("experiments")):
    if ai_enabled():
        c = st.columns([4, 1], vertical_alignment="bottom")
        prompt = c[0].text_input(
            "Describe the trial (AI suggestion)", placeholder="Compare 3 substrates on Pinus seedling growth"
        )
        if c[1].button("Suggest", icon=":material/auto_awesome:") and prompt.strip():
            with st.spinner("Asking Gemini…"):
                try:
                    r = suggest_design(prompt)
                    st.session_state["exp-name"] = str(r.get("name") or "")
                    if r.get("designType") in DESIGN_TYPES:
                        st.session_state["exp-design"] = r["designType"]
                    if r.get("replicates"):
                        st.session_state["exp-reps"] = max(2, int(r["replicates"]))
                    st.session_state["exp-treatments"] = "\n".join(map(str, r.get("treatments") or []))
                    st.session_state["exp-sub"] = "\n".join(map(str, r.get("subTreatments") or []))
                    st.rerun()
                except Exception as e:
                    st.error(f"Suggestion failed: {e}")
        st.caption("Check the suggestion before creating the layout.")
    name = st.text_input("Experiment name", placeholder="Substrate × nitrogen trial 2026", key="exp-name")
    design = st.selectbox("Design", DESIGN_TYPES, format_func=DESIGN_LABELS.get, index=1, key="exp-design")
    c = st.columns(2)
    treatments_text = c[0].text_area(
        "Main-plot levels" if design == "Split_Plot" else "Treatments",
        placeholder="One per line, e.g.\nControl\nGA₃ 250 ppm\nCold stratification 30 d",
        height=150,
        key="exp-treatments",
    )
    sub_text = ""
    if design == "Split_Plot":
        sub_text = c[1].text_area(
            "Sub-plot levels", placeholder="One per line, e.g.\n0 N\n50 N\n100 N", height=150, key="exp-sub"
        )
    treatments = [t.strip() for t in treatments_text.splitlines() if t.strip()]
    subs = [t.strip() for t in sub_text.splitlines() if t.strip()]
    if design == "Latin_Square":
        st.caption(
            f"A Latin square uses as many rows and columns as treatments ({len(treatments) or 't'} × "
            f"{len(treatments) or 't'})."
        )
        reps = len(treatments)
    else:
        reps = int(
            st.number_input(
                "Replicates per treatment" if design == "CRD" else "Blocks (replicates)",
                min_value=2,
                max_value=100,
                step=1,
                value=4,
                key="exp-reps",
            )
        )
    blind = st.checkbox(
        "Blind codes",
        help="Show T1, T2 … on the field map so people recording data don't see treatment names.",
        key="exp-blind",
    )
    if st.button("Create and randomise", type="primary", icon=":material/shuffle:"):
        problem = None if name.strip() else "Enter an experiment name."
        problem = problem or design_problem(design, treatments, reps, subs if design == "Split_Plot" else ())
        if problem:
            st.error(problem)
        else:
            seed = new_seed()
            sub = subs if design == "Split_Plot" else None
            if save(
                lambda: s.add(
                    "experiments",
                    {
                        "name": name,
                        "designType": design,
                        "treatments": treatments,
                        "subTreatments": sub,
                        "replicates": reps,
                        "blocks": 1 if design == "CRD" else reps,
                        "assignments": generate_layout(design, treatments, reps, seed, sub or ()),
                        "blindMode": blind,
                        "seed": seed,
                        "layoutVersion": 2,
                    },
                ),
                "Experiment created",
            ):
                for k in ("exp-name", "exp-treatments", "exp-sub"):
                    st.session_state.pop(k, None)
                st.rerun()


# ---------------------------------------------------------------------------
# Analysis display
# ---------------------------------------------------------------------------


def show_analysis(result: AnovaResult, unit: str, label, values_in_order: list[float]) -> None:
    table = pd.DataFrame(
        [
            {
                "Source": r.source,
                "df": r.df,
                "SS": sig(r.ss),
                "MS": sig(r.ms),
                "F": sig(r.f, 3),
                "p": fmt_p(r.p),
                "": stars(r.p) if r.p is not None else "",
                "Error term": r.error_term or "",
            }
            for r in result.table
        ]
    )
    st.markdown("**Analysis of variance**")
    st.dataframe(table, hide_index=True)
    cv = " · ".join(f"{lbl} {v:.1f} %" for lbl, v in result.cv)
    st.caption(
        f"n = {result.n} · grand mean {sig(result.grand_mean, 4)} {unit} · {cv}"
        + (
            " · main plots tested against error (a), sub-plots against error (b)"
            if result.design == "Split_Plot"
            else ""
        )
        + " · *** p < 0.001, ** p < 0.01, * p < 0.05, ns not significant"
    )
    inter = next((r for r in result.table if r.source == "A × B"), None)
    if inter and inter.p is not None and inter.p < 0.05:
        st.warning(
            f"The A × B interaction is significant (p {fmt_p(inter.p)}), so the effect of one factor depends "
            "on the other. Interpret main-effect means with care.",
            icon=":material/warning:",
        )

    for comp in result.comparisons:
        st.markdown(f"**{comp.factor} means · Tukey HSD**")
        c = st.columns([3, 2])
        with c[0]:
            charts.show(
                charts.means_with_se(
                    [label(m.level) for m in comp.means],
                    [m.mean for m in comp.means],
                    [m.se for m in comp.means],
                    [m.letters for m in comp.means],
                    f"Mean{f' ({unit})' if unit else ''}",
                )
            )
        with c[1]:
            st.dataframe(
                pd.DataFrame(
                    [
                        {"Level": label(m.level), "Mean": sig(m.mean), "SE": sig(m.se, 3), "n": m.n, "Group": m.letters}
                        for m in comp.means
                    ]
                ),
                hide_index=True,
            )
        note = (
            f"Means sharing a letter are not significantly different (α = 0.05; error df {comp.error_df}). "
            "Whiskers ± 1 SE."
        )
        if comp.anova_p >= 0.05:
            note += f" The ANOVA F-test for this factor is not significant (p {fmt_p(comp.anova_p)})."
        st.caption(note)

    st.markdown("**Assumption checks (residuals)**")
    for name, test, sym, r, ok, bad in [
        (
            "Normality",
            "Shapiro–Wilk",
            "W",
            result.normality,
            "Residuals are consistent with a normal distribution",
            "Residuals depart from normality; consider a transformation (e.g. log for counts, arcsine-square-root for "
            "proportions)",
        ),
        (
            "Equal variance",
            "Brown–Forsythe",
            "F",
            result.equal_variance,
            "Group variances are similar",
            "Group variances differ; consider a transformation",
        ),
    ]:
        if r is None:
            st.markdown(f":material/remove: **{name}** — not enough data to test.")
        else:
            icon = ":material/check_circle:" if r.p >= 0.05 else ":material/warning:"
            st.markdown(
                f"{icon} **{name}** ({test} {sym} = {r.statistic:.3f}, p = {fmt_p(r.p)}): {ok if r.p >= 0.05 else bad}."
            )
    res = np.asarray(result.residuals)
    fitted = np.asarray(values_in_order) - res
    n = len(res)
    theo = sps.norm.ppf((np.arange(1, n + 1) - 0.375) / (n + 0.25))  # Blom plotting positions
    ordered = np.sort(res)
    sd = float(np.std(res, ddof=1)) if n > 1 else 0.0
    c = st.columns(2)
    with c[0]:
        st.caption("Residuals vs fitted (look for no pattern)")
        charts.show(charts.scatter(fitted, res, "Fitted value", "Residual", zero_line=True))
    with c[1]:
        st.caption("Normal Q–Q plot (points near the line = normal)")
        line = ((theo[0], theo[0] * sd), (theo[-1], theo[-1] * sd)) if n > 1 else None
        charts.show(charts.scatter(theo, ordered, "Theoretical quantile", "Residual", ref_line=line))


def export_tsv(exp, var, result: AnovaResult | None) -> str:
    unit = f" ({var['unit']})" if var.get("unit") else ""
    lines = [
        f"{exp['name']} — {var['name']}{unit}",
        "",
        "\t".join(["Plot", "Block", "Row", "Column", "Treatment", "Sub-plot", var["name"]]),
    ]
    for p in plots_of(exp):
        lines.append(
            "\t".join(
                str(x)
                for x in [
                    p["plotNo"],
                    p["block"],
                    p.get("row") or "",
                    p.get("col") or "",
                    p["treatment"],
                    p.get("subTreatment") or "",
                    var["values"].get(str(p["plotNo"]), ""),
                ]
            )
        )
    if result:
        lines += ["", "\t".join(["Source", "df", "SS", "MS", "F", "p"])]
        for r in result.table:
            lines.append("\t".join(str(x if x is not None else "") for x in [r.source, r.df, r.ss, r.ms, r.f, r.p]))
        for c in result.comparisons:
            lines += ["", f"{c.factor}\tMean\tSE\tn\tTukey group"]
            lines += ["\t".join(str(x) for x in [m.level, m.mean, m.se, m.n, m.letters]) for m in c.means]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Experiments
# ---------------------------------------------------------------------------

experiments = sorted(s.list("experiments"), key=lambda e: e["createdAt"], reverse=True)
if not experiments:
    st.info(
        "No experiments yet. Create a trial to get a randomised field map with blind treatment codes if needed.",
        icon=":material/experiment:",
    )
    st.stop()

ids = [e["id"] for e in experiments]
exp_id = st.selectbox(
    "Experiment", ids, format_func=lambda i: next(e["name"] for e in experiments if e["id"] == i), key="exp-pick"
)
exp = next(e for e in experiments if e["id"] == exp_id)
variables = sorted((v for v in s.list("trialVariables") if v["experimentId"] == exp_id), key=lambda v: v["createdAt"])
latin = exp["designType"] == "Latin_Square"
legacy = exp.get("layoutVersion") != 2

st.subheader(exp["name"], anchor=False)
tags = (
    [DESIGN_LABELS[exp["designType"]]]
    + (["blind codes"] if exp.get("blindMode") else [])
    + (["example"] if exp.get("isExample") else [])
)
st.caption(
    " · ".join(tags)
    + f" · created {exp['createdAt'][:10]}"
    + (f" · seed {exp['seed']}" if exp.get("seed") is not None else "")
)
m = st.columns(3)
m[0].metric(
    "Treatments", f"{len(exp['treatments'])}" + (f" × {len(exp['subTreatments'])}" if exp.get("subTreatments") else "")
)
m[1].metric(
    "Rows × cols" if latin else "Replicates" if exp["designType"] == "CRD" else "Blocks",
    f"{len(exp['treatments'])} × {len(exp['treatments'])}" if latin else exp["replicates"],
)
m[2].metric("Plots", len(exp["assignments"]))

reveal = st.toggle("Reveal treatment key", key=f"reveal-{exp_id}") if exp.get("blindMode") else True
code_of = {a["treatment"]: a["code"] for a in exp["assignments"]}
code_of.update({a["subTreatment"]: a["subCode"] for a in exp["assignments"] if a.get("subTreatment")})


def level_label(level: str) -> str:
    if not exp.get("blindMode"):
        return level
    return f"{level} ({code_of.get(level, '?')})" if reveal else code_of.get(level, level)


def plot_text(p) -> str:
    if exp.get("blindMode") and not reveal:
        return p["code"] + (f" · {p['subCode']}" if p.get("subCode") else "")
    return p["treatment"] + (f" · {p['subTreatment']}" if p.get("subTreatment") else "")


if legacy:
    st.warning(
        "This layout was made by an earlier version that randomised every design like an RCBD and ignored "
        "replicates. Re-randomise to get a correct layout before recording results.",
        icon=":material/warning:",
    )
    if st.button("Re-randomise", icon=":material/shuffle:"):
        if variables:
            st.error("This experiment already has recorded results; re-randomising would detach them from their plots.")
        else:
            reps = (
                len(exp["treatments"]) if latin else exp["replicates"] if exp["designType"] == "CRD" else exp["blocks"]
            )
            problem = design_problem(exp["designType"], exp["treatments"], reps, exp.get("subTreatments") or ())
            if problem:
                st.error(problem)
            else:
                seed = new_seed()
                if save(
                    lambda: s.update(
                        "experiments",
                        exp_id,
                        {
                            "seed": seed,
                            "layoutVersion": 2,
                            "replicates": reps,
                            "blocks": 1 if exp["designType"] == "CRD" else reps,
                            "assignments": generate_layout(
                                exp["designType"], exp["treatments"], reps, seed, exp.get("subTreatments") or ()
                            ),
                        },
                    ),
                    "Re-randomised",
                ):
                    st.rerun()

map_tab, results_tab = st.tabs([":material/grid_view: Field map", ":material/bar_chart: Results and analysis"])

with map_tab:
    plots = plots_of(exp)
    row_of = (lambda a: a.get("row")) if latin else (lambda a: a["block"])
    col_of = (lambda a: a.get("col")) if latin else (lambda a: a["position"])
    rows = sorted({row_of(a) for a in plots})
    ncol = max(col_of(a) for a in plots)
    grid = {(row_of(a), col_of(a)): f"#{a['plotNo']} {plot_text(a)}" for a in plots}
    prefix = "Row" if latin else ("Plots" if exp["designType"] == "CRD" else "Block")
    df = pd.DataFrame(
        [[grid.get((r, c), "") for c in range(1, ncol + 1)] for r in rows],
        index=[prefix if exp["designType"] == "CRD" else f"{prefix} {r}" for r in rows],
        columns=[f"{'Col' if latin else 'Pos'} {c}" for c in range(1, ncol + 1)],
    )
    st.dataframe(df)
    if exp.get("blindMode") and reveal:
        st.caption(
            "Key: "
            + "; ".join(f"T{i + 1} = {t}" for i, t in enumerate(exp["treatments"]))
            + (
                "; " + "; ".join(f"S{i + 1} = {t}" for i, t in enumerate(exp.get("subTreatments") or []))
                if exp.get("subTreatments")
                else ""
            )
        )
    st.download_button(
        "Download field plan (CSV)",
        pd.DataFrame(
            [
                {
                    "Plot": p["plotNo"],
                    "Block": p["block"],
                    "Row": p.get("row"),
                    "Column": p.get("col"),
                    "Position": p["position"],
                    "Code": p["code"],
                    "Treatment": p["treatment"],
                    "Sub code": p.get("subCode"),
                    "Sub-plot": p.get("subTreatment"),
                }
                for p in plots
            ]
        ).to_csv(index=False),
        file_name=f"{exp['name']}-field-plan.csv",
        mime="text/csv",
        icon=":material/download:",
    )

with results_tab:
    if legacy:
        st.info("Re-randomise this layout before recording results.")
    else:
        plots = plots_of(exp)
        where = (
            (lambda p: f"R{p['row']} C{p['col']}")
            if latin
            else ((lambda p: "") if exp["designType"] == "CRD" else (lambda p: f"B{p['block']}"))
        )
        options = ["New variable"] + [v["id"] for v in variables]
        var_names = {v["id"]: v["name"] + (f" ({v['unit']})" if v.get("unit") else "") for v in variables}
        default_index = 1 if variables else 0
        pending = st.session_state.pop("_select_var", None)  # a variable saved in the previous run
        if pending in options:
            st.session_state[f"var-{exp_id}"] = pending
        elif st.session_state.get(f"var-{exp_id}") not in options:
            st.session_state.pop(f"var-{exp_id}", None)  # its variable was deleted
        choice = st.radio(
            "Variable",
            options,
            index=default_index,
            horizontal=True,
            format_func=lambda o: "＋ New variable" if o == "New variable" else var_names[o],
            key=f"var-{exp_id}",
        )
        var = next((v for v in variables if v["id"] == choice), None)

        with st.expander(
            "Enter or edit values" if var else "Record results", expanded=var is None, icon=":material/edit:"
        ):
            c = st.columns(2)
            vname = c[0].text_input(
                "Variable", var["name"] if var else "", placeholder="Height at 90 days", key=f"vn-{exp_id}-{choice}"
            )
            vunit = c[1].text_input(
                "Unit", var.get("unit", "") if var else "", placeholder="cm", key=f"vu-{exp_id}-{choice}"
            )
            entry = pd.DataFrame(
                {
                    "Plot": [p["plotNo"] for p in plots],
                    "Where": [where(p) for p in plots],
                    "Treatment": [plot_text(p) for p in plots],
                    "Value": [var["values"].get(str(p["plotNo"])) if var else None for p in plots],
                }
            )
            edited = st.data_editor(
                entry,
                hide_index=True,
                disabled=["Plot", "Where", "Treatment"],
                column_config={"Value": st.column_config.NumberColumn(format="%.4g")},
                key=f"ve-{exp_id}-{choice}",
            )
            st.caption("Leave a value blank if the plot is missing. You can paste a column from a spreadsheet.")
            c = st.columns([1, 1, 3])
            if c[0].button("Save results", type="primary", key=f"vs-{exp_id}-{choice}"):
                values = {
                    str(int(r["Plot"])): float(r["Value"])
                    for _, r in edited.iterrows()
                    if r["Value"] is not None and not pd.isna(r["Value"])
                }
                if var:
                    ok = save(
                        lambda: s.update("trialVariables", var["id"], {"name": vname, "unit": vunit, "values": values})
                    )
                else:
                    created = {}
                    ok = save(
                        lambda: created.update(
                            s.add(
                                "trialVariables",
                                {"experimentId": exp_id, "name": vname, "unit": vunit, "values": values},
                            )
                        )
                    )
                    st.session_state["_select_var"] = created.get("id")
                if ok:
                    flash("Results saved.")
                    st.rerun()
            if var:
                with c[1].popover("Delete variable", icon=":material/delete:"):
                    st.write(f"Delete “{var['name']}” and its {len(var['values'])} values?")
                    if st.button("Delete", type="primary", key=f"vd-{var['id']}"):
                        s.remove("trialVariables", var["id"])
                        st.rerun()

        if var:
            obs = [
                {
                    "block": p["block"],
                    "row": p.get("row"),
                    "col": p.get("col"),
                    "treatment": p["treatment"],
                    "subTreatment": p.get("subTreatment"),
                    "value": var["values"][str(p["plotNo"])],
                }
                for p in plots
                if str(p["plotNo"]) in var["values"]
            ]
            st.caption(f"{len(var['values'])}/{len(plots)} plots recorded")
            if exp.get("blindMode") and not reveal:
                st.caption("Blind trial: results use treatment codes. Turn on “Reveal treatment key” to show names.")
            result = None
            try:
                result = analyse(exp["designType"], obs)
            except AnalysisError as e:
                st.info(str(e), icon=":material/info:")
            if result:
                show_analysis(result, var.get("unit", ""), level_label, [o["value"] for o in obs])
            st.download_button(
                "Download data and ANOVA (TSV)",
                export_tsv(exp, var, result),
                file_name=f"{exp['name']}-{var['name']}.tsv",
                mime="text/tab-separated-values",
                icon=":material/download:",
            )

st.divider()
with st.popover("Delete experiment", icon=":material/delete:"):
    st.write(
        f"Delete **{exp['name']}**, its layout"
        + (f" and {len(variables)} recorded variable{'s' if len(variables) > 1 else ''}" if variables else "")
        + "?"
    )
    if st.button("Delete", type="primary", key=f"del-{exp_id}"):
        for v in variables:  # results belong to the layout, so they are removed with it
            s.remove("trialVariables", v["id"])
        s.remove("experiments", exp_id)
        st.session_state.pop("exp-pick", None)
        flash(f"{exp['name']} deleted.")
        st.rerun()
