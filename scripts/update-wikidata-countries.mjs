import { writeFile } from "node:fs/promises";

const endpoint = "https://query.wikidata.org/sparql";
const output = new URL(
  "../src/data/wikidata-countries.generated.json",
  import.meta.url,
);
const properties = {
  capital: "P36",
  currency: "P38",
  continent: "P30",
  language: "P37",
  callingCode: "P474",
  tld: "P78",
};

async function query(property) {
  const sparql = `
SELECT DISTINCT ?country ?code ?value ?valueLabel WHERE {
  VALUES ?class { wd:Q6256 wd:Q3624078 }
  ?country wdt:P31 ?class; wdt:P297 ?code; wdt:${property} ?value.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "da,en". }
}`;
  const response = await fetch(
    `${endpoint}?query=${encodeURIComponent(sparql)}&format=json`,
    {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "KVIZY-question-bank/1.0 (offline quiz data refresh)",
      },
    },
  );
  if (!response.ok) throw new Error(`Wikidata svarede ${response.status}`);
  return (await response.json()).results.bindings;
}

const countries = new Map();
for (const [field, property] of Object.entries(properties)) {
  const rows = await query(property);
  for (const row of rows) {
    const qid = row.country.value.split("/").at(-1);
    const code = row.code.value;
    const current = countries.get(qid) ?? { qid, code };
    const value = row.valueLabel?.value ?? row.value.value;
    const values = new Set(current[field] ?? []);
    values.add(value);
    current[field] = [...values];
    countries.set(qid, current);
  }
}

const displayNames = new Intl.DisplayNames(["da"], { type: "region" });
const data = [...countries.values()]
  .filter((country) => /^[A-Z]{2}$/.test(country.code))
  .map((country) => ({
    ...country,
    country: displayNames.of(country.code) ?? country.code,
  }))
  .sort((a, b) => a.country.localeCompare(b.country, "da"));

await writeFile(output, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Gemte ${data.length} lande fra Wikidata i ${output.pathname}`);
