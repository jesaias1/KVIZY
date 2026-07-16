import { CATEGORIES } from "@/lib/categories";
import { fingerprint, normalizeText, stableHash } from "@/lib/engine";
import { hasAnswerLeak } from "@/lib/question-quality";
import type { Question, QuestionType } from "@/lib/types";
import { COUNTRY_QUESTIONS } from "./country-questions";
import { MUSIC_PRODUCTION_QUESTIONS } from "./music-production-questions";
import { WIKIDATA_CULTURE_QUESTIONS } from "./wikidata-culture-questions";
import { EXPANSION_QUESTIONS } from "./expansion-questions";
import { WIKIDATA_THIN_QUESTIONS } from "./wikidata-thin-questions";
import { VARIETY_QUESTIONS } from "./variety-questions";
import { seedSpecs } from "./seed-spec";

const created = "2026-07-15T00:00:00.000Z";
const rows = seedSpecs.flatMap((spec) =>
  spec.items.map(([prompt, answer]) => ({
    categoryId: spec.categoryId,
    prompt,
    answer,
  })),
);

const overrides: Record<string, string[]> = {
  "Hvor ligger FN's hovedkvarter?": ["Genève", "Wien", "Paris"],
  "Hvilket land er ikke permanent medlem af FN's Sikkerhedsråd?": [
    "USA",
    "Kina",
    "Frankrig",
  ],
  "Hvor ofte skal der senest afholdes folketingsvalg?": [
    "Hvert tredje år",
    "Hvert femte år",
    "Hvert sjette år",
  ],
  "Hvad hedder Danmarks øverste domstol?": [
    "Østre Landsret",
    "Vestre Landsret",
    "Sø- og Handelsretten",
  ],
  "Hvilken grundlovsparagraf handler om religionsfrihed?": [
    "Paragraf 70",
    "Paragraf 71",
    "Paragraf 77",
  ],
  "Hvilken myndighed vedtager love i Danmark?": [
    "Regeringen",
    "Højesteret",
    "Kommunalbestyrelserne",
  ],
  "Hvilket rige byggede Colosseum?": [
    "Det Byzantinske Rige",
    "Det Persiske Rige",
    "Det Osmanniske Rige",
  ],
  "Hvilken pest ramte Europa hårdt i 1300-tallet?": [
    "Den justinianske pest",
    "Den spanske syge",
    "Koleraepidemien",
  ],
  "Hvem var den første romerske kejser?": ["Nero", "Trajan", "Hadrian"],
  "Hvem var første menneske på Månen?": [
    "Buzz Aldrin",
    "Jurij Gagarin",
    "John Glenn",
  ],
  "Hvem forbindes med opfindelsen af World Wide Web?": [
    "Vint Cerf",
    "Robert Kahn",
    "Marc Andreessen",
  ],
  "Hvilken partikel har negativ elektrisk ladning?": [
    "Protonen",
    "Neutronen",
    "Positronen",
  ],
  "Hvad er vands kemiske formel?": ["CO₂", "O₂", "H₂O₂"],
  "Hvilken kraft holder planeter i bane?": [
    "Elektromagnetismen",
    "Den stærke kernekraft",
    "Den svage kernekraft",
  ],
  "Hvad måles i enheden pascal?": ["Energi", "Effekt", "Elektrisk spænding"],
  "Hvilket vitamin danner huden ved sollys?": [
    "A-vitamin",
    "C-vitamin",
    "K-vitamin",
  ],
  "Hvad kaldes celledeling til to genetisk ens celler?": [
    "Meiose",
    "Mutation",
    "Befrugtning",
  ],
  "Hvilken teknologi lagrer data i blokke kædet sammen?": [
    "Relationsdatabase",
    "Objektlager",
    "Filsystem",
  ],
  "Hvad gør en kompilator?": [
    "Kører kildekoden linje for linje",
    "Finder IP-adressen til et domæne",
    "Komprimerer billeder og lyd",
  ],
  "Hvilken enhed måles processorfrekvens i?": ["Byte", "Watt", "Volt"],
  "Hvad gemmer en browsercookie typisk?": [
    "Hele websidens kildekode",
    "Computerens adgangskode",
    "En kopi af operativsystemet",
  ],
  "Hvilken retning forbindes med Jean-Paul Sartre?": [
    "Stoicisme",
    "Utilitarisme",
    "Positivisme",
  ],
  "Hvilken teori handler om tilknytning mellem barn og omsorgsperson?": [
    "Social indlæringsteori",
    "Kognitiv dissonansteori",
    "Selvbestemmelsesteori",
  ],
  "Hvad måler Big Five-modellen?": [
    "Fem former for intelligens",
    "Fem udviklingsstadier",
    "Fem typer hukommelse",
  ],
  "I hvilken roman optræder Atticus Finch?": [
    "Den store Gatsby",
    "Vredens druer",
    "Farven lilla",
  ],
  "Hvad hedder kaptajnen i Moby-Dick?": [
    "Kaptajn Nemo",
    "Kaptajn Hook",
    "Kaptajn Haddock",
  ],
  "Hvilken dansk gruppe udgav Barbie Girl?": [
    "Toy-Box",
    "Cartoons",
    "Infernal",
  ],
  "Hvilken stil forbindes med Claude Monet?": [
    "Kubisme",
    "Surrealisme",
    "Ekspressionisme",
  ],
  "Hvilken dansk maler skabte Hip, hip, hurra!?": [
    "Michael Ancher",
    "Anna Ancher",
    "Vilhelm Hammershøi",
  ],
  "Hvad kaldes kunst lavet af små farvede stenstykker?": [
    "Fresko",
    "Relief",
    "Collage",
  ],
  "Hvilket bilmærke producerer modellen Golf?": ["Ford", "Opel", "Peugeot"],
  "Hvilket brand forbindes med sloganet Just Do It?": [
    "Adidas",
    "Puma",
    "Reebok",
  ],
  "Hvilket mærke har et krokodillelogo?": [
    "Fred Perry",
    "Polo Ralph Lauren",
    "Tommy Hilfiger",
  ],
  "Hvilket firma fremstiller PlayStation?": [
    "Microsoft",
    "Nintendo",
    "Sega",
  ],
  "Hvilket brand sælger møbler i flade pakker?": [
    "JYSK",
    "ILVA",
    "BoConcept",
  ],
  "Hvilket urmærke har en krone som logo?": [
    "Omega",
    "TAG Heuer",
    "Breitling",
  ],
  "Hvilken virksomhed har et bidt æble som logo?": [
    "Microsoft",
    "Google",
    "Samsung",
  ],
  "Hvilken virksomhed bruger fire sammenkædede ringe?": [
    "BMW",
    "Mercedes-Benz",
    "Volkswagen",
  ],
  "Hvilket logo forestiller en havfrue med krone?": [
    "Costa Coffee",
    "Dunkin'",
    "Caffè Nero",
  ],
  "Hvilken streamingtjeneste bruger et rødt N?": [
    "Disney+",
    "HBO Max",
    "Amazon Prime Video",
  ],
  "Hvilket fragtfirma skjuler en pil i sit ordmærke?": [
    "DHL",
    "UPS",
    "PostNord",
  ],
  "Hvilket sportsmærke bruger tre striber?": ["Nike", "Puma", "Reebok"],
  "Hvilket bilmærkes logo består af tre overlappende ellipser?": [
    "Lexus",
    "Mazda",
    "Subaru",
  ],
  "Hvilken betalingsvirksomhed bruger en rød og en gul overlappende cirkel i sit logo?": [
    "Visa",
    "American Express",
    "PayPal",
  ],
  "Hvad kaldes Folketingets ledelse, som består af formanden og fire næstformænd?": [
    "Statsrådet",
    "Udvalget for Forretningsordenen",
    "Tingsekretærerne",
  ],
  "Hvilket grundstof har det kemiske symbol Au?": ["Sølv", "Kobber", "Jern"],
  "Hvor mange sider har en regulær sekskant?": ["5", "7", "8"],
  "Hvad kaldes verdens største ocean?": [
    "Atlanterhavet",
    "Det Indiske Ocean",
    "Ishavet",
  ],
  "Hvilket organ pumper blod rundt i kroppen?": [
    "Hjernen",
    "Leveren",
    "Lungerne",
  ],
  "Hvad er hovedstaden i Canada?": ["Toronto", "Vancouver", "Montréal"],
  "Hvilken farve får man ved at blande blå og gul?": [
    "Lilla",
    "Orange",
    "Brun",
  ],
  "Hvad undersøger etik?": [
    "Hvordan sikker viden opstår",
    "Hvordan politisk magt fordeles",
    "Hvordan sprog forandrer sig",
  ],
  "Hvad undersøger bevidsthedsfilosofi?": [
    "Hvordan viden begrundes",
    "Hvordan stater bør indrettes",
    "Hvordan økonomisk værdi opstår",
  ],
  "Hvad vogtede Kerberos?": [
    "Porten til Olympen",
    "Oraklet i Delfi",
    "Labyrinten på Kreta",
  ],
  "Hvad er en kimono?": [
    "En koreansk kampsport",
    "En kinesisk tesort",
    "En indisk musikform",
  ],
  "Hvad er skyr oprindeligt?": [
    "En norsk gedeost",
    "Et svensk knækbrød",
    "En finsk rugdrik",
  ],
  "Hvad består en klassisk gin og tonic af?": [
    "Rom, lime og cola",
    "Vodka og appelsinjuice",
    "Tequila og grapefrugt",
  ],
  "Hvad er en Tamagotchi?": [
    "Et håndholdt musikspil",
    "En japansk tegneseriefigur",
    "En tidlig mobiltelefon",
  ],
  "Hvad er hovedingrediensen i svensk kroppkakor?": [
    "Rugmel",
    "Kål",
    "Havregryn",
  ],
  "Hvad er rugbrød typisk lavet med?": [
    "Hvedemel",
    "Majsmel",
    "Rismel",
  ],
  "Hvad er hovedingrediensen i hummus?": [
    "Linser",
    "Hvide bønner",
    "Aubergine",
  ],
  "Hvor stammer paella fra?": ["Italien", "Portugal", "Grækenland"],
  "Hvad er miso lavet af traditionelt?": [
    "Fermenterede ris alene",
    "Tørrede kikærter",
    "Malede sesamfrø",
  ],
  "Hvilken ost bruges klassisk i græsk salat?": [
    "Halloumi",
    "Mozzarella",
    "Ricotta",
  ],
  "Hvad er kimchi?": [
    "En risnudelret",
    "En fiskesauce",
    "En sød bønnepasta",
  ],
  "Hvilken spiritus er basen i en mojito?": ["Vodka", "Gin", "Tequila"],
  "Hvilken bitter aperitif indgår i en negroni?": [
    "Aperol",
    "Fernet-Branca",
    "Suze",
  ],
  "Hvilken cocktail laves med tequila, lime og appelsinlikør?": [
    "Daiquiri",
    "Sidecar",
    "Mai Tai",
  ],
  "Hvad er sake brygget af?": ["Byg", "Druer", "Kartofler"],
  "Hvilken drue giver rødvin farve fra skallerne?": [
    "Grønne druer",
    "Rosiner",
    "Kerneløse hvide druer",
  ],
};

const explanationOverrides: Record<string, string> = {
  "Hvilket grundstof har det kemiske symbol Au?":
    "Au kommer af det latinske navn aurum. Guld er et ædelmetal, som næsten ikke reagerer med luft eller vand.",
  "Hvor mange sider har en regulær sekskant?":
    "En regulær sekskant har seks lige lange sider og seks lige store vinkler på 120 grader.",
  "Hvad kaldes verdens største ocean?":
    "Stillehavet er større end alle Jordens landområder tilsammen og dækker omkring en tredjedel af planetens overflade.",
  "Hvilket organ pumper blod rundt i kroppen?":
    "Hjertet er en muskelpumpe med fire kamre, der sender blod gennem både lunge- og kropskredsløbet.",
  "Hvad er hovedstaden i Canada?":
    "Ottawa blev valgt som Canadas hovedstad i 1857; Toronto er landets største by, men ikke hovedstaden.",
  "Hvilken farve får man ved at blande blå og gul?":
    "I traditionel farveblanding giver blå og gul grøn, fordi pigmenterne tilsammen absorberer andre dele af lyset.",
};

function semanticKey(prompt: string, categoryId: string, answer: string) {
  if (
    /^\d+(?:[,.]\d+)?(?:\s|$)/.test(answer) ||
    /^(Hvor mange|Hvor lang|Hvilket år)/i.test(prompt)
  )
    return "tal";
  if (/^Hvad står .+ for|^Hvad betyder [A-ZÆØÅ0-9-]{2,}/.test(prompt))
    return "abbreviation";
  const kinds: Array<[string, RegExp]> = [
    ["year", /\b(hvilket år|årstal|århundrede|årtier?)\b/i],
    ["city", /\b(hovedstad|by)\b/i],
    ["island", /(?:^|\s)ø(?:\s|[?.!,])|øgruppe/i],
    ["river", /(?:^|\s)å(?:\s|[?.!,])|flod|vandløb/i],
    ["sø", /(?:^|\s)sø(?:\s|[?.!,])|søen|søer/i],
    ["ørken", /ørken/i],
    ["stræde", /stræde/i],
    ["mountain", /\b(bjerg|vulkan)\b/i],
    ["country", /\b(land|nation|rige)\b/i],
    ["bridge", /\bbro(?:en|er|erne|forbindelse)?\b/i],
    ["organization", /\b(institution|organisation|myndighed)\b/i],
    ["band", /\b(band|musikgruppe)\b/i],
    [
      "person",
      /(^Hvem\b|\bforfatter|instruktør|kunstner|sanger|musiker|filosof|psykolog|gud|gudinde|helt|opfinder|arkitekt|komponist|forsker|politiker|konge|dronning|skuespiller)/i,
    ],
    ["film", /\bfilm(en)?\b/i],
    ["series", /\b(tv-serie|serie)\b/i],
    ["book", /\b(roman|bog|værk|novelle|digt)\b/i],
    ["music", /\b(album|sang|nummer|band|gruppe|genre)\b/i],
    ["game", /\b(spil|gaming|konsol)\b/i],
    ["animal", /\b(dyr|fugl|fisk|pattedyr|insekt)\b/i],
    ["sport", /\b(sport|sportsgren|disciplin|klub)\b/i],
    ["instrument", /\b(instrument)\b/i],
    ["language", /\b(sprog|ord|udtryk|begreb)\b/i],
    ["currency", /\b(valuta|møntfod)\b/i],
    ["food", /\b(ret|mad|ost|kage|brød|drue|ingrediens)\b/i],
    ["drink", /\b(cocktail|drink|spiritus)\b/i],
    ["company", /\b(brand|mærke|virksomhed|firma)\b/i],
    ["space", /\b(planet|måne|stjerne|stjernebillede)\b/i],
    ["element", /\b(grundstof|partikel|metal)\b/i],
    ["theory", /\b(teori|retning|princip|lov)\b/i],
  ];
  const kind = kinds.find(([, pattern]) => pattern.test(prompt))?.[0];
  if (kind) return kind;
  if (
    /^(Hvad er|Hvad betyder|Hvad gør|Hvad beskriver|Hvad undersøger|Hvad bruges|Hvad består)/i.test(
      prompt,
    )
  ) {
    const answerOpening = answer.match(/^(En|Et|At|Den|Det|Når|Hvor|Hvad)\b/i)?.[1];
    return `definition:${answerOpening?.toLocaleLowerCase("da") ?? "andet"}`;
  }
  const match = prompt.match(
    /^Hvilke[nrt]?\s+(land|by|film|serie|roman|bog|planet|måne|dyr|fugl|sport|instrument|valuta|farve|træ|ost|drue|cocktail|brand|virksomhed|platform|spil|band|gruppe|sanger|kunstner|filosof|psykolog|gud|helt|opfindelse|teknologi|institution|myndighed|flod|ørken|stræde|pest|fred|genre|stil|retning|teori|partikel|kraft|vitamin)/i,
  );
  if (match) return match[1].toLocaleLowerCase("da");
  const opening = prompt.match(
    /^(Hvad (?:hedder|kaldes|er|betyder|gør|beskriver|måler|undersøger|består)|Hvor (?:ligger|stammer))/i,
  )?.[1];
  return `${categoryId}:${opening?.toLocaleLowerCase("da") ?? prompt.split(" ")[0]}`;
}

const semanticFallbacks: Record<string, string[]> = {
  city: [
    "København",
    "Odense",
    "Aalborg",
    "Esbjerg",
    "Randers",
    "Aarhus",
    "Oslo",
    "Stockholm",
  ],
  island: ["Fyn", "Bornholm", "Lolland", "Falster", "Møn", "Samsø", "Gotland", "Öland"],
  river: [
    "Rhinen",
    "Donau",
    "Seinen",
    "Themsen",
    "Elben",
    "Volga",
    "Po",
    "Tiberen",
  ],
  sø: ["Ladoga", "Onega", "Vänern", "Genèvesøen", "Balatonsøen", "Comosøen"],
  ørken: ["Kalahari", "Sahara", "Namib", "Gobi", "Atacama", "Thar"],
  stræde: [
    "Gibraltarstrædet",
    "Bosporusstrædet",
    "Beringstrædet",
    "Hormuzstrædet",
    "Messinastrædet",
    "Doverstrædet",
  ],
  mountain: ["Mont Blanc", "Kilimanjaro", "Matterhorn", "Elbrus", "Vesuv", "Etna"],
  country: ["Danmark", "Norge", "Sverige", "Tyskland", "Frankrig", "Spanien", "Italien", "Polen"],
  instrument: ["Guitar", "Klaver", "Violin", "Trompet", "Cello", "Klarinet", "Harpe", "Fløjte"],
  currency: ["Euro", "Dollar", "Krone", "Pund", "Yen", "Franc", "Peso", "Rupie"],
  animal: ["Ræv", "Grævling", "Odder", "Los", "Mår", "Hare", "Bæver", "Sæl"],
  bridge: [
    "Storebæltsforbindelsen",
    "Øresundsbroen",
    "Lillebæltsbroen",
    "Farøbroerne",
    "Kronprinsesse Marys Bro",
    "Dronning Alexandrines Bro",
  ],
  organization: [
    "Europa-Kommissionen",
    "Europa-Parlamentet",
    "EU-Domstolen",
    "Det Europæiske Råd",
    "Folketinget",
    "FN's Generalforsamling",
  ],
  band: ["Queen", "The Beatles", "ABBA", "Nirvana", "U2", "Coldplay", "Metallica", "A-ha"],
  abbreviation: [
    "Verdenssundhedsorganisationen",
    "De Forenede Nationer",
    "Den Europæiske Union",
    "Den Internationale Valutafond",
    "Den Nordatlantiske Traktatorganisation",
    "Video Assistant Referee",
  ],
};

function fallbackOptions(key: string, prompt: string, categoryId: string) {
  const danishGeography: Partial<Record<string, string[]>> = {
    city: [
      "København",
      "Odense",
      "Aalborg",
      "Esbjerg",
      "Randers",
      "Aarhus",
      "Horsens",
      "Kolding",
      "Vejle",
      "Roskilde",
    ],
    island: ["Fyn", "Bornholm", "Lolland", "Falster", "Møn", "Samsø"],
    river: ["Skjern Å", "Suså", "Odense Å", "Vidå", "Kongeåen", "Storå"],
  };
  const values =
    (categoryId === "cat-2" ? danishGeography[key] : undefined) ??
    semanticFallbacks[key] ??
    [];
  if (values.length === 0) return [];
  const start = Number.parseInt(stableHash(prompt), 36) % values.length;
  return values.map((_, index) => values[(start + index) % values.length]);
}

function numericDistractors(answer: string) {
  const match = answer.match(/^(\d+(?:[,.]\d+)?)(.*)$/);
  if (!match) return [];
  const decimal = match[1].includes(",")
    ? ","
    : match[1].includes(".")
      ? "."
      : "";
  const value = Number(match[1].replace(",", "."));
  const suffix = match[2];
  const deltas =
    value >= 1000 ? [-10, 10, 20] : value > 40 ? [-5, 5, 10] : [-1, 1, 2];
  return deltas.map((delta) => {
    const next = Math.max(0, value + delta);
    const formatted = decimal
      ? next.toFixed(match[1].split(decimal)[1].length).replace(".", decimal)
      : String(next);
    return `${formatted}${suffix}`;
  });
}

function listedOptions(prompt: string, type: QuestionType) {
  const list = prompt
    .split(":")
    .slice(1)
    .join(":")
    .replace(/[?.!]$/, "")
    .trim();
  if (type === "odd_one_out")
    return list
      .replace(/ eller /i, ", ")
      .split(",")
      .map((x) => x.trim());
  if (type === "what_came_first")
    return list.split(/ eller /i).map((x) => x.trim());
  return [];
}

function optionsFor(
  prompt: string,
  correct: string,
  categoryId: string,
  type: QuestionType,
) {
  if (type === "true_false") return ["Sandt", "Falsk"];
  const listed = listedOptions(prompt, type);
  if (listed.length >= 2) return listed;
  const numeric = numericDistractors(correct);
  if (numeric.length) return [correct, ...numeric];
  const key = semanticKey(prompt, categoryId, correct);
  const candidates = [
    ...(overrides[prompt] ?? []),
    ...fallbackOptions(key, prompt, categoryId),
    ...rows
      .filter(
        (row) =>
          row.answer !== correct &&
          row.categoryId === categoryId &&
          semanticKey(row.prompt, row.categoryId, row.answer) === key,
      )
      .map((row) => row.answer),
    ...rows
      .filter(
        (row) =>
          row.answer !== correct &&
          row.categoryId === categoryId &&
          row.prompt.split(" ")[0] === prompt.split(" ")[0],
      )
      .map((row) => row.answer),
    ...rows
      .filter(
        (row) =>
          row.answer !== correct &&
          semanticKey(row.prompt, row.categoryId, row.answer) === key,
      )
      .map((row) => row.answer),
    ...rows
      .filter((row) => row.answer !== correct && row.categoryId === categoryId)
      .map((row) => row.answer),
  ];
  const uniqueCandidates = [
    ...new Map(
      candidates
        .filter((candidate) => normalizeText(candidate) !== normalizeText(correct))
        .map((candidate) => [normalizeText(candidate), candidate]),
    ).values(),
  ];
  return [correct, ...uniqueCandidates].slice(0, 4);
}

const CURATED_QUESTIONS: Question[] = seedSpecs.flatMap((spec) =>
  spec.items.map((item, index) => {
    const [prompt, correct, detail] = item;
    const type: QuestionType =
      spec.categoryId === "cat-47"
        ? "true_false"
        : spec.categoryId === "cat-45"
          ? "what_came_first"
          : spec.categoryId === "cat-46"
            ? "odd_one_out"
            : "multiple_choice";
    const texts = optionsFor(prompt, correct, spec.categoryId, type);
    const correctIndex = texts.findIndex(
      (text) =>
        text.toLocaleLowerCase("da") === correct.toLocaleLowerCase("da"),
    );
    const options = texts.map((text, optionIndex) => ({
      id: `o${optionIndex + 1}`,
      text,
    }));
    return {
      id: `q-${spec.categoryId}-${index + 1}`,
      prompt,
      type,
      categoryId: spec.categoryId,
      secondaryCategoryIds: [],
      difficulty: ((Number(spec.categoryId.slice(4)) + index * 2) % 5) + 1,
      options,
      correctOptionId: `o${correctIndex + 1}`,
      explanation:
        detail ??
        explanationOverrides[prompt] ??
        `Det korrekte svar er ${correct}. Det er den centrale sammenhæng, spørgsmålet tester.`,
      sourceLabel: "KVIZY redaktionel seedbank",
      tags: [
        CATEGORIES.find(
          (category) => category.id === spec.categoryId,
        )?.name.toLocaleLowerCase("da") ?? "quiz",
      ],
      origin: "curated",
      status: "active",
      fingerprint: fingerprint(prompt, correct, type),
      qualityScore: 92,
      timeSensitive: false,
      createdAt: created,
      updatedAt: created,
      playCount: 0,
      correctRate: 0,
      reportCount: 0,
    } satisfies Question;
  }),
);

const BASE_QUESTIONS: Question[] = [
  ...CURATED_QUESTIONS,
  ...COUNTRY_QUESTIONS,
  ...MUSIC_PRODUCTION_QUESTIONS,
  ...WIKIDATA_CULTURE_QUESTIONS,
  ...EXPANSION_QUESTIONS,
  ...WIKIDATA_THIN_QUESTIONS,
  ...VARIETY_QUESTIONS,
];

const categoryLinks: Record<string, string[]> = {
  "cat-11": ["cat-14"],
  "cat-12": ["cat-13"],
  "cat-13": ["cat-12"],
  "cat-16": ["cat-2", "cat-15", "cat-36"],
  "cat-17": ["cat-36"],
  "cat-18": ["cat-2", "cat-17", "cat-36"],
  "cat-19": ["cat-36"],
  "cat-20": ["cat-2", "cat-19", "cat-36"],
  "cat-21": ["cat-36"],
  "cat-22": ["cat-2", "cat-21", "cat-36"],
  "cat-26": ["cat-2", "cat-25"],
  "cat-27": ["cat-25"],
  "cat-8": ["cat-7"],
  "cat-29": ["cat-28"],
  "cat-41": ["cat-36"],
  "cat-42": ["cat-36"],
  "cat-43": ["cat-36", "cat-42"],
  "cat-44": ["cat-36"],
};
const typeLinks: Partial<Record<Question["type"], string>> = {
  true_false: "cat-47",
  odd_one_out: "cat-46",
  what_came_first: "cat-45",
  ordering: "cat-45",
  incorrect_statement: "cat-46",
};
const personTags = new Set([
  "novel-author",
  "danish-literature-author",
  "film-director",
  "danish-film-director",
  "series-creator",
  "danish-series-creator",
  "album-artist",
  "danish-song-performer",
  "painting-artist",
  "company-founder",
  "building-architect",
  "invention-inventor",
  "philosopher-movement",
  "psychologist-field",
]);

const POLISHED_QUESTIONS: Question[] = BASE_QUESTIONS.map((question) => {
  const inferred = [
    ...(categoryLinks[question.categoryId] ?? []),
    ...(typeLinks[question.type] ? [typeLinks[question.type]!] : []),
    ...(question.tags.some((tag) => personTags.has(tag)) ? ["cat-40"] : []),
    ...(question.categoryId === "cat-1" && question.difficulty <= 2
      ? ["cat-59"]
      : []),
  ];
  const correctAnswer = question.options.find(
    (option) => option.id === question.correctOptionId,
  )?.text;
  const capitalizeOption = (text: string) => {
    const value = text.trim();
    if (/^(iPhone|iPad|iOS|iPod|eBay|macOS)\b/.test(value)) return value;
    return /^\p{Ll}/u.test(value)
      ? `${value[0].toLocaleUpperCase("da")}${value.slice(1)}`
      : value;
  };
  const cleanText = (text: string) =>
    text.trim().replace(/\s{2,}/g, " ").replace(/\.{2}$/, ".");
  return {
    ...question,
    prompt: cleanText(question.prompt),
    options: question.options.map((option) => ({
      ...option,
      text: cleanText(capitalizeOption(option.text)),
    })),
    explanation: cleanText(
      question.explanation.includes("centrale sammenhæng")
        ? `Svaret er ${correctAnswer ?? "angivet ovenfor"}.`
        : question.explanation,
    ),
    secondaryCategoryIds: [
      ...new Set([...question.secondaryCategoryIds, ...inferred]),
    ].filter((categoryId) => categoryId !== question.categoryId),
  };
}).filter((question) => {
  const optionKeys = question.options.map((option) =>
    normalizeText(option.text),
  );
  return new Set(optionKeys).size === optionKeys.length;
});

const QUESTIONS_BY_PROMPT = new Map<string, Question>();
for (const question of POLISHED_QUESTIONS) {
  const promptKey = normalizeText(question.prompt);
  const existing = QUESTIONS_BY_PROMPT.get(promptKey);
  if (!existing) {
    QUESTIONS_BY_PROMPT.set(promptKey, question);
    continue;
  }
  existing.secondaryCategoryIds = [
    ...new Set([
      ...existing.secondaryCategoryIds,
      question.categoryId,
      ...question.secondaryCategoryIds,
    ]),
  ].filter((categoryId) => categoryId !== existing.categoryId);
}

export const SEED_QUESTIONS: Question[] = [
  ...QUESTIONS_BY_PROMPT.values(),
].filter((question) => !hasAnswerLeak(question));
