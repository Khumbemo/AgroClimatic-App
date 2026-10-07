import streamlit as st

from agroclimatic.science.calculations import daily_light_integral, dew_point, growing_degree_days, vpd, vpd_band
from agroclimatic.ui import charts
from agroclimatic.ui.common import by_date_desc, example_note, fmt, header, iso, num, record_table, save, store, today

s = store()
logs = by_date_desc(s.list("climateReadings"))
header("Environmental logs", "Daily greenhouse climate: temperature, humidity, light and CO₂.")

if logs:
    r = logs[0]
    v = vpd(r["tempMean"], r["humidity"])
    c = st.columns(4)
    c[0].metric(
        "Mean temperature", fmt(r["tempMean"], 1, "°C"), help=f"{r['tempMin']:g}–{r['tempMax']:g} °C on {r['date']}"
    )
    c[1].metric("Relative humidity", fmt(r["humidity"], 0, "%"))
    c[2].metric("VPD", fmt(v, 2, "kPa"), help=f"{vpd_band(v).label}. Tetens equation at the mean temperature.")
    c[3].metric("Dew point", fmt(dew_point(r["tempMean"], r["humidity"]), 1, "°C"), help="Magnus formula")

chron = list(reversed(logs))[-60:]
if len(chron) >= 2:
    dates = [r["date"] for r in chron]
    st.markdown("**Air temperature** · last 60 readings")
    charts.show(
        charts.lines(
            dates,
            {
                "T max": [r["tempMax"] for r in chron],
                "T mean": [r["tempMean"] for r in chron],
                "T min": [r["tempMin"] for r in chron],
            },
            "Temperature (°C)",
            hover_unit=" °C",
        )
    )
    c = st.columns(2)
    with c[0]:
        st.markdown("**Relative humidity**")
        charts.show(charts.lines(dates, {"RH": [r["humidity"] for r in chron]}, "RH (%)", hover_unit=" %", height=240))
    with c[1]:
        st.markdown("**Vapour pressure deficit**")
        charts.show(
            charts.lines(
                dates,
                {"VPD": [round(vpd(r["tempMean"], r["humidity"]), 2) for r in chron]},
                "VPD (kPa)",
                hover_unit=" kPa",
                height=240,
            )
        )

with st.expander("New climate reading", icon=":material/add:", expanded=not logs):
    with st.form("new-climate", clear_on_submit=True):
        d = st.date_input("Date", today(), format="YYYY-MM-DD")
        c = st.columns(3)
        t_min = c[0].number_input("T min (°C)", step=0.1, value=None, placeholder="12.5")
        t_max = c[1].number_input("T max (°C)", step=0.1, value=None, placeholder="28.3")
        t_mean = c[2].number_input(
            "T mean (°C)", step=0.1, value=None, placeholder="auto", help="Leave blank to use (min + max) / 2."
        )
        c = st.columns(4)
        rh = c[0].number_input("Relative humidity (%)", min_value=0.0, max_value=100.0, step=0.1, value=None)
        par = c[1].number_input("PAR (µmol m⁻² s⁻¹)", min_value=0.0, step=1.0, value=None)
        photo = c[2].number_input("Photoperiod (h)", min_value=0.0, max_value=24.0, step=0.5, value=None)
        co2 = c[3].number_input("CO₂ (ppm)", min_value=0.0, step=1.0, value=None)
        if st.form_submit_button("Save reading", type="primary"):
            if t_min is None or t_max is None or rh is None:
                st.error("Enter the minimum and maximum temperature and the relative humidity.")
            else:
                mean = t_mean if t_mean is not None else round((t_min + t_max) / 2, 2)
                if save(
                    lambda: s.add(
                        "climateReadings",
                        {
                            "date": iso(d),
                            "tempMin": t_min,
                            "tempMax": t_max,
                            "tempMean": mean,
                            "humidity": rh,
                            "lightIntensity": num(par) or 0,
                            "photoperiod": num(photo) or 0,
                            "co2": num(co2),
                        },
                    ),
                    "Reading saved",
                ):
                    st.rerun()

t_base = st.number_input(
    "Base temperature for growing degree days (°C)",
    value=10.0,
    step=0.5,
    help="GDD = max(0, (Tmax + Tmin)/2 − Tbase), summed over the readings shown.",
)
record_table(
    logs,
    {
        "Date": "date",
        "T min (°C)": "tempMin",
        "T max (°C)": "tempMax",
        "T mean (°C)": "tempMean",
        "RH (%)": "humidity",
        "VPD (kPa)": lambda r: round(vpd(r["tempMean"], r["humidity"]), 2),
        "VPD band": lambda r: vpd_band(vpd(r["tempMean"], r["humidity"])).label,
        "Dew point (°C)": lambda r: (
            round(dp, 1) if (dp := dew_point(r["tempMean"], r["humidity"])) is not None else None
        ),
        "DLI (mol m⁻² d⁻¹)": lambda r: (
            round(daily_light_integral(r["lightIntensity"], r["photoperiod"]), 1)
            if r["lightIntensity"] and r["photoperiod"]
            else None
        ),
        "GDD": lambda r: round(growing_degree_days(r["tempMax"], r["tempMin"], t_base), 1),
        "CO₂ (ppm)": "co2",
    },
    "climateReadings",
    "climate",
    empty="No climate readings yet. Record daily minimum and maximum temperature and "
    "relative humidity; VPD, dew point and light integral are calculated for you.",
)
if logs:
    st.caption(
        f"Accumulated GDD over {len(logs)} readings: "
        f"{sum(growing_degree_days(r['tempMax'], r['tempMin'], t_base) for r in logs):.1f} °C·d (base {t_base:g} °C)."
    )
example_note(logs)
