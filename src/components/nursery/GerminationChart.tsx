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
  const data: ChartData<'bar' | 'line'> = {
    labels,
    datasets: [
      { type: 'bar' as const, label: 'Daily Germ.', data: dailyCount, backgroundColor: 'rgba(34, 197, 94, 0.6)', borderRadius: 4, yAxisID: 'y' },
      { type: 'line' as const, label: 'Cumul %', data: cumulativePercent, borderColor: 'rgb(234, 179, 8)', backgroundColor: 'rgba(234, 179, 8, 0.2)', borderWidth: 3, pointRadius: 4, tension: 0.4, yAxisID: 'y1', fill: true },
    ],
  };

  const options: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 6, font: { size: 9, weight: 'bold' } } } },
    scales: {
      y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Count', font: { size: 9, weight: 'bold' } } },
      y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: '%', font: { size: 9, weight: 'bold' } }, min: 0, max: 100, grid: { drawOnChartArea: false } },
      x: { grid: { display: false }, ticks: { font: { size: 9 } } }
    },
  };
  return <Chart type="bar" data={data} options={options} />;
};
export default GerminationChart;
