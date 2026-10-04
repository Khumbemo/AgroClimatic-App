import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineController, LineElement, PointElement, Tooltip, type ChartData, type ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { chartChrome, paletteColor } from '../../utils/chartColors';

ChartJS.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler, Tooltip, Legend);

export type Series = {
  label: string;
  data: (number | null)[];
  /** Palette variable, e.g. 'green-600', 'blue-500', 'amber-500'. */
  color: string;
  axis?: 'y' | 'y1';
  fill?: boolean;
  dashed?: boolean;
};

type Props = { labels: string[]; series: Series[]; yTitle: string; y1Title?: string; yMin?: number; yMax?: number };

/** Line chart over dates with one or two y axes, coloured from the theme palette. */
const TimeSeriesChart = ({ labels, series, yTitle, y1Title, yMin, yMax }: Props) => {
  const ui = chartChrome();
  const data: ChartData<'line'> = {
    labels,
    datasets: series.map(s => ({
      label: s.label,
      data: s.data,
      borderColor: paletteColor(s.color),
      backgroundColor: paletteColor(s.color, s.fill ? 0.12 : 1),
      fill: s.fill ? 'origin' : false,
      borderDash: s.dashed ? [5, 4] : undefined,
      borderWidth: 2,
      pointRadius: labels.length > 30 ? 0 : 3,
      tension: 0.25,
      spanGaps: true,
      yAxisID: s.axis ?? 'y',
    })),
  };
  const axisTitle = (text: string) => ({ display: true, text, color: ui.muted, font: { size: 10 } });
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top', labels: { color: ui.text, usePointStyle: true, boxWidth: 6, font: { size: 10 } } } },
    scales: {
      x: { ticks: { color: ui.muted, font: { size: 10 }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
      y: { title: axisTitle(yTitle), ticks: { color: ui.muted, font: { size: 10 } }, grid: { color: ui.grid }, min: yMin, max: yMax },
      ...(y1Title ? { y1: { position: 'right' as const, title: axisTitle(y1Title), ticks: { color: ui.muted, font: { size: 10 } }, grid: { drawOnChartArea: false } } } : {}),
    },
  };
  return <Line data={data} options={options} />;
};

export default TimeSeriesChart;
