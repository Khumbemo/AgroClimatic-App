"""
Plotly figures with the app's chart conventions: one y-axis per chart (two measures with
different units get two charts), fixed categorical hue order, thin marks, hover on every mark,
and colours stepped separately for the light and dark themes.
"""

from __future__ import annotations

from collections.abc import Sequence

import plotly.graph_objects as go
import streamlit as st

# Categorical slots, in fixed order (validated palette; light / dark steps).
_SERIES = {
    "light": ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
    "dark": ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
}
_INK = {"light": ("#0b0b0b", "#52514e", "#e4e3df"), "dark": ("#ffffff", "#c3c2b7", "#3a3a37")}


def mode() -> str:
    try:
        return "dark" if st.context.theme.type == "dark" else "light"
    except Exception:
        return "light"


def series_color(i: int) -> str:
    return _SERIES[mode()][i % 8]


def _layout(fig: go.Figure, y_title: str, x_title: str = "", height: int = 300, legend: bool = False) -> go.Figure:
    primary, secondary, grid = _INK[mode()]
    fig.update_layout(
        height=height,
        margin=dict(l=64, r=16, t=16, b=56),
        showlegend=legend,
        hovermode="x unified",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color=secondary, size=12),
        bargap=0.35,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0, font=dict(color=primary)),
    )
    fig.update_xaxes(
        title=x_title or None, showgrid=False, linecolor=grid, ticks="outside", tickcolor=grid, automargin=True
    )
    fig.update_yaxes(title=y_title or None, gridcolor=grid, zeroline=False, rangemode="tozero", automargin=True)
    return fig


def bar(
    x: Sequence,
    y: Sequence[float],
    y_title: str,
    x_title: str = "",
    name: str = "",
    hover: str = "%{y}",
    color: int = 0,
) -> go.Figure:
    fig = go.Figure(
        go.Bar(
            x=list(x),
            y=list(y),
            name=name,
            marker=dict(color=series_color(color), cornerradius=4),
            hovertemplate=hover + "<extra></extra>",
        )
    )
    return _layout(fig, y_title, x_title)


def lines(
    x: Sequence,
    series: dict[str, Sequence[float]],
    y_title: str,
    x_title: str = "",
    hover_unit: str = "",
    height: int = 300,
) -> go.Figure:
    fig = go.Figure()
    for i, (name, ys) in enumerate(series.items()):
        fig.add_trace(
            go.Scatter(
                x=list(x),
                y=list(ys),
                name=name,
                mode="lines+markers",
                line=dict(color=series_color(i), width=2),
                marker=dict(size=8, line=dict(width=2, color="rgba(0,0,0,0)")),
                hovertemplate=f"{name}: %{{y:.2f}}{hover_unit}<extra></extra>",
            )
        )
    return _layout(fig, y_title, x_title, height, legend=len(series) > 1)


def means_with_se(
    levels: Sequence[str], means: Sequence[float], se: Sequence[float], letters: Sequence[str], y_title: str
) -> go.Figure:
    """Treatment means ± SE with compact letters above each bar."""
    fig = go.Figure(
        go.Bar(
            x=list(levels),
            y=list(means),
            marker=dict(color=series_color(0), cornerradius=4),
            error_y=dict(type="data", array=list(se), color=_INK[mode()][1], thickness=1.5, width=4),
            text=list(letters),
            textposition="outside",
            cliponaxis=False,
            textfont=dict(color=_INK[mode()][0]),
            customdata=list(zip(se, letters, strict=True)),
            hovertemplate="%{x}<br>mean %{y:.3g} ± %{customdata[0]:.2g} SE<br>group %{customdata[1]}<extra></extra>",
        )
    )
    fig = _layout(fig, y_title, height=320)
    fig.update_layout(hovermode="closest")
    return fig


def scatter(
    x: Sequence[float],
    y: Sequence[float],
    x_title: str,
    y_title: str,
    ref_line: tuple | None = None,
    zero_line: bool = False,
) -> go.Figure:
    fig = go.Figure(
        go.Scatter(
            x=list(x),
            y=list(y),
            mode="markers",
            marker=dict(size=8, color=series_color(0), line=dict(width=1, color="white")),
            hovertemplate=f"{x_title}: %{{x:.3g}}<br>{y_title}: %{{y:.3g}}<extra></extra>",
        )
    )
    grid = _INK[mode()][1]
    if ref_line:
        (x0, y0), (x1, y1) = ref_line
        fig.add_shape(type="line", x0=x0, y0=y0, x1=x1, y1=y1, line=dict(color=grid, width=1, dash="dot"))
    if zero_line:
        fig.add_hline(y=0, line=dict(color=grid, width=1, dash="dot"))
    fig = _layout(fig, y_title, x_title, height=280)
    fig.update_layout(hovermode="closest")
    fig.update_yaxes(rangemode="normal")
    fig.update_xaxes(zeroline=False)
    return fig


def show(fig: go.Figure, key: str | None = None) -> None:
    st.plotly_chart(
        fig, theme=None, key=key, config={"displaylogo": False, "modeBarButtonsToRemove": ["select2d", "lasso2d"]}
    )


def hbar(labels: Sequence[str], values: Sequence[float], x_title: str, hover: str = "%{x}") -> go.Figure:
    """Horizontal bars, largest first (labels read left to right)."""
    fig = go.Figure(
        go.Bar(
            y=list(labels),
            x=list(values),
            orientation="h",
            marker=dict(color=series_color(0), cornerradius=4),
            text=[f"{v:g}" for v in values],
            textposition="outside",
            cliponaxis=False,
            hovertemplate="%{y}: " + hover + "<extra></extra>",
        )
    )
    fig = _layout(fig, "", height=max(160, 44 * len(labels) + 40))
    fig.update_layout(hovermode="closest")
    fig.update_xaxes(title=x_title, rangemode="tozero", gridcolor=_INK[mode()][2], showgrid=True)
    fig.update_yaxes(autorange="reversed", showgrid=False, title=None)
    return fig
