import { useBatchIndex } from '../../data/hooks';

type Props = {
  id: string;
  value: string | null;
  onChange: (batchId: string | null) => void;
  /** Offer a "Whole nursery" choice that maps to null (fertigation, pest scouting). */
  allowWholeNursery?: boolean;
  className?: string;
};

/** Pick a batch from the nursery's records instead of typing a batch ID. */
const BatchSelect = ({ id, value, onChange, allowWholeNursery, className }: Props) => {
  const { batches, label } = useBatchIndex();
  const sorted = [...batches].sort((a, b) => b.batchNumber.localeCompare(a.batchNumber));
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className={className ?? 'w-full mt-1 p-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-green-600'}
    >
      <option value="">{allowWholeNursery ? 'Whole nursery' : 'Select a batch'}</option>
      {sorted.map(b => (
        <option key={b.id} value={b.id}>{label(b.id)}{b.needsReview ? ' (needs review)' : ''}</option>
      ))}
    </select>
  );
};

export default BatchSelect;
