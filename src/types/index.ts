export interface SeedLot {
  id: string;
  speciesId: string;
  lotNumber: string;
  collectionDate: string;
  location: {
    lat: number;
    lng: number;
    description: string;
  };
  moistureContent: number;
  germinationTestPercentage: number;
  viabilityPercentage: number; // Tetrazolium test
  thousandSeedWeight: number; // grams
  dormancyType: 'none' | 'physical' | 'physiological' | 'morphological' | 'combined';
  breakingTreatment: string;
  stockKg: number;
  createdAt: string;
}

export interface NurseryBatch {
  id: string;
  seedLotId: string;
  speciesId: string;
  batchNumber: string;
  sowingDate: string;
  bedTrayNumber: string;
  substrateMix: string;
  seedsSown: number;
  areaSownM2: number;
  status: 'sown' | 'germinating' | 'growing' | 'hardening' | 'ready' | 'outplanted';
  createdAt: string;
}

export interface GerminationLog {
  id: string;
  batchId: string;
  date: string;
  count: number; // Daily new germinated seeds
}

export interface GrowthLog {
  id: string;
  batchId: string;
  date: string;
  sampleSize: number;
  avgHeightCm: number;
  avgRCDmm: number; // Root Collar Diameter
  avgLeaves: number;
  leafAreaIndex?: number;
  shootDryWeight?: number;
  rootDryWeight?: number;
}

export interface ClimateLog {
  id: string;
  date: string;
  tempMin: number;
  tempMax: number;
  tempMean: number;
  humidity: number;
  lightIntensity: number; // lux or PAR
  photoperiod: number;
  co2?: number;
}

export interface FertLog {
  id: string;
  batchId?: string; // Optional if applied to whole nursery
  date: string;
  npkRatio: string;
  dosage: number; // mg/L or g/m2
  ph?: number;
  ec?: number;
}

export interface PestLog {
  id: string;
  batchId: string;
  date: string;
  pestDiseaseName: string;
  incidencePercentage: number;
  severityScale: 1 | 2 | 3 | 4 | 5;
  photoUrl?: string;
  treatmentDate?: string;
  treatmentChemical?: string;
}

export interface Species {
  id: string;
  botanicalName: string;
  commonName: string;
  family: string;
  seedType: string;
  dormancyClass: string;
  minHThreshold: number;
  minRCDThreshold: number;
  recommendedSowingSeason: string;
}

export interface Inventory {
  id: string;
  itemType: 'seed' | 'bag' | 'tray' | 'chemical' | 'fertilizer';
  itemName: string;
  quantity: number;
  unit: string;
  lastUpdated: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
