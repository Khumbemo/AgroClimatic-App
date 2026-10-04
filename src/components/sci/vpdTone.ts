import type { VpdBand } from '../../utils/calculations';

export const vpdToneFill: Record<VpdBand['tone'], string> = {
  water: 'bg-blue-200',
  'leaf-light': 'bg-green-200',
  leaf: 'bg-green-500',
  warn: 'bg-amber-300',
  critical: 'bg-red-300',
};

export const vpdToneChip: Record<VpdBand['tone'], string> = {
  water: 'text-blue-700 bg-blue-50 border-blue-200',
  'leaf-light': 'text-green-700 bg-green-50 border-green-200',
  leaf: 'text-green-800 bg-green-100 border-green-300',
  warn: 'text-amber-800 bg-amber-50 border-amber-200',
  critical: 'text-red-700 bg-red-50 border-red-200',
};
