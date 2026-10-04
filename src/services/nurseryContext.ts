import type { Batch, ClimateReading, GerminationCount, GrowthMeasurement, MortalityEvent, SeedLot, Species } from '../data/schema';
import { calculateVPD } from '../utils/calculations';

export type NurserySnapshot = {
  batches: readonly Batch[];
  species: readonly Species[];
  seedLots: readonly SeedLot[];
  germination: readonly GerminationCount[];
  growth: readonly GrowthMeasurement[];
  climate: readonly ClimateReading[];
  mortality: readonly MortalityEvent[];
};

const latest = <T extends { date: string }>(rows: readonly T[]) => [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];

/** Per-batch figures computed from the records (no invented values). */
export function batchFacts(s: NurserySnapshot, b: Batch) {
  const sp = s.species.find(x => x.id === b.speciesId)?.botanicalName ?? 'species not set';
  const germinated = s.germination.filter(g => g.batchId === b.id).reduce((n, g) => n + g.count, 0);
  const dead = s.mortality.filter(m => m.batchId === b.id).reduce((n, m) => n + m.count, 0);
  const g = latest(s.growth.filter(x => x.batchId === b.id));
  const parts = [
    `${b.batchNumber}: ${sp}, stage ${b.status}`,
    `sown ${b.sowingDate ?? 'date not recorded'}`,
    b.seedsSown ? `${b.seedsSown} seeds sown` : 'seeds sown not recorded',
    b.seedsSown ? `germination ${((germinated / b.seedsSown) * 100).toFixed(1)} % (${germinated} seeds)` : `${germinated} germinated`,
    `${dead} recorded deaths`,
    g ? `latest growth ${g.date}: height ${g.avgHeightCm} cm, root-collar diameter ${g.avgRCDmm} mm (n=${g.sampleSize})` : 'no growth measurements',
  ];
  return parts.join('; ');
}

/** Context block for the language model, built only from the user's records. */
export function buildNurseryContext(s: NurserySnapshot): string {
  const lines: string[] = ['NURSERY RECORDS (only facts below are known; say "not in the records" otherwise)'];
  lines.push(`Batches (${s.batches.length}):`);
  s.batches.slice(0, 40).forEach(b => lines.push(`- ${batchFacts(s, b)}`));
  lines.push(`Seed lots (${s.seedLots.length}):`);
  s.seedLots.slice(0, 40).forEach(l => {
    const sp = s.species.find(x => x.id === l.speciesId)?.botanicalName ?? 'species not set';
    lines.push(`- ${l.lotNumber}: ${sp}; stock ${l.stockKg ?? '?'} kg; moisture ${l.moistureContentPct ?? '?'} %; viability ${l.viabilityPct ?? '?'} %; collected ${l.collectionDate ?? '?'}`);
  });
  const c = latest(s.climate);
  lines.push(c
    ? `Latest climate reading ${c.date}: T ${c.tempMin}–${c.tempMax} °C (mean ${c.tempMean}), RH ${c.humidity} %, VPD ${calculateVPD(c.tempMean, c.humidity).toFixed(2)} kPa, PAR ${c.lightIntensity}, photoperiod ${c.photoperiod} h`
    : 'No climate readings recorded.');
  lines.push(`Species reference: ${s.species.map(x => `${x.botanicalName} (${x.storageBehaviour} seed storage)`).join('; ')}`);
  return lines.join('\n');
}

const KNOWLEDGE: { keys: string[]; answer: string }[] = [
  { keys: ['vpd', 'vapour pressure', 'vapor pressure'], answer: '### Vapour pressure deficit (VPD)\nThe difference between how much water vapour the air could hold at its temperature and how much it holds. It drives transpiration more directly than relative humidity.\n- Calculated here with the Tetens equation: VPD = 0.61078·e^(17.27T/(T+237.3)) × (1 − RH/100) kPa.\n- Common greenhouse guidance: about 0.4–0.8 kPa for propagation and 0.8–1.2 kPa for vegetative growth.' },
  { keys: ['dqi', 'dickson'], answer: '### Dickson quality index\nDQI = total dry mass (g) / [height (cm) ÷ root-collar diameter (mm) + shoot dry mass ÷ root dry mass] (Dickson et al. 1960). Higher values indicate a sturdier, better-balanced seedling.' },
  { keys: ['rcbd', 'randomized complete block', 'randomised complete block'], answer: '### Randomised complete block design (RCBD)\nGroup plots into blocks that are as uniform as possible (e.g. along a light or temperature gradient). Every treatment appears once in each block, randomised independently within each block. Analyse with two-way ANOVA (treatment + block).' },
  { keys: ['epigeal', 'hypogeal', 'germination type'], answer: '### Germination types\n- Epigeal: cotyledons are lifted above the soil (e.g. *Pinus*).\n- Hypogeal: cotyledons stay below ground (e.g. *Quercus*).' },
  { keys: ['cedrus', 'deodar'], answer: '### *Cedrus deodara* (deodar)\nSeed is oily and short-lived at ambient temperature (about one season). It behaves as sub-orthodox: dried to about 10 % moisture content and stored at −5 °C it stayed viable for more than 650 days.' },
  { keys: ['mgt', 'mean germination time'], answer: '### Mean germination time\nMGT = Σ(tᵢ·nᵢ) / Σnᵢ, where nᵢ seeds germinated on day tᵢ after sowing. Lower values mean faster germination.' },
];

/** Answer without a language model: look up the user's records, then a small reference set. */
export function offlineAnswer(query: string, s: NurserySnapshot): string {
  const q = query.toLowerCase();
  const batch = s.batches.find(b => q.includes(b.batchNumber.toLowerCase()));
  if (batch) return `### ${batch.batchNumber}\n${batchFacts(s, batch).split('; ').slice(1).map(p => `- ${p}`).join('\n')}`;
  const lot = s.seedLots.find(l => q.includes(l.lotNumber.toLowerCase()));
  if (lot) {
    const sp = s.species.find(x => x.id === lot.speciesId)?.botanicalName ?? 'species not set';
    return `### Seed lot ${lot.lotNumber}\n- ${sp}\n- Stock: ${lot.stockKg ?? 'not recorded'} kg\n- Moisture content: ${lot.moistureContentPct ?? 'not recorded'} %\n- Viability: ${lot.viabilityPct ?? 'not recorded'} %\n- Collected: ${lot.collectionDate ?? 'not recorded'}`;
  }
  const hit = KNOWLEDGE.find(k => k.keys.some(key => q.includes(key)));
  if (hit) return hit.answer;
  return 'Offline mode can answer from your records (name a batch number such as NB-2024-001 or a seed lot such as SL-001) and explain VPD, mean germination time, the Dickson quality index, RCBD trials and *Cedrus deodara* seed storage. Add a Gemini API key for open questions.';
}
