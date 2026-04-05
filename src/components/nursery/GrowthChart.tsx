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
  const data: ChartData<'line'> = {
    labels,
    datasets: [
      { label: 'Height (cm)', data: heightData, borderColor: 'rgb(34, 197, 94)', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.4, fill: true, yAxisID: 'y' },
      { label: 'RCD (mm)', data: rcdData, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, fill: true, yAxisID: 'y1' },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, font: { size: 9, weight: 'bold' } } },
      title: { display: !!title, text: title },
    },
    scales: {
      y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'H (cm)', font: { size: 9, weight: 'bold' } }, grid: { drawOnChartArea: false } },
      y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'RCD (mm)', font: { size: 9, weight: 'bold' } }, grid: { drawOnChartArea: false } },
      x: { grid: { display: false }, ticks: { font: { size: 9 } } }
    },
  };
  return <Line data={data} options={options} />;
};
export default GrowthChart;
