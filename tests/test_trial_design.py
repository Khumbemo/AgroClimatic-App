import json
from collections import Counter
from pathlib import Path

from agroclimatic.science.trial_design import design_problem, generate_layout, seeded_random, shuffle

T = ["Control", "GA3 250 ppm", "Cold strat 30 d", "Scarified"]
JS = json.loads((Path(__file__).parent / "js-layout-reference.json").read_text())


def test_generator_matches_previous_javascript_version():
    rand = seeded_random(12345)
    assert [rand() for _ in range(20)] == JS["seq"]


def test_saved_layouts_reproduce_exactly():
    for case in JS["cases"]:
        i = case["input"]
        layout = generate_layout(
            i["designType"], i["treatments"], i["replicates"], i["seed"], i.get("subTreatments", ())
        )
        assert layout == case["layout"]


def test_reproducible_and_seed_dependent():
    a = generate_layout("RCBD", T, 4, 42)
    assert a == generate_layout("RCBD", T, 4, 42)
    assert a != generate_layout("RCBD", T, 4, 43)


def test_shuffle_is_uniform_permutation():
    rand = seeded_random(1)
    first = Counter()
    for _ in range(4000):
        s = shuffle(["a", "b", "c", "d"], rand)
        assert sorted(s) == ["a", "b", "c", "d"]
        first[s[0]] += 1
    assert all(abs(n - 1000) < 100 for n in first.values())


def test_crd():
    plots = generate_layout("CRD", T, 5, 7)
    assert len(plots) == 20
    assert set(Counter(p["treatment"] for p in plots).values()) == {5}
    assert {p["block"] for p in plots} == {1}
    assert [p["plot"] for p in plots] == list(range(1, 21))


def test_rcbd_each_treatment_once_per_block_and_independent_orders():
    plots = generate_layout("RCBD", T, 6, 3)
    assert len(plots) == 24
    for b in range(1, 7):
        assert sorted(p["treatment"] for p in plots if p["block"] == b) == sorted(T)
    orders = {",".join(p["code"] for p in plots if p["block"] == b) for b in range(1, 7)}
    assert len(orders) > 1


def test_latin_square():
    for seed in (1, 2, 3, 99):
        plots = generate_layout("Latin_Square", T, 0, seed)
        assert len(plots) == 16
        for i in range(1, 5):
            assert sorted(p["treatment"] for p in plots if p["row"] == i) == sorted(T)
            assert sorted(p["treatment"] for p in plots if p["col"] == i) == sorted(T)


def test_split_plot():
    main, sub = ["Peat", "Coir", "Bark"], ["0 N", "50 N", "100 N", "150 N"]
    plots = generate_layout("Split_Plot", main, 3, 11, sub)
    assert len(plots) == 36
    for b in range(1, 4):
        for m in main:
            mp = [p for p in plots if p["block"] == b and p["treatment"] == m]
            assert sorted(p["subTreatment"] for p in mp) == sorted(sub)
            pos = sorted(p["position"] for p in mp)
            assert pos[-1] - pos[0] == len(sub) - 1


def test_design_problem():
    assert "two treatments" in design_problem("RCBD", ["A"], 3)
    assert "different" in design_problem("RCBD", ["A", "a"], 3)
    assert "two replicates" in design_problem("CRD", ["A", "B"], 1)
    assert "three treatments" in design_problem("Latin_Square", ["A", "B"], 0)
    assert "sub-plot" in design_problem("Split_Plot", ["A", "B"], 3, ["x"])
    assert design_problem("RCBD", ["A", "B", "C"], 4) is None
