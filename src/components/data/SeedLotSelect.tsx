import { useCollection } from '../../data/hooks';

type Props = { id: string; value: string | null; onChange: (seedLotId: string | null) => void; className?: string };

const SeedLotSelect = ({ id, value, onChange, className }: Props) => {
  const { items: lots } = useCollection('seedLots');
  const { items: species } = useCollection('species');
  const name = new Map(species.map(s => [s.id, s.botanicalName]));
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      className={className ?? 'w-full mt-1 p-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-green-600'}
    >
      <option value="">No seed lot</option>
      {lots.map(l => (
        <option key={l.id} value={l.id}>{l.lotNumber}{l.speciesId && name.get(l.speciesId) ? ` · ${name.get(l.speciesId)}` : ''}</option>
      ))}
    </select>
  );
};

export default SeedLotSelect;
