/**
 * Resolve a palette variable from src/index.css (e.g. 'green-600') to an rgba() string for
 * Chart.js, which draws on canvas and can't use CSS variables. Read at render time so charts
 * follow the active light/dark theme.
 */
export const paletteColor = (name: string, alpha = 1): string => {
  const channels = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(/\s+/);
  return channels.length === 3 ? `rgba(${channels.join(', ')}, ${alpha})` : `rgba(110, 123, 107, ${alpha})`;
};

/** Axis, tick and legend colours shared by every chart. */
export const chartChrome = () => ({
  text: paletteColor('gray-600'),
  muted: paletteColor('gray-500'),
  grid: paletteColor('gray-200'),
});
