/**
 * Scientific Mock Library for AgroBot.
 * Provides expert-level responses without an API key.
 */

const MOCK_KNOWLEDGE: Record<string, string> = {
  "default": "I am currently in **Simulated Research Mode**. To enable live dynamic responses, please add a free Google Gemini API key to your settings or .env file. However, I can still assist with core forestry concepts!",

  "tectona grandis": "### *Tectona grandis* (Teak)\n**Taxonomy:** Family Lamiaceae. \n**Ecology:** Deciduous tree, thrives in alluvial soils with high calcium. \n**Silviculture:** Managed primarily through clearfelling followed by stump planting. High light requirement (Light Demander).",

  "vpd": "### Vapor Pressure Deficit (VPD)\n**Definition:** The difference between the amount of moisture the air can hold and how much it currently holds.\n**Importance:** VPD is a better indicator of plant transpiration stress than Relative Humidity. \n**Range:** 0.8–1.2 kPa is generally considered optimal for most greenhouse crops.",

  "dqi": "### Dickson Quality Index (DQI)\n**Formula:** Total Dry Weight / [(Height / RCD) + (Shoot Weight / Root Weight)]\n**Utility:** A high DQI indicates a better-balanced seedling with a sturdy stem and robust root system, likely to survive outplanting.",

  "rcbd": "### Randomized Complete Block Design (RCBD)\n**Usage:** Standard design for nursery experiments where environmental gradients (like light or slope) exist.\n**Method:** Experimental units are grouped into 'blocks' to control for spatial variation, and treatments are randomized within each block.",

  "germination": "### Germination Physiology\n**Types:** \n1. **Epigeal:** Cotyledons emerge above ground (e.g., *Pinus roxburghii*).\n2. **Hypogeal:** Cotyledons remain below ground (e.g., *Quercus* species).",

  "cedrus deodara": "### *Cedrus deodara* (Deodar)\n**Status:** IUCN Least Concern but ecologically sensitive. \n**Seed Science:** Seeds are recalcitrant/intermediate and have high oil content, meaning they lose viability quickly if desiccated. Requires cold stratification (3-5°C) for 30-60 days."
};

export const getMockResponse = (input: string): string => {
  const query = input.toLowerCase();

  for (const key in MOCK_KNOWLEDGE) {
    if (query.includes(key)) return MOCK_KNOWLEDGE[key];
  }

  return `I recognize your query related to forestry research. In **Simulated Mode**, I can provide specific deep-dives on:
- *Tectona grandis*
- *Cedrus deodara*
- Vapor Pressure Deficit (VPD)
- Dickson Quality Index (DQI)
- Experimental Design (RCBD)

Please add a free **Google Gemini API Key** to enable my full PhD-level reasoning for any topic.`;
};
