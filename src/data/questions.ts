import { CATEGORIES } from "@/lib/categories";
import { fingerprint, normalizeText, stableHash } from "@/lib/engine";
import { hasAnswerLeak } from "@/lib/question-quality";
import type { Question, QuestionType } from "@/lib/types";
import { COUNTRY_QUESTIONS } from "./country-questions";
import { MUSIC_PRODUCTION_QUESTIONS } from "./music-production-questions";
import { WIKIDATA_CULTURE_QUESTIONS } from "./wikidata-culture-questions";
import { EXPANSION_QUESTIONS } from "./expansion-questions";
import { EVERYDAY_CURIOSITY_QUESTIONS } from "./everyday-curiosity-questions";
import { CURIOSITY_EXPANSION_QUESTIONS } from "./curiosity-expansion-questions";
import { CURIOSITY_ROUND_THREE_QUESTIONS } from "./curiosity-round-three-questions";
import { CATEGORY_DEPTH_QUESTIONS } from "./category-depth-questions";
import { CATEGORY_MATRIX_QUESTIONS } from "./category-matrix-questions";
import { FORMAT_DEPTH_QUESTIONS } from "./format-depth-questions";
import { ERA_DEPTH_QUESTIONS } from "./era-depth-questions";
import { WIKIDATA_THIN_QUESTIONS } from "./wikidata-thin-questions";
import { VARIETY_QUESTIONS } from "./variety-questions";
import { FRANCHISE_QUESTIONS } from "./franchise-questions";
import { CULTURE_AND_COOKING_QUESTIONS } from "./culture-and-cooking-questions";
import { DECADE_QUALITY_QUESTIONS } from "./decade-quality-questions";
import { PHILOSOPHY_QUESTIONS } from "./philosophy-questions";
import { EDITORIAL_FILL_QUESTIONS } from "./editorial-fill-questions";
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
  "Hvilken planet er nærmest Solen?": ["Venus", "Jorden", "Mars"],
  "Hvilken planet har den store røde plet?": ["Saturn", "Neptun", "Uranus"],
  "Hvad kaldes en eksploderende stjerne?": ["Pulsar", "Kvasar", "Rød kæmpe"],
  "Hvilken måne kredser om Saturn og har tæt atmosfære?": [
    "Europa",
    "Ganymedes",
    "Triton",
  ],
  "Hvad betyder CPU?": [
    "Computer Processing Utility",
    "Central Program Unit",
    "Core Processing User",
  ],
  "Hvad står URL for?": [
    "Universal Routing Link",
    "Uniform Reference Link",
    "User Resource Location",
  ],
  "Hvad står NATO for på dansk?": [
    "Den Nordatlantiske Handelsorganisation",
    "Den Nordiske Traktats Organisation",
    "Den Nationale Atlantiske Traktatorden",
  ],
  "Hvad betyder BPM?": [
    "Bars per measure",
    "Beats per measure",
    "Bars per minute",
  ],
  "Hvad betyder VAR?": [
    "Video Action Review",
    "Visual Assistant Referee",
    "Video Assisted Replay",
  ],
  "Hvilken opfindelse kom først?": [
    "Telegrafen",
    "Telefonen",
    "Den elektriske glødepære",
  ],
  "Hvilken musik- eller medieteknologi blev lanceret først?": [
    "MiniDisc-formatet",
    "Mp3-formatet",
    "Dvd-formatet",
  ],
  "Hvilken begivenhed i 1900-tallet skete først?": [
    "Den russiske revolution",
    "Den første nonstopflyvning over Atlanten",
    "Fundet af Tutankhamons grav",
  ],
  "Hvilken kommunikationsteknologi kom først?": [
    "Sms-beskeden",
    "Wikipedia",
    "YouTube",
  ],
  "Hvilket legetøj blev lanceret først?": [
    "Etch A Sketch",
    "Rubiks terning",
    "Playmobil",
  ],
  "Hvilken videnskabelig milepæl skete først?": [
    "Det første menneske i rummet",
    "Den første månelanding",
    "Verdens første reagensglasbarn",
  ],

  "Hvem skrev Staten?": ["Aristoteles", "Sokrates", "Xenofon"],
  "Hvilken filosof formulerede 'Jeg tænker, altså er jeg'?": [
    "Baruch Spinoza",
    "John Locke",
    "David Hume",
  ],
  "Hvad kaldes læren om viden?": ["Ontologi", "Etik", "Æstetik"],
  "Hvem forbindes med det kategoriske imperativ?": [
    "Jeremy Bentham",
    "John Stuart Mill",
    "Friedrich Nietzsche",
  ],
  "Hvad kaldes spørgsmålet om fri vilje over for årsagsbestemthed?": [
    "Det ondes problem",
    "Identitetsproblemet",
    "Bevidsthedsproblemet",
  ],
  "Hvilken disciplin undersøger livets mening filosofisk?": [
    "Erkendelsesteori",
    "Sprogfilosofi",
    "Videnskabsfilosofi",
  ],
  "Hvad er et tankeeksperiment?": [
    "En statistisk stikprøve",
    "En laboratoriemåling",
    "En historisk kildeanalyse",
  ],
  "Hvad spørger identitetsproblemet især til?": [
    "Hvordan sikker viden opstår",
    "Hvordan moralske regler begrundes",
    "Hvordan sprog får betydning",
  ],
  "Hvad er altruïsme?": [
    "At handle udelukkende for egen fordel",
    "At tvivle på al sikker viden",
    "At følge en regel uden undtagelser",
  ],

  "Hvilket firma skabte Super Mario?": ["Sega", "Atari", "Capcom"],
  "Hvilket spil foregår i landet Hyrule?": [
    "Final Fantasy",
    "Dragon Quest",
    "Elden Ring",
  ],
  "Hvad hedder hovedfiguren i Halo?": [
    "Commander Shepard",
    "Marcus Fenix",
    "Doom Slayer",
  ],
  "Hvilket studie udviklede Minecraft oprindeligt?": [
    "Valve",
    "Epic Games",
    "Bethesda Game Studios",
  ],

  "Hvilken dansker vandt Tour de France i både 2022 og 2023?": [
    "Bjarne Riis",
    "Jakob Fuglsang",
    "Mads Pedersen",
  ],
  "Hvilken dansk badmintonspiller vandt OL-guld i 1996?": [
    "Peter Gade",
    "Viktor Axelsen",
    "Morten Frost",
  ],
  "Hvilken dansk tennisspiller vandt Australian Open 2018?": [
    "Clara Tauson",
    "Holger Rune",
    "Kenneth Carlsen",
  ],

  "Hvilket hjortedyr er størst i Norden?": [
    "Kronhjorten",
    "Rensdyret",
    "Dådyret",
  ],
  "Hvilken sæl er almindelig i danske farvande?": [
    "Grønlandssæl",
    "Klapmyds",
    "Ringsæl",
  ],

  "Hvem er tordenguden i nordisk mytologi?": ["Tyr", "Frej", "Heimdal"],
  "Hvad hedder Odins ottebenede hest?": ["Gulltop", "Svadilfare", "Skinfaxe"],
  "Hvilket træ forbinder verdenerne?": ["Mímameiðr", "Læraðr", "Glasir"],
  "Hvem er Lokes datter og dødsrigets hersker?": ["Freja", "Frigg", "Idun"],
  "Hvad kaldes verdens undergang?": ["Fimbulvinter", "Valhal", "Bifrøst"],
  "Hvilken gud mistede sin hånd til Fenrisulven?": ["Balder", "Brage", "Njord"],

  "Hvilket kollegium tilhører Harry Potter?": [
    "Slytherin",
    "Ravenclaw",
    "Hufflepuff",
  ],
  "Hvad hedder Harrys ugle?": ["Skævben", "Scabbers", "Fawkes"],
  "Hvilken sport spilles på koste?": ["Troldmandsskak", "Gobstones", "Dueling"],
  "Hvem er rektor på Hogwarts i de første bøger?": [
    "Minerva McGonagall",
    "Severus Snape",
    "Filius Flitwick",
  ],
  "Hvilken trylleformular afvæbner en modstander?": [
    "Stupefy",
    "Protego",
    "Petrificus Totalus",
  ],

  "Hvilken dansk dessert består af ris, fløde og mandler?": [
    "Koldskål",
    "Æblekage",
    "Citronfromage",
  ],

  "Hvad får gærdej til at hæve?": [
    "Ilt fra melet",
    "Damp fra saltet",
    "Syre fra sukkeret",
  ],
  "Hvad er marengs primært lavet af?": [
    "Æggeblommer og mel",
    "Fløde og sukker",
    "Smør og mandler",
  ],
  "Hvad betyder det at temperere chokolade?": [
    "At piske luft ind i den",
    "At fortynde den med fløde",
    "At karamellisere sukkeret",
  ],
  "Hvad er en ganache?": [
    "En luftig æggemasse",
    "En mørdej med nødder",
    "En glasur af flormelis og vand",
  ],

  "Hvilken frugt er botanisk et bær?": [
    "Jordbærret",
    "Hindbærret",
    "Kirsebærret",
  ],
  "Hvilket metal kan smelte i hånden?": ["Titan", "Nikkel", "Kobolt"],

  "Hvilken spillekonsol udgav Nintendo i Japan i 1983?": [
    "Mega Drive",
    "PC Engine",
    "Neo Geo",
  ],
  "Hvem sang Like a Prayer?": [
    "Cyndi Lauper",
    "Whitney Houston",
    "Tina Turner",
  ],
  "Hvilken rumfærge eksploderede i 1986?": [
    "Columbia",
    "Discovery",
    "Atlantis",
  ],
  "Hvilket arkadespil har en gul figur, der spiser prikker?": [
    "Q*bert",
    "Frogger",
    "Dig Dug",
  ],

  "Hvilken søgemaskine blev grundlagt i 1998?": [
    "AltaVista",
    "Lycos",
    "Ask Jeeves",
  ],

  "Hvilket band udgav Kvinde min?": ["Shu-bi-dua", "TV-2", "Gnags"],
  "Hvem komponerede Tango Jalousie?": [
    "Bent Fabricius-Bjerre",
    "Kai Normann Andersen",
    "Niels W. Gade",
  ],
  "Hvilken sanger står bag Tusind stykker?": [
    "Sanne Salomonsen",
    "Lis Sørensen",
    "Søs Fenger",
  ],
  "Hvem udgav albummet No. 1?": [
    "Kim Larsen",
    "Sanne Salomonsen",
    "Anne Linnet",
  ],

  "Hvilket pattedyr kan flyve aktivt?": [
    "Flyveegernet",
    "Svævepossumen",
    "Kaguangen",
  ],
  "Hvilket dyr har sorte og hvide striber?": [
    "Okapien",
    "Stinkdyret",
    "Tapiren",
  ],
  "Hvilken fugl er verdens største?": ["Emuen", "Kasuarfuglen", "Nanduen"],
  "Hvilket dyr bygger dæmninger?": ["Bisamrotten", "Odderen", "Grævlingen"],
  "Hvilket landdyr er hurtigst?": ["Gaffelbukken", "Løven", "Strudsen"],
  "Hvad kaldes en gruppe løver?": ["En ulveflok", "En koloni", "En sværm"],

  "Hvilken japansk kunstform arrangerer blomster?": [
    "Origami",
    "Kalligrafi",
    "Bonsai",
  ],
  "Hvad kaldes den portugisiske musikstil præget af saudade?": [
    "Flamenco",
    "Tarantella",
    "Rebetiko",
  ],
  "Hvilken fest markerer lysets sejr i Indien?": ["Holi", "Vesak", "Songkran"],
  "Hvilken dans stammer fra Argentina?": ["Samba", "Salsa", "Rumba"],
  "Hvad kaldes den koreanske bølge af populærkultur?": [
    "Kawaii",
    "Bollywood",
    "Nollywood",
  ],

  "Hvem er gudernes konge i græsk mytologi?": ["Poseidon", "Hades", "Apollon"],
  "Hvem er visdommens gudinde?": ["Hera", "Afrodite", "Artemis"],
  "Hvilken helt dræbte Minotauros?": ["Perseus", "Herakles", "Jason"],
  "Hvem fløj for tæt på Solen?": ["Daidalos", "Phaeton", "Bellerofon"],
  "Hvem var havets gud?": ["Zeus", "Hades", "Apollon"],

  "Hvem var den første kvinde til at vinde en Nobelpris?": [
    "Bertha von Suttner",
    "Selma Lagerlöf",
    "Jane Addams",
  ],
  "Hvem holdt talen I Have a Dream?": [
    "Malcolm X",
    "John Lewis",
    "Jesse Jackson",
  ],
  "Hvem skrev dagbog under skjul i Amsterdam?": [
    "Etty Hillesum",
    "Corrie ten Boom",
    "Hélène Berr",
  ],
  "Hvem var Sydafrikas første sorte præsident?": [
    "Desmond Tutu",
    "Thabo Mbeki",
    "F.W. de Klerk",
  ],
  "Hvem udviklede relativitetsteorien?": [
    "Niels Bohr",
    "Max Planck",
    "Erwin Schrödinger",
  ],
  "Hvem var den første kvinde i rummet?": [
    "Svetlana Savitskaja",
    "Sally Ride",
    "Mae Jemison",
  ],

  "Hvilken onlineencyklopædi blev lanceret i 2001?": [
    "Britannica Online",
    "Encarta",
    "Citizendium",
  ],
  "Hvilken smartphone blev lanceret af Apple i 2007?": [
    "BlackBerry Bold",
    "Nokia N95",
    "HTC Dream",
  ],
  "Hvilken social platform blev grundlagt i 2004?": [
    "Myspace",
    "Twitter",
    "Instagram",
  ],
  "Hvilken dværgplanet mistede planetstatus i 2006?": [
    "Ceres",
    "Eris",
    "Haumea",
  ],

  "Hvilken streamingtjeneste lancerede House of Cards i 2013?": [
    "HBO",
    "Hulu",
    "Amazon Prime Video",
  ],
  "Hvilket spil blev et globalt fænomen med Battle Royale i 2017?": [
    "Overwatch",
    "Destiny 2",
    "PUBG Mobile",
  ],
  "Hvilken rumsonde passerede Pluto i 2015?": ["Voyager 2", "Cassini", "Juno"],

  "Hvad kaldes kunstig intelligens, der kan skabe nyt indhold?": [
    "Analytisk AI",
    "Ekspertsystem",
    "Regelbaseret AI",
  ],
  "Hvilken energikilde udnytter bevægelse i luft?": [
    "Solenergi",
    "Geotermisk energi",
    "Bølgeenergi",
  ],
  "Hvad er et deepfake?": [
    "Et krypteret dataarkiv",
    "Et anonymt netværk",
    "En digital vandmærkning",
  ],
  "Hvad betyder cirkulær økonomi?": [
    "At øge forbruget af nye råvarer",
    "At udskifte produkter hurtigere",
    "At samle produktionen i én virksomhed",
  ],
  "Hvilken type bil drives kun af batteri og elmotor?": [
    "Hybridbil",
    "Brintbil",
    "Plug-in-hybrid",
  ],
  "Hvad er en podcast?": [
    "En direkte tv-kanal",
    "Et digitalt nyhedsbrev",
    "En billedserie på sociale medier",
  ],
  "Hvad beskriver kognitiv dissonans?": [
    "Tendensen til at søge bekræftelse",
    "Belastning af arbejdshukommelsen",
    "Passivitet efter gentagne nederlag",
  ],
  "Hvad er placeboeffekten?": [
    "Forværring skabt af negative forventninger",
    "Bedring uden nogen behandling",
    "Adfærdsændring fordi man bliver observeret",
  ],
  "Hvad er empati?": [
    "At føle medlidenhed med andre",
    "At mangle interesse for andres følelser",
    "At tillægge andre sine egne følelser",
  ],
  "Hvad betyder introversion typisk?": [
    "At søge meget ydre stimulation",
    "At være ude af stand til at tale med andre",
    "At mangle interesse for egne tanker",
  ],
  "Hvem skrev romanen 1984?": [
    "Aldous Huxley",
    "Ray Bradbury",
    "Jevgenij Zamjatin",
  ],
  "Hvem skabte Sherlock Holmes?": [
    "Agatha Christie",
    "Wilkie Collins",
    "G.K. Chesterton",
  ],
  "Hvem skrev Hundrede års ensomhed?": [
    "Jorge Luis Borges",
    "Isabel Allende",
    "Mario Vargas Llosa",
  ],
  "Hvem skrev Frankenstein?": [
    "Bram Stoker",
    "Percy Bysshe Shelley",
    "John Polidori",
  ],
  "Hvem skrev Lykke-Per?": [
    "Herman Bang",
    "J.P. Jacobsen",
    "Martin Andersen Nexø",
  ],
  "Hvem er forfatter til Barndommens gade?": [
    "Dea Trier Mørch",
    "Kirsten Thorup",
    "Suzanne Brøgger",
  ],
  "Hvem skrev Kongens fald?": [
    "Henrik Pontoppidan",
    "Johannes Jørgensen",
    "Sophus Claussen",
  ],
  "Hvem skabte Pelle Erobreren?": [
    "Jeppe Aakjær",
    "Hans Kirk",
    "Hans Scherfig",
  ],
  "Hvem forbedrede glødepæren til praktisk massebrug?": [
    "Joseph Swan",
    "Nikola Tesla",
    "George Westinghouse",
  ],
  "Hvem opfandt dynamitten?": ["Richard Gatling", "Hiram Maxim", "Samuel Colt"],
  "Hvem udviklede den første effektive koppevaccine?": [
    "Louis Pasteur",
    "Robert Koch",
    "Joseph Lister",
  ],
  "Hvem patenterede en tidlig moderne lynlås?": [
    "Whitcomb Judson",
    "Elias Howe",
    "Isaac Singer",
  ],
  "Hvem udviklede teorien om klassisk betingning?": [
    "John B. Watson",
    "Edward Thorndike",
    "B.F. Skinner",
  ],
  "Hvem forbindes med operant betingning?": [
    "Edward Thorndike",
    "John B. Watson",
    "Albert Bandura",
  ],
  "Hvilken teori beskriver de følelsesmæssige bånd mellem et barn og dets omsorgsperson?":
    [
      "Social læringsteori",
      "Kognitiv udviklingsteori",
      "Selvbestemmelsesteori",
    ],
  "Hvem udviklede den sociokulturelle læringsteori?": [
    "Jerome Bruner",
    "Jean Piaget",
    "Albert Bandura",
  ],
  "Hvilken psykolog beskrev flow?": [
    "Abraham Maslow",
    "Carl Rogers",
    "Martin Seligman",
  ],
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
  "Hvilket firma fremstiller PlayStation?": ["Microsoft", "Nintendo", "Sega"],
  "Hvilket brand sælger møbler i flade pakker?": ["JYSK", "ILVA", "BoConcept"],
  "Hvilket urmærke har en krone som logo?": ["Omega", "TAG Heuer", "Breitling"],
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
  "Hvilken betalingsvirksomhed bruger en rød og en gul overlappende cirkel i sit logo?":
    ["Visa", "American Express", "PayPal"],
  "Hvad kaldes Folketingets ledelse, som består af formanden og fire næstformænd?":
    ["Statsrådet", "Udvalget for Forretningsordenen", "Tingsekretærerne"],
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
  "Hvad er rugbrød typisk lavet med?": ["Hvedemel", "Majsmel", "Rismel"],
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
  "Hvad er kimchi?": ["En risnudelret", "En fiskesauce", "En sød bønnepasta"],
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
  "Hvem udviklede teorien om klassisk betingning?":
    "Ivan Pavlov viste, hvordan en neutral stimulus kan udløse en indlært reaktion gennem gentagen kobling.",
  "Hvem forbindes med operant betingning?":
    "B.F. Skinner undersøgte, hvordan konsekvenser som belønning og straf påvirker adfærd.",
  "Hvilken teori beskriver de følelsesmæssige bånd mellem et barn og dets omsorgsperson?":
    "Tilknytningsteori blev især udviklet af John Bowlby og senere undersøgt empirisk af Mary Ainsworth.",
  "Hvem udviklede den sociokulturelle læringsteori?":
    "Lev Vygotskij fremhævede, at læring formes gennem sprog, kultur og samspil med andre.",
  "Hvad måler Big Five-modellen?":
    "Big Five beskriver personlighed gennem fem brede træk, blandt andet åbenhed og samvittighedsfuldhed.",
  "Hvilken psykolog beskrev flow?":
    "Mihaly Csikszentmihalyi beskrev flow som en tilstand af dyb koncentration, hvor udfordring og færdigheder er i balance.",
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

// Kernefakta er som udgangspunkt brede niveau 2-spÃ¸rgsmÃ¥l. Kun emner, der
// reelt krÃ¦ver mere specialiseret viden, lÃ¸ftes eksplicit; niveauet mÃ¥ aldrig
// afhÃ¦nge af spÃ¸rgsmÃ¥lets placering i filen.
const difficultyOverrides: Record<string, number> = {
  "Hvad kaldes Folketingets ledelse, som bestÃ¥r af formanden og fire nÃ¦stformÃ¦nd?": 3,
  "Hvilken grundlovsparagraf handler om religionsfrihed?": 4,
  "Hvilken fred afsluttede TrediveÃ¥rskrigen?": 4,
  "Hvad er Europas stÃ¸rste sÃ¸ mÃ¥lt pÃ¥ areal?": 3,
  "Hvilken Ã¸rken dÃ¦kker meget af Botswana?": 3,
  "Hvad mÃ¥les i enheden pascal?": 3,
  "Hvilken mÃ¥ne kredser om Saturn og har tÃ¦t atmosfÃ¦re?": 3,
  "Hvad gÃ¸r en kompilator?": 3,
  "Hvilken retning forbindes med Jean-Paul Sartre?": 3,
  "Hvad undersÃ¸ger bevidsthedsfilosofi?": 3,
  "Hvem udviklede teorien om klassisk betingning?": 3,
  "Hvem forbindes med operant betingning?": 3,
  "Hvilken teori beskriver de fÃ¸lelsesmÃ¦ssige bÃ¥nd mellem et barn og dets omsorgsperson?": 3,
  "Hvem udviklede den sociokulturelle lÃ¦ringsteori?": 4,
  "Hvad mÃ¥ler Big Five-modellen?": 3,
  "Hvilken psykolog beskrev flow?": 4,
  "I hvilken roman optrÃ¦der Atticus Finch?": 3,
  "Hvem skrev Hundrede Ã¥rs ensomhed?": 3,
  "Hvem skrev Den kroniske uskyld?": 3,
  "Hvem instruerede Parasite?": 3,
  "Hvem skabte Riget?": 3,
  "Hvem komponerede Tango Jalousie?": 3,
  "Hvem udgav albummet No. 1?": 3,
  "Hvad er MIDI primÃ¦rt?": 3,
  "Hvad gÃ¸r en limiter?": 3,
  "Hvilken dansk badmintonspiller vandt OL-guld i 1996?": 3,
  "Hvilket land vandt det fÃ¸rste VM i 1930?": 3,
  "Hvilken rovfugl har hvid hale som voksen?": 3,
  "Hvad kaldes det nordiske skovbÃ¦lte domineret af nÃ¥letrÃ¦er?": 3,
  "Hvilken gud mistede sin hÃ¥nd til Fenrisulven?": 3,
  "Hvad er Lord Voldemorts fÃ¸denavn?": 3,
  "Hvilken dansk maler skabte Hip, hip, hurra!?": 3,
  "Hvem patenterede en tidlig moderne lynlÃ¥s?": 4,
  "Hvad er hovedingrediensen i svensk kroppkakor?": 3,
  "Hvad betyder det at temperere chokolade?": 3,
  "Hvilken bitter aperitif indgÃ¥r i en negroni?": 3,
  "Hvad kan en gruppe flamingoer kaldes pÃ¥ engelsk?": 4,
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
    const answerOpening = answer.match(
      /^(En|Et|At|Den|Det|Når|Hvor|Hvad)\b/i,
    )?.[1];
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
  island: [
    "Fyn",
    "Bornholm",
    "Lolland",
    "Falster",
    "Møn",
    "Samsø",
    "Gotland",
    "Öland",
  ],
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
  mountain: [
    "Mont Blanc",
    "Kilimanjaro",
    "Matterhorn",
    "Elbrus",
    "Vesuv",
    "Etna",
  ],
  country: [
    "Danmark",
    "Norge",
    "Sverige",
    "Tyskland",
    "Frankrig",
    "Spanien",
    "Italien",
    "Polen",
  ],
  instrument: [
    "Guitar",
    "Klaver",
    "Violin",
    "Trompet",
    "Cello",
    "Klarinet",
    "Harpe",
    "Fløjte",
  ],
  currency: [
    "Euro",
    "Dollar",
    "Krone",
    "Pund",
    "Yen",
    "Franc",
    "Peso",
    "Rupie",
  ],
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
  band: [
    "Queen",
    "The Beatles",
    "ABBA",
    "Nirvana",
    "U2",
    "Coldplay",
    "Metallica",
    "A-ha",
  ],
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
  if (overrides[prompt]) return [correct, ...overrides[prompt]].slice(0, 4);
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
  ];
  const uniqueCandidates = [
    ...new Map(
      candidates
        .filter(
          (candidate) => normalizeText(candidate) !== normalizeText(correct),
        )
        .map((candidate) => [normalizeText(candidate), candidate]),
    ).values(),
  ];
  return [correct, ...uniqueCandidates].slice(0, 4);
}

const CURATED_QUESTIONS: Question[] = seedSpecs.flatMap((spec) =>
  spec.items
    .map((item, index) => {
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
        difficulty: difficultyOverrides[prompt] ?? 2,
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
    })
    .filter(
      (question) =>
        question.options.length === (question.type === "true_false" ? 2 : 4),
    ),
);

const redundantQuestionIds = new Set([
  "curiosity-008",
  "curiosity-expansion-053",
  "curiosity-round-3-049",
  "curiosity-round-3-056",
  "matrix-cat-18-dkfilm-object-6",
  "matrix-cat-3-dkpol-basis-5",
  "q-cat-39-5", // Overlapper flere Gutenberg-/bogtrykspørgsmål og blander århundrede med årtier.
  "variety-072", // Samme volleyballfakta som q-cat-25-6.
  "expansion-105", // Samme Just Do It-fakta som q-cat-34-1.
  "expansion-117", // Samme Famicom/NES-fakta som q-cat-49-1.
  "expansion-173", // Samme deepfake-definition som q-cat-53-3.
  "expansion-112", // "Brun" i spørgsmålet afslører svaret brunost.
  "variety-055",
  "q-cat-31-2",
  "expansion-102",
  "expansion-115",
  "variety-079",
  "variety-065",
  "variety-041",
  "wikithin-danish-literature-author-Q1758876",
  "expansion-088",
  "expansion-093",
  "expansion-098",
  "q-cat-31-4",
  "q-cat-32-6",
  "expansion-129",
  "expansion-109",
  "expansion-164",
  "wikithin-danish-literature-author-Q1985244",
  "wikithin-invention-inventor-Q3134",
  "wikithin-invention-inventor-Q3169",
  "wikithin-invention-inventor-Q3123",
]);
const retiredLowValueTags = new Set(["tld", "callingCode"]);

// Wikidata er nyttig som rå faktakilde, men hele skabelonserier giver et
// ensformigt spil. Kun de emner, der er genkendelige og redaktionelt vurderet,
// bliver i den aktive bank. Resten kan stadig genimporteres senere efter en
// egentlig omskrivning.
const reviewedGeneratedIds = new Set([
  "wikiculture-film-director-Q2345",
  "wikiculture-film-director-Q19355",
  "wikiculture-film-director-Q20456",
  "wikiculture-film-director-Q32303",
  "wikiculture-film-director-Q4941",
  "wikiculture-film-director-Q6074",
  "wikiculture-film-director-Q32433",
  "wikiculture-film-director-Q11621",
  "wikiculture-film-director-Q45602",
  "wikiculture-film-director-Q12018",
  "wikiculture-film-director-Q17738",
  "wikiculture-film-director-Q60072",
  "wikiculture-album-artist-Q8360",
  "wikiculture-album-artist-Q27166",
  "wikiculture-album-artist-Q17444",
  "wikiculture-album-artist-Q113189",
  "wikiculture-album-artist-Q131182",
  "wikiculture-album-artist-Q131977",
  "wikiculture-album-artist-Q19003",
  "wikiculture-painting-artist-Q1061035",
  "wikiculture-painting-artist-Q1091086",
  "wikiculture-painting-artist-Q1170315",
  "wikiculture-painting-artist-Q1142058",
  "wikiculture-painting-artist-Q12334558",
  "wikiculture-painting-artist-Q12418",
  "wikiculture-painting-artist-Q151047",
  "wikiculture-painting-artist-Q175036",
  "wikiculture-series-creator-Q35791",
  "wikiculture-series-creator-Q1077",
  "wikiculture-series-creator-Q1079",
  "wikiculture-series-creator-Q183513",
  "wikiculture-series-creator-Q189350",
  "wikiculture-series-creator-Q2744",
  "wikiculture-series-creator-Q13979",
  "wikiculture-series-creator-Q80044",
  "wikiculture-series-creator-Q199853",
  "wikiculture-food-origin-Q203925",
  "wikiculture-food-origin-Q275621",
  "wikiculture-food-origin-Q493749",
  "wikiculture-food-origin-Q920940",
  "wikiculture-food-origin-Q85772622",
  "wikithin-athlete-sport-Q10125",
  "wikithin-athlete-sport-Q1002293",
  "wikithin-athlete-sport-Q1009230",
  "wikithin-athlete-sport-Q100074",
  "wikithin-athlete-sport-Q1000592",
  "wikithin-battle-country-Q153376",
  "wikithin-battle-country-Q154182",
  "wikithin-battle-country-Q38789",
  "wikithin-battle-country-Q184320",
  "wikithin-battle-country-Q27759",
  "wikithin-battle-country-Q33132",
  "wikithin-battle-country-Q31900",
  "wikithin-battle-country-Q132568",
  "wikithin-battle-country-Q131969",
  "wikithin-battle-country-Q130847",
  "wikithin-danish-film-director-Q352000",
  "wikithin-danish-film-director-Q110365",
  "wikithin-danish-film-director-Q196103",
  "wikithin-danish-film-director-Q1327845",
  "wikithin-danish-film-director-Q775356",
  "wikithin-danish-film-director-Q1326419",
  "wikithin-danish-film-director-Q370707",
  "wikithin-danish-film-director-Q316761",
  "wikithin-danish-film-director-Q312394",
  "wikithin-danish-literature-author-Q1192442",
  "wikithin-danish-literature-author-Q1756234",
  "wikithin-danish-literature-author-Q11868",
  "wikithin-danish-literature-author-Q11859",
  "wikithin-danish-literature-author-Q11876",
  "wikithin-danish-literature-author-Q1807554",
  "wikithin-danish-literature-author-Q11872",
  "wikithin-danish-literature-author-Q1152009",
  "wikithin-danish-literature-author-Q1757858",
  "wikithin-danish-literature-author-Q767189",
  "wikithin-danish-literature-author-Q2180740",
  "wikithin-danish-literature-author-Q1642629",
  "wikithin-danish-literature-author-Q1757820",
  "wikithin-danish-literature-author-Q11880",
  "wikithin-danish-literature-author-Q1757894",
  "wikithin-danish-series-creator-Q1211796",
  "wikithin-danish-series-creator-Q956446",
  "wikithin-danish-series-creator-Q1782870",
  "wikithin-danish-series-creator-Q1275157",
  "wikithin-danish-series-creator-Q1331994",
  "wikithin-danish-series-creator-Q12333582",
  "wikithin-invention-inventor-Q2270",
  "wikithin-invention-inventor-Q143",
  "wikithin-invention-inventor-Q3143",
  "wikithin-invention-inventor-Q43484",
  "wikithin-invention-inventor-Q10693",
  "wikithin-invention-inventor-Q2294",
  "wikithin-invention-inventor-Q144334",
  "wikithin-invention-inventor-Q6368",
  "wikithin-nordic-mountain-country-Q1018862",
  "wikithin-nordic-mountain-country-Q1420616",
  "wikithin-nordic-mountain-country-Q1496308",
  "wikithin-nordic-mountain-country-Q1547402",
  "wikithin-nordic-mountain-country-Q1477173",
  "wikithin-nordic-mountain-country-Q1315012",
  "wikithin-nordic-mountain-country-Q1637507",
  "wikithin-nordic-mountain-country-Q138114",
]);

function passesEditorialReview(question: Question) {
  if (question.id.startsWith("era-")) return false;
  if (
    question.id.startsWith("wikiculture-") ||
    question.id.startsWith("wikithin-")
  )
    return reviewedGeneratedIds.has(question.id);
  return true;
}

function applyEditorialRewrite(question: Question): Question {
  const prompt = question.prompt
    .replace(/^Hvem skrev det dansksprogede værk /, "Hvem skrev ")
    .replace(
      /^Hvilken kunstner eller gruppe udgav albummet /,
      "Hvem udgav albummet ",
    )
    .replace(
      /^Hvilken sportsgren forbindes atleten (.+) med\?$/,
      "Hvilken sportsgren er $1 kendt for?",
    )
    .replace(
      /^Hvilket land forbindes (.+) med som oprindelsesland\?$/,
      "Hvilket land forbindes retten $1 især med?",
    );
  if (prompt === question.prompt) return question;
  const answer =
    question.options.find((option) => option.id === question.correctOptionId)
      ?.text ?? "";
  return {
    ...question,
    prompt,
    fingerprint: fingerprint(prompt, answer, question.type),
    updatedAt: "2026-07-18T00:00:00.000Z",
  };
}

type EditorialQuestionFix = {
  prompt: string;
  options: [string, string, string, string];
  explanation: string;
  difficulty?: number;
  categoryId?: string;
  secondaryCategoryIds?: string[];
};

const reportedDifficultyFixes: Record<string, number> = {
  "variety-035": 3,
  "expansion-067": 4,
  "curiosity-expansion-067": 3,
};

const reportedQuestionFixes: Record<string, EditorialQuestionFix> = {
  "q-cat-48-2": {
    prompt: "Hvilken af disse frugter er botanisk set et bær?",
    options: ["Bananen", "Æblet", "Ferskenen", "Ananassen"],
    explanation:
      "En banan udvikles fra én blomst med ét frugtanlæg og regnes botanisk som et bær. Et æble er en kernefrugt, en fersken er en stenfrugt, og en ananas er en sammensat frugt.",
    difficulty: 2,
  },
  "curiosity-expansion-038": {
    prompt: "Hvad gør en hunds rystetur så effektiv til at fjerne vand?",
    options: [
      "Den hurtige rotation giver dråberne stor acceleration",
      "Hårene leder vandet mod pelsspidsen ved kapillærkraft",
      "Underulden presses sammen og skubber vand gennem dækhårene",
      "Kropsvarmen øger fordampningen under den hurtige bevægelse",
    ],
    explanation:
      "Hundens hud og pels skifter hurtigt retning under rysteturen. Dråberne kan ikke følge bevægelsen og slynges fri; det kræver langt mindre energi end at fordampe vandet.",
    difficulty: 3,
  },
  "curiosity-expansion-048": {
    prompt: "Hvorfor dannes der ofte dug på bilrudens inderside om vinteren?",
    options: [
      "Den kolde rude køler fugtig kabineluft under dugpunktet",
      "Trykforskellen trækker fugt gennem glasset udefra",
      "Varm luft fra blæseren frigiver vand, når den rammer ruden",
      "Kold udeluft optager fugt fra glasset og afsætter den indvendigt",
    ],
    explanation:
      "Passagerernes ånde og vådt tøj tilfører fugt. Når kabineluften afkøles ved den kolde rude til under sit dugpunkt, fortættes vanddampen på glasset.",
    difficulty: 2,
  },
  "curiosity-expansion-055": {
    prompt: "Hvorfor har beslægtede sprog ofte systematiske ligheder?",
    options: [
      "De har udviklet sig fra et fælles historisk modersprog",
      "De har lånt de fleste grundord fra det samme moderne sprog",
      "Ens klima får talelydene til at udvikle sig på samme måde",
      "Samme alfabet får grammatikken til at følge de samme regler",
    ],
    explanation:
      "Beslægtede sprog er forgreninger af et fælles ophav. Regelmæssige lydændringer kan derfor spores i ord og grammatik, selv efter lang tids adskillelse.",
    difficulty: 3,
  },
  "curiosity-expansion-059": {
    prompt: "Hvorfor falder lufttemperaturen typisk med højden i troposfæren?",
    options: [
      "Luften udvider sig ved lavere tryk og afkøles",
      "Den tynde luft absorberer mindre varme direkte fra Solen",
      "Vanddamp fryser i højden og køler resten af luften",
      "Tyngdekraften trækker de varmeste luftmolekyler nedad",
    ],
    explanation:
      "Lufttrykket falder med højden. Når stigende luft udvider sig under det lavere tryk, bruger den energi og bliver koldere; processen kaldes adiabatisk afkøling.",
    difficulty: 3,
  },
  "variety-102": {
    prompt:
      "Hvad fremhæver social læringsteori som en vigtig vej til ny adfærd?",
    options: [
      "At observere andre og følgerne af deres handlinger",
      "Kun selv at modtage belønninger og straffe",
      "At bearbejde ubevidste konflikter fra barndommen",
      "At gennemløbe faste tankestadier uafhængigt af miljøet",
    ],
    explanation:
      "Albert Banduras socialkognitive teori viser, at mennesker kan lære ved at observere modeller og se, hvilke konsekvenser deres handlinger får.",
    difficulty: 3,
  },
  "curiosity-expansion-017": {
    prompt:
      "Hvorfor er en nybagt småkage ofte blød, men bliver sprød under afkøling?",
    options: [
      "Fedt og sukker stivner, mens fugt forlader overfladen",
      "Stivelsen fortsætter med at gelatinisere ved stuetemperatur",
      "Gluten trækker sig sammen, når bagepulverets gas forsvinder",
      "Sukkeret optager fugt fra luften og danner en hård skorpe",
    ],
    explanation:
      "I den varme småkage er fedt og sukker stadig blødt, og der findes mere damp i strukturen. Under afkøling stivner den, mens noget fugt slipper væk.",
    difficulty: 2,
  },
  "curiosity-expansion-022": {
    prompt: "Hvordan kan syltning forlænge madens holdbarhed?",
    options: [
      "Syre, salt eller sukker hæmmer væksten af mange mikrober",
      "Lagen fjerner al ilt og steriliserer dermed maden",
      "Krydderier neutraliserer de enzymer, som skaber bakterier",
      "Glasset trækker fugten ud og tørrer maden indefra",
    ],
    explanation:
      "Lav pH og en høj koncentration af salt eller sukker gør miljøet vanskeligere for mange mikroorganismer. Ren opbevaring og korrekt varmebehandling er også vigtige.",
    difficulty: 2,
  },
  "curiosity-expansion-067": {
    prompt: "Hvad gør den Y-formede kanal i en lynlåsskyder?",
    options: [
      "Den fører tandrækkerne sammen, så elementerne griber ind",
      "Den presser tænderne flade, så friktion holder rækkerne samlet",
      "Den trækker stoffet tættere uden at flytte selve tænderne",
      "Den drejer hver anden tand, så den hægter sig bag den næste",
    ],
    explanation:
      "Skyderens kileformede kanaler fører tænder eller spiraler ind i en position, hvor de griber ind i hinanden. I den modsatte retning skilles de igen.",
    difficulty: 3,
  },
  "curiosity-023": {
    prompt: "Hvad får boblerne til at dannes, når en sodavandsflaske åbnes?",
    options: [
      "Trykfaldet gør den opløste kuldioxid mindre stabil i væsken",
      "Luften over væsken trækker kuldioxid op gennem sodavanden",
      "Temperaturen stiger straks og får kuldioxiden til at udvide sig",
      "Ilt fra luften reagerer med kuldioxiden og danner skum",
    ],
    explanation:
      "Under tryk kan mere kuldioxid være opløst i sodavanden. Når flasken åbnes, falder trykket, og gassen slipper ud som bobler.",
  },
  "curiosity-expansion-057": {
    prompt:
      "Hvad er den vigtigste læsemæssige fordel ved mellemrum mellem ord?",
    options: [
      "De gør ordgrænserne hurtigere at genkende",
      "De viser, hvilke stavelser der skal have tryk",
      "De holder afstanden mellem alle bogstaver ens",
      "De angiver, hvor læseren skal trække vejret",
    ],
    explanation:
      "Tydelige ordgrænser gør det hurtigere at genkende ord. I oldtidens tekster skrev man ofte uden faste mellemrum, hvilket krævede mere af læseren.",
  },
  "curiosity-expansion-005": {
    prompt:
      "Hvorfor kan almindelig lyd næsten ikke udbrede sig i det ydre rum?",
    options: [
      "Der mangler stof, som lydbølger kan bevæge sig igennem",
      "Den lave temperatur gør lydbølgerne for langsomme",
      "Solens stråling overdøver alle andre vibrationer",
      "Den svage tyngdekraft bøjer lyden væk fra astronauter",
    ],
    explanation:
      "Lyd er mekaniske svingninger og kræver et medium som luft, vand eller metal. Det næsten tomme rum kan derfor ikke føre almindelige lydbølger.",
  },
  "format-depth-016": {
    prompt: "Hvilket af disse sproglige begreber er ikke en ordklasse?",
    options: ["Stavelse", "Biord", "Stedord", "Forholdsord"],
    explanation:
      "En stavelse er en lydenhed i et ord. De tre andre svar er ordklasser.",
    difficulty: 2,
  },
  "matrix-cat-58-architecture-force-2": {
    prompt: "Hvorfor består et fagværk ofte af trekanter?",
    options: [
      "Formen ændres kun, hvis en stang ændrer længde",
      "Tre sider bruger altid mindre materiale end en enkelt bjælke",
      "En trekant leder hele belastningen lodret gennem midten",
      "Tre samlinger kan være stabile uden at blive fastgjort",
    ],
    explanation:
      "En trekant er geometrisk stabil. I et fagværk bliver belastningen især fordelt som træk og tryk gennem stængerne.",
    difficulty: 3,
  },
  "depth-019": {
    prompt:
      "Hvilken konflikt blev ifølge myten udløst af striden om et gyldent æble?",
    options: [
      "Den trojanske krig",
      "Krigen mellem titanerne og guderne",
      "Krigen mellem lapitherne og kentaurerne",
      "Felttoget De syv mod Theben",
    ],
    explanation:
      "Paris gav æblet 'til den skønneste' til Afrodite. Hendes løfte om Helena blev begyndelsen på konflikten, der førte til den trojanske krig.",
  },
  "depth-029": {
    prompt: "Hvad gør Ratatosk i fortællingerne om verdenstræet Yggdrasil?",
    options: [
      "Bringer fornærmelser mellem ørnen og dragen Nidhug",
      "Vogter gudernes æbler mod jætterne",
      "Varsler Ragnarok ved at gale fra trækronen",
      "Gnaver den lænke over, som holder Fenrisulven",
    ],
    explanation:
      "Egernet Ratatosk løber op og ned ad Yggdrasil med hånlige beskeder mellem ørnen i kronen og Nidhug ved roden.",
  },
  "matrix-cat-22-music-origin-5": {
    prompt: "I hvilken dansk by blev bandet TV-2 dannet?",
    options: ["Aarhus", "Odense", "Aalborg", "Esbjerg"],
    explanation:
      "TV-2 blev dannet i Aarhus i 1980 på resterne af gruppen Taurus.",
  },
  "curiosity-round-3-023": {
    prompt: "Hvorfor kan nye skove ikke alene standse klimaforandringerne?",
    options: [
      "Arealet og træernes samlede kulstoflager er begrænset",
      "Efter de første år bliver træernes kulstofoptag meget lille",
      "Om vinteren frigiver skoven omtrent årets samlede optag",
      "Kulstof i træ forbliver bundet, selv hvis skoven brænder",
    ],
    explanation:
      "Skove lagrer kulstof, men der er begrænset plads, og lageret kan gå tabt ved skovbrand eller fældning. Udledningerne skal derfor også reduceres.",
  },
  "format-depth-070": {
    prompt: "Hvad kendetegner en overvejende indre kontrolplacering?",
    options: [
      "Personen forbinder ofte udfald med egne valg og handlinger",
      "Personen forklarer især udfald med held og tilfældigheder",
      "Personen forventer, at autoriteter bestemmer alle udfald",
      "Personen undgår situationer, hvor udfaldet er usikkert",
    ],
    explanation:
      "Indre kontrolplacering betyder, at man i relativt høj grad oplever egne handlinger som betydningsfulde for det, der sker.",
  },
  "matrix-cat-43-bake-technique-2": {
    prompt: "Hvordan skabes de mange tynde lag i en croissant?",
    options: [
      "Dejen foldes flere gange omkring lag af koldt smør",
      "Dejen piskes luftig, før melet tilsættes",
      "Smørret smeltes og røres helt ind i dejen",
      "Den formede dej koges kort før bagning",
    ],
    explanation:
      "Ved laminering foldes dej og koldt smør i mange lag. Under bagningen bliver vand til damp, som løfter lagene fra hinanden.",
  },
  "format-depth-047": {
    prompt:
      "Hvilken del af kroppen analyserer de duftpartikler, en slange samler med tungen?",
    options: [
      "Jacobsons organ i ganen",
      "Smagsløg langs tungens spids",
      "Lugteceller i slangens lunger",
      "Et sanseorgan bag trommehinden",
    ],
    explanation:
      "Tungen opsamler kemiske partikler og afleverer dem til Jacobsons organ i ganen, også kaldet det vomeronasale organ.",
  },
  "curiosity-round-3-034": {
    prompt:
      "Hvorfor ser fjerne bjerge ofte mere blålige ud end landskabet tæt på?",
    options: [
      "Lys spredt i luften dæmper kontraster og giver et blåligt skær",
      "Fjerne overflader reflekterer en større del af himlen",
      "Øjet bliver gradvist mindre følsomt for rødt med afstanden",
      "Vanddamp absorberer kun de grønne og gule farver",
    ],
    explanation:
      "Luft og små partikler mellem os og motivet spreder lys. Effekten kaldes atmosfærisk perspektiv og bruges også bevidst i malerier.",
  },
  "matrix-cat-4-intpol-decision-6": {
    prompt: "Hvad er en central opgave for Verdenshandelsorganisationen, WTO?",
    options: [
      "At administrere handelsregler og behandle tvister mellem lande",
      "At fastsætte medlemslandenes renter og valutakurser",
      "At vedtage bindende klimalove for alle verdens lande",
      "At lede fredsbevarende militære operationer",
    ],
    explanation:
      "WTO danner ramme om internationale handelsaftaler og har et system til behandling af handelstvister mellem medlemmerne.",
    difficulty: 2,
  },
  "matrix-cat-44-drink-serve-6": {
    prompt: "Hvordan serveres en klassisk Dry Martini efter omrøring?",
    options: [
      "Siet i et afkølet cocktailglas uden is",
      "I et højt glas fyldt med knust is",
      "I et kort glas over en stor isterning",
      "Usiet i et varmt cocktailglas",
    ],
    explanation:
      "En Dry Martini omrøres med is og sies normalt i et afkølet cocktailglas. Isen bruges til afkøling og fortynding, men følger ikke med i glasset.",
  },
  "curiosity-expansion-016": {
    prompt:
      "En nyæltet brøddej trækker sig sammen under formning. Hvorfor hjælper en kort hvile?",
    options: [
      "Glutennetværket bliver mere eftergiveligt",
      "Gæren standser og gør dejen mindre elastisk",
      "Stivelsen størkner og holder formen bedre",
      "Saltet nedbryder de stramme glutenproteiner",
    ],
    explanation:
      "Æltning spænder glutennetværket. Under hvilen fordeles fugten, og gluten bliver mere eftergiveligt, så dejen lettere kan formes uden at trække sig tilbage.",
    difficulty: 3,
  },
  "curiosity-expansion-062": {
    prompt: "Hvilken ændring kan give et omkvæd mere løft end verset?",
    options: [
      "Flere lydlag, bredere register og større intensitet",
      "Smallere stereobillede og færre instrumenter",
      "Lavere toneart og kortere toner i alle spor",
      "Samme arrangement afspillet ved lavere lydstyrke",
    ],
    explanation:
      "Et omkvæd kan løftes med ekstra stemmer og instrumenter, et bredere frekvensområde og mere dynamisk intensitet. Kontrasten til verset er afgørende.",
    difficulty: 3,
    categoryId: "cat-23",
    secondaryCategoryIds: ["cat-21", "cat-59"],
  },
  "curiosity-expansion-070": {
    prompt: "Hvilken retning vender et almindeligt spejl egentlig om?",
    options: [
      "Dybdeaksen: fremad og bagud",
      "Den vandrette akse fra venstre mod højre",
      "Den lodrette akse fra top mod bund",
      "Både den vandrette og den lodrette retning",
    ],
    explanation:
      "Spejlet vender dybderetningen: Det, der peger ind mod spejlet, ser ud til at pege ud. Højre og venstre virker ombyttet, fordi vi forestiller os at dreje os ind i spejlbilledets position.",
    difficulty: 4,
    categoryId: "cat-7",
    secondaryCategoryIds: ["cat-48", "cat-59"],
  },
  "curiosity-expansion-074": {
    prompt: "Hvad skaber illusionen af, at et hjul på film drejer baglæns?",
    options: [
      "Egerne optages næsten samme sted i hvert billede",
      "Lukkertiden spejlvender hurtige bevægelser",
      "Objektivet forsinker hjulets øverste halvdel",
      "Billedsensoren aflæser rotationen i omvendt rækkefølge",
    ],
    explanation:
      "Film viser en række enkeltbilleder. Hvis en eger næsten når den forrige egers position mellem to billeder, oplever vi den korteste bevægelse som baglæns rotation.",
    difficulty: 3,
    categoryId: "cat-17",
    secondaryCategoryIds: ["cat-7", "cat-9", "cat-59"],
  },
  "curiosity-expansion-075": {
    prompt: "Hvordan kan et publikum spontant begynde at klappe i samme takt?",
    options: [
      "Folk justerer ubevidst timingen efter hinanden",
      "Rummets ekko flytter alle klap ind på samme slag",
      "Publikums gennemsnitlige puls bestemmer tempoet",
      "De højeste klap skjuler alle slag uden for takten",
    ],
    explanation:
      "Når mennesker hører hinandens klap, foretager de små tidsmæssige justeringer. Den gensidige påvirkning kan gradvist samle gruppen om en fælles puls.",
    difficulty: 3,
    categoryId: "cat-12",
    secondaryCategoryIds: ["cat-21", "cat-36", "cat-59"],
  },
};

const plausibleDistractorFixes: Record<string, [string, string, string]> = {
  "music-production-014": [
    "Den opfanger primært lyd lige forfra",
    "Den opfanger lyd forfra og bagfra, men ikke fra siderne",
    "Den danner automatisk et stereosignal",
  ],
  "music-production-020": [
    "1 dB ekstra ind giver cirka 4 dB ekstra ud",
    "Signalet sænkes med 4 dB, så snart threshold nås",
    "Threshold flyttes 4 dB for hvert decibel over grænsen",
  ],
  "music-production-053": [
    "De forstærker især de frekvenser, signalerne har fælles",
    "De bliver forskudt i tid, men beholder samme lydstyrke",
    "De samles til et stereosignal med bredere panorering",
  ],
  "music-production-073": [
    "Den valgte kontrol kopieres til alle patterns i Playlist",
    "Kontrollens nuværende værdi gemmes som en ny mixer-preset",
    "Den valgte kontrol kobles direkte til projektets mastertempo",
  ],
  "music-production-075": [
    "Noter uden velocity vises som halvgennemsigtige",
    "Tidligere slettede noter vises, indtil projektet gemmes",
    "Noter uden for den valgte skala skjules i baggrunden",
  ],
  "music-production-087": [
    "Eksporten bruger en større buffer, men afspiller stadig i realtid",
    "Effekter med stor latenstid springes over under eksporten",
    "Projektet eksporteres ved lavere samplerate end afspilningen",
  ],
  "curiosity-002": [
    "Metallet har mindre varmekapacitet og er derfor reelt koldere",
    "Den blanke overflade sender mere varmestråling væk fra hånden",
    "Træets fibre holder på varmen fra den omgivende luft",
  ],
  "curiosity-005": [
    "Overfladespændingen bærer den frosne klump",
    "Små luftlommer i isen giver den tilstrækkelig opdrift",
    "Det kolde vand under isen presser den mod overfladen",
  ],
  "curiosity-012": [
    "Kulden får elektroner til at bevæge sig hurtigere gennem huden",
    "Vintertøj leder ladningen hurtigere fra kroppen til luften",
    "Opvarmet indeluft tilfører kroppen en svag elektrisk ladning",
  ],
  "curiosity-021": [
    "Luft i kornet udvider sig og river skallen op",
    "Olien trænger ind og får stivelsen til at svulme",
    "Skallen trækker sig hurtigt sammen omkring den varme kerne",
  ],
  "curiosity-028": [
    "Det ekstra glas reflekterer det meste af varmen tilbage i rummet",
    "To tynde ruder leder samlet mindre varme end én tyk rude",
    "Trykket mellem ruderne holder den indvendige rude varm",
  ],
  "curiosity-033": [
    "Rummet bliver gradvist køligere, fordi kulden slipper ud",
    "Temperaturen forbliver omtrent uændret, fordi døren står åben",
    "Luften køles, mens vægge og møbler beholder samme temperatur",
  ],
  "curiosity-044": [
    "Satellitsignalerne bliver upræcise, når telefonen står stille",
    "Telefonen kan kun beregne positionen, hvis kompasset peger nord",
    "Bygningens wi-fi-signaler bruger samme frekvens som GPS",
  ],
  "curiosity-045": [
    "De vigtigste felter er gemt to gange i hver sin halvdel",
    "Kameraet rekonstruerer skaden ud fra QR-kodens kantmønster",
    "Den beskadigede del erstattes med data fra en central database",
  ],
  "curiosity-046": [
    "Websteder kan ikke længere se enhedens IP-adresse",
    "Internetudbyderen modtager kun krypterede domænenavne",
    "Arbejdsgiverens netværk registrerer ikke trafik fra private vinduer",
  ],
  "curiosity-047": [
    "Hvor længe cremen er vandfast efter badning",
    "Hvor godt cremen beskytter mod UVA-stråling",
    "Hvor mange minutter der bør gå mellem påføringer",
  ],
  "curiosity-expansion-002": [
    "Den indeholder mere ilt og trækkes derfor mod højere luftlag",
    "Lufttrykket under den varme luft bliver lavere end over den",
    "Tyngdekraften påvirker varm luft mindre end kold luft",
  ],
  "curiosity-expansion-023": [
    "En stor isterning er tættere og holder derfor bedre på kulden",
    "Den store isterning indeholder mindre luft end mange små",
    "Små isterninger smelter først, når drinken bliver omrørt",
  ],
  "curiosity-expansion-037": [
    "Det udligner automatisk lydstyrken mellem de to klip",
    "Det flytter klippene, så deres bølgeformer begynder samme sted",
    "Det tilpasser tonehøjden i det ene klip til det andet",
  ],
  "curiosity-expansion-042": [
    "Nålenes vokslag gør fotosyntesen mere effektiv i frostvejr",
    "Harpiksen transporterer varme fra stammen ud til nålene",
    "Den smalle form gør, at sneen tilfører nålene nok vand",
  ],
  "curiosity-expansion-052": [
    "Banken lægger rentestigningen direkte oven i restgælden",
    "Afdragene bliver mindre, så lånet automatisk løber længere",
    "Lånets gebyrer vokser i samme forhold som markedsrenten",
  ],
  "curiosity-expansion-054": [
    "Alle værdipapirerne får dermed omtrent samme forventede afkast",
    "Fonden kan bruge gevinster til straks at annullere enkelte tab",
    "Kursudsving udlignes, når fonden ejer et bestemt minimumsantal",
  ],
  "curiosity-expansion-056": [
    "Stavereformer giver automatisk gamle ord en ny definition",
    "Sprognævn fordeler nye betydninger, når samfundet ændrer sig",
    "Ændret udtale får ordets betydning til at følge lyden",
  ],
  "curiosity-expansion-065": [
    "Hvirvler fra den forreste rytter skubber direkte på baghjulet",
    "Den forreste cykels bevægelse øger dæktrykket hos de næste",
    "Rytterne deler bevægelsesenergi, når afstanden bliver lille",
  ],
  "curiosity-expansion-067-retired": [
    "Skyderen presser tænderne flade, så de ligger oven på hinanden",
    "Friktion opvarmer tænderne, så de kortvarigt binder sammen",
    "Skyderen strammer stoffet, mens tandrækkerne forbliver adskilt",
  ],
  "curiosity-round-3-006": [
    "Programmet samler optagelserne til én tonefast version",
    "Hvert nyt lag dæmper fasefejl i den foregående optagelse",
    "Mikrofonens frekvensområde udvides for hver ekstra optagelse",
  ],
  "curiosity-round-3-027": [
    "Korttidshukommelsen fortsætter med at afprøve løsninger uændret",
    "En pause flytter automatisk problemet til langtidshukommelsen",
    "Synet bliver mere præcist, når opgaven ikke betragtes et stykke tid",
  ],
  "curiosity-round-3-045": [
    "Skrå stænger fordeler automatisk vægten ligeligt i alle retninger",
    "En trekant fører hele belastningen direkte ned i fundamentet",
    "Tre samlinger kræver mindre materiale end andre former med samme areal",
  ],
  "curiosity-round-3-047": [
    "Om ejerskabet følger den ældste del af en genstand",
    "Om en nøjagtig kopi arver originalens historie",
    "Om materialets alder alene bestemmer en genstands værdi",
  ],
  "format-depth-060": [
    "Elementer tæt på hinanden opfattes som en gruppe",
    "Elementer med samme form opfattes som sammenhørende",
    "Et motiv opfattes som adskilt fra sin baggrund",
  ],
  "format-depth-073": [
    "Små formater øger automatisk kontrasten mellem farverne",
    "Skærmen fremhæver tynde detaljer, når logoet skaleres ned",
    "Bogstaver bliver lettere at læse, jo tættere de står",
  ],
};

function applyReportedQuestionFix(question: Question): Question {
  const fix = reportedQuestionFixes[question.id];
  const reportedDifficulty = reportedDifficultyFixes[question.id];
  if (!fix)
    return reportedDifficulty === undefined
      ? question
      : {
          ...question,
          difficulty: reportedDifficulty,
          updatedAt: "2026-07-20T00:00:00.000Z",
        };
  const options = fix.options.map((text, index) => ({
    id: `o${index + 1}`,
    text,
  }));
  return {
    ...question,
    prompt: fix.prompt,
    options,
    correctOptionId: options[0].id,
    explanation: fix.explanation,
    difficulty: fix.difficulty ?? reportedDifficulty ?? question.difficulty,
    categoryId: fix.categoryId ?? question.categoryId,
    secondaryCategoryIds:
      fix.secondaryCategoryIds ?? question.secondaryCategoryIds,
    fingerprint: fingerprint(fix.prompt, options[0].text, question.type),
    updatedAt: "2026-07-20T00:00:00.000Z",
  };
}

function applyPlausibleDistractorFix(question: Question): Question {
  const distractors = plausibleDistractorFixes[question.id];
  if (!distractors) return question;
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  if (!correct) return question;
  const options = [correct.text, ...distractors].map((text, index) => ({
    id: `o${index + 1}`,
    text,
  }));
  return {
    ...question,
    options,
    correctOptionId: options[0].id,
    updatedAt: "2026-07-18T00:00:00.000Z",
  };
}

const rawBaseQuestions: Question[] = [
  ...CURATED_QUESTIONS,
  ...COUNTRY_QUESTIONS,
  ...MUSIC_PRODUCTION_QUESTIONS,
  ...WIKIDATA_CULTURE_QUESTIONS,
  ...EXPANSION_QUESTIONS,
  ...EVERYDAY_CURIOSITY_QUESTIONS,
  ...CURIOSITY_EXPANSION_QUESTIONS,
  ...CURIOSITY_ROUND_THREE_QUESTIONS,
  ...CATEGORY_DEPTH_QUESTIONS,
  ...CATEGORY_MATRIX_QUESTIONS,
  ...FORMAT_DEPTH_QUESTIONS,
  ...ERA_DEPTH_QUESTIONS,
  ...WIKIDATA_THIN_QUESTIONS,
  ...VARIETY_QUESTIONS,
  ...FRANCHISE_QUESTIONS,
  ...CULTURE_AND_COOKING_QUESTIONS,
  ...DECADE_QUALITY_QUESTIONS,
  ...PHILOSOPHY_QUESTIONS,
  ...EDITORIAL_FILL_QUESTIONS,
]
  .filter(
    (question) =>
      passesEditorialReview(question) &&
      !redundantQuestionIds.has(question.id) &&
      !question.tags.some((tag) => retiredLowValueTags.has(tag)),
  )
  .map(applyEditorialRewrite)
  .map(applyReportedQuestionFix)
  .map(applyPlausibleDistractorFix);

const countryRelationLimits = new Map([
  ["capital", 18],
  ["currency", 21],
  ["language", 5],
]);
const retainedCountryLookupIds = new Set(
  [...countryRelationLimits].flatMap(([relation, limit]) =>
    rawBaseQuestions
      .filter((question) => question.tags.includes(relation))
      .sort((a, b) => stableHash(a.id).localeCompare(stableHash(b.id)))
      .slice(0, limit)
      .map((question) => question.id),
  ),
);
const repetitiveRelationLimits = [
  { tags: ["film-director"], limit: 8 },
  { tags: ["danish-film-director"], limit: 9 },
  { tags: ["series-creator"], limit: 7 },
  { tags: ["danish-series-creator"], limit: 6 },
  { tags: ["album-artist"], limit: 6 },
  { tags: ["painting-artist"], limit: 5 },
];
const retainedRepetitiveRelationIds = new Set(
  repetitiveRelationLimits.flatMap(({ tags, limit }) =>
    rawBaseQuestions
      .filter((question) => tags.some((tag) => question.tags.includes(tag)))
      .sort((a, b) => stableHash(a.id).localeCompare(stableHash(b.id)))
      .slice(0, limit)
      .map((question) => question.id),
  ),
);
const repetitiveRelationTags = new Set(
  repetitiveRelationLimits.flatMap(({ tags }) => tags),
);
const BASE_QUESTIONS = rawBaseQuestions.filter((question) => {
  const countryRelation = ["capital", "currency", "continent", "language"].find(
    (relation) => question.tags.includes(relation),
  );
  if (countryRelation && !retainedCountryLookupIds.has(question.id))
    return false;
  const repetitiveRelation = question.tags.some((tag) =>
    repetitiveRelationTags.has(tag),
  );
  return !repetitiveRelation || retainedRepetitiveRelationIds.has(question.id);
});

const categoryLinks: Record<string, string[]> = {
  "cat-11": ["cat-14"],
  "cat-12": ["cat-13"],
  "cat-13": ["cat-12"],
  "cat-14": ["cat-11"],
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

const semanticRules: { categoryId: string; pattern: RegExp }[] = [
  {
    categoryId: "cat-3",
    pattern:
      /folketing|grundlov|statsminister|kommunalvalg|folkeafstemning|mandat|koalition|ministeransvar|stemmehemmelighed|magtens deling/u,
  },
  {
    categoryId: "cat-4",
    pattern:
      /\bfn\b|europa-parlament|sikkerhedsråd|nato|international politik|diplomati|sanktion|traktat|suverænitet/u,
  },
  {
    categoryId: "cat-8",
    pattern:
      /planet|måne|solen|stjerne|galakse|asteroide|komet|rumfart|kredsløb|atmosfære|tyngdekraft/u,
  },
  {
    categoryId: "cat-10",
    pattern:
      /internet|browser|webside|hjemmeside|wifi|wi-fi|https|url|domæne|cookie|streaming|server|datapakke|qr-kode|søgemaskine/u,
  },
  {
    categoryId: "cat-11",
    pattern:
      /filosof|etik|moral|erkendelse|fri vilje|determinisme|eksistential|utilitar|platon|aristoteles|(?<!\p{L})kant(?!\p{L})|sokrates/u,
  },
  {
    categoryId: "cat-12",
    pattern:
      /psykolog|hukommelse|opmærksomhed|bias|adfærd|følelse|motivation|placebo|forventning|gruppepres|beslutning/u,
  },
  {
    categoryId: "cat-14",
    pattern:
      /livets mening|fri vilje|identitet|bevidsthed|lykke|døden|moralsk|tankeeksperiment|theseus|uvidenhedens slør/u,
  },
  {
    categoryId: "cat-24",
    pattern:
      /computerspil|videospil|spilkonsol|playstation|xbox|nintendo|minecraft|zelda|mario|gaming|billedfrekvens|latency/u,
  },
  {
    categoryId: "cat-27",
    pattern:
      /fodbold|målmand|straffespark|offside|premier league|champions league|verdensmesterskab|vm-finale/u,
  },
  {
    categoryId: "cat-28",
    pattern:
      /pattedyr|fugl|fisk|insekt|dyr|pels|vinge|næb|hale|rovdyr|planteæder/u,
  },
  {
    categoryId: "cat-29",
    pattern:
      /rensdyr|elg|los|polarræv|isbjørn|sæl|marsvin|hugorm|nordiske dyr|skandinaviske dyr/u,
  },
  {
    categoryId: "cat-30",
    pattern:
      /nordisk natur|skandinav|fjord|birk|gran|mos|tundra|nordlys|midnatssol|løvfald|sne/u,
  },
  {
    categoryId: "cat-34",
    pattern:
      /(?<!\p{L})(?:brand|mærke|produktnavn|varemærke|slogan|model|modellen|lego|ikea|nike|adidas|apple|volkswagen)(?!\p{L})/u,
  },
  {
    categoryId: "cat-35",
    pattern:
      /(?<!\p{L})(?:logo|virksomhed|firma|grundlagt|hovedsæde|branche|koncern|varemærke|brand)(?!\p{L})/u,
  },
  {
    categoryId: "cat-37",
    pattern:
      /kunst|maleri|maler|skulptur|museum|perspektiv|farvelære|lærred|portræt/u,
  },
  {
    categoryId: "cat-38",
    pattern:
      /sprog|ordet|udtryk|stavning|grammatik|dialekt|alfabet|vokal|konsonant|betydning|læseretning/u,
  },
  {
    categoryId: "cat-39",
    pattern:
      /opfind|patent|udviklede den første|prototyp|telegraf|telefon|lynlås|glødepære/u,
  },
  {
    categoryId: "cat-41",
    pattern:
      /rugbrød|smørrebrød|skyr|brunost|gravlaks|surströmming|nordisk mad|rødgrød|frikadelle/u,
  },
  {
    categoryId: "cat-43",
    pattern:
      /(?<!\p{L})(?:bagning|dej|gær|gluten|mel|kage|brød|marengs|hæve)(?!\p{L})|temperere chokolade/u,
  },
  {
    categoryId: "cat-44",
    pattern:
      /(?<!\p{L})(?:cocktail|spiritus|vin|øl|whisky|rom|gin|vodka|bitter|mousserende|alkohol)(?!\p{L})/u,
  },
  {
    categoryId: "cat-48",
    pattern:
      /mærkelig|overraskende|usædvanlig|kan leve uden|større end|længere end|eneste dyr|særpræg/u,
  },
  {
    categoryId: "cat-54",
    pattern:
      /krop|blod|hjerte|hjerne|hud|muskel|knogle|immun|sundhed|søvn|vitamin|smerte|vejrtræk/u,
  },
  {
    categoryId: "cat-56",
    pattern:
      /klima|miljø|drivhus|kulstof|co2|genbrug|vedvarende|havstigning|tørke|vådområde|varmeø/u,
  },
  {
    categoryId: "cat-57",
    pattern:
      /(?<!\p{L})(?:bil|motor|dæk|bremse|tog|cykel|fly|transport|trafik|vej|brændstof|gear)(?!\p{L})/u,
  },
  {
    categoryId: "cat-58",
    pattern:
      /(?<!\p{L})(?:arkitektur|bygning|design|konstruktion|bro|tag|beton|mursten|akustik|fundament|facade)(?!\p{L})/u,
  },
];

const decadeCategory = (text: string) => {
  const years = [...text.matchAll(/\b(19[89]\d|20[012]\d)\b/gu)].map((match) =>
    Number(match[1]),
  );
  if (years.some((year) => year >= 1980 && year <= 1989)) return "cat-49";
  if (years.some((year) => year >= 1990 && year <= 1999)) return "cat-50";
  if (years.some((year) => year >= 2000 && year <= 2009)) return "cat-51";
  if (years.some((year) => year >= 2010 && year <= 2019)) return "cat-52";
  return undefined;
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
const legacyOptionOverrides: Record<string, [string, string, string, string]> =
  {
    "q-cat-11-3": [
      "Erkendelsesteori",
      "Bevidsthedsfilosofi",
      "Videnskabsteori",
      "Værditeori",
    ],
    "q-cat-26-2": [
      "Poul-Erik Høyer Larsen",
      "Thomas Stuer-Lauridsen",
      "Joachim Fischer Nielsen",
      "Kim Astrup Sørensen",
    ],
    "q-cat-41-5": [
      "Et islandsk syrnet mælkeprodukt",
      "En norsk lagret gedeost",
      "Et svensk syrnet kornprodukt",
      "En finsk fermenteret mælkedrik",
    ],
    "q-cat-34-2": ["Volkswagen", "Chevrolet", "Mitsubishi", "Alfa Romeo"],
    "q-cat-48-5": ["Vombatten", "Næsebjørnen", "Bæltedyret", "Jærven"],
    "expansion-156": ["Blæksprutten", "Kæmpekrabben", "Pighajen", "Søkoen"],
    "q-cat-51-5": [
      "Olsen Brothers",
      "A Friend in London",
      "Rollo & King",
      "Lighthouse X",
    ],
    "q-cat-52-3": ["New Horizons", "Cassini-Huygens", "Voyager 2", "Dawn"],
    "q-cat-53-3": [
      "Medie manipuleret med generativ teknologi",
      "Data skjult med moderne kryptering",
      "Video sendt gennem et anonymt netværk",
      "Indhold mærket med en digital signatur",
    ],
    "expansion-174": [
      "Login med kryptografiske nøgler",
      "Login med et ekstra langt brugernavn",
      "Login med en fysisk nøgle til serveren",
      "Login gennem et offentligt trådløst netværk",
    ],
    "expansion-175": [
      "Overvågning af celler, temperatur og opladning",
      "Styring af bilens radio, navigation og højttalere",
      "Produktion af strøm direkte fra bilens bremsevæske",
      "Tilpasning af dækmønsteret til vejens overflade",
    ],
    "variety-018": [
      "Google blev grundlagt i Californien",
      "Nelson Mandela blev Sydafrikas præsident",
      "Windows 95 blev udgivet af Microsoft",
      "Fåret Dolly blev klonet i Skotland",
    ],
    "variety-031": [
      "Manchester United",
      "Real Madrid",
      "Bayern München",
      "Los Angeles Lakers",
    ],
    "variety-115": [
      "Operatørprofil uden et fysisk SIM-kort",
      "Mobilforbindelse udelukkende gennem Wi-Fi",
      "Batteriskift uden værktøj eller afbrydelse",
      "Visning af elektronisk blæk på skærmen",
    ],
  };

const POLISHED_QUESTIONS: Question[] = BASE_QUESTIONS.map((question) => {
  const searchableText = normalizeText(
    [
      question.prompt,
      question.explanation,
      ...question.options.map((option) => option.text),
      ...question.tags,
    ].join(" "),
  );
  const inferredDecade = decadeCategory(searchableText);
  const inferred = [
    ...(categoryLinks[question.categoryId] ?? []),
    ...(typeLinks[question.type] ? [typeLinks[question.type]!] : []),
    ...(question.tags.some((tag) => personTags.has(tag)) ? ["cat-40"] : []),
    ...(question.categoryId === "cat-1" && question.difficulty <= 2
      ? ["cat-59"]
      : []),
    ...semanticRules
      .filter((rule) => rule.pattern.test(searchableText))
      .map((rule) => rule.categoryId),
    ...(inferredDecade ? [inferredDecade] : []),
  ];
  const correctAnswer = question.options.find(
    (option) => option.id === question.correctOptionId,
  )?.text;
  const optionOverride = legacyOptionOverrides[question.id];
  const capitalizeOption = (text: string) => {
    const value = text.trim();
    if (/^(iPhone|iPad|iOS|iPod|eBay|macOS)\b/.test(value)) return value;
    return /^\p{Ll}/u.test(value)
      ? `${value[0].toLocaleUpperCase("da")}${value.slice(1)}`
      : value;
  };
  const cleanText = (text: string) =>
    text
      .trim()
      .replace(/\s{2,}/g, " ")
      .replace(/\.{2}$/, ".");
  return {
    ...question,
    prompt: cleanText(question.prompt),
    options: question.options.map((option, optionIndex) => ({
      ...option,
      text: cleanText(
        capitalizeOption(optionOverride?.[optionIndex] ?? option.text),
      ),
    })),
    fingerprint: fingerprint(
      cleanText(question.prompt),
      cleanText(
        capitalizeOption(
          optionOverride?.[
            question.options.findIndex(
              (option) => option.id === question.correctOptionId,
            )
          ] ??
            correctAnswer ??
            "",
        ),
      ),
      question.type,
    ),
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
].filter((question) => {
  if (hasAnswerLeak(question)) return false;
  if (question.options.length < 4) return true;
  const correct = question.options.find(
    (option) => option.id === question.correctOptionId,
  );
  if (!correct) return true;
  const longestDistractor = Math.max(
    ...question.options
      .filter((option) => option.id !== question.correctOptionId)
      .map((option) => option.text.length),
  );
  return correct.text.length <= longestDistractor * 1.25;
});
