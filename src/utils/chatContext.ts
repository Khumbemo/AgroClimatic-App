/**
 * Utility to gather app-wide nursery and greenhouse data for AI context.
 * In a real app, this would pull from Firestore or Global State.
 */

export const getNurseryContext = () => {
  const activeBatches = [
    { id: '1', number: 'NB-2024-001', species: 'Pinus roxburghii', status: 'growing', sown: '2024-03-10', seeds: 1000 },
    { id: '2', number: 'NB-2024-002', species: 'Cedrus deodara', status: 'germinating', sown: '2024-03-15', seeds: 500 }
  ];

  const seedLots = [
    { lot: 'SL-001', species: 'Pinus roxburghii', stock: '12.5kg', moisture: '8.2%', origin: 'Uttarakhand' },
    { lot: 'SL-002', species: 'Cedrus deodara', stock: '5.0kg', moisture: '9.1%', origin: 'Himachal' }
  ];

  const greenhouseSensors = {
    id: 'GHG-01',
    vpd: '1.24 kPa',
    tempMean: '24.5C',
    rh: '62%',
    status: 'OPTIMAL'
  };

  return `
CURRENT NURSERY DATA (FOR RESEARCH CONTEXT):
- Active Batches:
  ${activeBatches.map(b => `* ${b.number}: ${b.species} (${b.status}), sown ${b.sown}, count: ${b.seeds}`).join('\n  ')}

- Seed Inventory:
  ${seedLots.map(s => `* ${s.lot}: ${s.species}, Stock: ${s.stock}, Moisture: ${s.moisture}, Origin: ${s.origin}`).join('\n  ')}

- Greenhouse GHG-01 Real-time Stats:
  * VPD: ${greenhouseSensors.vpd}
  * Temperature: ${greenhouseSensors.tempMean}
  * Humidity: ${greenhouseSensors.rh}
  * System Status: ${greenhouseSensors.status}
`;
};
