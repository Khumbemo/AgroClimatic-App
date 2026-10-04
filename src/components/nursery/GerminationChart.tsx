import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { paletteColor, chartChrome } from '../../utils/chartColors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface GerminationChartProps {
  labels: string[];
  dailyCount: number[];
  cumulativePercent: number[];
}

const GerminationChart: React.FC<GerminationChartProps> = ({ labels, dailyCount, cumulativePercent }) => {
  const ui = chartChrome();
  const data: ChartData<'bar' | 'line'> = {
    labels,
    datasets: [
      { type: 'bar' as const, label: 'Daily Germ.', data: dailyCount, backgroundColor: paletteColor('green-500', 0.7), borderRadius: 4, yAxisID: 'y' },
      { type: 'line' as const, label: 'Cumul %', data: cumulativePercent, borderColor: paletteColor('amber-500'), backgroundColor: paletteColor('amber-500', 0.15), borderWidth: 3, pointRadius: 4, tension: 0.4, yAxisID: 'y1', fill: true },
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { color: ui.text, usePointStyle: true, boxWidth: 6, font: { size: 9, weight: 'bold' } } } },
    scales: {
      y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Count', color: ui.muted, font: { size: 9, weight: 'bold' } }, ticks: { color: ui.muted }, grid: { color: ui.grid } },
      y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: '%', color: ui.muted, font: { size: 9, weight: 'bold' } }, ticks: { color: ui.muted }, min: 0, max: 100, grid: { drawOnChartArea: false } },
      x: { grid: { display: false }, ticks: { color: ui.muted, font: { size: 9 } } }
    },
  };
  return <Chart type="bar" data={data} options={options} />;
};
export default GerminationChart;
