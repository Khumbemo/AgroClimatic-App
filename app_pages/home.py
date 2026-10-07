from datetime import date, timedelta

import streamlit as st

from agroclimatic.science.calculations import (
    daily_light_integral,
    days_after_sowing,
    germination_percent,
    vpd,
    vpd_band,
)
from agroclimatic.ui.common import by_date_desc, fmt, header, store

s = store()
today = date.today()
today_iso = today.isoformat()
climate = by_date_desc(s.list("climateReadings"))
batches = s.list("batches")
lots = s.list("seedLots")
counts = s.list("germinationCounts")
calibrations = s.list("calibrations")
pests = s.list("pestObservations")

header("Overview", f"{today:%A %d %B %Y}")

# --- Greenhouse climate -----------------------------------------------------
reading = climate[0] if climate else None
with st.container(border=True):
    top = st.columns([4, 1])
    top[0].subheader("Greenhouse climate", anchor=False)
    if reading and reading.get("isExample"):
        top[1].caption(":material/science: Example data")
    if reading:
        v = vpd(reading["tempMean"], reading["humidity"])
        band = vpd_band(v)
        st.caption(f"Latest reading · {reading['date']}")
        c = st.columns(4)
        c[0].metric(
            "Air temperature",
            fmt(reading["tempMean"], 1, "°C"),
            help=f"Daily range {reading['tempMin']:g}–{reading['tempMax']:g} °C",
        )
        c[1].metric("Relative humidity", fmt(reading["humidity"], 0, "%"))
        dli = (
            daily_light_integral(reading["lightIntensity"], reading["photoperiod"])
            if reading["lightIntensity"]
            else None
        )
        c[2].metric(
            "PAR (µmol m⁻² s⁻¹)",
            fmt(reading["lightIntensity"], 0) if reading["lightIntensity"] else "—",
            help="Photosynthetically active radiation",
        )
        c[3].metric("VPD", fmt(v, 2, "kPa"), help="Tetens equation at the daily mean temperature")
        if dli is not None:
            st.caption(f"Daily light integral {dli:.1f} mol m⁻² d⁻¹ over {reading['photoperiod']:g} h.")
        icon = {
            "water": ":material/water_drop:",
            "leaf-light": ":material/eco:",
            "leaf": ":material/check_circle:",
            "warn": ":material/warning:",
            "critical": ":material/error:",
        }[band.tone]
        bands = "0–0.4 low · 0.4–0.8 propagation · 0.8–1.2 optimal vegetative · 1.2–1.6 high · >1.6 stress (kPa)"
        st.progress(min(v / 2.0, 1.0), text=f"{icon} VPD {v:.2f} kPa — **{band.label}**")
        st.caption(bands)
    else:
        st.write("Record a daily reading to see temperature, humidity, light and VPD here.")
        st.page_link("app_pages/environment.py", label="Open environmental logs", icon=":material/arrow_forward:")

# --- Key figures -----------------------------------------------------------
active = [b for b in batches if b["status"] != "outplanted"]
in_stock = [x for x in lots if (x.get("stockKg") or 0) > 0]
germ = [
    g
    for g in (
        germination_percent([c for c in counts if c.get("batchId") == b["id"]], b.get("seedsSown") or 0) for b in active
    )
    if g
]
k = st.columns(3)
k[0].metric("Active batches", len(active), help=f"{len(batches) - len(active)} outplanted")
k[1].metric("Seed lots in stock", len(in_stock), help=f"{sum(x.get('stockKg') or 0 for x in in_stock):.1f} kg in total")
k[2].metric(
    "Mean germination",
    fmt(sum(germ) / len(germ), 1, "%") if germ else "—",
    help=f"Across {len(germ)} batches with counts" if germ else "No counts yet",
)

# --- Needs attention -------------------------------------------------------
alerts: list[tuple[str, str, str]] = []  # (level, text, page)
review = sum(1 for b in batches if b.get("needsReview"))
if review:
    alerts.append(
        (
            "warn",
            f"{review} batch{'es' if review > 1 else ''} need species, sowing date and seeds sown",
            "app_pages/batches.py",
        )
    )
latest_cal: dict[str, dict] = {}
for c in sorted(calibrations, key=lambda c: c["calibrationDate"]):
    latest_cal[c["instrumentName"].strip().lower()] = c
overdue = [c for c in latest_cal.values() if c.get("nextDueDate") and c["nextDueDate"] < today_iso]
due_soon = [
    c
    for c in latest_cal.values()
    if c.get("nextDueDate") and today_iso <= c["nextDueDate"] <= (today + timedelta(days=14)).isoformat()
]
if overdue:
    alerts.append(
        ("critical", "Calibration overdue: " + ", ".join(c["instrumentName"] for c in overdue), "app_pages/audit.py")
    )
if due_soon:
    alerts.append(
        (
            "warn",
            "Calibration due within 14 days: " + ", ".join(c["instrumentName"] for c in due_soon),
            "app_pages/audit.py",
        )
    )
if reading:
    v = vpd(reading["tempMean"], reading["humidity"])
    band = vpd_band(v)
    if band.tone in ("critical", "water"):
        alerts.append(
            (
                "critical" if band.tone == "critical" else "warn",
                f"Latest VPD {v:.2f} kPa: {band.label.lower()}",
                "app_pages/environment.py",
            )
        )
    age = days_after_sowing(today_iso, reading["date"])
    if age > 3:
        alerts.append(("warn", f"No climate reading for {age} days", "app_pages/environment.py"))
no_counts = [
    b
    for b in active
    if b.get("sowingDate")
    and b["status"] in ("sown", "germinating")
    and days_after_sowing(today_iso, b["sowingDate"]) > 14
    and not any(c.get("batchId") == b["id"] for c in counts)
]
if no_counts:
    alerts.append(
        (
            "warn",
            "No germination counts yet for "
            + ", ".join(b["batchNumber"] for b in no_counts)
            + " (sown over 14 days ago)",
            "app_pages/germination.py",
        )
    )
severe = [p for p in pests if p["severityScale"] >= 4 and 0 <= days_after_sowing(today_iso, p["date"]) <= 14]
if severe:
    alerts.append(
        (
            "critical",
            "Severe pest or disease in the last 14 days: " + ", ".join(sorted({p["pestDiseaseName"] for p in severe})),
            "app_pages/treatments.py",
        )
    )

with st.container(border=True):
    st.subheader("Needs attention", anchor=False)
    if not alerts:
        st.success("Nothing flagged from your records.", icon=":material/check_circle:")
    for level, text, page in alerts:
        st.page_link(page, label=text, icon=":material/error:" if level == "critical" else ":material/warning:")

# --- Quick entry -----------------------------------------------------------
st.subheader("Record", anchor=False)
q = st.columns(4)
q[0].page_link("app_pages/germination.py", label="Germination count", icon=":material/eco:")
q[1].page_link("app_pages/environment.py", label="Climate reading", icon=":material/thermostat:")
q[2].page_link("app_pages/morphometrics.py", label="Growth measurement", icon=":material/straighten:")
q[3].page_link("app_pages/batches.py", label="New batch", icon=":material/add:")
