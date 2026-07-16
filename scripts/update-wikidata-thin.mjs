import { readFile, writeFile } from "node:fs/promises";

const endpoint = "https://query.wikidata.org/sparql";
const outputUrl = new URL(
  "../src/data/wikidata-thin.generated.json",
  import.meta.url,
);
const headers = {
  "User-Agent":
    "KVIZY-question-builder/1.0 (https://github.com/jesaias1/KVIZY)",
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const configs = [
  {
    key: "novel-author",
    categoryId: "cat-15",
    prompt: "Hvem skrev romanen {work}?",
    relation: "forfatter",
    where: "?work wdt:P31 wd:Q8261; wdt:P50 ?answer.",
  },
  {
    key: "danish-film-director",
    categoryId: "cat-18",
    prompt: "Hvem instruerede den danske film {work}?",
    relation: "instruktør",
    where: "?work wdt:P31 wd:Q11424; wdt:P495 wd:Q35; wdt:P57 ?answer.",
  },
  {
    key: "danish-series-creator",
    categoryId: "cat-20",
    prompt: "Hvem skabte den danske TV-serie {work}?",
    relation: "skaber",
    where: "?work wdt:P31 wd:Q5398426; wdt:P495 wd:Q35; wdt:P170 ?answer.",
  },
  {
    key: "invention-inventor",
    categoryId: "cat-39",
    prompt: "Hvem forbindes som opfinder af {work}?",
    relation: "opfinder",
    where: "?work wdt:P61 ?answer.",
  },
  {
    key: "building-architect",
    categoryId: "cat-58",
    prompt: "Hvem tegnede bygningen {work}?",
    relation: "arkitekt",
    where: "?work wdt:P84 ?answer.",
  },
  {
    key: "cocktail-origin",
    categoryId: "cat-44",
    prompt: "Hvilket land forbindes cocktailen {work} med?",
    relation: "oprindelsesland",
    where: "?work wdt:P31 wd:Q134768; wdt:P495 ?answer.",
  },
  {
    key: "baked-origin",
    categoryId: "cat-43",
    prompt: "Hvilket land stammer bagværket {work} fra?",
    relation: "oprindelsesland",
    where: "?work wdt:P31 wd:Q746549; wdt:P495 ?answer.",
  },
  {
    key: "philosopher-movement",
    categoryId: "cat-11",
    prompt: "Hvilken filosofisk retning forbindes {work} med?",
    relation: "filosofisk retning",
    where: "?work wdt:P106 wd:Q4964182; wdt:P135 ?answer.",
  },
  {
    key: "psychologist-field",
    categoryId: "cat-13",
    prompt: "Hvilket fagområde forbindes psykologen {work} især med?",
    relation: "fagområde",
    where: "?work wdt:P106 wd:Q212980; wdt:P101 ?answer.",
  },
  {
    key: "nordic-mountain-country",
    categoryId: "cat-30",
    prompt: "I hvilket nordisk land ligger bjerget {work}?",
    relation: "land",
    where:
      "?work wdt:P31 wd:Q8502; wdt:P17 ?answer. VALUES ?answer { wd:Q35 wd:Q20 wd:Q34 wd:Q33 wd:Q189 }",
  },
  {
    key: "danish-literature-author",
    categoryId: "cat-16",
    prompt: "Hvem skrev det dansksprogede værk {work}?",
    relation: "forfatter",
    where: "?work wdt:P407 wd:Q9035; wdt:P50 ?answer.",
  },
  {
    key: "danish-song-performer",
    categoryId: "cat-22",
    prompt: "Hvilken dansk musiker eller gruppe fremførte {work}?",
    relation: "udøvende kunstner",
    where:
      "?work wdt:P31/wdt:P279* wd:Q7366; wdt:P175 ?answer. ?answer wdt:P27|wdt:P495 wd:Q35.",
  },
  {
    key: "athlete-sport",
    categoryId: "cat-25",
    prompt: "Hvilken sportsgren forbindes atleten {work} med?",
    relation: "sportsgren",
    where: "?work wdt:P31 wd:Q5; wdt:P641 ?answer.",
  },
  {
    key: "danish-athlete-sport",
    categoryId: "cat-26",
    prompt: "Hvilken sportsgren forbindes den danske atlet {work} med?",
    relation: "sportsgren",
    where: "?work wdt:P31 wd:Q5; wdt:P27 wd:Q35; wdt:P641 ?answer.",
  },
  {
    key: "scientist-field",
    categoryId: "cat-7",
    prompt: "Hvilket fagområde forbindes forskeren {work} især med?",
    relation: "fagområde",
    where: "?work wdt:P31 wd:Q5; wdt:P106 wd:Q901; wdt:P101 ?answer.",
  },
  {
    key: "space-constellation",
    categoryId: "cat-8",
    prompt: "I hvilket stjernebillede ligger himmelobjektet {work}?",
    relation: "stjernebillede",
    where: "?work wdt:P59 ?answer.",
  },
  {
    key: "danish-place-municipality",
    categoryId: "cat-2",
    prompt: "Hvilken kommune ligger {work} i?",
    relation: "kommune",
    where:
      "?work wdt:P31/wdt:P279* wd:Q486972; wdt:P17 wd:Q35; wdt:P131 ?answer. ?answer wdt:P31 wd:Q2039348.",
  },
  {
    key: "battle-country",
    categoryId: "cat-5",
    prompt: "I hvilket land fandt slaget ved {work} sted?",
    relation: "land",
    where: "?work wdt:P31/wdt:P279* wd:Q178561; wdt:P17 ?answer.",
  },
  {
    key: "brand-industry",
    categoryId: "cat-34",
    prompt: "Hvilken branche forbindes virksomheden {work} primært med?",
    relation: "branche",
    where: "?work wdt:P31/wdt:P279* wd:Q4830453; wdt:P452 ?answer.",
  },
  {
    key: "football-club-stadium",
    categoryId: "cat-27",
    prompt: "Hvilket stadion er hjemmebane for fodboldklubben {work}?",
    relation: "hjemmebane",
    where: "?work wdt:P31/wdt:P279* wd:Q476028; wdt:P115 ?answer.",
  },
  {
    key: "danish-musician-genre",
    categoryId: "cat-22",
    prompt: "Hvilken musikgenre forbindes {work} med?",
    relation: "musikgenre",
    where:
      "?work wdt:P31 wd:Q5; wdt:P27 wd:Q35; wdt:P106/wdt:P279* wd:Q639669; wdt:P136 ?answer.",
  },
  {
    key: "nordic-author-country",
    categoryId: "cat-15",
    prompt: "Hvilket nordisk land kom forfatteren {work} fra?",
    relation: "statsborgerskab",
    where:
      "?work wdt:P31 wd:Q5; wdt:P106 wd:Q49757; wdt:P27 ?answer. VALUES ?answer { wd:Q35 wd:Q20 wd:Q34 wd:Q33 wd:Q189 }",
  },
  {
    key: "animal-class",
    categoryId: "cat-28",
    prompt: "Hvilken dyreklasse tilhører {work}?",
    relation: "dyreklasse",
    where:
      "?work wdt:P31 wd:Q16521; wdt:P171+ ?answer. ?answer wdt:P31 wd:Q37517.",
  },
  {
    key: "car-model-manufacturer",
    categoryId: "cat-57",
    prompt: "Hvilken bilproducent fremstiller modellen {work}?",
    relation: "producent",
    where: "?work wdt:P31 wd:Q3231690; wdt:P176 ?answer.",
  },
  {
    key: "airport-country",
    categoryId: "cat-57",
    prompt: "I hvilket land ligger lufthavnen {work}?",
    relation: "land",
    where: "?work wdt:P31 wd:Q1248784; wdt:P17 ?answer.",
  },
  {
    key: "car-model-designer",
    categoryId: "cat-57",
    prompt: "Hvem er registreret som designer af bilmodellen {work}?",
    relation: "designer",
    where: "?work wdt:P31 wd:Q3231690; wdt:P287 ?answer.",
  },
];

async function query(config) {
  const sparql = `SELECT ?work ?workLabel ?answer ?answerLabel WHERE {
    ${config.where}
    ?article schema:about ?work; schema:isPartOf <https://da.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "da,en". }
  } LIMIT 90`;
  const url = `${endpoint}?format=json&query=${encodeURIComponent(sparql)}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) return (await response.json()).results.bindings;
    if (![429, 502, 503, 504].includes(response.status) || attempt === 2)
      throw new Error(`${config.key}: HTTP ${response.status}`);
    await pause(attempt * 5000);
  }
  return [];
}

let existing = [];
try {
  existing = JSON.parse(await readFile(outputUrl, "utf8"));
} catch {}

const merged = new Map(
  existing.map((record) => [`${record.key}:${record.workQid}`, record]),
);
const missingOnly = process.argv.includes("--missing");
async function persist() {
  const records = [...merged.values()].sort((a, b) =>
    `${a.key}:${a.work}`.localeCompare(`${b.key}:${b.work}`, "da"),
  );
  await writeFile(outputUrl, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  return records.length;
}

for (const config of configs) {
  if (
    missingOnly &&
    [...merged.values()].some((record) => record.key === config.key)
  ) {
    console.log(`${config.key}: findes allerede, springes over`);
    continue;
  }
  try {
    const bindings = await query(config);
    const rows = bindings.map((row) => ({
      key: config.key,
      categoryId: config.categoryId,
      prompt: config.prompt,
      relation: config.relation,
      workQid: row.work.value.split("/").at(-1),
      work: row.workLabel.value,
      answerQid: row.answer.value.split("/").at(-1),
      answer: row.answerLabel.value,
    }));
    const grouped = Map.groupBy(rows, (row) => row.workQid);
    const clean = [...grouped.values()]
      .filter(
        (items) => new Set(items.map((item) => item.answerQid)).size === 1,
      )
      .map((items) => items[0])
      .filter(
        (item) => item.work !== item.workQid && item.answer !== item.answerQid,
      )
      .slice(0, 50);
    for (const record of clean)
      merged.set(`${record.key}:${record.workQid}`, record);
    await persist();
    console.log(`${config.key}: +${clean.length}`);
  } catch (error) {
    console.warn(`${config.key}: sprunget over (${error.message})`);
  }
  await pause(2000);
}

console.log(`Gemte ${await persist()} kumulative poster.`);
