import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { paletteColor, chartChrome } from '../../utils/chartColors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface GrowthChartProps {
  labels: string[];
  heightData: number[];
  rcdData: number[];
  title?: string;
}

const GrowthChart: React.FC<GrowthChartProps> = ({ labels, heightData, rcdData, title }) => {
  const ui = chartChrome();
  const data: ChartData<'line'> = {
    labels,
    datasets: [
      { label: 'Height (cm)', data: heightData, borderColor: paletteColor('green-600'), backgroundColor: paletteColor('green-600', 0.1), tension: 0.4, fill: true, yAxisID: 'y' },
      { label: 'RCD (mm)', data: rcdData, borderColor: paletteColor('blue-500'), backgroundColor: paletteColor('blue-500', 0.1), tension: 0.4, fill: true, yAxisID: 'y1' },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: ui.text, usePointStyle: true, boxWidth: 6, font: { size: 9, weight: 'bold' } } },
      title: { display: !!title, text: title, color: ui.text },
    },
    scales: {
      y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'H (cm)', color: ui.muted, font: { size: 9, weight: 'bold' } }, ticks: { color: ui.muted }, grid: { drawOnChartArea: false, color: ui.grid } },
      y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'RCD (mm)', color: ui.muted, font: { size: 9, weight: 'bold' } }, ticks: { color: ui.muted }, grid: { drawOnChartArea: false, color: ui.grid } },
      x: { grid: { display: false }, ticks: { color: ui.muted, font: { size: 9 } } }
    },
  };
  return <Line data={data} options={options} />;
};
export default GrowthChart;
