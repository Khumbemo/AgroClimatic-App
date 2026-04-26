/**
 * ADVANCED SCIENTIFIC CONTEXT UTILITY
 * Aggregates granular nursery, greenhouse, and experiment data for AI grounding.
 */

export const getNurseryContext = () => {
  const activeBatches = [
    {
      number: 'NB-2024-001',
      species: 'Pinus roxburghii',
      status: 'growing',
      sown: '2024-03-10',
      seeds: 1000,
      substrate: 'Coir:Soil (70:30)',
      avgHeight: '12.4cm',
      mortalityRate: '2.5%'
    },
    {
      number: 'NB-2024-002',
      species: 'Cedrus deodara',
      status: 'germinating',
      sown: '2024-03-15',
      seeds: 500,
      substrate: 'Sand:Coir (50:50)',
      soilPH: '6.4'
    }
  ];

  const seedLots = [
    { lot: 'SL-001', species: 'Pinus roxburghii', stock: '12.5kg', moisture: '8.2%', origin: 'Uttarakhand', viability: '94%' },
    { lot: 'SL-002', species: 'Cedrus deodara', stock: '5.0kg', moisture: '9.1%', origin: 'Himachal', viability: '88%' }
  ];

  const greenhouseSensors = {
    id: 'GHG-01',
    vpd: '1.24 kPa',
    tempMean: '24.5C',
    rh: '62%',
    par: '450 umol/m2/s',
    irrigation: 'Automated (Twice daily, 0800 & 1700)',
    systemStatus: 'NOMINAL - OPTIMAL RANGE'
  };

  return `
[STRICT REFERENCE DATA - DO NOT DEVIATE]

1. ACTIVE NURSERY BATCHES:
${activeBatches.map(b => `- ${b.number}: ${b.species} | Status: ${b.status} | Sown: ${b.sown} | Seeds: ${b.seeds} | Substrate: ${b.substrate || 'N/A'} | Mortality: ${b.mortalityRate || '0%'} | Soil PH: ${b.soilPH || 'N/A'}`).join('\n')}

2. SEED INVENTORY (CURRENT STOCKS):
${seedLots.map(s => `- ${s.lot}: ${s.species} | Stock: ${s.stock} | Moisture: ${s.moisture} | Origin: ${s.origin} | Viability: ${s.viability}`).join('\n')}

3. GREENHOUSE GHG-01 REAL-TIME TELEMETRY:
- VPD: ${greenhouseSensors.vpd}
- Light (PAR): ${greenhouseSensors.par}
- Environment: ${greenhouseSensors.tempMean} / ${greenhouseSensors.rh} humidity.
- Irrigation Schedule: ${greenhouseSensors.irrigation}
- Global System Status: ${greenhouseSensors.systemStatus}
`;
};
