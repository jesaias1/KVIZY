import { fingerprint } from "@/lib/engine";
import type { Question } from "@/lib/types";

// Redaktionel gennemgang af hele banken (oktober 2026). Hvert spørgsmål er
// læst igennem og enten beholdt, rettet eller taget ud. Skabelonserier, hvor
// svarmulighederne afslørede svaret, og dubletter af samme faktum er fjernet.

const reviewedAt = "2026-10-02T00:00:00.000Z";

// Serier, der udgår som helhed. Enkelte velfungerende spørgsmål reddes nedenfor.
const RETIRED_PREFIXES = [
  "matrix-",
  "wd-",
  "wikithin-battle-country-",
  "wikithin-nordic-mountain-country-",
  "wikithin-athlete-sport-",
  "wikiculture-food-origin-",
];

const KEPT_FROM_RETIRED_SERIES = new Set([
  "matrix-cat-22-music-front-3",
  "matrix-cat-22-music-front-4",
  "matrix-cat-22-music-front-6",
  "matrix-cat-43-bake-technique-2",
  "matrix-cat-44-drink-serve-6",
  "wd-Q228-language",
  "wd-Q794-language",
  "wd-Q424-language",
  "wikiculture-food-origin-Q920940",
]);

const RETIRED_IDS = new Set([
  // For barnlige eller uden egentlig tvivl.
  "q-cat-1-2",
  "q-cat-1-4",
  "q-cat-1-6",
  "q-cat-3-4",
  "q-cat-27-1",
  "q-cat-28-4",
  "q-cat-28-5",
  "q-cat-41-3",
  "q-cat-44-6",
  "expansion-035",
  "expansion-152",
  "expansion-171",
  "format-depth-023",
  "format-depth-024",
  "format-depth-025",
  "theme-64-014",
  "theme-64-017",
  "theme-64-019",
  "theme-64-026",
  "theme-64-027",
  "theme-64-028",
  "theme-64-033",
  "theme-64-034",
  "theme-64-035",
  "theme-64-037",
  "q-cat-53-2",
  "q-cat-53-5",
  "q-cat-53-6",
  "format-depth-065",
  "format-depth-068",
  "decade-quality-052",
  "expansion-175",
  "curiosity-round-3-003",
  "curiosity-round-3-029",
  "curiosity-round-3-031",
  "curiosity-round-3-036",
  // Flertydige eller upræcise.
  "q-cat-2-6",
  "q-cat-3-6",
  "q-cat-4-3",
  "q-cat-12-4",
  "q-cat-12-5",
  "q-cat-14-1",
  "q-cat-14-2",
  "q-cat-47-3",
  "q-cat-50-5",
  "format-depth-044",
  "depth-036",
  "depth-038",
  "depth-044",
  "depth-047",
  // Samme faktum findes i en bedre udgave.
  "variety-063",
  "wikithin-invention-inventor-Q6368",
  "variety-069",
  "variety-070",
  "q-cat-13-1",
  "q-cat-13-3",
  "format-depth-059",
  "variety-102",
  "expansion-122",
  "wikithin-danish-literature-author-Q11868",
  "wikithin-danish-literature-author-Q11859",
  "wikithin-danish-literature-author-Q11872",
  "wikithin-danish-literature-author-Q11880",
  "wikithin-danish-literature-author-Q11876",
  "wikithin-danish-literature-author-Q1152009",
  "wikithin-danish-literature-author-Q1757858",
  "wikithin-danish-literature-author-Q1807554",
  "wikiculture-film-director-Q60072",
  "wikiculture-film-director-Q32303",
  "wikiculture-film-director-Q32433",
  "curiosity-round-3-001",
  "wikiculture-series-creator-Q183513",
  "wikiculture-series-creator-Q13979",
  "wikiculture-series-creator-Q199853",
  "wikiculture-series-creator-Q80044",
  "wikiculture-album-artist-Q27166",
  "q-cat-23-2",
  "curiosity-expansion-033",
  "variety-074",
  "variety-056",
  "expansion-101",
  "q-cat-31-3",
  "q-cat-31-5",
  "variety-046",
  "variety-026",
  "format-depth-051",
  "depth-039",
  "depth-027",
  "depth-051",
  "q-cat-35-6",
  "expansion-108",
  "format-depth-073",
  "variety-059",
  "q-cat-43-1",
  "curiosity-020",
  "variety-109",
  "variety-080",
  "q-cat-44-3",
  "expansion-151",
  "format-depth-030",
  "q-cat-48-3",
  "expansion-157",
  "expansion-156",
  "format-depth-046",
  "expansion-158",
  "expansion-118",
  "decade-quality-010",
  "variety-085",
  "variety-083",
  "q-cat-50-4",
  "expansion-161",
  "expansion-162",
  "q-cat-51-1",
  "q-cat-51-2",
  "expansion-167",
  "expansion-168",
  "q-cat-53-1",
  "expansion-174",
  "format-depth-067",
  "variety-115",
  "variety-106",
  "variety-105",
  "decade-quality-044",
  "decade-quality-021",
  "variety-113",
  "curiosity-027",
  "expansion-058",
  "curiosity-expansion-050",
  "curiosity-expansion-047",
  "curiosity-009",
  "curiosity-round-3-024",
  "theme-64-032",
  "theme-64-058",
  "theme-65-031",
]);

type Patch = {
  /** Ny formulering. */
  p?: string;
  /** Nye svarmuligheder: det rigtige svar først. */
  o?: [string, string, string, string];
  /** Nyt niveau 1-5. */
  d?: number;
  /** Ny forklaring. */
  e?: string;
};

const PATCHES: Record<string, Patch> = {
  // Paratviden og geografi
  "q-cat-2-1": { d: 1 },
  "q-cat-2-4": { d: 1 },
  "q-cat-3-1": { o: ["179", "175", "169", "199"] },
  "q-cat-3-2": { d: 3 },
  "q-cat-3-5": { d: 1 },
  "q-cat-4-4": { d: 3 },
  "q-cat-4-5": { o: ["Haag", "Genève", "Strasbourg", "Bruxelles"] },
  "q-cat-5-2": { d: 1 },
  "q-cat-5-5": { d: 1 },
  "expansion-067": {
    p: "Hvilken oldtidscivilisation udviklede kileskriften?",
    o: ["Sumererne", "Egypterne", "Fønikerne", "Minoerne"],
    d: 3,
  },
  "expansion-068": {
    o: [
      "Attentatet i Sarajevo",
      "Sænkningen af Lusitania",
      "Zimmermann-telegrammet",
      "Tysklands invasion af Polen",
    ],
  },
  "q-cat-6-1": { o: ["Donau", "Rhinen", "Elben", "Dnepr"] },
  "q-cat-6-2": {
    o: ["Kilimanjaro", "Mount Kenya", "Toubkal", "Mount Stanley"],
    d: 1,
  },
  "q-cat-6-3": { o: ["Canada", "Norge", "Rusland", "Indonesien"], d: 3 },
  "q-cat-6-4": { o: ["Ladoga", "Onega", "Vänern", "Balatonsøen"], d: 4 },
  "q-cat-6-6": { d: 1 },
  // Naturvidenskab, rummet og teknologi
  "q-cat-7-2": { d: 1 },
  "q-cat-7-3": { d: 1 },
  "q-cat-7-4": { d: 3 },
  "q-cat-7-6": { d: 3 },
  "wikithin-invention-inventor-Q2294": {
    p: "Hvem regnes for protonens opdager?",
    d: 4,
  },
  "wikithin-invention-inventor-Q10693": { d: 2 },
  "wikithin-invention-inventor-Q2270": {
    p: "Hvem isolerede som den første benzen i 1825?",
    d: 5,
  },
  "q-cat-8-1": { d: 1 },
  "q-cat-8-5": { d: 1 },
  "q-cat-8-6": { d: 3 },
  "wikithin-invention-inventor-Q3143": { d: 3 },
  "q-cat-9-4": { d: 3 },
  "q-cat-10-1": { d: 3 },
  // Filosofi og psykologi
  "q-cat-11-1": { d: 3 },
  "q-cat-11-3": { d: 3 },
  "q-cat-11-4": { d: 3 },
  "wikithin-invention-inventor-Q43484": {
    p: "Hvilken filosof skrev om overmennesket i «Således talte Zarathustra»?",
    d: 3,
  },
  "q-cat-13-4": { d: 4 },
  // Litteratur
  "q-cat-15-2": { d: 1 },
  "q-cat-15-4": { d: 3 },
  "q-cat-15-5": { d: 3 },
  "expansion-079": { d: 3 },
  "q-cat-16-1": { d: 3 },
  "q-cat-16-4": { d: 3 },
  "wikithin-danish-literature-author-Q1192442": {
    o: ["Søren Kierkegaard", "N.F.S. Grundtvig", "Georg Brandes", "K.E. Løgstrup"],
    d: 2,
  },
  "wikithin-danish-literature-author-Q1642629": {
    o: [
      "Martin Andersen Nexø",
      "Henrik Pontoppidan",
      "Jeppe Aakjær",
      "Hans Kirk",
    ],
    d: 2,
  },
  "wikithin-danish-literature-author-Q1756234": {
    o: ["Karen Blixen", "Thit Jensen", "Tove Ditlevsen", "Agnes Henningsen"],
    d: 1,
  },
  "wikithin-danish-literature-author-Q1757894": {
    o: ["Karen Blixen", "Tove Ditlevsen", "Inger Christensen", "Thit Jensen"],
    d: 3,
  },
  "wikithin-danish-literature-author-Q2180740": {
    o: [
      "Ludvig Holberg",
      "Johan Herman Wessel",
      "Adam Oehlenschläger",
      "Johannes Ewald",
    ],
    d: 2,
  },
  "wikithin-danish-literature-author-Q1757820": {
    o: [
      "Steen Steensen Blicher",
      "B.S. Ingemann",
      "Meïr Aron Goldschmidt",
      "Carsten Hauch",
    ],
    d: 4,
  },
  // Film, tv og musik
  "wikiculture-film-director-Q12018": {
    o: [
      "Federico Fellini",
      "Michelangelo Antonioni",
      "Luchino Visconti",
      "Vittorio De Sica",
    ],
    d: 4,
  },
  "wikiculture-film-director-Q11621": {
    o: ["Steven Spielberg", "George Lucas", "Robert Zemeckis", "Ron Howard"],
    d: 1,
  },
  "wikiculture-film-director-Q45602": {
    o: ["Charlie Chaplin", "Buster Keaton", "Harold Lloyd", "Fritz Lang"],
    d: 2,
  },
  "wikiculture-film-director-Q20456": {
    o: ["Kevin Costner", "Clint Eastwood", "Mel Gibson", "Robert Redford"],
    d: 3,
  },
  "wikiculture-film-director-Q6074": {
    o: ["J.J. Abrams", "Rian Johnson", "George Lucas", "Gareth Edwards"],
    d: 3,
  },
  "wikithin-danish-film-director-Q110365": {
    o: ["Lars von Trier", "Thomas Vinterberg", "Lone Scherfig", "Bille August"],
    d: 2,
  },
  "wikithin-danish-film-director-Q196103": {
    o: ["Susanne Bier", "Lone Scherfig", "Annette K. Olesen", "Pernille Fischer Christensen"],
    d: 3,
  },
  "wikithin-danish-film-director-Q1327845": {
    o: ["Susanne Bier", "Per Fly", "Lone Scherfig", "Thomas Vinterberg"],
    d: 3,
  },
  "wikithin-danish-film-director-Q1326419": {
    o: ["Nikolaj Arcel", "Per Fly", "Ole Christian Madsen", "Niels Arden Oplev"],
    d: 4,
  },
  "wikithin-danish-film-director-Q370707": {
    o: ["Bille August", "Erik Clausen", "Søren Kragh-Jacobsen", "Nils Malmros"],
    d: 2,
  },
  "wikithin-danish-film-director-Q316761": {
    o: [
      "Nicolas Winding Refn",
      "Anders Thomas Jensen",
      "Ole Bornedal",
      "Lasse Spang Olsen",
    ],
    d: 2,
  },
  "wikithin-danish-film-director-Q352000": {
    o: [
      "Anders Thomas Jensen",
      "Lasse Spang Olsen",
      "Nicolas Winding Refn",
      "Ole Bornedal",
    ],
    d: 2,
  },
  "wikithin-danish-film-director-Q775356": {
    o: [
      "Lars von Trier",
      "Thomas Vinterberg",
      "Søren Kragh-Jacobsen",
      "Kristian Levring",
    ],
    d: 3,
  },
  "wikithin-danish-film-director-Q312394": {
    o: ["Bille August", "Lars von Trier", "Susanne Bier", "Gabriel Axel"],
    d: 4,
  },
  "wikiculture-series-creator-Q2744": {
    o: ["Chris Carter", "David Lynch", "J.J. Abrams", "Rod Serling"],
    d: 4,
  },
  "wikiculture-series-creator-Q1079": {
    o: ["Vince Gilligan", "David Chase", "David Simon", "Matthew Weiner"],
    d: 3,
  },
  "wikiculture-series-creator-Q1077": {
    o: ["Gene Roddenberry", "Rod Serling", "George Lucas", "Irwin Allen"],
    d: 3,
  },
  "wikithin-danish-series-creator-Q956446": {
    o: ["Søren Sveistrup", "Adam Price", "Hans Rosenfeldt", "Maya Ilsøe"],
    d: 3,
  },
  "wikithin-danish-series-creator-Q1782870": {
    o: ["Stig Thorsboe", "Adam Price", "Peter Thorsboe", "Lise Nørgaard"],
    d: 4,
  },
  "wikithin-danish-series-creator-Q1275157": {
    o: ["Lise Nørgaard", "Tove Ditlevsen", "Hanne-Vibeke Holst", "Bodil Kjer"],
    d: 2,
  },
  "wikithin-danish-series-creator-Q1331994": {
    o: ["Lars von Trier", "Ole Bornedal", "Søren Sveistrup", "Thomas Vinterberg"],
    d: 2,
  },
  "wikithin-danish-series-creator-Q12333582": {
    o: ["Christian Torpe", "Adam Price", "Maya Ilsøe", "Jeppe Gjervig Gram"],
    d: 4,
  },
  "wikithin-danish-series-creator-Q1211796": {
    o: ["Hans Rosenfeldt", "Søren Sveistrup", "Adam Price", "Henning Mankell"],
    d: 4,
  },
  "q-cat-21-1": {
    o: ["Queen", "Led Zeppelin", "The Who", "Pink Floyd"],
    d: 1,
  },
  "q-cat-21-3": { d: 1 },
  "wikiculture-album-artist-Q17444": {
    o: ["Nirvana", "Pearl Jam", "Soundgarden", "Alice in Chains"],
    d: 2,
  },
  "wikiculture-album-artist-Q113189": {
    o: ["David Bowie", "Prince", "Duran Duran", "Bryan Ferry"],
    d: 3,
  },
  "wikiculture-album-artist-Q19003": {
    o: ["The Clash", "Sex Pistols", "The Jam", "Ramones"],
    d: 3,
  },
  "wikiculture-album-artist-Q8360": {
    o: ["Oasis", "Blur", "Pulp", "The Verve"],
    d: 2,
  },
  "wikiculture-album-artist-Q131182": {
    o: ["Lady Gaga", "Katy Perry", "Rihanna", "Kesha"],
    d: 2,
  },
  "q-cat-22-3": { d: 4 },
  "q-cat-22-5": { o: ["TV-2", "Gnags", "Kliché", "Shu-bi-dua"], d: 2 },
  "q-cat-22-6": { d: 4 },
  "matrix-cat-22-music-front-3": {
    p: "Hvem er forsanger i Volbeat?",
    o: ["Michael Poulsen", "Jesper Binzer", "Simon Kvamm", "Tim Christensen"],
    d: 2,
  },
  "matrix-cat-22-music-front-4": {
    p: "Hvem er forsanger i The Minds of 99?",
    o: ["Niels Brandt", "Simon Kvamm", "Jonas Bjerre", "Peter Sommer"],
    d: 3,
  },
  "matrix-cat-22-music-front-6": {
    p: "Hvem er forsanger i D-A-D?",
    o: ["Jesper Binzer", "Michael Poulsen", "Lars Lilholt", "Johan Olsen"],
    d: 2,
  },
  // Sport
  "q-cat-25-1": { d: 1 },
  "q-cat-25-3": {
    o: ["42,195 kilometer", "40 kilometer", "41,5 kilometer", "43,2 kilometer"],
  },
  "q-cat-25-4": { o: ["Japan", "Kina", "Sydkorea", "Thailand"], d: 1 },
  "q-cat-26-3": { d: 3 },
  "q-cat-27-3": { o: ["Uruguay", "Argentina", "Brasilien", "Italien"], d: 3 },
  // Dyr og natur
  "q-cat-28-1": { d: 1 },
  "q-cat-28-2": { d: 3 },
  "q-cat-28-6": { d: 1 },
  "q-cat-29-3": { d: 3 },
  "q-cat-29-5": { d: 1 },
  // Mytologi
  "q-cat-31-1": { d: 1 },
  "q-cat-31-6": { d: 1 },
  "depth-013": { o: ["Styx", "Lethe", "Eridanos", "Skamander"], d: 2 },
  "depth-014": { o: ["Olympen", "Parnassos", "Ida", "Athos"], d: 1 },
  "depth-015": { o: ["Kimæren", "Hydraen", "Sfinksen", "Mantikoren"], d: 4 },
  "depth-016": { o: ["Sfinksen", "Kimæren", "Medusa", "Minotauros"], d: 3 },
  "depth-017": { o: ["Kerberos", "Kimæren", "Hydraen", "Orthros"], d: 2 },
  "depth-018": {
    p: "Pandoras æske var i den oprindelige græske myte slet ikke en æske. Hvad var den?",
    o: ["En krukke", "Et skrin", "En kurv", "En sæk"],
    d: 4,
    e: "Hos Hesiod åbner Pandora en stor lerkrukke, en pithos. Først i 1500-tallet blev ordet oversat til «æske», og den version hang ved.",
  },
  "q-cat-32-1": { d: 1 },
  "q-cat-32-4": { d: 3 },
  "depth-028": {
    o: ["Dragen Nidhug", "Midgårdsormen", "Fenrisulven", "Egernet Ratatosk"],
  },
  "depth-030": { o: ["Midgård", "Asgård", "Udgård", "Jotunheim"], d: 1 },
  "depth-032": { o: ["Valhal", "Folkvang", "Bilskirner", "Gimle"], d: 2 },
  "depth-033": { o: ["Gungner", "Draupner", "Gleipner", "Mjølner"] },
  "depth-034": { o: ["Gleipner", "Draupner", "Gungner", "Brisingamen"] },
  "depth-035": { o: ["Draupner", "Gleipner", "Gungner", "Andvaranaut"] },
  "depth-037": {
    p: "Hvad sker der med solen ved Ragnarok?",
    o: [
      "En ulv sluger den",
      "Den synker i havet",
      "Surt slukker den med sit sværd",
      "Midgårdsormen forgifter den",
    ],
  },
  "depth-040": { o: ["Ni", "Tre", "Syv", "Tolv"] },
  "depth-041": { o: ["Tre", "Ni", "Syv", "Fire"], d: 4 },
  // Harry Potter
  "q-cat-33-1": { d: 1 },
  "q-cat-33-3": { d: 1 },
  "q-cat-33-4": { d: 1 },
  "expansion-128": { p: "Hvilken slags ugle er Harry Potters Hedvig?" },
  "depth-043": {
    o: ["Sirius Black", "Remus Lupus", "Arthur Weasley", "Rubeus Hagrid"],
  },
  "depth-045": {
    o: [
      "Pomona Spire",
      "Filius Flitwick",
      "Minerva McGonagall",
      "Severus Snape",
    ],
  },
  "depth-049": {
    o: ["Hogsmeade", "Godric-dalen", "Lille Hangleton", "Diagonalstræde"],
  },
  "depth-052": {
    o: ["Vindelhuset", "Muslingehytten", "Grumsted Plads", "Ligustervænget"],
  },
  "depth-054": {
    o: ["Fordelingshatten", "Flammernes Pokal", "Mindekarret", "Drømmespejlet"],
  },
  "depth-055": {
    o: [
      "At rejse nogle timer tilbage",
      "At se et døgn ud i fremtiden",
      "At standse tiden et øjeblik",
      "At genopleve andres minder",
    ],
  },
  "depth-056": { o: ["Minder", "Profetier", "Horcruxer", "Trylledrikke"] },
  "depth-057": {
    o: ["Thestraler", "Hippogriffer", "Kentaurer", "Enhjørninger"],
  },
  "depth-058": { o: ["En føniks", "En hippogrif", "En drage", "En ugle"] },
  "depth-059": {
    o: ["En basilisk", "En kæmpeedderkop", "En drage", "En varulv"],
  },
  "depth-060": { o: ["En husalf", "En nisse", "En gnom", "En trold"] },
  // Brands og kultur
  "q-cat-34-1": { d: 1 },
  "q-cat-34-4": { d: 1 },
  "q-cat-34-5": { d: 1 },
  "q-cat-35-1": { d: 1 },
  "q-cat-35-4": { d: 1 },
  "q-cat-35-5": { d: 3 },
  "q-cat-35-7": { d: 3 },
  "q-cat-36-1": { d: 3 },
  "q-cat-36-2": { d: 3 },
  "q-cat-36-5": { d: 1 },
  "q-cat-36-6": { d: 4 },
  "wikiculture-painting-artist-Q175036": {
    o: ["Pablo Picasso", "Salvador Dalí", "Joan Miró", "Georges Braque"],
    d: 2,
  },
  "wikiculture-painting-artist-Q151047": {
    o: ["Sandro Botticelli", "Rafael", "Tizian", "Leonardo da Vinci"],
    d: 3,
  },
  "wikiculture-painting-artist-Q1170315": {
    o: [
      "Kasimir Malevitj",
      "Vasilij Kandinskij",
      "Piet Mondrian",
      "Marc Chagall",
    ],
    d: 4,
  },
  "wikiculture-painting-artist-Q1091086": {
    o: ["Francisco Goya", "Diego Velázquez", "El Greco", "Eugène Delacroix"],
    d: 4,
  },
  "wikiculture-painting-artist-Q12334558": {
    p: "Hvem malede «Sankt Hansblus på Skagen Strand»?",
    o: ["P.S. Krøyer", "Michael Ancher", "Anna Ancher", "Laurits Tuxen"],
    d: 3,
  },
  "wd-Q228-language": {
    p: "Hvad er det eneste officielle sprog i Andorra?",
    d: 4,
  },
  "wd-Q794-language": { p: "Hvad er det officielle sprog i Iran?", d: 3 },
  "wd-Q424-language": { p: "Hvad er det officielle sprog i Cambodja?", d: 3 },
  "wikithin-invention-inventor-Q143": { d: 4 },
  "wikithin-invention-inventor-Q144334": {
    p: "Hvem udviklede bogtrykket med løse metaltyper i Europa?",
    d: 2,
  },
  "q-cat-39-4": { d: 3 },
  "q-cat-39-6": { d: 5 },
  "q-cat-40-3": { d: 1 },
  "q-cat-40-4": { d: 1 },
  "q-cat-40-5": { d: 1 },
  "q-cat-40-6": { d: 3 },
  "expansion-138": { d: 3 },
  // Mad og drikke
  "variety-060": { p: "Hvilket land er især kendt for brunost?", d: 1 },
  "q-cat-41-1": { d: 4 },
  "q-cat-42-1": { o: ["Peru", "Mexico", "Spanien", "Brasilien"], d: 3 },
  "q-cat-42-3": { d: 1 },
  "q-cat-42-4": { d: 3 },
  "wikiculture-food-origin-Q920940": {
    p: "Hvilket land kommer den sprøde pandekage dosa fra?",
    d: 3,
  },
  // Formkategorier
  "q-cat-46-1": { d: 1 },
  "q-cat-46-3": {
    p: "Hvilken passer ikke ind: eg, bøg, birk eller gran?",
    o: ["Gran", "Eg", "Bøg", "Birk"],
    e: "Gran er et nåletræ. Eg, bøg og birk er alle løvtræer, der taber bladene om efteråret.",
  },
  "q-cat-46-5": {
    p: "Hvilken passer ikke ind: kobber, jern, guld eller bronze?",
    o: ["Bronze", "Kobber", "Jern", "Guld"],
    d: 3,
    e: "Bronze er en legering af kobber og tin. De tre andre er grundstoffer.",
  },
  "format-depth-008": { p: "Hvilken dansk kulturbegivenhed kom først?" },
  "q-cat-48-1": { d: 3 },
  "q-cat-48-2": {
    o: ["Bananen", "Jordbærret", "Hindbærret", "Brombærret"],
    d: 3,
    e: "Botanisk er et bær en kødfuld frugt fra ét frugtanlæg med frøene indeni – som bananen. Jordbær, hindbær og brombær er trods navnet ikke ægte bær.",
  },
  "q-cat-48-4": { o: ["Nepal", "Bhutan", "Sri Lanka", "Qatar"], d: 3 },
  "q-cat-48-5": { d: 3 },
  // Årtier
  "q-cat-49-1": { d: 4 },
  "q-cat-49-6": { d: 1 },
  "q-cat-50-1": { o: ["Nirvana", "Pearl Jam", "Soundgarden", "R.E.M."], d: 1 },
  "q-cat-51-5": { d: 1 },
  "q-cat-51-6": { d: 1 },
  "q-cat-52-3": { d: 3 },
  "q-cat-52-4": { o: ["Frankrig", "Kroatien", "Belgien", "Brasilien"] },
  // Franchise-niveauer
  "theme-61-010": { d: 2 },
  "theme-61-012": { d: 3 },
  "theme-61-016": { d: 4 },
  "theme-61-024": { d: 2 },
  "theme-61-035": { d: 3 },
  "theme-61-036": { d: 3 },
  "theme-62-001": { d: 3 },
  "theme-62-005": { d: 2 },
  "theme-62-015": { d: 2 },
  "theme-62-019": { d: 2 },
  "theme-62-021": { d: 2 },
  "theme-62-023": { d: 3 },
  "theme-62-028": { d: 2 },
};

export function isRetiredByReview(id: string) {
  if (KEPT_FROM_RETIRED_SERIES.has(id)) return false;
  return (
    RETIRED_IDS.has(id) ||
    RETIRED_PREFIXES.some((prefix) => id.startsWith(prefix))
  );
}

export function applyQualityReview(question: Question): Question {
  const patch = PATCHES[question.id];
  if (!patch) return question;
  const options = patch.o
    ? patch.o.map((text, index) => ({ id: `o${index + 1}`, text }))
    : question.options;
  const correctOptionId = patch.o ? options[0].id : question.correctOptionId;
  const prompt = patch.p ?? question.prompt;
  const answer =
    options.find((option) => option.id === correctOptionId)?.text ?? "";
  return {
    ...question,
    prompt,
    options,
    correctOptionId,
    difficulty: patch.d ?? question.difficulty,
    explanation: patch.e ?? question.explanation,
    fingerprint:
      patch.p || patch.o
        ? fingerprint(prompt, answer, question.type)
        : question.fingerprint,
    updatedAt: reviewedAt,
  };
}
