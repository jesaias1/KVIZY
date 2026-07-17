import { fingerprint, stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

type Fact = [
  categoryId: string,
  answerKind: string,
  prompt: string,
  answer: string,
  detail: string,
  difficulty: number,
  secondary?: string[],
];

const facts: Fact[] = [
  ["cat-31", "greek-figure", "Hvem besejrede Minotauros i labyrinten på Kreta?", "Theseus", "Han fandt ud igen ved hjælp af Ariadnes tråd.", 2],
  ["cat-31", "greek-figure", "Hvem fløj for tæt på Solen med vinger af voks og fjer?", "Ikaros", "Voksen smeltede, selv om hans far Daidalos havde advaret ham.", 1],
  ["cat-31", "greek-figure", "Hvilken helt udførte tolv berømte arbejder?", "Herakles", "Arbejderne omfattede kampen mod den nemeiske løve.", 2],
  ["cat-31", "greek-figure", "Hvem gav menneskene ilden og blev straffet af Zeus?", "Prometheus", "Han blev lænket, og en ørn åd dagligt af hans lever.", 2],
  ["cat-31", "greek-figure", "Hvem var dømt til at skubbe en sten op ad et bjerg igen og igen?", "Sisyfos", "Straffen har givet navn til et sisyfosarbejde.", 2, ["cat-14"]],
  ["cat-31", "greek-figure", "Hvilken helt brugte et spejlblankt skjold mod Medusa?", "Perseus", "Skjoldets spejlbillede lod ham undgå hendes blik.", 3],
  ["cat-31", "greek-figure", "Hvem ledte argonauternes jagt på det gyldne skind?", "Jason", "Skibet hed Argo, og besætningen blev kaldt argonauterne.", 3],
  ["cat-31", "greek-figure", "Hvilken sanger forsøgte at hente Eurydike ud af dødsriget?", "Orfeus", "Han måtte ikke vende sig om, før de var ude.", 2, ["cat-21"]],
  ["cat-31", "greek-deity", "Hvilken gudinde forbindes med jagt og vild natur?", "Artemis", "Hun var Apollons tvillingesøster og bar ofte bue.", 2],
  ["cat-31", "greek-deity", "Hvilken gud var smed for guderne på Olympen?", "Hefaistos", "Han fremstillede blandt andet gudernes våben og rustninger.", 3],
  ["cat-31", "greek-deity", "Hvem var budbringer for de græske guder?", "Hermes", "Hans vingede sandaler symboliserer hans fart.", 1],
  ["cat-31", "greek-deity", "Hvilken gudinde sprang ifølge myten fuldt bevæbnet ud af Zeus' hoved?", "Athene", "Hun forbindes med visdom og strategisk krigsførelse.", 2],
  ["cat-31", "greek-place", "Hvad hedder floden, som ofte markerer grænsen til dødsriget?", "Styx", "De døde blev færget over af Charon.", 3],
  ["cat-31", "greek-place", "På hvilket bjerg boede de olympiske guder?", "Olympen", "Bjerget er også Grækenlands højeste.", 1, ["cat-6"]],
  ["cat-31", "greek-creature", "Hvilket væsen havde løvekrop, gedehoved og slangehale?", "Kimæren", "Bellerofon besejrede den med hjælp fra Pegasos.", 4],
  ["cat-31", "greek-creature", "Hvilket væsen stillede en gåde ved indgangen til Theben?", "Sfinksen", "Ødipus løste gåden om menneskets aldre.", 3],
  ["cat-31", "greek-creature", "Hvilken trehovedet hund bevogtede dødsriget?", "Kerberos", "Herakles hentede den som sit sidste arbejde.", 2],
  ["cat-31", "greek-object", "Hvilken gave åbnede Pandora trods en advarsel?", "En krukke", "Den omtales ofte som en æske i moderne gengivelser.", 2],
  ["cat-31", "greek-event", "Hvilken strid begyndte med en gylden frugt mærket 'til den skønneste'?", "Den trojanske krig", "Paris' valg af Afrodite satte begivenhederne i gang.", 3, ["cat-5"]],

  ["cat-32", "norse-deity", "Hvem vogter regnbuebroen Bifrost?", "Heimdal", "Han kan ifølge myterne høre græsset gro.", 2],
  ["cat-32", "norse-deity", "Hvilken gud forbindes med digtning og veltalenhed?", "Brage", "Han beskrives som gudernes skjald.", 3],
  ["cat-32", "norse-deity", "Hvilken gudinde vogter ungdommens æbler?", "Idun", "Æblerne holder guderne unge.", 2],
  ["cat-32", "norse-deity", "Hvem er gud for hav, vind og rigdom?", "Njord", "Han er far til Frej og Freja.", 3],
  ["cat-32", "norse-deity", "Hvilken gud ejer skibet Skidbladner?", "Frej", "Skibet kan foldes sammen og altid få medvind.", 3],
  ["cat-32", "norse-figure", "Hvem dræbte dragen Fafner?", "Sigurd Fafnersbane", "Efter sejren kunne han forstå fuglenes tale.", 3],
  ["cat-32", "norse-figure", "Hvilken jætte byggede Asgårds mur med hjælp fra hingsten Svadilfare?", "Hrimturse-byggemesteren", "Loke forhindrede ham i at fuldføre arbejdet til tiden.", 4],
  ["cat-32", "norse-creature", "Hvilken ulv skal slippe fri ved Ragnarok?", "Fenrisulven", "Guderne bandt den med lænken Gleipner.", 2],
  ["cat-32", "norse-creature", "Hvilket dyr gnaver ved en rod af Yggdrasil?", "Dragen Nidhug", "Den holder til nær brønden Hvergelmer.", 3],
  ["cat-32", "norse-creature", "Hvilket egern løber med fornærmelser op og ned ad Yggdrasil?", "Ratatosk", "Det bringer ord mellem ørnen i kronen og Nidhug ved roden.", 4],
  ["cat-32", "norse-place", "Hvad hedder menneskenes verden i nordisk mytologi?", "Midgård", "Den ligger mellem gudernes og jætternes verdener.", 1],
  ["cat-32", "norse-place", "Hvad hedder jætternes hjem?", "Jotunheim", "Det er adskilt fra Midgård og Asgård.", 2],
  ["cat-32", "norse-place", "Hvilken sal modtager krigere udvalgt af Odin?", "Valhal", "Valkyrierne fører de udvalgte dertil.", 1],
  ["cat-32", "norse-object", "Hvad hedder Odins spyd, som aldrig rammer ved siden af?", "Gungner", "Dværgene, Ivaldesønnerne, smedede spyddet.", 3],
  ["cat-32", "norse-object", "Hvad hedder den magiske lænke omkring Fenrisulven?", "Gleipner", "Den ser tynd ud, men er stærkere end jern.", 3],
  ["cat-32", "norse-object", "Hvad hedder ringen, der hver niende nat drypper otte nye ringe?", "Draupner", "Odin lagde ringen på Balders ligbål.", 4],
  ["cat-32", "norse-event", "Hvad indleder den sidste vinter før Ragnarok?", "Fimbulvinteren", "Tre hårde vintre følger uden sommer imellem.", 2],
  ["cat-32", "norse-event", "Hvad sker der med solen under Ragnarok ifølge myten?", "Ulven Skoll sluger den", "Skoll har jagtet solen over himlen.", 3],
  ["cat-32", "norse-event", "Hvad markerer Balders død i mange gengivelser af myterne?", "Ragnarok nærmer sig", "Balders død er et afgørende varsel om gudernes undergang.", 3],
  ["cat-32", "norse-number", "Hvor mange ben har Odins hest Sleipner?", "Otte", "Sleipner beskrives som den hurtigste af alle heste.", 1],
  ["cat-32", "norse-number", "Hvor mange verdener forbindes normalt af Yggdrasil?", "Ni", "De ni verdener omfatter blandt andet Asgård, Midgård og Jotunheim.", 2],
  ["cat-32", "norse-number", "Hvor mange rødder beskrives Yggdrasil med i Den Yngre Edda?", "Tre", "Rødderne strækker sig mod forskellige verdener og brønde.", 3],
  ["cat-32", "norse-number", "Hvor mange nætter går der mellem hver gang Draupner drypper nye ringe?", "Ni nætter", "Efter perioden kommer otte ringe af samme vægt.", 4],

  ["cat-33", "hp-person", "Hvem er Harrys gudfar?", "Sirius Black", "Han var James Potters nære ven og medlem af Fønixordenen.", 1],
  ["cat-33", "hp-person", "Hvem underviser først Harry i forsvar mod mørkets kræfter?", "Quirinus Quirrell", "Han underviser i Harrys første skoleår.", 2],
  ["cat-33", "hp-person", "Hvem er leder af kollegiet Hufflepuff?", "Pomona Spire", "Hun underviser også i botanik.", 3],
  ["cat-33", "hp-person", "Hvem er mor til Draco Malfoy?", "Narcissa Malfoy", "Hendes løgn for Voldemort hjælper Harry under slaget om Hogwarts.", 3],
  ["cat-33", "hp-person", "Hvilken auror har et magisk øje?", "Alastor Moody", "Tilnavnet Skrækøje kommer fra det roterende øje.", 2],
  ["cat-33", "hp-person", "Hvem grundlagde kollegiet Ravenclaw?", "Rowena Ravenclaw", "Hendes diadem blev senere gjort til en horcrux.", 2],
  ["cat-33", "hp-place", "Hvad hedder troldmandslandsbyen nær Hogwarts?", "Hogsmeade", "Elever fra tredje år kan besøge landsbyen med tilladelse.", 1],
  ["cat-33", "hp-place", "På hvilken perron afgår toget til Hogwarts?", "Perron 9¾", "Perronen nås gennem en barriere på King's Cross.", 1],
  ["cat-33", "hp-place", "Hvad hedder troldmandsbanken i Diagonalstræde?", "Gringotts", "Banken drives hovedsageligt af nisser.", 1],
  ["cat-33", "hp-place", "Hvor bor familien Weasley?", "Vindelhuset", "Det skæve hus ligger nær landsbyen Ottery St Catchpole.", 2],
  ["cat-33", "hp-object", "Hvad viser Røverkortet?", "Personers placering på Hogwarts", "Kortet viser både gange og navngivne personer i bevægelse.", 2],
  ["cat-33", "hp-object", "Hvilken genstand vælger kollegium for nye elever?", "Fordelingshatten", "Hatten tager elevens egenskaber og ønsker i betragtning.", 1],
  ["cat-33", "hp-object", "Hvad bruges en tidsvender til?", "At rejse nogle timer tilbage", "Hermione bruger en i sit tredje skoleår.", 2],
  ["cat-33", "hp-object", "Hvad gemmer Dumbledore i et mindekar?", "Minder", "Minderne kan betragtes udefra som levende scener.", 2],
  ["cat-33", "hp-creature", "Hvilket væsen trækker vognene til Hogwarts for dem, der kan se det?", "Thestraler", "De ses kun af personer, som har oplevet og forstået et dødsfald.", 3],
  ["cat-33", "hp-creature", "Hvilket dyr er Fawkes?", "En føniks", "Fawkes' tårer har helende kræfter.", 1],
  ["cat-33", "hp-creature", "Hvilket væsen bor i skolens hemmelige kammer?", "En basilisk", "Dens direkte blik er dødeligt.", 2],
  ["cat-33", "hp-creature", "Hvilken slags væsen er Dobby?", "En husalf", "Han bliver fri, da han modtager en sok.", 1],
  ["cat-33", "hp-spell", "Hvilken besværgelse fremkalder lys fra tryllestaven?", "Lumos", "Modbesværgelsen, der slukker lyset, er Nox.", 1],
  ["cat-33", "hp-spell", "Hvilken besværgelse bruges til at reparere en ødelagt genstand?", "Reparo", "Hermione bruger blandt andet magien på Harrys briller.", 1],
  ["cat-33", "hp-spell", "Hvilken besværgelse tilkalder en genstand?", "Accio", "Genstanden flyver mod den, der udfører besværgelsen.", 2],
  ["cat-33", "hp-spell", "Hvilken besværgelse fremkalder en patronus?", "Expecto Patronum", "En patronus kan holde dementorer på afstand.", 2],
  ["cat-33", "hp-subject", "Hvilket fag underviser professor Binns i?", "Magihistorie", "Binns fortsatte undervisningen som spøgelse.", 3],
  ["cat-33", "hp-subject", "I hvilket fag lærer eleverne at passe magiske planter?", "Botanik", "Undervisningen foregår ofte i Hogwarts' drivhuse.", 1],
  ["cat-33", "hp-subject", "I hvilket fag lærer eleverne at forvandle ting?", "Forvandling", "Minerva McGonagall underviser faget i Harrys første år.", 1],
  ["cat-33", "hp-subject", "I hvilket fag tolker eleverne stjerner og planeter?", "Astronomi", "Undervisningen foregår om natten i astronomitårnet.", 2, ["cat-8"]],
];

const createdAt = "2026-07-17T00:00:00.000Z";
const poolKind = (kind: string) =>
  /^(greek|norse)-(place|object|event|creature|figure)$/u.test(kind)
    ? kind.replace(/^(greek|norse)-/u, "myth-")
    : kind;
const answersByKind = Object.groupBy(facts, (fact) => poolKind(fact[1]));

const distractorsFor = (kind: string, answer: string, id: string) => {
  const candidates = [
    ...new Set((answersByKind[poolKind(kind)] ?? []).map((fact) => fact[3])),
  ].filter((candidate) => candidate !== answer);
  const pivot = Number.parseInt(stableHash(id).slice(0, 8), 16) || 0;
  return candidates
    .sort((a, b) =>
      Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length) ||
      a.localeCompare(b, "da"),
    )
    .slice(pivot % Math.max(1, candidates.length - 2))
    .concat(candidates)
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .slice(0, 3);
};

export const CATEGORY_DEPTH_QUESTIONS: Question[] = facts.map((fact, index) => {
  const [categoryId, kind, prompt, answer, detail, difficulty, secondary = []] = fact;
  const id = `depth-${String(index + 1).padStart(3, "0")}`;
  const distractors = distractorsFor(kind, answer, id);
  if (distractors.length !== 3) {
    throw new Error(`For få svar i gruppen ${kind}`);
  }
  return {
    id,
    prompt,
    type: "multiple_choice",
    categoryId,
    secondaryCategoryIds: secondary,
    difficulty,
    options: [answer, ...distractors].map((text, optionIndex) => ({
      id: `o${optionIndex + 1}`,
      text,
    })),
    correctOptionId: "o1",
    explanation: `${answer} er korrekt. ${detail}`,
    sourceLabel: "KVIZY redaktion",
    tags: ["redaktionel-dybde", kind],
    origin: "curated",
    status: "active",
    fingerprint: fingerprint(prompt, answer, "multiple_choice"),
    qualityScore: 96,
    timeSensitive: false,
    createdAt,
    updatedAt: createdAt,
    playCount: 0,
    correctRate: 0,
    reportCount: 0,
  };
});
