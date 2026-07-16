import { stableHash } from "@/lib/engine";
import type { Question, QuestionType } from "@/lib/types";

type Spec = {
  type: QuestionType;
  categoryId: string;
  difficulty: number;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  sourceUrl: string;
  order?: number[];
};

const wiki = (page: string) =>
  `https://da.wikipedia.org/wiki/${encodeURIComponent(page).replaceAll("%2F", "/")}`;

const specs: Spec[] = [
  {
    type: "ordering",
    categoryId: "cat-8",
    difficulty: 2,
    prompt: "Rangér planeterne fra nærmest til længst fra Solen.",
    options: ["Mars", "Merkur", "Jorden", "Venus"],
    correct: 0,
    order: [1, 3, 2, 0],
    explanation:
      "De fire første planeter fra Solen er Merkur, Venus, Jorden og Mars.",
    sourceUrl: wiki("Solsystemet"),
  },
  {
    type: "ordering",
    categoryId: "cat-2",
    difficulty: 4,
    prompt: "Sæt de danske regenter i rækkefølge efter deres tronbestigelse.",
    options: ["Margrethe 2.", "Christian 4.", "Christian 10.", "Frederik 7."],
    correct: 0,
    order: [1, 3, 2, 0],
    explanation:
      "Christian 4. kom på tronen i 1588, Frederik 7. i 1848, Christian 10. i 1912 og Margrethe 2. i 1972.",
    sourceUrl: wiki("Danmarks_monarki"),
  },
  {
    type: "ordering",
    categoryId: "cat-39",
    difficulty: 3,
    prompt: "Rangér opfindelserne fra ældst til yngst.",
    options: ["World Wide Web", "Telefonen", "Bogtrykkerkunsten", "Radioen"],
    correct: 0,
    order: [2, 1, 3, 0],
    explanation:
      "Bogtrykkerkunsten kom omkring 1450, telefonen i 1876, radioen i 1890'erne og World Wide Web i 1989.",
    sourceUrl: wiki("Teknologihistorie"),
  },
  {
    type: "ordering",
    categoryId: "cat-15",
    difficulty: 4,
    prompt: "Sæt værkerne i rækkefølge efter deres første udgivelse.",
    options: ["1984", "Hamlet", "Arternes oprindelse", "Stolthed og fordom"],
    correct: 0,
    order: [1, 3, 2, 0],
    explanation:
      "Hamlet er fra omkring 1600, Stolthed og fordom fra 1813, Arternes oprindelse fra 1859 og 1984 fra 1949.",
    sourceUrl: wiki("Litteraturhistorie"),
  },
  {
    type: "ordering",
    categoryId: "cat-25",
    difficulty: 3,
    prompt: "Rangér sportsbegivenhederne efter deres første afholdelse.",
    options: [
      "Fodbold-VM",
      "Tour de France",
      "Moderne olympiske lege",
      "Formel 1-VM",
    ],
    correct: 0,
    order: [2, 1, 0, 3],
    explanation:
      "De moderne OL begyndte i 1896, Tour de France i 1903, fodbold-VM i 1930 og Formel 1-VM i 1950.",
    sourceUrl: wiki("Sportens_historie"),
  },
  {
    type: "ordering",
    categoryId: "cat-23",
    difficulty: 4,
    prompt: "Sæt lydmedierne i rækkefølge fra ældst til yngst.",
    options: ["Compact disc", "Fonograf", "Kompaktkassette", "Magnetbånd"],
    correct: 0,
    order: [1, 3, 2, 0],
    explanation:
      "Fonografen kom i 1877, magnetbåndet i 1920'erne, kompaktkassetten i 1963 og cd'en kommercielt i 1982.",
    sourceUrl: wiki("Lydoptagelse"),
  },
  {
    type: "ordering",
    categoryId: "cat-2",
    difficulty: 4,
    prompt: "Rangér broerne efter åbningsår.",
    options: [
      "Øresundsbroen",
      "Den gamle Lillebæltsbro",
      "Storebæltsforbindelsen",
      "Den nye Lillebæltsbro",
    ],
    correct: 0,
    order: [1, 3, 2, 0],
    explanation: "Broerne åbnede i henholdsvis 1935, 1970, 1998 og 2000.",
    sourceUrl: wiki("Broer_i_Danmark"),
  },
  {
    type: "ordering",
    categoryId: "cat-9",
    difficulty: 3,
    prompt: "Rangér teknologierne efter deres gennembrud, ældst først.",
    options: [
      "Smartphonen",
      "Transistoren",
      "Mikroprocessoren",
      "Dampmaskinen",
    ],
    correct: 0,
    order: [3, 1, 2, 0],
    explanation:
      "Dampmaskinen kom længe før transistoren i 1947, mikroprocessoren i 1971 og den moderne smartphone i 2000'erne.",
    sourceUrl: wiki("Teknologihistorie"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-2",
    difficulty: 3,
    prompt: "Hvor mange kvadratkilometer er Danmarks landareal omtrent?",
    options: ["22.900", "42.900", "62.900", "82.900"],
    correct: 1,
    explanation:
      "Danmarks landareal er cirka 42.952 km², når Grønland og Færøerne ikke medregnes.",
    sourceUrl: wiki("Danmark"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-8",
    difficulty: 3,
    prompt: "Hvor mange kilometer er der i gennemsnit fra Jorden til Månen?",
    options: ["184.400", "284.400", "384.400", "484.400"],
    correct: 2,
    explanation:
      "Månens gennemsnitlige afstand til Jorden er omkring 384.400 kilometer.",
    sourceUrl: wiki("Månen"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-54",
    difficulty: 2,
    prompt: "Hvor mange knogler har et voksent menneske normalt?",
    options: ["186", "196", "206", "216"],
    correct: 2,
    explanation:
      "Et voksent menneskes skelet regnes normalt for at bestå af 206 knogler.",
    sourceUrl: wiki("Menneskets_skelet"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-2",
    difficulty: 4,
    prompt: "Hvor højt er Danmarks højeste naturlige punkt, Møllehøj, omtrent?",
    options: ["121 meter", "146 meter", "171 meter", "196 meter"],
    correct: 2,
    explanation: "Møllehøj måler cirka 170,86 meter over havets overflade.",
    sourceUrl: wiki("Møllehøj"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-7",
    difficulty: 3,
    prompt: "Hvor hurtigt bevæger lyd sig omtrent i tør luft ved 20 °C?",
    options: ["243 m/s", "343 m/s", "443 m/s", "543 m/s"],
    correct: 1,
    explanation:
      "Lydens hastighed i tør luft ved 20 °C er omtrent 343 meter i sekundet.",
    sourceUrl: wiki("Lydens_hastighed"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-21",
    difficulty: 4,
    prompt: "Hvor mange nummererede symfonier tilskrives normalt Mozart?",
    options: ["31", "36", "41", "46"],
    correct: 2,
    explanation:
      "Mozarts traditionelle symfonikatalog ender ved symfoni nr. 41, Jupiter-symfonien.",
    sourceUrl: wiki("Wolfgang_Amadeus_Mozart"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-31",
    difficulty: 2,
    prompt: "Hvor mange olympiske guder regner man traditionelt med?",
    options: ["8", "10", "12", "14"],
    correct: 2,
    explanation:
      "Den klassiske gruppe kaldes De Tolv Olympere, selv om sammensætningen kan variere.",
    sourceUrl: wiki("De_tolvs_guder"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-7",
    difficulty: 4,
    prompt: "Hvor mange grundstoffer har det periodiske system officielt?",
    options: ["108", "113", "118", "123"],
    correct: 2,
    explanation:
      "IUPAC anerkender 118 grundstoffer, fra hydrogen til oganesson.",
    sourceUrl: wiki("Periodiske_system"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-49",
    difficulty: 2,
    prompt: "Hvad kom først?",
    options: [
      "Berlinmurens fald",
      "Den første Macintosh",
      "Tjernobylulykken",
      "Live Aid",
    ],
    correct: 1,
    explanation:
      "Macintosh blev lanceret i 1984, før Live Aid i 1985, Tjernobyl i 1986 og Berlinmurens fald i 1989.",
    sourceUrl: wiki("1980'erne"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-50",
    difficulty: 2,
    prompt: "Hvad skete først i 1990'erne?",
    options: [
      "Google blev grundlagt",
      "Nelson Mandela blev præsident",
      "Windows 95 udkom",
      "Dolly blev klonet",
    ],
    correct: 1,
    explanation:
      "Nelson Mandela blev præsident i 1994; Windows 95, Dolly og Google fulgte senere.",
    sourceUrl: wiki("1990'erne"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-51",
    difficulty: 2,
    prompt: "Hvad kom først i 2000'erne?",
    options: ["YouTube", "Wikipedia", "Den første iPhone", "Spotify"],
    correct: 1,
    explanation:
      "Wikipedia blev lanceret i 2001, YouTube i 2005, iPhone i 2007 og Spotify i 2008.",
    sourceUrl: wiki("2000'erne"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-52",
    difficulty: 3,
    prompt: "Hvilken begivenhed kom først i 2010'erne?",
    options: [
      "Brexit-afstemningen",
      "Instagram blev lanceret",
      "Disney+ blev lanceret",
      "Paris-aftalen",
    ],
    correct: 1,
    explanation:
      "Instagram blev lanceret i 2010, før Paris-aftalen, Brexit-afstemningen og Disney+.",
    sourceUrl: wiki("2010'erne"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-19",
    difficulty: 3,
    prompt: "Hvilken tv-serie havde premiere først?",
    options: ["The Wire", "Breaking Bad", "The Sopranos", "Mad Men"],
    correct: 2,
    explanation:
      "The Sopranos havde premiere i 1999, før The Wire, Mad Men og Breaking Bad.",
    sourceUrl: wiki("Tv-serie"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-24",
    difficulty: 3,
    prompt: "Hvilket spil udkom først?",
    options: ["Minecraft", "Doom", "The Sims", "World of Warcraft"],
    correct: 1,
    explanation:
      "Doom udkom i 1993, The Sims i 2000, World of Warcraft i 2004 og Minecrafts første version i 2009.",
    sourceUrl: wiki("Computerspillets_historie"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-22",
    difficulty: 3,
    prompt: "Hvilken dansk musikudgivelse kom først?",
    options: [
      "Aquarium af Aqua",
      "No Fuel Left for the Pilgrims af D-A-D",
      "Philharmonics af Agnes Obel",
      "Efter endnu en dag af Gasolin'",
    ],
    correct: 3,
    explanation:
      "Gasolins Efter endnu en dag udkom i 1976, før D-A-D, Aqua og Agnes Obel-albummene.",
    sourceUrl: wiki("Dansk_musik"),
  },
  {
    type: "what_came_first",
    categoryId: "cat-27",
    difficulty: 3,
    prompt: "Hvilken fodboldturnering blev grundlagt først?",
    options: ["Premier League", "Champions League", "FA Cup", "Europa League"],
    correct: 2,
    explanation:
      "FA Cup blev grundlagt i 1871 og er ældre end de øvrige turneringer.",
    sourceUrl: wiki("FA_Cup"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-28",
    difficulty: 2,
    prompt: "Hvilket af disse dyr er ikke et pattedyr?",
    options: ["Delfin", "Flagermus", "Sæl", "Tun"],
    correct: 3,
    explanation: "Tun er en fisk; delfiner, flagermus og sæler er pattedyr.",
    sourceUrl: wiki("Pattedyr"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-31",
    difficulty: 2,
    prompt: "Hvilken passer ikke ind blandt græske guder?",
    options: ["Athene", "Apollon", "Odin", "Ares"],
    correct: 2,
    explanation:
      "Odin tilhører nordisk mytologi, mens de tre andre er græske guder.",
    sourceUrl: wiki("Græsk_mytologi"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-32",
    difficulty: 2,
    prompt: "Hvilken passer ikke ind blandt væsener fra nordisk mytologi?",
    options: ["Fenrisulven", "Midgårdsormen", "Pegasus", "Sleipner"],
    correct: 2,
    explanation: "Pegasus er den bevingede hest fra græsk mytologi.",
    sourceUrl: wiki("Nordisk_mytologi"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-23",
    difficulty: 2,
    prompt: "Hvilken passer ikke ind som mikrofontype?",
    options: ["Dynamisk", "Kondensator", "Bånd", "Kompressor"],
    correct: 3,
    explanation: "En kompressor er en signalprocessor, ikke en mikrofontype.",
    sourceUrl: wiki("Mikrofon"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-8",
    difficulty: 1,
    prompt: "Hvilken passer ikke ind blandt planeter?",
    options: ["Mars", "Venus", "Europa", "Saturn"],
    correct: 2,
    explanation: "Europa er en af Jupiters måner, ikke en planet.",
    sourceUrl: wiki("Europa_(måne)"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-9",
    difficulty: 2,
    prompt: "Hvilken passer ikke ind som programmeringssprog?",
    options: ["Python", "Java", "HTML", "C++"],
    correct: 2,
    explanation:
      "HTML er et opmærkningssprog; de andre bruges som programmeringssprog.",
    sourceUrl: wiki("Programmeringssprog"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-27",
    difficulty: 1,
    prompt: "Hvilket hold hører ikke til i europæisk fodbold?",
    options: ["Liverpool", "Barcelona", "Bayern München", "Los Angeles Lakers"],
    correct: 3,
    explanation: "Los Angeles Lakers er et amerikansk basketballhold.",
    sourceUrl: wiki("Fodbold"),
  },
  {
    type: "odd_one_out",
    categoryId: "cat-44",
    difficulty: 1,
    prompt: "Hvilken passer ikke ind blandt cocktails?",
    options: ["Negroni", "Mojito", "Martini", "Croissant"],
    correct: 3,
    explanation: "En croissant er bagværk; de øvrige er klassiske cocktails.",
    sourceUrl: wiki("Cocktail"),
  },
  {
    type: "true_false",
    categoryId: "cat-7",
    difficulty: 1,
    prompt: "Sandt eller falsk: Lyd kan bevæge sig gennem et vakuum.",
    options: ["Sandt", "Falsk"],
    correct: 1,
    explanation:
      "Lyd kræver et medium som luft, vand eller fast stof og kan derfor ikke udbrede sig i vakuum.",
    sourceUrl: wiki("Lyd"),
  },
  {
    type: "true_false",
    categoryId: "cat-8",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Et døgn på Venus er længere end et år på Venus.",
    options: ["Sandt", "Falsk"],
    correct: 0,
    explanation:
      "Venus roterer så langsomt, at dens sideriske døgn varer længere end dens omløb om Solen.",
    sourceUrl: wiki("Venus_(planet)"),
  },
  {
    type: "true_false",
    categoryId: "cat-5",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Gutenberg opfandt bogtrykkerkunsten før Columbus nåede Amerika.",
    options: ["Sandt", "Falsk"],
    correct: 0,
    explanation:
      "Gutenbergs trykketeknik slog igennem omkring 1450; Columbus nåede Caribien i 1492.",
    sourceUrl: wiki("Johannes_Gutenberg"),
  },
  {
    type: "true_false",
    categoryId: "cat-29",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Isbjørne lever naturligt både i Arktis og Antarktis.",
    options: ["Sandt", "Falsk"],
    correct: 1,
    explanation:
      "Isbjørne lever i Arktis; Antarktis har pingviner, men ingen vilde isbjørne.",
    sourceUrl: wiki("Isbjørn"),
  },
  {
    type: "true_false",
    categoryId: "cat-16",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Karen Blixen udgav også bøger under navnet Isak Dinesen.",
    options: ["Sandt", "Falsk"],
    correct: 0,
    explanation:
      "Isak Dinesen var Karen Blixens mest kendte engelsksprogede pseudonym.",
    sourceUrl: wiki("Karen_Blixen"),
  },
  {
    type: "true_false",
    categoryId: "cat-22",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Roskilde Festival blev første gang afholdt i 1972.",
    options: ["Sandt", "Falsk"],
    correct: 1,
    explanation:
      "Den første festival blev holdt i 1971 under navnet Sound Festival.",
    sourceUrl: wiki("Roskilde_Festival"),
  },
  {
    type: "true_false",
    categoryId: "cat-3",
    difficulty: 3,
    prompt:
      "Sandt eller falsk: Danmarks Grundlov blev underskrevet den 4. juni 1849.",
    options: ["Sandt", "Falsk"],
    correct: 1,
    explanation: "Frederik 7. underskrev Junigrundloven den 5. juni 1849.",
    sourceUrl: wiki("Danmarks_Riges_Grundlov"),
  },
  {
    type: "true_false",
    categoryId: "cat-27",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: En målmand må samle en bevidst tilbagelægning fra en medspillers fod op med hænderne.",
    options: ["Sandt", "Falsk"],
    correct: 1,
    explanation:
      "Tilbagelægningsreglen forbyder målmanden at tage en bevidst aflevering med foden op i hænderne.",
    sourceUrl: wiki("Fodboldloven"),
  },
  {
    type: "quote",
    categoryId: "cat-11",
    difficulty: 2,
    prompt: "Hvem forbindes med ordene: »Jeg tænker, altså er jeg«?",
    options: ["René Descartes", "Immanuel Kant", "Sokrates", "David Hume"],
    correct: 0,
    explanation:
      "Formuleringen sammenfatter Descartes' metodiske tvivl og optræder på latin som cogito, ergo sum.",
    sourceUrl: wiki("Cogito_ergo_sum"),
  },
  {
    type: "quote",
    categoryId: "cat-15",
    difficulty: 2,
    prompt: "Hvem skrev den korte linje: »At være eller ikke være«?",
    options: [
      "William Shakespeare",
      "Charles Dickens",
      "Goethe",
      "Miguel de Cervantes",
    ],
    correct: 0,
    explanation:
      "Ordene indleder Hamlets berømte monolog i Shakespeares tragedie Hamlet.",
    sourceUrl: wiki("Hamlet"),
  },
  {
    type: "quote",
    categoryId: "cat-16",
    difficulty: 3,
    prompt: "Hvem skrev: »At rejse er at leve«?",
    options: [
      "H.C. Andersen",
      "Søren Kierkegaard",
      "Ludvig Holberg",
      "Georg Brandes",
    ],
    correct: 0,
    explanation:
      "Sætningen forbindes med H.C. Andersens selvbiografiske værk Mit Livs Eventyr.",
    sourceUrl: wiki("H.C._Andersen"),
  },
  {
    type: "quote",
    categoryId: "cat-3",
    difficulty: 3,
    prompt:
      "Hvilken dansk politiker forbindes med ordene: »Man har et standpunkt, til man tager et nyt«?",
    options: [
      "Jens Otto Krag",
      "Anker Jørgensen",
      "Poul Schlüter",
      "Viggo Kampmann",
    ],
    correct: 0,
    explanation:
      "Jens Otto Krag brugte formuleringen i forbindelse med ændrede politiske standpunkter.",
    sourceUrl: wiki("Jens_Otto_Krag"),
  },
  {
    type: "description",
    categoryId: "cat-32",
    difficulty: 2,
    prompt:
      "Hvem beskrives? Han har én hånd, mistet som pant da Fenrisulven blev lænket.",
    options: ["Tyr", "Thor", "Balder", "Heimdal"],
    correct: 0,
    explanation:
      "Tyr lagde sin hånd i Fenrisulvens gab som garanti og mistede den, da ulven opdagede bedraget.",
    sourceUrl: wiki("Tyr_(nordisk_mytologi)"),
  },
  {
    type: "description",
    categoryId: "cat-31",
    difficulty: 2,
    prompt:
      "Hvem beskrives? Hun er visdommens gudinde og siges at være født af Zeus' hoved.",
    options: ["Athene", "Afrodite", "Hera", "Artemis"],
    correct: 0,
    explanation:
      "Athene er blandt andet gudinde for visdom og strategisk krigsførelse.",
    sourceUrl: wiki("Athene"),
  },
  {
    type: "description",
    categoryId: "cat-28",
    difficulty: 2,
    prompt:
      "Hvilket dyr beskrives? Det er verdens største nulevende dyr og lever af små krebsdyr.",
    options: ["Blåhval", "Hvalhaj", "Kaskelot", "Elefantsæl"],
    correct: 0,
    explanation:
      "Blåhvalen kan blive over 25 meter lang og filtrerer især krill fra vandet.",
    sourceUrl: wiki("Blåhval"),
  },
  {
    type: "description",
    categoryId: "cat-39",
    difficulty: 2,
    prompt:
      "Hvilken opfindelse beskrives? Den bruger roterende blade til at omdanne vindens energi til elektricitet.",
    options: ["Vindmølle", "Brændselscelle", "Solcelle", "Transformator"],
    correct: 0,
    explanation:
      "En moderne vindmølle driver en generator med energi fra rotorens bevægelse.",
    sourceUrl: wiki("Vindmølle"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-12",
    difficulty: 3,
    prompt: "Hvilket udsagn om hukommelse er korrekt?",
    options: [
      "Arbejdshukommelsen har begrænset kapacitet",
      "Langtidshukommelsen varer højst ét døgn",
      "Alle minder lagres som perfekte kopier",
      "Korttidshukommelse findes kun hos børn",
    ],
    correct: 0,
    explanation:
      "Arbejdshukommelsen kan kun håndtere en begrænset mængde information ad gangen.",
    sourceUrl: wiki("Arbejdshukommelse"),
  },
  {
    type: "incorrect_statement",
    categoryId: "cat-7",
    difficulty: 3,
    prompt: "Hvilket udsagn om atomer er forkert?",
    options: [
      "Protoner har negativ elektrisk ladning",
      "Neutroner er elektrisk neutrale",
      "Elektroner har negativ ladning",
      "Atomkernen indeholder protoner",
    ],
    correct: 0,
    explanation:
      "Protoner har positiv ladning; det er elektroner, der har negativ ladning.",
    sourceUrl: wiki("Atom"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-4",
    difficulty: 3,
    prompt: "Hvilket udsagn om FN er korrekt?",
    options: [
      "FN blev grundlagt i 1945",
      "FN har hovedsæde i Bruxelles",
      "Alle lande har vetoret",
      "FN blev dannet før Første Verdenskrig",
    ],
    correct: 0,
    explanation:
      "De Forenede Nationer blev grundlagt i 1945 efter Anden Verdenskrig.",
    sourceUrl: wiki("Forenede_Nationer"),
  },
  {
    type: "incorrect_statement",
    categoryId: "cat-27",
    difficulty: 2,
    prompt: "Hvilket udsagn om fodbold er forkert?",
    options: [
      "Et hold starter normalt med 12 spillere på banen",
      "En kamp er normalt delt i to halvlege",
      "Straffesparksfeltet ligger foran målet",
      "Et rødt kort udviser spilleren",
    ],
    correct: 0,
    explanation:
      "Et hold starter normalt med 11 spillere på banen, inklusive målmanden.",
    sourceUrl: wiki("Fodbold"),
  },
  {
    type: "category_cross",
    categoryId: "cat-21",
    difficulty: 3,
    prompt:
      "Musik møder geografi: Hvilken by forbindes med grunge-bølgen omkring Nirvana?",
    options: ["Seattle", "Chicago", "Miami", "Boston"],
    correct: 0,
    explanation:
      "Seattle blev centrum for grunge-scenen med blandt andre Nirvana, Pearl Jam og Soundgarden.",
    sourceUrl: wiki("Grunge"),
  },
  {
    type: "category_cross",
    categoryId: "cat-5",
    difficulty: 3,
    prompt:
      "Historie møder teknologi: Hvilken krig forbindes med Enigma-maskinens berømte kodebrydning?",
    options: [
      "Anden Verdenskrig",
      "Krimkrigen",
      "Vietnamkrigen",
      "Den Spanske Borgerkrig",
    ],
    correct: 0,
    explanation:
      "Allierede kodebrydere arbejdede under Anden Verdenskrig med at læse tysk Enigma-trafik.",
    sourceUrl: wiki("Enigma_(krypteringsmaskine)"),
  },
];

const balanceSpecs: Spec[] = [
  {
    type: "description",
    categoryId: "cat-26",
    difficulty: 2,
    prompt:
      "Hvilken dansk badmintonspiller beskrives? Han vandt OL-guld i herresingle i Tokyo.",
    options: [
      "Viktor Axelsen",
      "Peter Gade",
      "Anders Antonsen",
      "Morten Frost",
    ],
    correct: 0,
    explanation:
      "Viktor Axelsen vandt OL-finalen i Tokyo i 2021 og tog dermed Danmarks andet OL-guld i herresingle.",
    sourceUrl: wiki("Viktor_Axelsen"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-26",
    difficulty: 2,
    prompt: "Hvilken sportsgren gjorde Caroline Wozniacki verdensberømt?",
    options: ["Tennis", "Golf", "Badminton", "Håndbold"],
    correct: 0,
    explanation:
      "Caroline Wozniacki blev nummer ét på tennisverdensranglisten og vandt Australian Open i 2018.",
    sourceUrl: wiki("Caroline_Wozniacki"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-26",
    difficulty: 3,
    prompt: "Hvilken motorsportsbegivenhed har Tom Kristensen vundet ni gange?",
    options: [
      "Le Mans",
      "Indianapolis 500",
      "Monacos Grand Prix",
      "Dakar Rally",
    ],
    correct: 0,
    explanation:
      "Tom Kristensens ni sejre i 24-timersløbet Le Mans har givet ham tilnavnet Mr. Le Mans.",
    sourceUrl: wiki("Tom_Kristensen"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-26",
    difficulty: 3,
    prompt: "Hvilket udsagn om Wilson Kipketer er korrekt?",
    options: [
      "Han satte verdensrekord på 800 meter",
      "Han vandt Tour de France",
      "Han var professionel målmand",
      "Han blev verdensmester i svømning",
    ],
    correct: 0,
    explanation:
      "Wilson Kipketer repræsenterede Danmark og satte verdensrekord på 800 meter i 1997.",
    sourceUrl: wiki("Wilson_Kipketer"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-41",
    difficulty: 2,
    prompt: "Hvilket nordisk land forbindes skyr oprindeligt med?",
    options: ["Island", "Sverige", "Finland", "Danmark"],
    correct: 0,
    explanation:
      "Skyr har været en del af islandsk madkultur i århundreder og fremstilles med en syrnet proces.",
    sourceUrl: wiki("Skyr"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-41",
    difficulty: 2,
    prompt: "Hvilket land forbindes især med den brune ost brunost?",
    options: ["Norge", "Island", "Danmark", "Finland"],
    correct: 0,
    explanation:
      "Norsk brunost får sin farve og sødme ved indkogning og karamellisering af valle.",
    sourceUrl: wiki("Brunost"),
  },
  {
    type: "description",
    categoryId: "cat-41",
    difficulty: 3,
    prompt:
      "Hvilken finsk ret beskrives? Fisk og flæsk bages inde i et tæt rugbrød.",
    options: ["Kalakukko", "Karelsk pirog", "Lohikeitto", "Raggmunk"],
    correct: 0,
    explanation:
      "Kalakukko er en traditionel finsk ret fra Savolax, hvor fyldet tilberedes inde i rugbrød.",
    sourceUrl: wiki("Kalakukko"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-41",
    difficulty: 2,
    prompt: "Hvilket udsagn om gravad laks er korrekt?",
    options: [
      "Fisken kures typisk med salt, sukker og dild",
      "Fisken frituresteges hel",
      "Retten laves altid af torsk",
      "Fisken koges i mælk",
    ],
    correct: 0,
    explanation:
      "Gravad laks konserveres og smagssættes traditionelt med salt, sukker og dild.",
    sourceUrl: wiki("Gravad_laks"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-4",
    difficulty: 3,
    prompt:
      "Hvilke fem lande har permanent sæde og vetoret i FN's Sikkerhedsråd?",
    options: [
      "Kina, Frankrig, Rusland, Storbritannien og USA",
      "Tyskland, Japan, Indien, Brasilien og USA",
      "Frankrig, Italien, Canada, Kina og Rusland",
      "USA, Mexico, Kina, Indien og Storbritannien",
    ],
    correct: 0,
    explanation:
      "De fem permanente medlemmer af Sikkerhedsrådet er Kina, Frankrig, Rusland, Storbritannien og USA.",
    sourceUrl: wiki("FN's_Sikkerhedsråd"),
  },
  {
    type: "true_false",
    categoryId: "cat-4",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Medlemmerne af Europa-Parlamentet vælges direkte af borgerne.",
    options: ["Sandt", "Falsk"],
    correct: 0,
    explanation:
      "Der har været direkte valg til Europa-Parlamentet siden 1979.",
    sourceUrl: wiki("Europa-Parlamentet"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-4",
    difficulty: 3,
    prompt: "I hvilken by har Den Internationale Domstol sæde?",
    options: ["Haag", "Genève", "Bruxelles", "Wien"],
    correct: 0,
    explanation:
      "Den Internationale Domstol er FN's øverste domstol og har sæde i Fredspaladset i Haag.",
    sourceUrl: wiki("Den_Internationale_Domstol"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-4",
    difficulty: 3,
    prompt: "Hvilket udsagn om NATO's artikel 5 er korrekt?",
    options: [
      "Et angreb på ét medlem kan betragtes som et angreb på alle",
      "Den fastsætter euroens rente",
      "Den opløser automatisk alliancen",
      "Den gælder kun handelsaftaler",
    ],
    correct: 0,
    explanation: "Artikel 5 udtrykker NATO's princip om kollektivt forsvar.",
    sourceUrl: wiki("NATO"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-12",
    difficulty: 2,
    prompt:
      "Hvem forbindes med klassisk betingning og forsøg med hundes spytrefleks?",
    options: ["Ivan Pavlov", "B.F. Skinner", "Carl Rogers", "Albert Bandura"],
    correct: 0,
    explanation:
      "Pavlov viste, hvordan en neutral stimulus kan udløse en indlært respons gennem association.",
    sourceUrl: wiki("Ivan_Pavlov"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-12",
    difficulty: 3,
    prompt:
      "Hvem udviklede tilknytningsteorien med fokus på barnets nære omsorgsrelationer?",
    options: ["John Bowlby", "Leon Festinger", "Erik Erikson", "Aaron Beck"],
    correct: 0,
    explanation:
      "John Bowlby beskrev tilknytning som et biologisk forankret system, der søger nærhed og tryghed.",
    sourceUrl: wiki("John_Bowlby"),
  },
  {
    type: "description",
    categoryId: "cat-12",
    difficulty: 3,
    prompt:
      "Hvilket begreb beskrives? Ubehag opstår, når ens holdninger og handlinger modsiger hinanden.",
    options: ["Kognitiv dissonans", "Flow", "Klassisk betingning", "Priming"],
    correct: 0,
    explanation:
      "Leon Festingers teori om kognitiv dissonans beskriver presset for at mindske indre modstrid.",
    sourceUrl: wiki("Kognitiv_dissonans"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-12",
    difficulty: 3,
    prompt: "Hvilket udsagn om Big Five-modellen er korrekt?",
    options: [
      "Den beskriver fem brede personlighedstræk",
      "Den måler kun intelligens",
      "Den består af fem udviklingsstadier",
      "Den blev udviklet som en hukommelsestest",
    ],
    correct: 0,
    explanation:
      "Big Five organiserer personlighed omkring fem brede dimensioner, blandt andet åbenhed og samvittighedsfuldhed.",
    sourceUrl: wiki("Femfaktormodellen"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-25",
    difficulty: 1,
    prompt: "Hvor mange discipliner består en tikamp af?",
    options: ["10", "8", "12", "15"],
    correct: 0,
    explanation:
      "Tikamp kombinerer ti atletikdiscipliner fordelt over to konkurrencedage.",
    sourceUrl: wiki("Tikamp"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-25",
    difficulty: 1,
    prompt: "Hvor mange spillere har et volleyballhold normalt på banen?",
    options: ["6", "5", "7", "8"],
    correct: 0,
    explanation:
      "Seks spillere fra hvert hold er på banen ad gangen i indendørs volleyball.",
    sourceUrl: wiki("Volleyball"),
  },
  {
    type: "description",
    categoryId: "cat-25",
    difficulty: 1,
    prompt:
      "Hvilken sportsgren beskrives? Spillerne slår til en fjerbold over et net.",
    options: ["Badminton", "Squash", "Padel", "Bordtennis"],
    correct: 0,
    explanation:
      "Badminton spilles med ketcher og en fjerbold, som bremses markant af luften.",
    sourceUrl: wiki("Badminton"),
  },
  {
    type: "closest_wins",
    categoryId: "cat-25",
    difficulty: 2,
    prompt: "Hvor lang er den officielle maratondistance?",
    options: ["40,000 km", "41,195 km", "42,195 km", "43,195 km"],
    correct: 2,
    explanation:
      "En maraton er præcis 42,195 kilometer, en distance standardiseret i begyndelsen af 1900-tallet.",
    sourceUrl: wiki("Maratonløb"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-29",
    difficulty: 2,
    prompt: "Hvor i Norden lever moskusoksen vildt i større bestande?",
    options: ["Grønland", "Danmark", "Gotland", "Færøerne"],
    correct: 0,
    explanation:
      "Grønland har store bestande af moskusokser, selv om nogle bestande er blevet flyttet mellem områder.",
    sourceUrl: wiki("Moskusokse"),
  },
  {
    type: "description",
    categoryId: "cat-29",
    difficulty: 2,
    prompt:
      "Hvilken nordatlantisk fugl beskrives? Den har et farverigt næb og yngler i kolonier på klipper.",
    options: ["Lunde", "Sule", "Ride", "Edderfugl"],
    correct: 0,
    explanation:
      "Lunden kaldes også søpapegøje og bruger sit farverige næb til at bære flere småfisk.",
    sourceUrl: wiki("Lunde"),
  },
  {
    type: "true_false",
    categoryId: "cat-29",
    difficulty: 2,
    prompt:
      "Sandt eller falsk: Rensdyr findes naturligt kun syd for polarcirklen.",
    options: ["Sandt", "Falsk"],
    correct: 1,
    explanation:
      "Rensdyr er tilpasset tundra og nordlige skovområder i både Eurasien og Nordamerika.",
    sourceUrl: wiki("Rensdyr"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-29",
    difficulty: 3,
    prompt: "Hvilket udsagn om polarræven er korrekt?",
    options: [
      "Pelsen isolerer effektivt mod ekstrem kulde",
      "Den lever kun af planter",
      "Den går altid i vinterhi",
      "Den findes naturligt i Antarktis",
    ],
    correct: 0,
    explanation:
      "Polarræven har tæt pels og små ører, som begrænser varmetabet i arktisk klima.",
    sourceUrl: wiki("Polarræv"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-44",
    difficulty: 2,
    prompt: "Hvilken spiritus er normalt basen i en mojito?",
    options: ["Rom", "Gin", "Vodka", "Whisky"],
    correct: 0,
    explanation:
      "En klassisk mojito kombinerer lys rom med lime, mynte, sukker og danskvand.",
    sourceUrl: wiki("Mojito"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-44",
    difficulty: 2,
    prompt: "Hvilken spiritus bruges normalt i en margarita?",
    options: ["Tequila", "Cognac", "Gin", "Rom"],
    correct: 0,
    explanation:
      "Margarita laves traditionelt med tequila, appelsinlikør og limejuice.",
    sourceUrl: wiki("Margarita"),
  },
  {
    type: "correct_statement",
    categoryId: "cat-44",
    difficulty: 3,
    prompt: "Hvilket udsagn om en klassisk Negroni er korrekt?",
    options: [
      "Den indeholder gin, Campari og sød vermouth",
      "Den laves med øl og æblemost",
      "Den serveres altid varm",
      "Den indeholder normalt fløde",
    ],
    correct: 0,
    explanation:
      "Den klassiske Negroni blandes ofte i lige dele gin, Campari og sød vermouth.",
    sourceUrl: wiki("Negroni"),
  },
  {
    type: "description",
    categoryId: "cat-44",
    difficulty: 2,
    prompt:
      "Hvilken proces beskrives? Gær omdanner sukker til alkohol og kuldioxid.",
    options: ["Gæring", "Destillation", "Filtrering", "Pasteurisering"],
    correct: 0,
    explanation:
      "Ved alkoholisk gæring nedbryder gær sukker og danner blandt andet ethanol og kuldioxid.",
    sourceUrl: wiki("Alkoholisk_gæring"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-49",
    difficulty: 2,
    prompt: "I hvilket år begyndte MTV at sende i USA?",
    options: ["1981", "1984", "1987", "1989"],
    correct: 0,
    explanation:
      "MTV gik i luften 1. august 1981 og åbnede med musikvideoen Video Killed the Radio Star.",
    sourceUrl: wiki("MTV"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-49",
    difficulty: 2,
    prompt: "I hvilket år skete Tjernobylulykken?",
    options: ["1986", "1983", "1988", "1989"],
    correct: 0,
    explanation: "Reaktorulykken ved Tjernobyl fandt sted den 26. april 1986.",
    sourceUrl: wiki("Tjernobylulykken"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-49",
    difficulty: 2,
    prompt: "Hvilken kunstner udgav albummet Thriller i 1982?",
    options: ["Michael Jackson", "Prince", "George Michael", "Lionel Richie"],
    correct: 0,
    explanation:
      "Thriller blev udgivet i 1982 og blev et af musikhistoriens bedst sælgende album.",
    sourceUrl: wiki("Thriller"),
  },

  {
    type: "multiple_choice",
    categoryId: "cat-50",
    difficulty: 2,
    prompt: "I hvilket år blev rumteleskopet Hubble sendt op?",
    options: ["1990", "1993", "1996", "1999"],
    correct: 0,
    explanation:
      "Hubble blev sendt i kredsløb med rumfærgen Discovery i april 1990.",
    sourceUrl: wiki("Hubble-rumteleskopet"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-50",
    difficulty: 2,
    prompt:
      "Hvilken film fra 1995 var den første fuldt computeranimerede spillefilm?",
    options: ["Toy Story", "Løvernes konge", "Shrek", "Mulan"],
    correct: 0,
    explanation:
      "Pixars Toy Story fra 1995 var den første spillefilm skabt helt med computeranimation.",
    sourceUrl: wiki("Toy_Story"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-50",
    difficulty: 2,
    prompt:
      "Hvilken spilserie begyndte i Japan i 1996 med monstrer, der kunne samles?",
    options: ["Pokémon", "The Sims", "Halo", "Animal Crossing"],
    correct: 0,
    explanation: "De første Pokémon-spil udkom til Game Boy i Japan i 1996.",
    sourceUrl: wiki("Pokémon"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-34",
    difficulty: 2,
    prompt:
      "Hvilket elektronikmærke lancerede den bærbare kassetteafspiller Walkman?",
    options: ["Sony", "Panasonic", "Philips", "JVC"],
    correct: 0,
    explanation:
      "Sony lancerede den første Walkman i 1979 og gjorde navnet synonymt med bærbar musik.",
    sourceUrl: wiki("Walkman"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-34",
    difficulty: 2,
    prompt: "Hvilket sportsmærke forbindes især med tre parallelle striber?",
    options: ["Adidas", "Puma", "Reebok", "Asics"],
    correct: 0,
    explanation:
      "Adidas har brugt de tre striber som et centralt varemærke siden virksomhedens tidlige år.",
    sourceUrl: wiki("Adidas"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-34",
    difficulty: 3,
    prompt: "Hvilket bilmærke bruger modelnavnene Corolla, Prius og Yaris?",
    options: ["Toyota", "Honda", "Nissan", "Mazda"],
    correct: 0,
    explanation:
      "Corolla, Prius og Yaris er tre forskellige modelserier fra Toyota.",
    sourceUrl: wiki("Toyota"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-56",
    difficulty: 3,
    prompt: "Hvad beskriver albedo i klimaforskning?",
    options: [
      "Hvor meget lys en overflade reflekterer",
      "Hvor meget salt havvand indeholder",
      "Hvor hurtigt lufttrykket falder",
      "Hvor meget ilt planter optager",
    ],
    correct: 0,
    explanation:
      "Albedo er den andel af indstrålingen, som en overflade reflekterer; lys sne har derfor høj albedo.",
    sourceUrl: wiki("Albedo"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-56",
    difficulty: 3,
    prompt:
      "Hvilken proces gør havet mere surt, når det optager mere kuldioxid?",
    options: [
      "Dannelse af kulsyre",
      "Fordampning af salt",
      "Spaltning af kvælstof",
      "Udfældning af ilt",
    ],
    correct: 0,
    explanation:
      "Opløst kuldioxid reagerer med vand og danner kulsyre, som sænker havvandets pH-værdi.",
    sourceUrl: wiki("Havforsuring"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-24",
    difficulty: 2,
    prompt: "Hvad kaldes de fire felter, som hver brik består af i Tetris?",
    options: ["Tetrominoer", "Polyeder", "Fraktaler", "Pentagrammer"],
    correct: 0,
    explanation:
      "Tetris-brikker er tetrominoer: figurer sammensat af præcis fire lige store kvadrater.",
    sourceUrl: wiki("Tetris"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-24",
    difficulty: 2,
    prompt: "Hvilken spilserie bruger våbnet Master Sword?",
    options: ["The Legend of Zelda", "Final Fantasy", "Dark Souls", "Warcraft"],
    correct: 0,
    explanation:
      "Master Sword er Links tilbagevendende våben i The Legend of Zelda-serien.",
    sourceUrl: wiki("The_Legend_of_Zelda"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-24",
    difficulty: 2,
    prompt:
      "Hvilket materiale bruges til rammen om en Nether-portal i Minecraft?",
    options: ["Obsidian", "Granit", "Bedrock", "Sortsten"],
    correct: 0,
    explanation:
      "En Nether-portal bygges af obsidian og aktiveres normalt med flint og stål.",
    sourceUrl: wiki("Minecraft"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-24",
    difficulty: 3,
    prompt: "Hvilken genre tilhører Civilization-serien primært?",
    options: [
      "Turbaseret strategi",
      "Førstepersonsskydespil",
      "Rytmespil",
      "Racerspil",
    ],
    correct: 0,
    explanation:
      "Civilization er en turbaseret strategiserie, hvor en civilisation udvikles gennem historiske tidsaldre.",
    sourceUrl: wiki("Civilization_(computerspilserie)"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-24",
    difficulty: 3,
    prompt: "Hvilket studie udviklede det oprindelige Pokémon Red og Green?",
    options: ["Game Freak", "Nintendo EAD", "Square", "Sega AM2"],
    correct: 0,
    explanation:
      "Game Freak udviklede de første Pokémon-spil, som Nintendo udgav til Game Boy i Japan.",
    sourceUrl: wiki("Pokémon_Red_og_Blue"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-13",
    difficulty: 3,
    prompt: "Hvad beskriver Vygotskijs zone for nærmeste udvikling?",
    options: [
      "Opgaver man kan klare med passende støtte",
      "Evner der er fuldt medfødte",
      "Minder der ikke kan genkaldes",
      "Adfærd der kun styres af straf",
    ],
    correct: 0,
    explanation:
      "Zonen ligger mellem det, en person kan alene, og det vedkommende kan klare med vejledning.",
    sourceUrl: wiki("Lev_Vygotskij"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-13",
    difficulty: 2,
    prompt: "Hvad er den centrale forskel på klassisk og operant betingning?",
    options: [
      "Klassisk kobler stimuli; operant kobler adfærd og konsekvens",
      "Klassisk gælder voksne; operant gælder børn",
      "Klassisk kræver sprog; operant kræver søvn",
      "Klassisk er medfødt; operant kan ikke læres",
    ],
    correct: 0,
    explanation:
      "Klassisk betingning forbinder stimuli, mens operant betingning ændrer adfærd gennem dens konsekvenser.",
    sourceUrl: wiki("Betingning"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-13",
    difficulty: 3,
    prompt:
      "Hvilken forsker udviklede Strange Situation-testen af små børns tilknytning?",
    options: [
      "Mary Ainsworth",
      "Anna Freud",
      "Elizabeth Loftus",
      "Carol Dweck",
    ],
    correct: 0,
    explanation:
      "Mary Ainsworth brugte Strange Situation til at undersøge forskellige tilknytningsmønstre.",
    sourceUrl: wiki("Mary_Ainsworth"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-13",
    difficulty: 3,
    prompt: "Hvad går social læringsteori især ud på?",
    options: [
      "At adfærd kan læres ved at observere andre",
      "At personlighed kun bestemmes af gener",
      "At hukommelse fungerer som et kamera",
      "At følelser ikke påvirker beslutninger",
    ],
    correct: 0,
    explanation:
      "Albert Banduras socialkognitive teori viser, at mennesker blandt andet lærer gennem observation og efterligning.",
    sourceUrl: wiki("Albert_Bandura"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-9",
    difficulty: 2,
    prompt: "Hvad bruges RAM primært til i en computer?",
    options: [
      "Midlertidig lagring af aktive data",
      "Permanent arkivering uden strøm",
      "Køling af processoren",
      "Overførsel af lyd til højttalere",
    ],
    correct: 0,
    explanation:
      "RAM giver hurtig, midlertidig adgang til de data og programmer, computeren arbejder med lige nu.",
    sourceUrl: wiki("Random-access_memory"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-9",
    difficulty: 2,
    prompt: "Hvad betyder det normalt, at software er open source?",
    options: [
      "Kildekoden kan undersøges og bruges efter licensens regler",
      "Programmet virker kun uden internet",
      "Programmet har ingen ophavsret",
      "Alle funktioner er altid gratis",
    ],
    correct: 0,
    explanation:
      "Open source betyder, at kildekoden er tilgængelig under en licens, som fastlægger retten til brug og ændringer.",
    sourceUrl: wiki("Open_source"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-9",
    difficulty: 2,
    prompt: "Hvad kan en QR-kode indeholde?",
    options: [
      "Data som tekst eller en webadresse",
      "Kun sort-hvide fotografier",
      "Kun et serienummer på otte cifre",
      "Et fysisk radiosignal",
    ],
    correct: 0,
    explanation:
      "En QR-kode lagrer maskinlæsbare data i et todimensionelt mønster, eksempelvis en URL eller tekst.",
    sourceUrl: wiki("QR-kode"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-9",
    difficulty: 2,
    prompt: "Hvilken praktisk egenskab har et USB-C-stik?",
    options: [
      "Det kan sættes i begge veje",
      "Det overfører kun strøm",
      "Det virker kun med Apple-enheder",
      "Det kræver altid en adapter til skærme",
    ],
    correct: 0,
    explanation:
      "USB-C-stikket er symmetrisk og kan blandt andet bruges til data, strøm og videosignaler afhængigt af forbindelsen.",
    sourceUrl: wiki("USB-C"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-43",
    difficulty: 2,
    prompt: "Hvad betyder det at blindbage en tærtebund?",
    options: [
      "At bage bunden før fyldet tilsættes",
      "At bage uden at tænde ovnlyset",
      "At dække tærten helt med dej",
      "At bage ved stuetemperatur",
    ],
    correct: 0,
    explanation:
      "Ved blindbagning forbages bunden, ofte med bagepapir og vægte, så den ikke bliver blød under fyldet.",
    sourceUrl: wiki("Blindbagning"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-43",
    difficulty: 2,
    prompt: "Hvilken gas får en gærdej til at hæve?",
    options: ["Kuldioxid", "Ilt", "Kvælstof", "Brint"],
    correct: 0,
    explanation:
      "Gær omsætter sukker og danner blandt andet kuldioxid, som fanges i dejens glutennetværk.",
    sourceUrl: wiki("Gær"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-43",
    difficulty: 2,
    prompt: "Hvad piskes til skum i en klassisk marengs?",
    options: ["Æggehvider", "Æggeblommer", "Fløde", "Smør"],
    correct: 0,
    explanation:
      "Marengs laves ved at piske æggehvider med sukker, så proteinerne stabiliserer et luftigt skum.",
    sourceUrl: wiki("Marengs"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-43",
    difficulty: 3,
    prompt: "Hvad udvikles især, når en hvededej æltes?",
    options: ["Et glutennetværk", "Mælkesukker", "Karamel", "Gelatine"],
    correct: 0,
    explanation:
      "Æltning hjælper glutenproteinerne med at danne et elastisk netværk, der kan holde på dejens gas.",
    sourceUrl: wiki("Gluten"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-59",
    difficulty: 1,
    prompt: "Hvorfor kan en helt fyldt vandflaske revne i fryseren?",
    options: [
      "Vand udvider sig, når det fryser",
      "Plast bliver magnetisk i kulde",
      "Is absorberer luft fra flasken",
      "Vand bliver tungere som is",
    ],
    correct: 0,
    explanation:
      "Vand udvider sig ved frysning, så en helt fyldt, lukket beholder kan blive udsat for stort tryk.",
    sourceUrl: wiki("Is"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-59",
    difficulty: 2,
    prompt: "Hvad er opvaskemaskinens særlige salt primært beregnet til?",
    options: [
      "At modvirke kalk fra hårdt vand",
      "At give servicet glans",
      "At desinficere bestikket",
      "At gøre vaskemidlet parfumeret",
    ],
    correct: 0,
    explanation:
      "Saltet regenererer maskinens ionbytter, som blødgør vandet og begrænser kalkaflejringer.",
    sourceUrl: wiki("Opvaskemaskine"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-59",
    difficulty: 2,
    prompt: "Hvorfor kan vejsalt hjælpe med at smelte is?",
    options: [
      "Det sænker vandets frysepunkt",
      "Det opvarmer asfalten kemisk",
      "Det absorberer alt vandet",
      "Det gør isen lettere end luft",
    ],
    correct: 0,
    explanation:
      "Opløst salt sænker vandets frysepunkt, så is kan smelte ved temperaturer lidt under nul grader.",
    sourceUrl: wiki("Vejsalt"),
  },
];

const createdAt = "2026-07-16T00:00:00.000Z";

const qualityAdditions: Spec[] = [
  {
    type: "multiple_choice",
    categoryId: "cat-49",
    difficulty: 3,
    prompt:
      "Hvilken computer lancerede Commodore som sin nye 16-bit-model i 1985?",
    options: ["Amiga 1000", "Commodore 64", "Atari 2600", "Apple Lisa"],
    correct: 0,
    explanation:
      "Amiga 1000 blev lanceret i 1985 og blev kendt for avanceret grafik og lyd i forhold til mange samtidige hjemmecomputere.",
    sourceUrl: wiki("Amiga_1000"),
  },
  {
    type: "multiple_choice",
    categoryId: "cat-53",
    difficulty: 2,
    prompt:
      "Hvad gør et indbygget digitalt SIM-modul i en mobiltelefon muligt?",
    options: [
      "En operatørprofil kan hentes og skiftes uden et fysisk kort",
      "Telefonen kan kun bruges via Wi-Fi",
      "Batteriet kan udskiftes uden værktøj",
      "Skærmen kan vise elektronisk blæk",
    ],
    correct: 0,
    explanation:
      "Et eSIM er indbygget i enheden og kan få en operatørprofil installeret digitalt.",
    sourceUrl: wiki("ESIM"),
  },
];

export const VARIETY_QUESTIONS: Question[] = [
  ...specs,
  ...balanceSpecs,
  ...qualityAdditions,
].map((spec, index) => {
  const options = spec.options.map((text, optionIndex) => ({
    id: `o${optionIndex + 1}`,
    text,
  }));
  return {
    id: `variety-${String(index + 1).padStart(3, "0")}`,
    prompt: spec.prompt,
    type: spec.type,
    categoryId: spec.categoryId,
    secondaryCategoryIds: spec.type === "category_cross" ? ["cat-6"] : [],
    difficulty: spec.difficulty,
    options,
    correctOptionId:
      spec.type === "ordering" ? undefined : options[spec.correct].id,
    correctOrder: spec.order?.map((position) => options[position].id),
    explanation: spec.explanation,
    sourceLabel: "Wikipedia – fagligt overblik",
    sourceUrl: spec.sourceUrl,
    tags: ["varieret", spec.type],
    origin: "curated",
    status: "active",
    fingerprint: stableHash(
      `variety:${spec.type}:${spec.prompt}:${spec.options[spec.correct]}`,
    ),
    qualityScore: 94,
    timeSensitive: false,
    createdAt,
    updatedAt: createdAt,
    playCount: 0,
    correctRate: 0,
    reportCount: 0,
  };
});
