import { VPD_BANDS, getVpdBand } from '../../utils/calculations';
import { vpdToneFill } from './vpdTone';

const SCALE_MAX = 2.0; // kPa shown on the bar; readings above are pinned to the end
const TICKS = [0, 0.4, 0.8, 1.2, 1.6, 2.0];
const pos = (v: number) => (Math.min(Math.max(v, 0), SCALE_MAX) / SCALE_MAX) * 100;

/** Horizontal 0–2 kPa VPD scale with guidance bands and a marker at the reading. */
const VpdScale = ({ value }: { value: number }) => {
  const band = getVpdBand(value);
  return (
    <div role="img" aria-label={`VPD ${value.toFixed(2)} kPa: ${band.label}`}>
      <div className="relative">
        <div className="h-2.5 rounded-sm overflow-hidden flex">
          {VPD_BANDS.map((b, i) => {
            const from = i === 0 ? 0 : Math.min(VPD_BANDS[i - 1].max, SCALE_MAX);
            const to = Math.min(b.max, SCALE_MAX);
            return <div key={b.label} className={vpdToneFill[b.tone]} style={{ width: `${((to - from) / SCALE_MAX) * 100}%` }} />;
          })}
        </div>
        <div className="absolute -top-1 h-[18px] w-0.5 bg-gray-900 -translate-x-1/2" style={{ left: `${pos(value)}%` }} />
      </div>
      <div className="relative h-4 mt-1.5 font-mono-sci text-[10px] text-gray-500">
        {TICKS.map((t, i) => (
          <span
            key={t}
            className="absolute"
            style={{ left: `${pos(t)}%`, transform: i === 0 ? 'none' : i === TICKS.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}
          >
            {t.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VpdScale;
