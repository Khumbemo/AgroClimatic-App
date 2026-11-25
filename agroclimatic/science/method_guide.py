"""
Choosing a research design: a decision guide from the research objective and site to a
sampling or experimental design, with the reasons, assumptions and standard references.

Sources: Gomez & Gomez (1984) Statistical Procedures for Agricultural Research; Montgomery
(2017) Design and Analysis of Experiments; Mueller-Dombois & Ellenberg (1974) Aims and Methods
of Vegetation Ecology; Kent (2012) Vegetation Description and Data Analysis; Krebs (1999)
Ecological Methodology; Cochran (1977) Sampling Techniques; ISTA International Rules for Seed
Testing; Curtis & McIntosh (1951); Cottam & Curtis (1956); Canfield (1941); Levy & Madden (1933).
"""

from __future__ import annotations

from dataclasses import dataclass, field

OBJECTIVES = {
    "compare": "Compare treatments I apply (nursery, greenhouse or field trial)",
    "germination": "Test seed germination or viability",
    "composition": "Describe vegetation composition, structure and diversity",
    "trees": "Estimate tree density and basal area in a forest",
    "cover": "Measure plant cover (grass, herbs, shrubs)",
    "regeneration": "Survey natural regeneration (seedlings, saplings, trees)",
    "quadrat_size": "Find the right quadrat size or count species richness",
}

LIFE_FORMS = {
    "herbs": "Herbs, grasses, seedlings",
    "shrubs": "Shrubs and saplings",
    "trees": "Trees",
}


@dataclass
class Recommendation:
    method: str
    """Key of the design: a survey method in sampling.METHODS, or an experimental design."""
    title: str
    why: str
    how: list[str]
    assumptions: list[str]
    references: list[str]
    tool: str
    """'survey', 'experiment' or 'germination': which page sets it up."""
    alternatives: list[tuple[str, str]] = field(default_factory=list)


# Commonly used quadrat sizes by life form (Mueller-Dombois & Ellenberg 1974; Kent 2012). They
# vary with vegetation; confirm with a species–area curve from nested quadrats.
QUADRAT_SIZE = {
    "herbs": (1.0, "1 × 1 m (0.5–2 m for dense swards)"),
    "shrubs": (5.0, "5 × 5 m (2–10 m)"),
    "trees": (10.0, "10 × 10 m, or 20 × 20 m where trees are large or sparse"),
}


def recommend(
    objective: str,
    life_form: str = "trees",
    gradients: int = 0,
    hard_to_change_factor: bool = False,
    homogeneous_units: bool = False,
    pattern: str = "unknown",
    area_large: bool = False,
) -> Recommendation:
    """
    gradients: known sources of variation across the site or bench (0, 1 or 2);
    pattern: spatial pattern of the plants, 'random', 'clumped' or 'unknown';
    area_large: the site is too large or rugged to cover evenly.
    """
    size_text = QUADRAT_SIZE.get(life_form, QUADRAT_SIZE["herbs"])[1]
    if objective == "compare":
        if hard_to_change_factor:
            return Recommendation(
                "Split_Plot",
                "Split-plot design",
                "One factor (e.g. irrigation regime, greenhouse compartment, shade house) can only be applied to "
                "large units, while a second factor (e.g. substrate, fertiliser) can be applied to small units "
                "within them.",
                [
                    "Randomise main-plot levels to main plots within each block.",
                    "Randomise sub-plot levels within every main plot.",
                    "Analyse with two error terms: main plots against error (a), sub-plots and A × B against error (b).",
                ],
                [
                    "Main-plot effects are estimated less precisely than sub-plot effects and the interaction.",
                    "At least two blocks (replicates) are needed to estimate error (a).",
                ],
                ["Gomez & Gomez (1984), ch. 3", "Montgomery (2017), ch. 14"],
                "experiment",
                [
                    (
                        "RCBD",
                        "if both factors can be randomised to individual plots: treat each combination as a treatment",
                    )
                ],
            )
        if gradients >= 2:
            return Recommendation(
                "Latin_Square",
                "Latin square",
                "Two known gradients (e.g. light across benches and temperature along them) can both be removed "
                "from the error by making each treatment appear once in every row and every column.",
                [
                    "Use a t × t square: as many rows and columns as treatments.",
                    "Rows and columns follow the two gradients.",
                ],
                [
                    "Practical for about 4–8 treatments; with few treatments the error degrees of freedom are small "
                    "((t − 1)(t − 2)).",
                    "No interaction between rows, columns and treatments.",
                ],
                ["Gomez & Gomez (1984), ch. 2", "Montgomery (2017), ch. 4"],
                "experiment",
                [("RCBD", "if there are more than about 8 treatments, block on the stronger gradient")],
            )
        if gradients == 1 or not homogeneous_units:
            return Recommendation(
                "RCBD",
                "Randomised complete block design (RCBD)",
                "Experimental units differ along a known or likely gradient (bench position, light, slope, "
                "soil). Grouping uniform units into blocks removes that variation from the error.",
                [
                    "Each block holds every treatment once; randomise independently in each block.",
                    "Lay blocks across the gradient's direction so units within a block are alike.",
                    "Use at least 3–4 blocks; aim for 10 or more error degrees of freedom, (t − 1)(r − 1).",
                ],
                [
                    "Treatment effects are the same in every block (no block × treatment interaction).",
                    "Every block is complete; missing plots need special handling.",
                ],
                ["Gomez & Gomez (1984), ch. 2", "Montgomery (2017), ch. 4"],
                "experiment",
                [("Latin_Square", "if there are two crossing gradients"), ("CRD", "only if units are truly uniform")],
            )
        return Recommendation(
            "CRD",
            "Completely randomised design (CRD)",
            "Units are uniform (e.g. trays in a growth chamber or a well-mixed germination cabinet), so blocking "
            "gains nothing and every degree of freedom goes to error.",
            [
                "Randomise every treatment × replicate over all units.",
                "Unequal replication is allowed (analysed with Tukey–Kramer).",
            ],
            ["Units really are homogeneous; any gradient inflates the error and hides treatment effects."],
            ["Gomez & Gomez (1984), ch. 2"],
            "experiment",
            [("RCBD", "if you are not sure the units are uniform")],
        )
    if objective == "germination":
        return Recommendation(
            "germination",
            "Standard germination test",
            "Germination capacity and speed are estimated from replicated samples of pure seed under defined "
            "conditions; ISTA rules use 400 seeds per test.",
            [
                "Use 4 replicates of 100 seeds (ISTA also allows 8 × 50 or 16 × 25).",
                "Count new germinants at fixed intervals from sowing; remove counted seedlings.",
                "Report final germination %, mean germination time, germination speed index and energy.",
                "To compare pre-treatments, use them as treatments in a CRD (cabinet) or RCBD (nursery beds).",
            ],
            ["Replicates should agree within ISTA tolerance; large differences suggest a problem with the test."],
            ["ISTA International Rules for Seed Testing", "Ranal & Santana (2006) for germination indices"],
            "germination",
            [("CRD", "to compare pre-sowing treatments in a germination cabinet")],
        )
    if objective == "trees":
        if pattern == "clumped":
            return Recommendation(
                "systematic_quadrats",
                "Systematic or random quadrats (fixed-area plots)",
                "Distance methods such as the point-centred quarter assume trees are randomly dispersed and "
                "are biased when they are clumped; fixed-area plots give unbiased density whatever the pattern.",
                [
                    f"Use quadrats of {QUADRAT_SIZE['trees'][1]}.",
                    "Measure every tree's DBH (≥ 10 cm, or your threshold) for basal area and IVI.",
                    "Use the pilot data's variation to set the number of plots (this tool estimates it).",
                ],
                ["Plots are placed independently of where the trees are."],
                ["Mueller-Dombois & Ellenberg (1974)", "Curtis & McIntosh (1951)", "Krebs (1999), ch. 2"],
                "survey",
                [
                    ("pcq", "faster, but biased in clumped stands"),
                    ("stratified_quadrats", "if the stand varies along a gradient"),
                ],
            )
        return Recommendation(
            "pcq",
            "Point-centred quarter method (PCQ)",
            "A plotless method that is fast in large forests: at each sampling point, the distance to the nearest "
            "tree in each of four quarters estimates density; species and DBH give relative dominance and IVI.",
            [
                "Place points every 20–30 m along transects (farther apart than the typical nearest-tree distance, "
                "so no tree is measured twice).",
                "At each point, divide the area into four quarters by the transect and a line across it.",
                "In each quarter, record the nearest tree's species, distance (m) and DBH (cm).",
                "Use 20–50 points for a stand.",
            ],
            [
                "Trees are randomly dispersed; in clumped stands PCQ is biased (use plots instead).",
                "Every quarter must contain a tree within the search distance.",
            ],
            ["Cottam & Curtis (1956)", "Pollard (1971) for the unbiased density estimator", "Mitchell (2007)"],
            "survey",
            [("systematic_quadrats", "fixed-area plots, unbiased for any spatial pattern")],
        )
    if objective == "cover":
        if life_form == "herbs":
            return Recommendation(
                "point_intercept",
                "Point intercept",
                "For grass and herb layers, recording which species each pin or point touches gives objective cover "
                "estimates without visual guessing.",
                [
                    "Read 50–100 points at fixed intervals along each transect.",
                    "Record every species a vertical pin touches at each point (hits).",
                    "Cover % = hits / points read × 100; average over transects.",
                ],
                ["Points are fine enough to hit small species; rare species need many points."],
                ["Levy & Madden (1933)", "Bonham (2013) Measurements for Terrestrial Vegetation"],
                "survey",
                [("random_quadrats", "visual cover in quadrats, faster but more subjective")],
            )
        return Recommendation(
            "line_intercept",
            "Line intercept",
            "For shrubs and other plants with distinct crowns, the length of tape each canopy crosses measures "
            "cover directly.",
            [
                "Lay transects of 20–50 m; record where each canopy starts and ends along the tape.",
                "Cover % = Σ intercept length / line length × 100, averaged over lines.",
            ],
            ["Canopies are discrete; gaps within a crown are excluded or included consistently."],
            ["Canfield (1941)", "Bonham (2013)"],
            "survey",
            [("point_intercept", "for fine-leaved herbs and grasses")],
        )
    if objective == "quadrat_size":
        return Recommendation(
            "nested_quadrats",
            "Nested quadrats (species–area curve)",
            "Recording species in quadrats that double in area shows how richness rises with area; the size where "
            "the curve levels off is a suitable quadrat size for the community.",
            [
                "Start small (e.g. 0.25 m² for herbs, 1 m² for shrubs, 25 m² for trees) and double the area 6–8 times.",
                "Repeat at 3 or more locations and average the curves.",
            ],
            ["The community is reasonably uniform within the area sampled."],
            [
                "Mueller-Dombois & Ellenberg (1974)",
                "Kent (2012)",
                "Stohlgren et al. (1995) for modified Whittaker plots",
            ],
            "survey",
        )
    # composition and regeneration: quadrat sampling
    alternatives = [("belt_transect", "to follow change along a gradient (altitude, moisture, edge)")]
    if gradients >= 1:
        rec = (
            "stratified_quadrats",
            "Stratified random quadrats",
            "The site has distinct zones or a gradient. Sampling each stratum separately gives every zone fair "
            "coverage and a more precise overall estimate.",
        )
        alternatives = [
            ("belt_transect", "to describe the change along the gradient itself"),
            ("random_quadrats", "if the strata are not distinct"),
        ]
    elif area_large:
        rec = (
            "systematic_quadrats",
            "Systematic quadrats with a random start",
            "A grid covers a large or rugged site evenly and is quick to lay out; one random start keeps it unbiased.",
        )
        alternatives.append(("random_quadrats", "if a regular pattern in the vegetation could line up with the grid"))
    else:
        rec = (
            "random_quadrats",
            "Simple random quadrats",
            "Every location has the same chance of selection, giving unbiased estimates with valid confidence "
            "intervals.",
        )
        alternatives.append(("systematic_quadrats", "for even coverage of large sites"))
    how = [
        f"Quadrat size: {size_text}; confirm with a species–area curve.",
        "Record every species and its count (and DBH or basal area for trees) in each quadrat.",
        "Start with 10–20 quadrats; this tool then reports how many are needed for ±10 % or ±20 % precision.",
    ]
    if objective == "regeneration":
        how = [
            "Nest subplots at each sampling location: e.g. 1 × 1 m for seedlings, 5 × 5 m for saplings, "
            "10 × 10 m for trees (sizes vary by protocol).",
            "Define height or diameter classes in advance (e.g. seedling < 1 m tall; sapling ≥ 1 m and < 10 cm DBH; "
            "tree ≥ 10 cm DBH) and record counts per class and species.",
            "Survey each size class as its own quadrat layout here (same seed and site, different quadrat size).",
        ]
    return Recommendation(
        rec[0],
        rec[1],
        rec[2],
        how,
        [
            "Quadrats are placed independently of the plants (never 'representative' spots).",
            "Quadrat boundaries are applied consistently to plants on the edge.",
        ],
        [
            "Curtis & McIntosh (1950, 1951) for density, frequency, abundance and IVI",
            "Mueller-Dombois & Ellenberg (1974)",
            "Cochran (1977) for stratified sampling",
            "Krebs (1999)",
        ],
        "survey",
        alternatives,
    )
