import { buildCurated } from "./build";
import { CULTURE_SPECS } from "./culture";
import { EXTRA_SPECS } from "./extra";
import { EXTRA2_SPECS } from "./extra2";
import { EXTRA3_SPECS } from "./extra3";
import { GENERAL_SPECS } from "./general";
import { HARD_SPECS } from "./hard";
import { LIFE_SPECS } from "./life";
import { SCIENCE_SPECS } from "./science";

// Håndskrevne spørgsmål fra den redaktionelle gennemgang i 2026.
export const CURATED_2026_QUESTIONS = buildCurated([
  ...GENERAL_SPECS,
  ...SCIENCE_SPECS,
  ...CULTURE_SPECS,
  ...LIFE_SPECS,
  ...HARD_SPECS,
  ...EXTRA_SPECS,
  ...EXTRA2_SPECS,
  ...EXTRA3_SPECS,
]);
