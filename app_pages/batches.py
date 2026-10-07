import streamlit as st

from agroclimatic.data.schema import BATCH_STATUSES
from agroclimatic.science.calculations import (
    cumulative_germination,
    days_after_sowing,
    dickson_quality_index,
    germination_energy,
    germination_percent,
    mean_germination_time,
    relative_growth_rate,
    sturdiness_quotient,
)
from agroclimatic.ui import charts
from agroclimatic.ui.common import (
    BatchIndex,
    example_note,
    flash,
    fmt,
    header,
    iso,
    num,
    parse_date,
    save,
    seed_lot_select,
    species_select,
    store,
    today,
    whole,
)

s = store()
idx = BatchIndex(s)
LINKED = {
    "germinationCounts": ("Germination counts", "app_pages/germination.py"),
    "growthMeasurements": ("Growth measurements", "app_pages/morphometrics.py"),
    "fertigationEvents": ("Fertigation events", "app_pages/treatments.py"),
    "pestObservations": ("Pest observations", "app_pages/treatments.py"),
    "preSowingTreatments": ("Pre-sowing treatments", "app_pages/treatments.py"),
    "mortalityEvents": ("Mortality events", "app_pages/mortality.py"),
    "irrigationEvents": ("Irrigation events", "app_pages/irrigation.py"),
    "leachateTests": ("Leachate tests", "app_pages/substrate.py"),
}


def batch_form(existing: dict | None) -> None:
    """Create a batch, or edit `existing`."""
    e = existing or {}
    key = f"bf-{e.get('id', 'new')}"
    with st.form(key, clear_on_submit=existing is None):
        number = st.text_input("Batch number", e.get("batchNumber") or f"NB-{today().year}-", key=f"{key}-n")
        c = st.columns(2)
        with c[0]:
            species = species_select(s, "Species", f"{key}-sp", e.get("speciesId"))
        with c[1]:
            lot = seed_lot_select(s, "Seed lot", f"{key}-lot", e.get("seedLotId"))
        c = st.columns(2)
        sowing = c[0].date_input(
            "Sowing date", parse_date(e.get("sowingDate")) if existing else today(), format="YYYY-MM-DD", key=f"{key}-d"
        )
        status = c[1].selectbox(
            "Stage", BATCH_STATUSES, index=BATCH_STATUSES.index(e.get("status", "sown")), key=f"{key}-st"
        )
        c = st.columns(2)
        seeds = c[0].number_input(
            "Seeds sown", min_value=1, step=1, value=e.get("seedsSown"), placeholder="1000", key=f"{key}-seeds"
        )
        area = c[1].number_input(
            "Area sown (m²)", min_value=0.0, step=0.1, value=e.get("areaSownM2"), placeholder="1.5", key=f"{key}-area"
        )
        c = st.columns(2)
        tray = c[0].text_input("Bed / tray", e.get("bedTrayNumber") or "", placeholder="B-01", key=f"{key}-tray")
        substrate = c[1].text_input(
            "Substrate mix", e.get("substrateMix") or "", placeholder="Coir : soil (70 : 30)", key=f"{key}-sub"
        )
        notes = st.text_area("Notes", e.get("notes") or "", height=80, key=f"{key}-notes")
        submitted = st.form_submit_button("Save changes" if existing else "Create batch", type="primary")
    if submitted:
        data = {
            "batchNumber": number,
            "speciesId": species,
            "seedLotId": lot,
            "sowingDate": iso(sowing),
            "seedsSown": whole(seeds),
            "areaSownM2": num(area) or None,
            "status": status,
            "bedTrayNumber": tray,
            "substrateMix": substrate,
            "notes": notes,
        }
        if existing:
            complete = data["speciesId"] and data["sowingDate"] and data["seedsSown"]
            data["needsReview"] = True if existing.get("needsReview") and not complete else None
            ok = save(lambda: s.update("batches", existing["id"], data), "Batch updated")
            if ok:
                flash(f"{number} updated.")
                st.rerun()
        else:
            created = {}
            if save(lambda: created.update(s.add("batches", data)), "Batch created"):
                st.query_params["batch"] = created["id"]
                flash(f"Batch {created['batchNumber']} created.")
                st.rerun()


def detail(b: dict) -> None:
    if st.button("All batches", icon=":material/arrow_back:"):
        st.query_params.clear()
        st.rerun()
    header(b["batchNumber"], idx.species_name(b.get("speciesId")) or "Species not set")
    if b.get("needsReview"):
        st.warning(
            "Created from earlier records. Use **Edit** to add the species, sowing date and seeds sown.",
            icon=":material/warning:",
        )
    if b.get("isExample"):
        st.caption(":material/science: Example batch included with the app.")

    counts = sorted((c for c in s.list("germinationCounts") if c.get("batchId") == b["id"]), key=lambda c: c["date"])
    growth = sorted((g for g in s.list("growthMeasurements") if g.get("batchId") == b["id"]), key=lambda g: g["date"])
    deaths = [m for m in s.list("mortalityEvents") if m.get("batchId") == b["id"]]
    sown, sowing = b.get("seedsSown") or 0, b.get("sowingDate")
    germ_pct = germination_percent(counts, sown)
    first, last = (growth[0], growth[-1]) if growth else (None, None)
    span = days_after_sowing(last["date"], first["date"]) if growth else 0
    rgr = relative_growth_rate(first["avgHeightCm"], last["avgHeightCm"], span) if growth and span > 0 else None

    m = st.columns(4)
    m[0].metric("Seeds sown", f"{sown:,}" if sown else "—")
    m[1].metric("Germination", fmt(germ_pct, 1, "%"))
    m[2].metric(
        "RGR (height)", fmt(rgr, 3, "d⁻¹"), help="(ln H₂ − ln H₁) / Δt between the first and latest measurement"
    )
    m[3].metric("Recorded deaths", sum(d["count"] for d in deaths))

    info, germ_tab, growth_tab, edit_tab = st.tabs(["Info", "Germination", "Growth", "Edit"])
    with info:
        lot = s.get("seedLots", b["seedLotId"]) if b.get("seedLotId") else None
        st.dataframe(
            {
                "Field": ["Sowing date", "Stage", "Bed / tray", "Area sown", "Substrate", "Seed lot", "Notes"],
                "Value": [
                    sowing or "—",
                    b["status"],
                    b.get("bedTrayNumber") or "—",
                    fmt(b.get("areaSownM2"), 2, "m²"),
                    b.get("substrateMix") or "—",
                    lot["lotNumber"] if lot else "—",
                    b.get("notes") or "—",
                ],
            },
            hide_index=True,
        )
        st.markdown("**Linked records**")
        cols = st.columns(4)
        for i, (col, (label, page)) in enumerate(LINKED.items()):
            n = sum(1 for r in s.list(col) if r.get("batchId") == b["id"])
            cols[i % 4].page_link(page, label=f"{label}: {n}")

    with germ_tab:
        if not counts:
            st.info("No germination counts for this batch yet.", icon=":material/info:")
            st.page_link(
                "app_pages/germination.py", label="Open the germination tracker", icon=":material/arrow_forward:"
            )
        else:
            labels = [f"D{days_after_sowing(c['date'], sowing)}" if sowing else c["date"] for c in counts]
            mgt = mean_germination_time(counts, sowing) if sowing else None
            energy = germination_energy(counts, sown, sowing, 7) if sowing else None
            g = st.columns(3)
            g[0].metric("Mean germination time", fmt(mgt, 1, "days"), help="Σ(tᵢ·nᵢ)/Σnᵢ from the sowing date")
            g[1].metric("Germination energy (day 7)", fmt(energy, 1, "%"))
            g[2].metric("Germinated", f"{sum(c['count'] for c in counts):,}")
            x_title = "Days after sowing" if sowing else "Date"
            st.markdown("**Daily germinants**")
            charts.show(charts.bar(labels, [c["count"] for c in counts], "Seeds", x_title, hover="%{y} seeds"))
            if sown:
                st.markdown("**Cumulative germination**")
                charts.show(
                    charts.lines(
                        labels,
                        {"Cumulative": [round(x, 1) for x in cumulative_germination(counts, sown)]},
                        "Germination (%)",
                        x_title,
                        hover_unit=" %",
                    )
                )
            else:
                st.caption("Add seeds sown to see the cumulative germination curve.")

    with growth_tab:
        if not growth:
            st.info("No growth measurements for this batch yet.", icon=":material/info:")
            st.page_link("app_pages/morphometrics.py", label="Open morphometrics", icon=":material/arrow_forward:")
        else:
            with_mass = next((g for g in reversed(growth) if g.get("shootDryWeight") and g.get("rootDryWeight")), None)
            dqi = (
                dickson_quality_index(
                    with_mass["avgHeightCm"],
                    with_mass["avgRCDmm"],
                    with_mass["shootDryWeight"],
                    with_mass["rootDryWeight"],
                )
                if with_mass
                else None
            )
            g = st.columns(2)
            g[0].metric(
                "Dickson quality index",
                fmt(dqi, 2),
                help=f"From {with_mass['date']}" if with_mass else "Needs shoot and root dry mass",
            )
            g[1].metric("Sturdiness H/D", fmt(sturdiness_quotient(last["avgHeightCm"], last["avgRCDmm"]), 1, "cm mm⁻¹"))
            dates = [x["date"] for x in growth]
            c = st.columns(2)
            with c[0]:
                st.markdown("**Mean height**")
                charts.show(
                    charts.lines(
                        dates,
                        {"Height": [x["avgHeightCm"] for x in growth]},
                        "Height (cm)",
                        hover_unit=" cm",
                        height=260,
                    )
                )
            with c[1]:
                st.markdown("**Mean root-collar diameter**")
                charts.show(
                    charts.lines(
                        dates, {"RCD": [x["avgRCDmm"] for x in growth]}, "RCD (mm)", hover_unit=" mm", height=260
                    )
                )

    with edit_tab:
        batch_form(b)
        linked = sum(1 for col in LINKED for r in s.list(col) if r.get("batchId") == b["id"]) + sum(
            1 for gh in s.list("greenhouses") for p in gh.get("placements", []) if p.get("batchId") == b["id"]
        )
        st.divider()
        if linked:
            st.caption(
                f"This batch has {linked} linked record{'s' if linked > 1 else ''} (counts, measurements, "
                "treatments or bench positions), so it can't be deleted. Set its stage to “outplanted” when it "
                "leaves the nursery."
            )
        elif st.toggle("Delete this batch", key="del-toggle"):
            st.warning(f"Delete {b['batchNumber']}? This can't be undone.")
            if st.button("Delete batch", type="primary"):
                s.remove("batches", b["id"])
                st.query_params.clear()
                flash(f"{b['batchNumber']} deleted.")
                st.rerun()


selected = st.query_params.get("batch")
batch = idx.by_id.get(selected) if selected else None
if selected and not batch:
    st.query_params.clear()
    st.warning("That batch no longer exists.")

if batch:
    detail(batch)
else:
    header("Nursery batches", f"{len(idx.batches)} batch{'es' if len(idx.batches) != 1 else ''}")
    review = sum(1 for b in idx.batches if b.get("needsReview"))
    if review:
        st.warning(
            f"{review} batch{'es were' if review > 1 else ' was'} created from earlier records. Open "
            f"{'each' if review > 1 else 'it'} to add the species, sowing date and seeds sown.",
            icon=":material/warning:",
        )
    all_tab, new_tab = st.tabs(["All batches", "New batch"])
    with all_tab:
        ordered = sorted(idx.batches, key=lambda b: (b.get("sowingDate") or "", b["batchNumber"]), reverse=True)
        if not ordered:
            st.info(
                "No batches yet. Add a sowing under **New batch**. Germination, growth and treatment records link "
                "to batches.",
                icon=":material/potted_plant:",
            )
        else:
            counts = s.list("germinationCounts")
            rows = [
                {
                    "Batch": b["batchNumber"],
                    "Species": idx.species_name(b.get("speciesId")) or "Not set",
                    "Stage": b["status"],
                    "Sown": b.get("sowingDate") or "—",
                    "Seeds": b.get("seedsSown"),
                    "Germination %": round(g, 1)
                    if (
                        g := germination_percent(
                            [c for c in counts if c.get("batchId") == b["id"]], b.get("seedsSown") or 0
                        )
                    )
                    is not None
                    else None,
                    "Bed / tray": b.get("bedTrayNumber") or "",
                    "Flags": " ".join(
                        f for f, on in (("needs review", b.get("needsReview")), ("example", b.get("isExample"))) if on
                    ),
                }
                for b in ordered
            ]
            event = st.dataframe(
                rows, hide_index=True, on_select="rerun", selection_mode="single-row", key="batch-list"
            )
            st.caption("Select a batch to open its record, charts and edit form.")
            if event.selection.rows:
                st.query_params["batch"] = ordered[event.selection.rows[0]]["id"]
                st.rerun()
            example_note(ordered)
    with new_tab:
        batch_form(None)
