import { writeFile } from "node:fs/promises";

const endpoint = "https://query.wikidata.org/sparql";
const userAgent =
  "KVIZY-question-builder/1.0 (https://github.com/jesaias1/KVIZY)";

const configs = [
  {
    key: "film-director",
    instance: "Q11424",
    property: "P57",
    categoryId: "cat-17",
    prompt: "Hvem instruerede filmen {work}?",
  },
  {
    key: "novel-author",
    instance: "Q8261",
    property: "P50",
    categoryId: "cat-15",
    prompt: "Hvem skrev romanen {work}?",
  },
  {
    key: "album-artist",
    instance: "Q482994",
    property: "P175",
    categoryId: "cat-21",
    prompt: "Hvilken kunstner eller gruppe udgav albummet {work}?",
  },
  {
    key: "game-developer",
    instance: "Q7889",
    property: "P178",
    categoryId: "cat-24",
    prompt: "Hvilket firma udviklede spillet {work}?",
  },
  {
    key: "painting-artist",
    instance: "Q3305213",
    property: "P170",
    categoryId: "cat-37",
    prompt: "Hvem skabte maleriet {work}?",
  },
  {
    key: "series-creator",
    instance: "Q5398426",
    property: "P170",
    categoryId: "cat-19",
    prompt: "Hvem skabte TV-serien {work}?",
  },
  {
    key: "software-developer",
    instance: "Q7397",
    property: "P178",
    categoryId: "cat-9",
    prompt: "Hvilket firma eller projekt udviklede softwaren {work}?",
  },
  {
    key: "food-origin",
    instance: "Q2095",
    property: "P495",
    categoryId: "cat-42",
    prompt: "Hvilket land forbindes {work} med som oprindelsesland?",
  },
  {
    key: "company-founder",
    instance: "Q4830453",
    property: "P112",
    categoryId: "cat-35",
    prompt: "Hvem grundlagde virksomheden {work}?",
  },
  {
    key: "spacecraft-manufacturer",
    instance: "Q40218",
    property: "P176",
    categoryId: "cat-8",
    prompt: "Hvilken producent byggede rumfartøjet {work}?",
  },
];

async function fetchRows(config) {
  const query = `SELECT ?work ?workLabel ?answer ?answerLabel WHERE {
    ?work wdt:P31 wd:${config.instance}; wdt:${config.property} ?answer.
    ?article schema:about ?work; schema:isPartOf <https://da.wikipedia.org/>.
    SERVICE wikibase:label { bd:serviceParam wikibase:language "da,en". }
  } LIMIT 180`;
  const url = `${endpoint}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!response.ok) throw new Error(`${config.key}: ${response.status}`);
  const json = await response.json();
  return json.results.bindings.map((row) => ({
    workQid: row.work.value.split("/").at(-1),
    work: row.workLabel.value,
    answerQid: row.answer.value.split("/").at(-1),
    answer: row.answerLabel.value,
  }));
}

const records = [];
for (let offset = 0; offset < configs.length; offset += 2) {
  const batch = configs.slice(offset, offset + 2);
  const results = await Promise.all(batch.map(fetchRows));
  for (let batchIndex = 0; batchIndex < batch.length; batchIndex++) {
    const config = batch[batchIndex];
    const rows = results[batchIndex];
    const grouped = Map.groupBy(rows, (row) => row.workQid);
    const unambiguous = [...grouped.values()]
      .filter(
        (items) => new Set(items.map((item) => item.answerQid)).size === 1,
      )
      .map((items) => items[0])
      .filter(
        (item) => item.work !== item.workQid && item.answer !== item.answerQid,
      )
      .slice(0, 45);
    for (const item of unambiguous) {
      records.push({
        ...item,
        key: config.key,
        categoryId: config.categoryId,
        prompt: config.prompt,
      });
    }
  }
}

await writeFile(
  new URL("../src/data/wikidata-culture.generated.json", import.meta.url),
  `${JSON.stringify(records, null, 2)}\n`,
  "utf8",
);
console.log(`Skrev ${records.length} kulturspørgsmålsgrundlag.`);
