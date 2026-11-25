import streamlit as st

from agroclimatic.science.method_guide import LIFE_FORMS, OBJECTIVES, recommend
from agroclimatic.science.sampling import METHODS
from agroclimatic.science.trial_design import DESIGN_LABELS
from agroclimatic.ui.common import header

header("Method guide", "Choose a sampling or experimental design for your research question.")

LABELS = {**METHODS, **DESIGN_LABELS, "germination": "Standard germination test"}

objective = st.radio("What do you want to find out?", list(OBJECTIVES), format_func=OBJECTIVES.get, key="mg-objective")
life_form, gradients, hard, uniform, pattern, large = "trees", 0, False, False, "unknown", False
with st.container(horizontal=True, gap="medium"):
    if objective == "compare":
        gradients = st.selectbox(
            "Known gradients across the units",
            [0, 1, 2],
            format_func=lambda g: [
                "None",
                "One (e.g. light along the benches)",
                "Two crossing (e.g. light and temperature)",
            ][g],
            index=1,
            help="Anything that makes some units differ from others before treatment: bench position, slope, soil, light.",
        )
        uniform = st.checkbox("Units are truly uniform (e.g. a growth chamber)", disabled=gradients > 0)
        hard = st.checkbox(
            "One factor can only be applied to large units",
            help="E.g. irrigation regime per bed or greenhouse compartment, with substrates or fertiliser inside.",
        )
    elif objective in ("composition", "regeneration", "cover", "quadrat_size"):
        life_form = st.selectbox(
            "Main life form", list(LIFE_FORMS), format_func=LIFE_FORMS.get, index=2 if objective != "cover" else 0
        )
        if objective in ("composition", "regeneration"):
            gradients = int(st.checkbox("The site has distinct zones or a gradient (altitude, aspect, moisture, edge)"))
            large = st.checkbox("The site is large or rugged")
    elif objective == "trees":
        pattern = st.selectbox(
            "How are the trees spread?",
            ["unknown", "random", "clumped"],
            format_func={
                "unknown": "Not sure",
                "random": "Fairly evenly / at random",
                "clumped": "In clumps or patches",
            }.get,
        )

rec = recommend(objective, life_form, gradients, hard, uniform, pattern, large)

with st.container(border=True):
    st.caption("Recommended design")
    st.subheader(rec.title, anchor=False)
    st.write(rec.why)
    st.markdown("**How to carry it out**\n" + "\n".join(f"- {h}" for h in rec.how))
    st.markdown("**Assumptions to check**\n" + "\n".join(f"- {a}" for a in rec.assumptions))
    if rec.alternatives:
        st.markdown("**Alternatives**\n" + "\n".join(f"- **{LABELS.get(k, k)}**: {why}" for k, why in rec.alternatives))
    st.caption("References: " + "; ".join(rec.references))
    label = {
        "survey": "Set up this survey",
        "experiment": "Set up this experiment",
        "germination": "Open the germination tracker",
    }[rec.tool]
    if st.button(label, type="primary", icon=":material/arrow_forward:"):
        if rec.tool == "survey":
            st.session_state["survey-method"] = rec.method
            st.session_state["survey-open"] = True
            st.switch_page("app_pages/surveys.py")
        elif rec.tool == "experiment":
            st.session_state["exp-design"] = rec.method
            st.session_state["exp-open"] = True
            st.switch_page("app_pages/experiments.py")
        else:
            st.switch_page("app_pages/germination.py")

st.subheader("Methods at a glance", anchor=False)
st.dataframe(
    [
        {
            "Method": "CRD / RCBD / Latin square / split-plot",
            "Use for": "Comparing treatments you apply",
            "Record": "One value per plot",
            "App gives": "Randomised layout, ANOVA, Tukey letters, assumption checks",
            "Key reference": "Gomez & Gomez 1984",
        },
        {
            "Method": "Random, systematic or stratified quadrats",
            "Use for": "Density, frequency, composition, diversity",
            "Record": "Species counts per quadrat (+ basal area)",
            "App gives": "Density, frequency, abundance, A/F, IVI, diversity, species accumulation, sample size",
            "Key reference": "Curtis & McIntosh 1951",
        },
        {
            "Method": "Belt transect",
            "Use for": "Change along a gradient",
            "Record": "Species counts per quadrat",
            "App gives": "As for quadrats, by position",
            "Key reference": "Kent 2012",
        },
        {
            "Method": "Nested quadrats",
            "Use for": "Quadrat size, species richness",
            "Record": "Species in each size",
            "App gives": "Species–area curve",
            "Key reference": "Mueller-Dombois & Ellenberg 1974",
        },
        {
            "Method": "Point-centred quarter",
            "Use for": "Tree density and basal area in large forests",
            "Record": "Nearest tree per quarter: species, distance, DBH",
            "App gives": "Density with 95 % CI, IVI, diversity",
            "Key reference": "Cottam & Curtis 1956; Pollard 1971",
        },
        {
            "Method": "Line intercept",
            "Use for": "Shrub and canopy cover",
            "Record": "Intercept length per species",
            "App gives": "Cover % ± SE",
            "Key reference": "Canfield 1941",
        },
        {
            "Method": "Point intercept",
            "Use for": "Grass and herb cover",
            "Record": "Hits per species per line",
            "App gives": "Cover % ± SE",
            "Key reference": "Levy & Madden 1933",
        },
        {
            "Method": "Germination test",
            "Use for": "Seed quality, pre-treatment effects",
            "Record": "Daily germinant counts",
            "App gives": "Germination %, MGT, speed index, energy",
            "Key reference": "ISTA Rules",
        },
    ],
    hide_index=True,
)
