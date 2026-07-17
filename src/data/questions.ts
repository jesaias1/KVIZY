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

const rawBaseQuestions: Question[] = [
  ...CURATED_QUESTIONS,
  ...COUNTRY_QUESTIONS,
  ...MUSIC_PRODUCTION_QUESTIONS,
  ...WIKIDATA_CULTURE_QUESTIONS,
  ...EXPANSION_QUESTIONS,
  ...EVERYDAY_CURIOSITY_QUESTIONS,
  ...CURIOSITY_EXPANSION_QUESTIONS,
  ...CURIOSITY_ROUND_THREE_QUESTIONS,
  ...WIKIDATA_THIN_QUESTIONS,
  ...VARIETY_QUESTIONS,
].filter(
  (question) =>
    !redundantQuestionIds.has(question.id) &&
    !question.tags.some((tag) => retiredLowValueTags.has(tag)),
);

const countryRelationLimits = new Map([
  ["capital", 36],
  ["currency", 24],
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
const BASE_QUESTIONS = rawBaseQuestions.filter((question) => {
  const countryRelation = [
    "capital",
    "currency",
    "continent",
    "language",
  ].find((relation) => question.tags.includes(relation));
  return !countryRelation || retainedCountryLookupIds.has(question.id);
});

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
const legacyOptionOverrides: Record<string, [string, string, string, string]> = {
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
  "q-cat-34-2": [
    "Volkswagen",
    "Chevrolet",
    "Mitsubishi",
    "Alfa Romeo",
  ],
  "q-cat-48-5": ["Vombatten", "Næsebjørnen", "Bæltedyret", "Jærven"],
  "expansion-156": [
    "Blæksprutten",
    "Kæmpekrabben",
    "Pighajen",
    "Søkoen",
  ],
  "q-cat-51-5": [
    "Olsen Brothers",
    "A Friend in London",
    "Rollo & King",
    "Lighthouse X",
  ],
  "q-cat-52-3": [
    "New Horizons",
    "Cassini-Huygens",
    "Voyager 2",
    "Dawn",
  ],
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
