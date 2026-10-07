import math

import pytest

from agroclimatic.science.calculations import (
    cumulative_germination,
    daily_light_integral,
    days_after_sowing,
    dew_point,
    dickson_quality_index,
    fertilizer_mass_g,
    germination_energy,
    germination_percent,
    germination_speed_index,
    growing_degree_days,
    leaching_fraction,
    mean_germination_time,
    relative_growth_rate,
    saturation_vapour_pressure,
    sturdiness_quotient,
    vpd,
    vpd_band,
)

# 1000 seeds sown 2024-03-10; counts on days 5, 8 and 12 after sowing
COUNTS = [
    {"date": "2024-03-15", "count": 120},
    {"date": "2024-03-18", "count": 300},
    {"date": "2024-03-22", "count": 180},
]


def test_days_after_sowing_across_month_ends_and_dst():
    assert days_after_sowing("2024-03-15", "2024-03-10") == 5
    assert days_after_sowing("2024-04-01", "2024-03-30") == 2
    assert days_after_sowing("2024-03-31", "2024-03-30") == 1


def test_germination_percent():
    assert germination_percent(COUNTS, 1000) == 60
    assert germination_percent(COUNTS, 0) is None


def test_mean_germination_time():
    # (5·120 + 8·300 + 12·180) / 600
    assert mean_germination_time(COUNTS, "2024-03-10") == pytest.approx(8.6, abs=1e-10)
    assert mean_germination_time([], "2024-03-10") is None


def test_germination_speed_index():
    # 120/5 + 300/8 + 180/12
    assert germination_speed_index(COUNTS, "2024-03-10") == pytest.approx(76.5, abs=1e-10)


def test_germination_energy_counts_from_sowing():
    assert germination_energy(COUNTS, 1000, "2024-03-10", 7) == 12
    assert germination_energy(COUNTS, 1000, "2024-03-10", 12) == 60


def test_cumulative_germination():
    assert cumulative_germination(COUNTS, 1000) == [12, 42, 60]


def test_seedling_quality():
    assert sturdiness_quotient(5.2, 1.4) == pytest.approx(3.714, abs=1e-3)
    assert sturdiness_quotient(5, 0) is None
    # H 20 cm, D 4 mm, shoot 3 g, root 1.5 g → 4.5 / (5 + 2)
    assert dickson_quality_index(20, 4, 3, 1.5) == pytest.approx(0.642857, abs=1e-6)
    assert dickson_quality_index(20, 4, 3, 0) is None
    assert relative_growth_rate(5, 10, 10) == pytest.approx(math.log(2) / 10, abs=1e-12)
    assert relative_growth_rate(5, 10, 0) == 0


def test_saturation_vapour_pressure_table_values():
    assert saturation_vapour_pressure(0) == pytest.approx(0.611, abs=5e-4)
    assert saturation_vapour_pressure(20) == pytest.approx(2.338, abs=5e-3)
    assert saturation_vapour_pressure(25) == pytest.approx(3.168, abs=5e-3)


def test_vpd_and_band():
    assert vpd(25, 60) == pytest.approx(1.267, abs=5e-4)
    assert vpd_band(vpd(25, 60)).label == "High transpiration"
    assert vpd_band(vpd(24.6, 68)).label == "Optimal vegetative"
    assert vpd_band(0.4).label == "Propagation"
    assert vpd(20, 100) == 0


def test_dew_point():
    assert dew_point(25, 60) == pytest.approx(16.7, abs=0.05)
    assert dew_point(20, 100) == pytest.approx(20, abs=1e-6)
    assert dew_point(20, 0) is None


def test_dli_and_gdd():
    assert daily_light_integral(412, 12) == pytest.approx(17.7984, abs=1e-4)
    assert growing_degree_days(28, 12) == 10
    assert growing_degree_days(8, 2) == 0


def test_fertigation():
    assert fertilizer_mass_g(150, 10, 20) == 7.5
    assert fertilizer_mass_g(150, 10, 0) is None
    assert leaching_fraction(250, 1000) == 0.25
    assert leaching_fraction(250, 0) is None
