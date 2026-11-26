import pandas as pd
import streamlit as st

from agroclimatic.data.schema import RecordInvalid
from agroclimatic.science import vegetation as veg
from agroclimatic.science.sampling import METHODS, QUADRAT_METHODS, LayoutError, build_layout, doubling_sizes
from agroclimatic.science.trial_design import new_seed
from agroclimatic.ui import charts
from agroclimatic.ui.common import (
    example_note,
    flash,
    fmt,
    header,
    iso,
    observations_from_table,
    row,
    save,
    store,
    today,
)

s = store()
header("Field surveys", "Reproducible sampling layouts for vegetation surveys, with field data entry and analysis.")

# ---------------------------------------------------------------------------
# New survey
# ---------------------------------------------------------------------------

method_keys = list(METHODS)
if st.session_state.get("survey-method") not in method_keys:
    st.session_state["survey-method"] = "random_quadrats"
opened_from_guide = st.session_state.pop("survey-open", False)

with st.expander("New survey", icon=":material/add:", expanded=opened_from_guide or not s.count("surveys")):
    st.page_link(
        "app_pages/method_guide.py", label="Not sure which method? Open the method guide", icon=":material/help:"
    )
    method = st.selectbox("Sampling method", method_keys, format_func=METHODS.get, key="survey-method")
    c = row(3)
    name = c[0].text_input("Survey name", placeholder="Compartment 12 tree survey", key="sv-name")
    site = c[1].text_input("Site", placeholder="Location, forest division", key="sv-site")
    when = c[2].date_input("Date", today(), format="YYYY-MM-DD", key="sv-date")
    c = row(2)
    width = c[0].number_input("Site width (m)", min_value=1.0, value=100.0, step=10.0, key="sv-w")
    length = c[1].number_input(
        "Site length (m)",
        min_value=1.0,
        value=100.0,
        step=10.0,
        key="sv-l",
        help="Strata and transects run along the length (e.g. up the slope).",
    )
    p: dict = {}
    c = row(3)
    if method in QUADRAT_METHODS:
        p["size"] = c[0].number_input(
            "Quadrat side (m)",
            min_value=0.1,
            value=10.0,
            step=0.5,
            help="Common sizes: 1 m herbs, 5 m shrubs, 10–20 m trees.",
        )
    if method == "random_quadrats":
        p["n"] = c[1].number_input("Number of quadrats", min_value=2, max_value=500, value=10)
    elif method == "systematic_quadrats":
        p["spacing"] = c[1].number_input("Grid spacing (m)", min_value=0.1, value=25.0, step=5.0)
    elif method == "stratified_quadrats":
        p["strata"] = c[1].number_input("Strata (bands along the length)", min_value=2, max_value=20, value=3)
        p["per_stratum"] = c[2].number_input("Quadrats per stratum", min_value=2, max_value=200, value=4)
    elif method == "belt_transect":
        p["transects"] = c[1].number_input("Transects", min_value=1, max_value=50, value=2)
    elif method == "nested_quadrats":
        p["smallest"] = c[0].number_input("Smallest quadrat side (m)", min_value=0.1, value=0.5, step=0.1)
        p["count"] = c[1].number_input("Sizes (each doubles the area)", min_value=3, max_value=12, value=7)
        p["locations"] = c[2].number_input("Locations", min_value=1, max_value=50, value=3)
        st.caption("Quadrat sides: " + ", ".join(f"{x:g} m" for x in doubling_sizes(p["smallest"], int(p["count"]))))
    elif method == "pcq":
        p["transects"] = c[0].number_input("Transects", min_value=1, max_value=50, value=2)
        p["interval"] = c[1].number_input(
            "Distance between points (m)",
            min_value=1.0,
            value=25.0,
            step=5.0,
            help="Larger than the usual nearest-tree distance, so no tree is measured twice.",
        )
    elif method in ("line_intercept", "point_intercept"):
        p["transects"] = c[0].number_input("Transect lines", min_value=1, max_value=50, value=4)
        if method == "point_intercept":
            p["points"] = c[1].number_input("Points read per line", min_value=10, max_value=1000, value=50)
    seed = st.number_input(
        "Random seed",
        min_value=0,
        max_value=2**31 - 1,
        value=st.session_state.setdefault("sv-seed", new_seed()),
        help="The same seed and settings always give the same layout.",
    )
    if st.button("Create layout", type="primary", icon=":material/shuffle:"):
        params = {k: float(v) for k, v in p.items()}
        try:
            units = build_layout(method, width, length, params, int(seed))
        except LayoutError as e:
            st.error(str(e))
        else:
            created = {}
            if save(
                lambda: created.update(
                    s.add(
                        "surveys",
                        {
                            "name": name,
                            "method": method,
                            "site": site,
                            "date": iso(when),
                            "widthM": width,
                            "lengthM": length,
                            "params": params,
                            "seed": int(seed),
                            "units": units,
                            "observations": [],
                        },
                    )
                ),
                "Survey created",
            ):
                st.session_state["survey-pick"] = created["id"]
                for k in ("sv-name", "sv-site", "sv-seed"):
                    st.session_state.pop(k, None)
                st.rerun()

surveys = sorted(s.list("surveys"), key=lambda x: x["createdAt"], reverse=True)
if not surveys:
    st.info("No surveys yet. Create one above.", icon=":material/info:")
    st.stop()

ids = [x["id"] for x in surveys]
if st.session_state.get("survey-pick") not in ids:
    st.session_state["survey-pick"] = ids[0]
sid = st.selectbox(
    "Survey", ids, format_func=lambda i: next(x["name"] for x in surveys if x["id"] == i), key="survey-pick"
)
sv = next(x for x in surveys if x["id"] == sid)
m = sv["method"]
units = sv["units"]
st.subheader(sv["name"], anchor=False)
st.caption(
    " · ".join(
        x
        for x in [
            METHODS[m],
            sv.get("site"),
            sv.get("date"),
            f"{sv['widthM']:g} × {sv['lengthM']:g} m site",
            f"seed {sv['seed']}",
        ]
        if x
    )
)
example_note([sv])

layout_tab, data_tab, analysis_tab = st.tabs(
    [":material/map: Layout", ":material/edit_note: Field data", ":material/bar_chart: Analysis"]
)

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------

with layout_tab:
    charts.show(charts.site_map(units, sv["widthM"], sv["lengthM"]), key=f"map-{sid}")
    kinds = {u["kind"] for u in units}
    st.caption(
        f"{len(units)} sampling {'units' if len(kinds) > 1 else next(iter(kinds)) + 's'}. Coordinates are metres "
        "from the site's south-west corner; quadrat coordinates are its south-west corner."
    )
    table = pd.DataFrame(
        [
            {
                "Unit": u["id"],
                "x (m)": u["x"],
                "y (m)": u["y"],
                **({"Side (m)": u["w"]} if u["kind"] == "quadrat" else {}),
                **({"Length (m)": u["h"]} if u["kind"] == "line" else {}),
                **({k.title(): u[k] for k in ("stratum", "transect", "location") if k in u}),
            }
            for u in units
        ]
    )
    st.dataframe(table, hide_index=True, placeholder="")
    st.download_button(
        "Download field sheet (CSV)",
        table.to_csv(index=False),
        file_name=f"{sv['name']}-layout.csv",
        mime="text/csv",
        icon=":material/download:",
    )

# ---------------------------------------------------------------------------
# Field data
# ---------------------------------------------------------------------------

unit_ids = [u["id"] for u in units]
COLUMNS = {  # data-editor column → observation field
    "quadrat": {"Quadrat": "unit", "Species": "species", "Count": "count", "Basal area (cm²)": "basal_area_cm2"},
    "nested_quadrats": {"Quadrat": "unit", "Species": "species"},
    "pcq": {
        "Point": "unit",
        "Quarter": "quarter",
        "Species": "species",
        "Distance (m)": "distance_m",
        "DBH (cm)": "dbh_cm",
    },
    "line_intercept": {"Line": "unit", "Species": "species", "Intercept (m)": "intercept_m"},
    "point_intercept": {"Line": "unit", "Species": "species", "Hits": "hits"},
}
cols = COLUMNS["quadrat" if m in QUADRAT_METHODS else m]
HELP = {
    "quadrat": "One row per species per quadrat: number of individuals, and for trees the total basal area of those "
    "stems (π·DBH²/4, in cm²) for dominance and a full IVI. Quadrats with no plants need no rows.",
    "nested_quadrats": "List each species where it first appears in the smallest quadrat at each location.",
    "pcq": "Four rows per point, one per quarter: species of the nearest tree, its distance from the point (m) and DBH (cm).",
    "line_intercept": "One row per canopy crossing the tape: species and the length of line it covers (m).",
    "point_intercept": f"Per line and species, the number of points (of {sv['params'].get('points', 0):g}) the species touched.",
}

with data_tab:
    st.caption(HELP["quadrat" if m in QUADRAT_METHODS else m])
    obs = pd.DataFrame(
        [{col: o.get(field) for col, field in cols.items()} for o in sv["observations"]], columns=list(cols)
    )
    numeric = {"count", "basal_area_cm2", "distance_m", "dbh_cm", "intercept_m", "hits"}
    for col, field in cols.items():  # numeric columns stay numeric even when the table starts empty
        if field in numeric:
            obs[col] = pd.to_numeric(obs[col], errors="coerce").astype("float64")
    config = {list(cols)[0]: st.column_config.SelectboxColumn(options=unit_ids, required=True)}
    for col, field in cols.items():
        if field in numeric:
            whole = field in ("count", "hits")
            config[col] = st.column_config.NumberColumn(
                min_value=0, step=1 if whole else 0.01, format="%d" if whole else None
            )
    if "Quarter" in cols:
        config["Quarter"] = st.column_config.SelectboxColumn(options=[1, 2, 3, 4], required=True)
    known = sorted(
        {o["species"] for x in surveys for o in x["observations"]} | {sp["botanicalName"] for sp in s.list("species")}
    )
    config["Species"] = st.column_config.TextColumn(
        help="Botanical name; e.g. " + ", ".join(known[:3]) if known else None
    )
    edited = st.data_editor(obs, num_rows="dynamic", hide_index=True, column_config=config, key=f"obs-{sid}")
    st.caption(
        "Add rows at the bottom of the table; paste from a spreadsheet; select rows and press Delete to remove them."
    )
    if st.button("Save field data", type="primary", key=f"save-{sid}"):
        records, skipped = observations_from_table(edited, cols)
        heading = {field: col for col, field in cols.items()}
        try:
            s.update("surveys", sid, {"observations": records})
        except RecordInvalid as e:
            # "observations.3.count" → "Row 4, Count" (rows as in the table, blank rows excluded)
            lines = []
            for path, msg in e.issues:
                parts = path.split(".")
                if len(parts) == 3 and parts[0] == "observations" and parts[1].isdigit():
                    lines.append(f"- **Row {int(parts[1]) + 1}, {heading.get(parts[2], parts[2])}**: {msg}")
                else:
                    lines.append(f"- **{path or 'Record'}**: {msg}")
            st.error("Not saved. Please correct:\n" + "\n".join(lines))
        else:
            flash(
                f"Saved {len(records)} records."
                + (f" {skipped} row{'s' if skipped > 1 else ''} without a species were not saved." if skipped else "")
            )
            st.rerun()
    variants = veg.case_variants(o["species"] for o in sv["observations"])
    if variants:
        st.warning(
            "These names differ only in capital letters and are counted as different species: "
            + "; ".join(" / ".join(g) for g in variants)
            + ". Correct them in the table if they are the same species.",
            icon=":material/warning:",
        )

# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------


def diversity_metrics(d: veg.Diversity, chao: float | None) -> None:
    c = row(5)
    c[0].metric("Species", d.richness, help=f"Chao2 estimate of total richness: {fmt(chao, 1)}" if chao else None)
    c[1].metric("Shannon H′", fmt(d.shannon, 3), help="−Σ pᵢ ln pᵢ (natural log)")
    c[2].metric(
        "Simpson 1 − D", fmt(d.simpson, 3), help="Probability two individuals drawn at random differ in species"
    )
    c[3].metric("Pielou J′", fmt(d.pielou, 3), help="Evenness: H′ / ln S")
    c[4].metric("Margalef d", fmt(d.margalef, 2), help="Richness: (S − 1) / ln N")


def accumulation_chart(curve: list[float], unit_word: str) -> None:
    if len(curve) >= 2:
        st.markdown(f"**Species accumulation** (expected species in 1 … {len(curve)} {unit_word}s)")
        charts.show(
            charts.lines(
                list(range(1, len(curve) + 1)),
                {"Species": [round(v, 2) for v in curve]},
                "Species",
                f"{unit_word.title()}s sampled",
                height=260,
            ),
            key=f"acc-{sid}",
        )
        st.caption("If the curve is still rising steeply at the end, more sampling units would find more species.")


with analysis_tab:
    if variants:
        st.warning(
            "Some species names differ only in capital letters and are analysed as separate species (see Field data).",
            icon=":material/warning:",
        )
    try:
        if m in QUADRAT_METHODS:
            r = veg.analyse_quadrats(units, sv["observations"])
            c = row(3)
            ci = r.total_density
            c[0].metric(
                "Density (all species)",
                f"{ci.mean:,.0f} ha⁻¹" if ci else "—",
                help=f"95 % CI {ci.low:,.0f}–{ci.high:,.0f} ha⁻¹ from {r.quadrats} quadrats" if ci else None,
            )
            c[1].metric("Quadrats", r.quadrats, help=f"{r.area_m2:g} m² sampled")
            c[2].metric(
                "Quadrats for ±10 % precision",
                r.n_for_10pct or "—",
                help=f"For ±20 %: {r.n_for_20pct or '—'} (95 % confidence, from this survey's variation)",
            )
            if ci:
                st.caption(f"95 % confidence interval: {ci.low:,.0f}–{ci.high:,.0f} individuals ha⁻¹.")
            if r.stratified_density:
                mean, se = r.stratified_density
                st.caption(f"Stratified estimate (equal-area strata): {mean:,.0f} ± {se:,.0f} (SE) individuals ha⁻¹.")
            diversity_metrics(r.diversity, r.chao2)
            st.markdown(f"**Phytosociological attributes** · IVI = {r.ivi_basis}")
            table = pd.DataFrame(
                [
                    {
                        "Species": x.species,
                        "Individuals": x.individuals,
                        "Density (ha⁻¹)": round(x.density_ha, 1),
                        "Frequency (%)": round(x.frequency_pct, 1),
                        "Abundance": round(x.abundance, 2),
                        "A/F": round(x.af_ratio, 4),
                        "Pattern (A/F)": x.distribution,
                        "Variance/mean": round(x.dispersion_index, 2) if x.dispersion_index is not None else None,
                        "Pattern (χ² test)": x.dispersion_pattern,
                        "Basal area (m² ha⁻¹)": round(x.basal_area_m2_ha, 2)
                        if x.basal_area_m2_ha is not None
                        else None,
                        "RD (%)": round(x.rel_density, 2),
                        "RF (%)": round(x.rel_frequency, 2),
                        "RDo (%)": round(x.rel_dominance, 2) if x.rel_dominance is not None else None,
                        "IVI": round(x.ivi, 2),
                    }
                    for x in r.species
                ]
            )
            st.dataframe(table, hide_index=True, placeholder="—")
            st.caption(
                "A/F: Whitford (1949) abundance-to-frequency ratio (< 0.025 regular, 0.025–0.05 random, > 0.05 "
                "contiguous). Variance/mean: index of dispersion, tested against 1 with χ²(n − 1) at α = 0.05; "
                "needs several quadrats to have power."
            )
            st.download_button(
                "Download table (CSV)",
                table.to_csv(index=False),
                file_name=f"{sv['name']}-ivi.csv",
                mime="text/csv",
                icon=":material/download:",
            )
            top = r.species[:15]
            st.markdown("**Importance Value Index**")
            charts.show(charts.hbar([x.species for x in top], [round(x.ivi, 1) for x in top], "IVI"), key=f"ivi-{sid}")
            accumulation_chart(r.accumulation, "quadrat")
        elif m == "nested_quadrats":
            curve = veg.species_area(units, sv["observations"])
            st.markdown("**Species–area curve** (mean over locations)")
            charts.show(
                charts.lines(
                    [round(a, 2) for a, _, _ in curve],
                    {"Species": [round(v, 2) for _, v, _ in curve]},
                    "Species",
                    "Quadrat area (m²)",
                    height=300,
                ),
                key=f"sa-{sid}",
            )
            rows = [
                {
                    "Area (m²)": round(a, 2),
                    "Mean species": round(v, 2),
                    "SD": round(sd, 2),
                    "Gain from previous size (%)": round((v - curve[i - 1][1]) / curve[i - 1][1] * 100, 1)
                    if i and curve[i - 1][1]
                    else None,
                }
                for i, (a, v, sd) in enumerate(curve)
            ]
            st.dataframe(pd.DataFrame(rows), hide_index=True, placeholder="—")
            st.caption(
                "Choose the size where doubling the area adds few new species (the curve levels off); this "
                "depends on the community, so judge it together with practicality in the field."
            )
        elif m == "pcq":
            r = veg.analyse_pcq(sv["observations"])
            c = row(3)
            c[0].metric(
                "Tree density", f"{r.density_ha:,.0f} ha⁻¹", help="Pollard (1971) unbiased estimator 4(4n − 1)/(π Σr²)"
            )
            c[1].metric(
                "95 % CI",
                f"{r.density_low_ha:,.0f}–{r.density_high_ha:,.0f}",
                help="Exact interval from the χ²(8n) distribution, valid when trees are randomly dispersed",
            )
            c[2].metric("Points", r.points, help=f"Mean point-to-tree distance {r.mean_distance_m:.2f} m")
            st.caption(
                f"Cottam & Curtis (1956) estimate 1/r̄² = {r.cottam_curtis_ha:,.0f} ha⁻¹ is shown for comparison "
                "with older studies; it is biased upwards for small samples."
            )
            diversity_metrics(r.diversity, r.chao2)
            st.markdown(f"**Species** · IVI = {r.ivi_basis}")
            table = pd.DataFrame(
                [
                    {
                        "Species": x.species,
                        "Trees": x.trees,
                        "RD (%)": round(x.rel_density, 2),
                        "Density (ha⁻¹)": round(x.density_ha, 1),
                        "Frequency (%)": round(x.frequency_pct, 1),
                        "RF (%)": round(x.rel_frequency, 2),
                        "Basal area (m² ha⁻¹)": round(x.basal_area_m2_ha, 2)
                        if x.basal_area_m2_ha is not None
                        else None,
                        "RDo (%)": round(x.rel_dominance, 2) if x.rel_dominance is not None else None,
                        "IVI": round(x.ivi, 2),
                    }
                    for x in r.species
                ]
            )
            st.dataframe(table, hide_index=True, placeholder="—")
            st.download_button(
                "Download table (CSV)",
                table.to_csv(index=False),
                file_name=f"{sv['name']}-pcq.csv",
                mime="text/csv",
                icon=":material/download:",
            )
            st.markdown("**Importance Value Index**")
            charts.show(
                charts.hbar([x.species for x in r.species[:15]], [round(x.ivi, 1) for x in r.species[:15]], "IVI"),
                key=f"pivi-{sid}",
            )
            accumulation_chart(r.accumulation, "point")
        else:
            cover = (
                veg.line_intercept(units, sv["observations"])
                if m == "line_intercept"
                else veg.point_intercept(units, sv["observations"], int(sv["params"].get("points", 0)))
            )
            table = pd.DataFrame(
                [
                    {
                        "Species": x.species,
                        "Cover (%)": round(x.cover_pct, 2),
                        "SE": round(x.se, 2) if x.se is not None else None,
                        "Lines present": x.transects_present,
                    }
                    for x in cover
                ]
            )
            st.metric(
                "Total cover (sum of species)",
                f"{sum(x.cover_pct for x in cover):.1f} %",
                help="Can exceed 100 % where canopies overlap",
            )
            st.markdown(f"**Cover by species** (mean of {len(units)} lines)")
            charts.show(
                charts.hbar(
                    [x.species for x in cover[:15]],
                    [round(x.cover_pct, 1) for x in cover[:15]],
                    "Cover (%)",
                    hover="%{x} %",
                ),
                key=f"cov-{sid}",
            )
            st.dataframe(table, hide_index=True, placeholder="—")
            diversity_metrics(veg.diversity(x.cover_pct for x in cover), None)
            st.caption("Diversity indices here use cover instead of counts (Margalef needs counts).")
    except veg.SurveyError as e:
        st.info(str(e), icon=":material/info:")

st.divider()
with st.popover("Delete survey", icon=":material/delete:"):
    st.write(f"Delete **{sv['name']}**, its layout and {len(sv['observations'])} field records?")
    if st.button("Delete", type="primary", key=f"del-{sid}"):
        s.remove("surveys", sid)
        st.session_state.pop("survey-pick", None)
        flash(f"{sv['name']} deleted.")
        st.rerun()
