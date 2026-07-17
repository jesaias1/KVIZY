import { fingerprint, stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

type EraRow = { categoryId: string; subject: string; year: string; field: string; place: string; impact: string; detail: string };
const rows: EraRow[] = [
  { categoryId: "cat-49", subject: "Compact Disc", year: "1982", field: "Digital lyd", place: "Japan og Europa", impact: "Musik kunne afspilles uden mekanisk kontakt", detail: "De første kommercielle cd-afspillere kom på markedet i 1982." },
  { categoryId: "cat-49", subject: "Berlinmurens fald", year: "1989", field: "Europæisk politik", place: "Øst- og Vestberlin", impact: "Tysk genforening blev mulig", detail: "Grænseovergangene blev åbnet den 9. november 1989." },
  { categoryId: "cat-49", subject: "Challenger-ulykken", year: "1986", field: "Rumfart", place: "Florida", impact: "Rumfærgeprogrammet blev sat på pause", detail: "En fejl i en tætningsring bidrog til ulykken kort efter opsendelsen." },
  { categoryId: "cat-49", subject: "Tjernobylulykken", year: "1986", field: "Atomenergi", place: "Det daværende Sovjetunionen", impact: "Radioaktivt materiale spredtes over Europa", detail: "Reaktor 4 eksploderede under en sikkerhedstest." },
  { categoryId: "cat-49", subject: "Nintendo Entertainment System", year: "1983", field: "Spilkonsoller", place: "Japan", impact: "Hjemmekonsoller fik nyt globalt gennembrud", detail: "Konsollen hed Famicom på det japanske marked." },
  { categoryId: "cat-49", subject: "Det første kommercielle håndholdte mobiltelefonprodukt", year: "1983", field: "Mobiltelefoni", place: "USA", impact: "Telefonopkald blev reelt mobile", detail: "Motorola DynaTAC 8000X var blandt de første kommercielle modeller." },

  { categoryId: "cat-51", subject: "Wikipedia", year: "2001", field: "Digitalt opslagsværk", place: "USA", impact: "Frivillige kunne opbygge en fælles encyklopædi", detail: "Projektet åbnede den 15. januar 2001." },
  { categoryId: "cat-51", subject: "Eurosedler og -mønter", year: "2002", field: "Valuta", place: "Euroområdet", impact: "Kontantbetaling blev fælles i mange EU-lande", detail: "Euroen fandtes elektronisk fra 1999, men kontanterne kom i 2002." },
  { categoryId: "cat-51", subject: "Human Genome Project", year: "2003", field: "Genetik", place: "Internationalt samarbejde", impact: "En reference for menneskets arvemasse blev færdiggjort", detail: "Projektet offentliggjorde sin afslutning i april 2003." },
  { categoryId: "cat-51", subject: "Facebook", year: "2004", field: "Sociale medier", place: "Harvard University", impact: "Online sociale netværk blev hverdag for millioner", detail: "Tjenesten begyndte som et netværk for universitetsstuderende." },
  { categoryId: "cat-51", subject: "YouTube", year: "2005", field: "Videodeling", place: "Californien", impact: "Brugere kunne udgive video uden en tv-station", detail: "Den første video blev uploadet i april 2005." },
  { categoryId: "cat-51", subject: "Den første iPhone", year: "2007", field: "Smartphones", place: "USA", impact: "Multitouch blev centralt i mobilbetjening", detail: "Telefonen samlede webbrowser, musikafspiller og telefon omkring en berøringsskærm." },

  { categoryId: "cat-52", subject: "Higgs-partiklen", year: "2012", field: "Partikelfysik", place: "CERN", impact: "Higgs-feltets forudsagte partikel blev påvist", detail: "ATLAS- og CMS-eksperimenterne fandt en ny partikel omkring 125 GeV." },
  { categoryId: "cat-52", subject: "Curiosity på Mars", year: "2012", field: "Planetforskning", place: "Gale-krateret", impact: "Mars' tidligere beboelighed kunne undersøges", detail: "Roveren brugte en raketdrevet sky crane under landingen." },
  { categoryId: "cat-52", subject: "Parisaftalen", year: "2015", field: "Klimapolitik", place: "Paris", impact: "Lande fik en fælles ramme for at begrænse opvarmning", detail: "Aftalen bygger på nationale klimabidrag, der løbende skal skærpes." },
  { categoryId: "cat-52", subject: "Den første direkte måling af gravitationsbølger", year: "2015", field: "Astrofysik", place: "LIGO i USA", impact: "En ny måde at observere universet blev åbnet", detail: "Signalet kom fra to sorte huller, der smeltede sammen." },
  { categoryId: "cat-52", subject: "GDPR", year: "2018", field: "Databeskyttelse", place: "EU", impact: "Borgeres rettigheder over persondata blev styrket", detail: "Forordningen begyndte at gælde den 25. maj 2018." },
  { categoryId: "cat-52", subject: "Det første billede af et sort huls skygge", year: "2019", field: "Radioastronomi", place: "Galaksen M87", impact: "Et sort huls nære omgivelser blev afbildet", detail: "Event Horizon Telescope kombinerede radioteleskoper over hele Jorden." },

  { categoryId: "cat-53", subject: "Passkeys", year: "2020'erne", field: "Digital sikkerhed", place: "Telefoner og computere", impact: "Login kan ske uden et delt kodeord", detail: "Passkeys bruger et kryptografisk nøglepar og låses ofte op med enhedens biometri." },
  { categoryId: "cat-53", subject: "Generativ kunstig intelligens", year: "2020'erne", field: "Maskinlæring", place: "Datacentre og lokale enheder", impact: "Nyt indhold kan dannes ud fra mønstre i træningsdata", detail: "Modellerne beregner sandsynlige fortsættelser eller strukturer frem for at slå ét facit op." },
  { categoryId: "cat-53", subject: "mRNA-vacciner", year: "2020'erne", field: "Bioteknologi", place: "Celler i kroppen", impact: "Celler får en midlertidig opskrift på et antigen", detail: "mRNA'et nedbrydes efter brug og ændrer ikke cellens DNA." },
  { categoryId: "cat-53", subject: "Genbrugelige rakettrin", year: "2020'erne", field: "Rumfart", place: "Opsendelsesbaser", impact: "Dele af raketten kan flyve igen", detail: "Kontrolleret landing kan reducere behovet for at bygge alle trin på ny." },
  { categoryId: "cat-53", subject: "Varmepumper", year: "2020'erne", field: "Energieffektiv opvarmning", place: "Boliger og fjernvarmesystemer", impact: "Varme flyttes med mindre el end direkte elvarme", detail: "En varmepumpe transporterer energi fra omgivelserne i stedet for kun at omdanne strøm til varme." },
  { categoryId: "cat-53", subject: "Satellitbaseret bredbånd", year: "2020'erne", field: "Internetforbindelser", place: "Lavt kredsløb om Jorden", impact: "Fjerntliggende områder kan få hurtigere internet", detail: "Lavere kredsløb kan give mindre forsinkelse end traditionelle geostationære satellitter." },
];

const relations = [
  { key: "era-year", prompt: (r: EraRow) => `Hvornår forbindes ${r.subject} med dette gennembrud?`, answer: (r: EraRow) => r.year, difficulty: 2 },
  { key: "era-field", prompt: (r: EraRow) => `Hvilket område hører ${r.subject} især til?`, answer: (r: EraRow) => r.field, difficulty: 2 },
  { key: "era-place", prompt: (r: EraRow) => `Hvilket sted forbindes især med ${r.subject}?`, answer: (r: EraRow) => r.place, difficulty: 3 },
  { key: "era-impact", prompt: (r: EraRow) => `Hvilken betydning havde eller har ${r.subject}?`, answer: (r: EraRow) => r.impact, difficulty: 3 },
];
const createdAt = "2026-07-17T00:00:00.000Z";
export const ERA_DEPTH_QUESTIONS: Question[] = [];

for (const relation of relations) {
  for (const categoryId of [...new Set(rows.map((row) => row.categoryId))]) {
    const group = rows.filter((row) => row.categoryId === categoryId);
    const answers = [...new Set(group.map(relation.answer))];
    if (answers.length < 4) continue;
    for (const [index, row] of group.entries()) {
      const answer = relation.answer(row);
      const id = `era-${categoryId}-${relation.key}-${index + 1}`;
      const pivot = Number.parseInt(stableHash(id).slice(0, 8), 16) || 0;
      const distractors = answers.filter((value) => value !== answer)
        .sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length))
        .slice(pivot % Math.max(1, answers.length - 2)).concat(answers.filter((value) => value !== answer))
        .filter((value, i, all) => all.indexOf(value) === i).slice(0, 3);
      const prompt = relation.prompt(row);
      ERA_DEPTH_QUESTIONS.push({
        id, prompt, type: "multiple_choice", categoryId, secondaryCategoryIds: [], difficulty: relation.difficulty,
        options: [answer, ...distractors].map((text, i) => ({ id: `o${i + 1}`, text })), correctOptionId: "o1",
        explanation: `${answer} er korrekt. ${row.detail}`, sourceLabel: "KVIZY redaktion",
        tags: ["redaktionel-æra", relation.key], origin: "curated", status: "active",
        fingerprint: fingerprint(prompt, answer, "multiple_choice"), qualityScore: 95, timeSensitive: false,
        createdAt, updatedAt: createdAt, playCount: 0, correctRate: 0, reportCount: 0,
      });
    }
  }
}
