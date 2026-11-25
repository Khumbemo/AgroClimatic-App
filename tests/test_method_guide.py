from agroclimatic.science.method_guide import OBJECTIVES, recommend
from agroclimatic.science.sampling import METHODS
from agroclimatic.science.trial_design import DESIGN_TYPES


def test_experimental_designs_follow_the_sources_of_variation():
    assert recommend("compare", gradients=0, homogeneous_units=True).method == "CRD"
    assert recommend("compare", gradients=0).method == "RCBD"  # uniformity not confirmed: block
    assert recommend("compare", gradients=1).method == "RCBD"
    assert recommend("compare", gradients=2).method == "Latin_Square"
    assert recommend("compare", gradients=2, hard_to_change_factor=True).method == "Split_Plot"


def test_survey_methods_follow_objective_and_site():
    assert recommend("trees").method == "pcq"
    assert recommend("trees", pattern="clumped").method == "systematic_quadrats"  # PCQ is biased in clumped stands
    assert recommend("cover", life_form="herbs").method == "point_intercept"
    assert recommend("cover", life_form="shrubs").method == "line_intercept"
    assert recommend("quadrat_size").method == "nested_quadrats"
    assert recommend("composition", life_form="herbs").method == "random_quadrats"
    assert recommend("composition", gradients=1).method == "stratified_quadrats"
    assert recommend("composition", area_large=True).method == "systematic_quadrats"
    assert recommend("germination").tool == "germination"


def test_every_recommendation_is_complete_and_points_at_a_real_tool():
    valid = set(METHODS) | set(DESIGN_TYPES) | {"germination"}
    for objective in OBJECTIVES:
        for kwargs in (
            {},
            {"gradients": 1},
            {"gradients": 2},
            {"life_form": "herbs"},
            {"pattern": "clumped"},
            {"area_large": True},
            {"hard_to_change_factor": True},
        ):
            r = recommend(objective, **kwargs)
            assert r.method in valid and r.why and r.how and r.assumptions and r.references
            assert all(alt in valid for alt, _ in r.alternatives)
