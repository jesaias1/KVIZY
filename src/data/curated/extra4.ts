import { first, mc, tf, type Spec } from "./build";

// Sjette runde: flere spørgsmål til de tyndeste kategorier. Korte svar.
// prettier-ignore
export const EXTRA4_SPECS: Spec[] = [
  // ── Hvad kom først? ────────────────────────────────────────
  first(45, 2, "Hvilket af disse apparater blev opfundet først?", ["Dampmaskinen", "Cyklen", "Bilen", "Flyet"],
    "Dampmaskinen kom i 1700-tallet, cyklen i 1817, bilen i 1885 og det første motorfly i 1903.", { also: [39, 57] }),
  first(45, 3, "Hvilken af disse danske begivenheder skete først?", ["Slaget på Reden", "Treårskrigen", "Genforeningen", "Besættelsen"],
    "Slaget på Reden var i 1801, Treårskrigen begyndte i 1848, Sønderjylland blev genforenet i 1920, og besættelsen kom i 1940.", { also: [5, 2] }),
  first(45, 2, "Hvilket af disse spil udkom først?", ["Pong", "Tetris", "Super Mario Bros.", "Minecraft"],
    "Pong kom i 1972, Tetris i 1984, Super Mario Bros. i 1985 og Minecraft i 2009.", { also: [24, 49] }),
  first(45, 3, "Hvem af disse modtog først Nobelprisen?", ["Marie Curie", "Ernest Rutherford", "Niels Bohr", "Alexander Fleming"],
    "Curie fik prisen i 1903, Rutherford i 1908, Bohr i 1922 og Fleming i 1945.", { also: [40, 7] }),
  first(45, 3, "Hvem af disse blev født først?", ["Leonardo da Vinci", "Michelangelo", "Galileo Galilei", "William Shakespeare"],
    "Da Vinci blev født i 1452, Michelangelo i 1475, Galilei i februar 1564 og Shakespeare i april samme år.", { also: [5, 40] }),

  // ── Sandt eller falsk ──────────────────────────────────────
  tf(47, 2, "Sne er hvid, fordi iskrystallerne spreder lyset.", true,
    "Hver krystal bryder og spreder lyset i alle farver, og det opfattes som hvidt.", { also: [7, 30] }),
  tf(47, 2, "Danmark har aldrig haft en dronning, der regerede på egen hånd.", false,
    "Både Margrete 1. og Margrethe 2. regerede selv.", { also: [2, 5] }),
  tf(47, 2, "Alle planeter i solsystemet har mindst én måne.", false,
    "Merkur og Venus har ingen måner.", { also: [8] }),
  tf(47, 2, "Det er umuligt at nyse med åbne øjne.", false,
    "Det er en myte. Man blinker bare af refleks, og det kan godt undertrykkes.", { also: [57] }),
  tf(47, 3, "Blæksprutter har blåt blod.", true,
    "Blodet indeholder kobber i stedet for jern, og det farver det blåt.", { also: [28] }),
  tf(47, 2, "Vand koger ved 100 grader overalt på Jorden.", false,
    "Kogepunktet falder med lufttrykket, så det er lavere i bjergene.", { also: [7] }),

  // ── Livets store spørgsmål ─────────────────────────────────
  mc(14, 3, "Hvilken græsk filosof knyttede lykken til et liv i dyd?", ["Aristoteles", "Epikur", "Diogenes", "Heraklit"],
    "Aristoteles mente, at et godt liv består i at udfolde sine dyder.", { also: [11] }),
  mc(14, 3, "Hvad kaldes tanken om, at moral ikke gælder for alle?", ["Relativisme", "Idealisme", "Realisme", "Dualisme"],
    "Relativister mener, at gode og dårlige handlinger afhænger af kultur og sted.", { also: [11] }),
  mc(14, 2, "Hvad hedder læren om det skønne og kunstens væsen?", ["Æstetik", "Etik", "Logik", "Metafysik"],
    "Etik handler om rigtigt og forkert, logik om rigtige slutninger.", { also: [11, 37] }),
  mc(14, 4, "Hvilken østrigsk psykiater overlevede Auschwitz og grundlagde logoterapien?", ["Viktor Frankl", "Sigmund Freud", "Alfred Adler", "Carl Jung"],
    "Frankl mente, at mennesket især drives af søgen efter mening.", { also: [12, 13] }),

  // ── Psykologisk teori ──────────────────────────────────────
  mc(13, 3, "Hvem er kendt for teorien om «multiple intelligenser»?", ["Howard Gardner", "Jean Piaget", "Erik Erikson", "Carl Rogers"],
    "Gardner foreslog flere slags intelligens, blandt andet musikalsk og kropslig.", { also: [12] }),
  mc(13, 3, "Hvilken psykolog skrev «Tænk, hurtigt og langsomt»?", ["Daniel Kahneman", "Martin Seligman", "Jordan Peterson", "Steven Pinker"],
    "Kahneman fik Nobelprisen i økonomi for sit arbejde med menneskers fejlslutninger.", { also: [12, 58] }),
  mc(13, 3, "Hvad kaldes det, når man tilskriver succes sig selv og fiasko uheld?", ["Selvtjenende bias", "Ankereffekten", "Haloeffekten", "Bekræftelsesbias"],
    "Vi forklarer ofte egne resultater mere pænt, end de fortjener.", { also: [12] }),
  mc(13, 3, "Hvem regnes for grundlægger af den positive psykologi?", ["Martin Seligman", "Sigmund Freud", "B.F. Skinner", "Ivan Pavlov"],
    "Seligman flyttede fokus fra sygdom til styrker og trivsel.", { also: [12] }),

  // ── Filosofi ───────────────────────────────────────────────
  mc(11, 3, "Hvem skrev «Etikken» og levede af at slibe linser?", ["Baruch Spinoza", "Immanuel Kant", "Blaise Pascal", "John Locke"],
    "Spinoza opfattede Gud og naturen som ét og det samme.", { also: [14] }),
  mc(11, 4, "Hvem skrev «Væren og tid» i 1927?", ["Martin Heidegger", "Edmund Husserl", "Karl Marx", "Georg Hegel"],
    "Bogen undersøger, hvad det vil sige at være til.", { also: [14] }),
  mc(11, 3, "Hvilken kinesisk tænker samler «Samtaler» sine tanker om moral og samfund?", ["Konfucius", "Laozi", "Sun Tzu", "Mencius"],
    "Bogen er opkaldt efter samtalerne med hans elever.", { also: [14, 5] }),
  mc(11, 3, "Hvad hedder den græske søjlegang, som gav stoicismen sit navn?", ["Stoa", "Agora", "Lykeion", "Akropolis"],
    "Zenon underviste i søjlegangen Stoa Poikile i Athen.", { also: [14, 31] }),

  // ── Kendte brands ──────────────────────────────────────────
  mc(34, 2, "Hvilket firma ejer Instagram?", ["Meta", "Google", "Snap", "Microsoft"],
    "Facebook købte Instagram i 2012, og selskabet hedder i dag Meta.", { also: [9, 35] }),
  mc(34, 3, "Hvilket italiensk firma står bag Nutella?", ["Ferrero", "Barilla", "Lavazza", "Campari"],
    "Ferrero laver også Kinder-æg og Ferrero Rocher.", { also: [42] }),
  mc(34, 2, "Hvilket firma lancerede Barbie-dukken i 1959?", ["Mattel", "Hasbro", "Lego", "Playmobil"],
    "Mattel er også firmaet bag Hot Wheels.", { also: [17] }),
  mc(34, 1, "Hvilken burgerkæde bruger sloganet «I’m lovin’ it»?", ["McDonald’s", "Burger King", "Max", "KFC"],
    "Sloganet blev lanceret i 2003.", { also: [35, 42] }),

  // ── Kultur ─────────────────────────────────────────────────
  mc(36, 1, "Hvilket land er Oktoberfest oprindeligt fra?", ["Tyskland", "Østrig", "Belgien", "Schweiz"],
    "Festen begyndte i München i 1810 som en kongelig bryllupsfest.", { also: [6, 44] }),
  mc(36, 2, "Hvilket land er flamenco-dansen fra?", ["Spanien", "Portugal", "Mexico", "Italien"],
    "Flamenco stammer fra Andalusien i det sydlige Spanien.", { also: [6] }),
  mc(36, 1, "Hvilket instrument forbindes især med Skotland?", ["Sækkepibe", "Harpe", "Harmonika", "Violin"],
    "Sækkepiben spilles ved alt fra bryllupper til militærparader.", { also: [21] }),
  mc(36, 2, "Hvad hedder muslimernes fastemåned?", ["Ramadan", "Eid", "Hajj", "Muharram"],
    "Under Ramadan faster mange fra solopgang til solnedgang.", { also: [5] }),
  mc(36, 2, "Hvad hedder den traditionelle japanske klædedragt?", ["Kimono", "Sari", "Hanbok", "Cheongsam"],
    "Sari er indisk, hanbok koreansk og cheongsam kinesisk.", { also: [6] }),

  // ── Opfindelser ────────────────────────────────────────────
  mc(39, 2, "Hvem fik patent på telefonen i 1876?", ["Alexander Graham Bell", "Thomas Edison", "Nikola Tesla", "Guglielmo Marconi"],
    "Bell var i øvrigt skotsk-født og underviste døve.", { also: [9, 40] }),
  mc(39, 3, "Hvem opfandt det luftfyldte cykeldæk i 1888?", ["John Boyd Dunlop", "Karl Benz", "Henry Ford", "Rudolf Diesel"],
    "Dunlop lavede dækket til sin søns trehjulede cykel.", { also: [57] }),
  mc(39, 3, "Hvilken maskine forbedrede James Watt så meget, at den drev industrialiseringen?", ["Dampmaskinen", "Vævestolen", "Trykpressen", "Dynamoen"],
    "Watts version brugte langt mindre kul end de ældre dampmaskiner.", { also: [5, 40] }),
  mc(39, 3, "Hvem udviklede metoden til at varmebehandle mælk, som bærer hans navn?", ["Louis Pasteur", "Robert Koch", "Joseph Lister", "Edward Jenner"],
    "Pasteuriseringen dræber de fleste bakterier uden at ødelægge smagen.", { also: [40, 42] }),

  // ── Mærkelige fakta ────────────────────────────────────────
  mc(48, 3, "Hvor mange øjne har en bi?", ["5", "2", "3", "7"],
    "To store facetøjne og tre små punktøjne øverst på hovedet.", { also: [28] }),
  mc(48, 2, "Hvor stor en del af en voksen krop er vand?", ["Omkring 60 procent", "Omkring 30 procent", "Omkring 80 procent", "Omkring 45 procent"],
    "Andelen er lidt højere hos børn og lidt lavere hos ældre.", { also: [57] }),
  mc(48, 2, "Hvilket pattedyr er verdens langsomste?", ["Dovendyr", "Panda", "Koala", "Pangolin"],
    "Det kan tage dovendyret uger at fordøje et enkelt måltid.", { also: [28] }),
  mc(48, 3, "Hvilket landdyr er drægtigt længst?", ["Elefanten", "Giraffen", "Næsehornet", "Flodhesten"],
    "Elefantens drægtighed varer omkring 22 måneder.", { also: [28] }),

  // ── 1980’erne ──────────────────────────────────────────────
  mc(49, 1, "Hvilken film fra 1982 handler om en dreng og en udenjordisk ven?", ["E.T.", "Gremlins", "Star Wars", "Poltergeist"],
    "Filmen blev instrueret af Steven Spielberg.", { also: [17] }),
  mc(49, 2, "Hvilket band sang «Livin’ on a Prayer» i 1986?", ["Bon Jovi", "Europe", "Def Leppard", "Journey"],
    "Sangen blev et af 1980’ernes største rockhits.", { also: [24] }),
  mc(49, 3, "Hvem blev Sovjetunionens leder i 1985 og indførte glasnost?", ["Mikhail Gorbatjov", "Leonid Bresjnev", "Boris Jeltsin", "Jurij Andropov"],
    "Glasnost betyder åbenhed. Gorbatjov ledte landet til dets opløsning.", { also: [4, 5] }),

  // ── 1990’erne ──────────────────────────────────────────────
  mc(50, 2, "Hvilket år kom Nintendo 64 til Europa?", ["1997", "1994", "1999", "1996"],
    "Konsollen kom til Japan i 1996 og til Europa i foråret 1997.", { also: [24, 9] }),
  mc(50, 1, "Hvilken film fra 1993 handler om genskabte dinosaurer?", ["Jurassic Park", "Godzilla", "Indiana Jones", "King Kong"],
    "Filmen er baseret på en roman af Michael Crichton.", { also: [17] }),
  mc(50, 2, "Hvilket band udgav «Wonderwall» i 1995?", ["Oasis", "Blur", "Pulp", "Radiohead"],
    "Oasis og Blur var britpoppens to store rivaler.", { also: [21] }),
  mc(50, 2, "Hvilken sangerinde slog igennem i 1998 med «Baby One More Time»?", ["Britney Spears", "Christina Aguilera", "Mariah Carey", "Shakira"],
    "Sangen gik nummer et i mange lande.", { also: [21] }),

  // ── 2000’erne ──────────────────────────────────────────────
  mc(51, 2, "Hvilket år skete terrorangrebene den 11. september?", ["2001", "1999", "2003", "2005"],
    "Angrebene i New York og Washington ændrede verdenspolitikken.", { also: [4, 5] }),
  mc(51, 1, "Hvilken musikafspiller fra Apple udkom i 2001?", ["iPod", "iPad", "iMac", "AirPods"],
    "Den første iPod kunne rumme 1.000 sange.", { also: [9] }),
  mc(51, 2, "Hvilket land vandt VM i fodbold i 2006?", ["Italien", "Frankrig", "Tyskland", "Brasilien"],
    "Italien slog Frankrig i finalen efter straffesparkskonkurrence.", { also: [27, 26] }),
  mc(51, 2, "Hvem blev valgt til USA’s præsident i 2008?", ["Barack Obama", "John McCain", "Hillary Clinton", "George W. Bush"],
    "Obama blev landets første sorte præsident.", { also: [4] }),

  // ── Biler og transport ─────────────────────────────────────
  mc(57, 2, "Hvad hedder de japanske højhastighedstog?", ["Shinkansen", "TGV", "ICE", "Maglev"],
    "TGV er fransk og ICE tysk. Shinkansen åbnede i 1964.", { also: [6] }),
  mc(57, 1, "Hvad kaldes en bil med både benzinmotor og elmotor?", ["Hybrid", "Diesel", "Turbo", "Cabriolet"],
    "Toyota Prius var den første hybridbil i masseproduktion.", { also: [9, 56] }),
  mc(57, 3, "Hvilken by åbnede verdens første undergrundsbane i 1863?", ["London", "New York", "Paris", "Berlin"],
    "Den første strækning kørte med damplokomotiver.", { also: [5, 6] }),
  mc(57, 2, "Hvilket land kommer bilmærket Volvo oprindeligt fra?", ["Sverige", "Tyskland", "Danmark", "Norge"],
    "Volvo blev grundlagt i Göteborg i 1927.", { also: [34] }),

  // ── Paratviden og Film ─────────────────────────────────────
  mc(1, 1, "Hvor mange ben har en edderkop?", ["8", "6", "10", "4"],
    "Insekter har seks ben, og edderkopper har otte.", { also: [28] }),
  mc(1, 1, "Hvad er verdens største kontinent?", ["Asien", "Afrika", "Nordamerika", "Antarktis"],
    "Asien rummer cirka 60 procent af klodens befolkning.", { also: [6] }),
  mc(1, 1, "Hvilket dyr står sammen med emuen i Australiens våbenskjold?", ["Kænguru", "Koala", "Dingo", "Vombat"],
    "Begge dyr går kun fremad og skulle derfor symbolisere fremskridt.", { also: [28, 6] }),
  mc(17, 2, "Hvem instruerede «Dødens gab» fra 1975?", ["Steven Spielberg", "George Lucas", "Martin Scorsese", "Ridley Scott"],
    "Filmen regnes for den første sommerblockbuster.", { also: [66] }),
  mc(17, 2, "Hvilken film har replikken «I’ll be back»?", ["The Terminator", "Rambo", "Die Hard", "Predator"],
    "Arnold Schwarzenegger spiller den dræbende robot.", { also: [66] }),
  mc(17, 3, "Hvilken skuespiller vandt en Oscar for rollen som Jokeren i filmen fra 2019?", ["Joaquin Phoenix", "Heath Ledger", "Jared Leto", "Jack Nicholson"],
    "Ledger vandt posthumt for «The Dark Knight», men Phoenix vandt for filmen «Joker».", { also: [66] }),
  mc(17, 2, "Hvilken Pixar-film foregår inde i hovedet på en pige?", ["Inside Out", "Soul", "Coco", "Onward"],
    "Følelserne Glæde, Tristhed, Vrede, Frygt og Afsky styrer pigen Riley.", { also: [65, 12] }),
];
