import { fingerprint } from "@/lib/engine";
import type { Question } from "@/lib/types";

const specs = [
  {
    prompt: "Hvad viser de såkaldte Gettier-eksempler?",
    correct: "At begrundet sand overbevisning ikke altid er nok til viden",
    distractors: [
      "At sikker viden kræver en matematisk formulering",
      "At sanseerfaring altid er mere pålidelig end logik",
      "At en sand påstand ikke kan være baseret på held",
    ],
    explanation:
      "Gettier-eksempler beskriver tilfælde, hvor en person har en begrundet og sand overbevisning, men kun rammer sandheden ved et tilfælde. De udfordrer en klassisk definition af viden.",
    difficulty: 5,
    tag: "erkendelsesteori",
  },
  {
    prompt: "Hvad går stoikernes skel mellem kontrol og ikke-kontrol ud på?",
    correct: "At fokusere på egne valg frem for det, man ikke kan styre",
    distractors: [
      "At undertrykke alle følelser for at tænke helt rationelt",
      "At opdele samfundet efter menneskers evne til selvkontrol",
      "At undgå handlinger, hvis udfaldet ikke kan forudsiges sikkert",
    ],
    explanation:
      "Stoikerne skelnede mellem vores egne vurderinger og handlinger og de ydre forhold, vi ikke behersker. Ro findes ved at rette indsatsen mod det første.",
    difficulty: 3,
    tag: "stoicisme",
  },
  {
    prompt: "Hvad er kernen i David Humes problem om ‘er’ og ‘bør’?",
    correct: "En moralsk konklusion følger ikke alene af beskrivelser af fakta",
    distractors: [
      "En faktuel påstand bliver moralsk rigtig, hvis flertallet er enig",
      "En moralsk regel gælder kun, når dens følger kan måles præcist",
      "En beskrivelse af naturen er altid farvet af personlige værdier",
    ],
    explanation:
      "Hume gjorde opmærksom på springet fra udsagn om, hvordan verden er, til udsagn om, hvordan den bør være. Der kræves mindst én normativ præmis.",
    difficulty: 5,
    tag: "moralfilosofi",
  },
  {
    prompt: "Hvorfor fremhævede Karl Popper falsificerbarhed i videnskab?",
    correct: "En teori skal kunne modsiges af en mulig observation",
    distractors: [
      "En teori skal kunne bevises endeligt gennem gentagne forsøg",
      "En teori skal forklare samtlige kendte observationer uden undtagelser",
      "En teori skal bygge på målinger, som forskere allerede accepterer",
    ],
    explanation:
      "For Popper er en videnskabelig teori risikabel: Man skal kunne beskrive en observation, der ville tale imod den. Bekræftelser alene er ikke nok.",
    difficulty: 4,
    tag: "videnskabsfilosofi",
  },
  {
    prompt: "Hvad skal Robert Nozicks tankeeksperiment om en oplevelsesmaskine undersøge?",
    correct: "Om behagelige oplevelser alene er nok til et godt liv",
    distractors: [
      "Om en maskine kan træffe mere retfærdige valg end et menneske",
      "Om minder stadig er ægte, når de lagres uden for hjernen",
      "Om teknologisk fremskridt nødvendigvis øger menneskers frihed",
    ],
    explanation:
      "Nozick bad os forestille os en maskine, der giver perfekte oplevelser. Mange vil ikke kobles til, hvilket antyder, at vi også værdsætter virkelighed, handling og identitet.",
    difficulty: 4,
    tag: "tankeeksperiment",
  },
  {
    prompt: "Hvad betyder Sartres formulering ‘eksistensen går forud for essensen’?",
    correct: "Mennesket skaber sig selv gennem sine valg og handlinger",
    distractors: [
      "Menneskets personlighed er fastlagt før fødslen",
      "Kroppens behov kommer altid før moralske hensyn",
      "Et menneskes rolle bestemmes af det samfund, det fødes i",
    ],
    explanation:
      "Hos Sartre har mennesket ingen på forhånd fastlagt natur eller opgave. Vi eksisterer først og former derefter os selv gennem vores valg.",
    difficulty: 4,
    tag: "eksistentialisme",
  },
  {
    prompt: "Hvad beskriver Albert Camus som det absurde?",
    correct: "Mødet mellem menneskets søgen efter mening og en tavs verden",
    distractors: [
      "Konflikten mellem fornuft og menneskets biologiske drifter",
      "Følelsen af at være fremmedgjort fra det moderne arbejdsliv",
      "Påstanden om, at enhver moralsk regel fører til en selvmodsigelse",
    ],
    explanation:
      "Det absurde opstår hos Camus i spændingen mellem vores behov for mening og en verden, der ikke giver et klart svar. Han anbefaler oprør og nærvær frem for resignation.",
    difficulty: 4,
    tag: "absurdisme",
  },
  {
    prompt: "Hvad adskiller den regelbaserede tilgang fra den handlingsbaserede?",
    correct: "Den bedømmer faste retningslinjer efter deres samlede følger",
    distractors: [
      "Den vurderer hensigten bag en handling frem for dens konsekvenser",
      "Den giver den enkeltes rettigheder forrang for fælles velfærd",
      "Den kræver, at moralske regler aldrig må have undtagelser",
    ],
    explanation:
      "Handlingsutilitarisme vurderer den enkelte handling direkte. Regelutilitarisme spørger i stedet, hvilke generelle regler der typisk skaber de bedste konsekvenser.",
    difficulty: 5,
    tag: "utilitarisme",
  },
  {
    prompt: "Hvad forbandt Epikur især med et godt og behageligt liv?",
    correct: "Fravær af kropslig smerte og uro i sindet",
    distractors: [
      "Størst mulig nydelse i hvert enkelt øjeblik",
      "Anerkendelse og indflydelse i det offentlige liv",
      "Et liv uden stærke venskaber eller følelsesmæssige bånd",
    ],
    explanation:
      "Epikur anbefalede mådehold, venskab og sindsro. Nydelse betød ikke konstant overflod, men især frihed fra smerte og unødig frygt.",
    difficulty: 3,
    tag: "epikuræisme",
  },
  {
    prompt: "Hvad kendetegner den sokratiske samtalemetode?",
    correct: "Spørgsmål bruges til at afprøve antagelser og definitioner",
    distractors: [
      "Taleren fremlægger først en konklusion og undgår indvendinger",
      "To synspunkter afgøres ved at tælle, hvor mange der støtter dem",
      "Et moralsk problem løses ved at finde et historisk fortilfælde",
    ],
    explanation:
      "Sokrates forbindes med en undersøgende spørgeteknik, hvor uklare begreber og skjulte modsigelser bliver synlige gennem samtalen.",
    difficulty: 2,
    tag: "sokratisk-metode",
  },
] as const;

const createdAt = "2026-07-18T18:00:00.000Z";

export const PHILOSOPHY_QUESTIONS: Question[] = specs.map((spec, index) => {
  const options = [spec.correct, ...spec.distractors].map((text, optionIndex) => ({
    id: `o${optionIndex + 1}`,
    text,
  }));
  return {
    id: `philosophy-quality-${String(index + 1).padStart(3, "0")}`,
    prompt: spec.prompt,
    type: "multiple_choice",
    categoryId: "cat-11",
    secondaryCategoryIds: ["cat-14"],
    difficulty: spec.difficulty,
    options,
    correctOptionId: "o1",
    explanation: spec.explanation,
    sourceLabel: "KVIZY · redaktionel filosofibank",
    tags: ["filosofi", "redaktionel", spec.tag],
    origin: "curated",
    status: "active",
    fingerprint: fingerprint(spec.prompt, spec.correct, "multiple_choice"),
    qualityScore: 96,
    timeSensitive: false,
    createdAt,
    updatedAt: createdAt,
    playCount: 0,
    correctRate: 0,
    reportCount: 0,
  };
});
