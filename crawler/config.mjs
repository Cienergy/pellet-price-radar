/**
 * Pellet price signals — raw materials (RM), regions, grades.
 */

export const FEEDSTOCKS = [
  "Paddy straw",
  "Wheat straw",
  "Sugarcane trash / bagasse",
  "Mustard husk",
  "Cotton stalk",
  "Rice husk",
  "Mixed agri residue",
  "Torrefied / densified",
  "Wood / sawdust",
];

export const REGIONS = [
  "North India",
  "Punjab / Haryana",
  "Uttar Pradesh",
  "West India",
  "Maharashtra / Gujarat",
  "Central India",
  "East India",
  "South India",
  "All India",
];

export const GRADES = [
  "Non-torrefied agri pellet",
  "Torrefied pellet",
  "Industrial / co-firing grade",
  "Export / wood pellet",
];

/** Search queries used by the crawler. */
export const PRICE_QUERIES = [
  {
    label: "Agri pellet price IN",
    query: '"biomass pellet" OR "agro residue pellet" (price OR ₹ OR Rs OR "per tonne" OR "per ton" OR MT) India',
    region: "All India",
    feedstock: "Mixed agri residue",
    grade: "Non-torrefied agri pellet",
  },
  {
    label: "Paddy straw pellet",
    query: '"paddy straw pellet" OR "stubble pellet" (price OR ₹ OR Rs OR "per tonne") (Punjab OR Haryana OR India)',
    region: "Punjab / Haryana",
    feedstock: "Paddy straw",
    grade: "Non-torrefied agri pellet",
  },
  {
    label: "NTPC / co-firing buy",
    query: 'NTPC ("biomass pellet" OR "agro residue") (price OR benchmark OR "Rs" OR ₹ OR procurement)',
    region: "All India",
    feedstock: "Mixed agri residue",
    grade: "Industrial / co-firing grade",
  },
  {
    label: "Torrefied pellet",
    query: '"torrefied" pellet (price OR ₹ OR Rs OR "per tonne") India',
    region: "All India",
    feedstock: "Torrefied / densified",
    grade: "Torrefied pellet",
  },
  {
    label: "West India bagasse",
    query: '(bagasse OR "sugarcane trash") pellet (price OR ₹ OR Rs) (Maharashtra OR Gujarat OR India)',
    region: "Maharashtra / Gujarat",
    feedstock: "Sugarcane trash / bagasse",
    grade: "Non-torrefied agri pellet",
  },
  {
    label: "Mustard / cotton stalk",
    query: '("mustard husk" OR "cotton stalk") pellet (price OR ₹ OR Rs OR "per tonne") India',
    region: "North India",
    feedstock: "Mustard husk",
    grade: "Non-torrefied agri pellet",
  },
];

/** Conservative screening benchmarks (INR/MT ex-works-ish) when markets are quiet. */
export const BENCHMARKS = [
  { feedstock: "Paddy straw", region: "Punjab / Haryana", grade: "Non-torrefied agri pellet", price: 6200 },
  { feedstock: "Wheat straw", region: "North India", grade: "Non-torrefied agri pellet", price: 5800 },
  { feedstock: "Sugarcane trash / bagasse", region: "Maharashtra / Gujarat", grade: "Non-torrefied agri pellet", price: 5500 },
  { feedstock: "Mustard husk", region: "North India", grade: "Non-torrefied agri pellet", price: 6400 },
  { feedstock: "Cotton stalk", region: "West India", grade: "Non-torrefied agri pellet", price: 6000 },
  { feedstock: "Rice husk", region: "East India", grade: "Non-torrefied agri pellet", price: 5200 },
  { feedstock: "Mixed agri residue", region: "All India", grade: "Industrial / co-firing grade", price: 6500 },
  { feedstock: "Torrefied / densified", region: "All India", grade: "Torrefied pellet", price: 9200 },
  { feedstock: "Wood / sawdust", region: "South India", grade: "Export / wood pellet", price: 11000 },
];
