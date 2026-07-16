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
];

async function query(config) {
  const sparql = `SELECT ?work ?workLabel ?answer ?answerLabel WHERE {
    ${config.where}
    ?article schema:about ?work; schema:isPartOf <https://da.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "da,en". }
  } LIMIT 60`;
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
async function persist() {
  const records = [...merged.values()].sort((a, b) =>
    `${a.key}:${a.work}`.localeCompare(`${b.key}:${b.work}`, "da"),
  );
  await writeFile(outputUrl, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  return records.length;
}

for (const config of configs) {
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
      .slice(0, 35);
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
