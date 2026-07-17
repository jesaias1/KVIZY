import { fingerprint, stableHash } from "@/lib/engine";
import type { Question } from "@/lib/types";

type Row = Record<string, string> & { detail: string };
type Relation = {
  key: string;
  prompt: (row: Row) => string;
  answer: (row: Row) => string;
  difficulty: number;
  secondary?: string[];
};
type Matrix = {
  categoryId: string;
  rows: Row[];
  relations: Relation[];
};

const matrices: Matrix[] = [
  {
    categoryId: "cat-20",
    rows: [
      { title: "Matador", setting: "Korsbæk", genre: "Historisk familiedrama", debut: "1978", channel: "DR", detail: "Serien følger livet i en dansk provinsby fra 1929 til 1947." },
      { title: "Borgen", setting: "Christiansborg", genre: "Politisk drama", debut: "2010", channel: "DR1", detail: "Birgitte Nyborgs politiske karriere er seriens omdrejningspunkt." },
      { title: "Taxa", setting: "København", genre: "Hverdagsdrama", debut: "1997", channel: "DR1", detail: "Serien følger chaufførerne omkring den fiktive central Krone-Taxa." },
      { title: "Forbrydelsen", setting: "København", genre: "Krimidrama", debut: "2007", channel: "DR1", detail: "Efterforskeren Sarah Lund blev kendt langt uden for Danmark." },
      { title: "Badehotellet", setting: "Nordjylland", genre: "Historisk komediedrama", debut: "2013", channel: "TV 2", detail: "Handlingen begynder i 1928 på et sommerhotel ved Vesterhavet." },
      { title: "Klovn", setting: "Hovedstadsområdet", genre: "Situationskomedie", debut: "2005", channel: "TV 2 Zulu", detail: "Frank Hvam og Casper Christensen spiller overdrevne udgaver af sig selv." },
    ],
    relations: [
      { key: "tv-setting", prompt: (r) => `Hvor foregår en stor del af tv-serien ${r.title}?`, answer: (r) => r.setting, difficulty: 2 },
      { key: "tv-genre", prompt: (r) => `Hvilken genre passer bedst på ${r.title}?`, answer: (r) => r.genre, difficulty: 2 },
      { key: "tv-debut", prompt: (r) => `I hvilket år havde ${r.title} dansk premiere?`, answer: (r) => r.debut, difficulty: 3 },
      { key: "tv-channel", prompt: (r) => `Hvilken kanal viste oprindeligt ${r.title}?`, answer: (r) => r.channel, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-22",
    rows: [
      { act: "Gasolin'", origin: "København", genre: "Rock", lead: "Kim Larsen", founded: "1969", detail: "Gruppen blev et af de mest indflydelsesrige danske rockbands." },
      { act: "Aqua", origin: "København", genre: "Dance-pop", lead: "Lene Nystrøm", founded: "1994", detail: "Gruppen fik et internationalt gennembrud i 1990'erne." },
      { act: "Volbeat", origin: "Ringsted", genre: "Metal og rockabilly", lead: "Michael Poulsen", founded: "2001", detail: "Bandet blander tung rock med inspiration fra 1950'ernes rockabilly." },
      { act: "The Minds of 99", origin: "Frederiksberg", genre: "Alternativ rock", lead: "Niels Brandt", founded: "2012", detail: "Bandet er kendt for dansksprogede sange og store koncertproduktioner." },
      { act: "TV-2", origin: "Aarhus", genre: "Poprock", lead: "Steffen Brandt", founded: "1980", detail: "Bandet kalder sig med et glimt i øjet Danmarks kedeligste orkester." },
      { act: "D-A-D", origin: "København", genre: "Hard rock", lead: "Jesper Binzer", founded: "1982", detail: "Navnet blev forkortet fra Disneyland After Dark efter en juridisk indsigelse." },
    ],
    relations: [
      { key: "music-origin", prompt: (r) => `Hvilken dansk by forbindes med dannelsen af ${r.act}?`, answer: (r) => r.origin, difficulty: 3 },
      { key: "music-genre", prompt: (r) => `Hvilken musikalsk retning passer bedst på ${r.act}?`, answer: (r) => r.genre, difficulty: 2 },
      { key: "music-front", prompt: (r) => `Hvem er forsanger i ${r.act}?`, answer: (r) => r.lead, difficulty: 2 },
      { key: "music-founded", prompt: (r) => `I hvilket årti blev ${r.act} dannet?`, answer: (r) => `${r.founded.slice(0, 3)}0'erne`, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-26",
    rows: [
      { person: "Caroline Wozniacki", sport: "Tennis", achievement: "Australian Open", year: "2018", discipline: "Single", detail: "Sejren gav hende Danmarks første grand slam-titel i single." },
      { person: "Viktor Axelsen", sport: "Badminton", achievement: "OL-guld", year: "2021", discipline: "Herresingle", detail: "Han vandt finalen ved de udskudte olympiske lege i Tokyo." },
      { person: "Jonas Vingegaard", sport: "Landevejscykling", achievement: "Tour de France", year: "2022", discipline: "Etapeløb", detail: "Han gentog den samlede sejr året efter." },
      { person: "Pernille Blume", sport: "Svømning", achievement: "OL-guld", year: "2016", discipline: "50 meter fri", detail: "Hun vandt Danmarks første olympiske svømmeguld siden 1948." },
      { person: "Eskild Ebbesen", sport: "Roning", achievement: "OL-guld", year: "1996", discipline: "Letvægtsfirer", detail: "Han vandt tre olympiske guldmedaljer med Guldfireren." },
      { person: "Tom Kristensen", sport: "Motorsport", achievement: "Le Mans", year: "1997", discipline: "24-timersløb", detail: "Han har rekorden med ni samlede sejre i Le Mans." },
    ],
    relations: [
      { key: "sport-discipline", prompt: (r) => `Hvilken sportsgren dyrkede ${r.person} på topniveau?`, answer: (r) => r.sport, difficulty: 1 },
      { key: "sport-achievement", prompt: (r) => `Hvilken stor titel eller konkurrence vandt ${r.person}?`, answer: (r) => r.achievement, difficulty: 2 },
      { key: "sport-year", prompt: (r) => `I hvilket år kom en af ${r.person}s mest kendte sejre?`, answer: (r) => r.year, difficulty: 3 },
      { key: "sport-event", prompt: (r) => `Hvilken disciplin forbindes især med ${r.person}?`, answer: (r) => r.discipline, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-24",
    rows: [
      { title: "Portal", mechanic: "Portaler mellem flader", setting: "Et testlaboratorium", studio: "Valve", debut: "2007", detail: "Spillet kombinerer fysikgåder med en upålidelig kunstig intelligens." },
      { title: "Minecraft", mechanic: "Bygning med blokke", setting: "En genereret åben verden", studio: "Mojang", debut: "2011", detail: "Verdenerne skabes procedurelt og kan ændres blok for blok." },
      { title: "The Sims", mechanic: "Styring af hverdagsliv", setting: "Et boligkvarter", studio: "Maxis", debut: "2000", detail: "Spilleren styrer figurers hjem, behov og relationer." },
      { title: "Rocket League", mechanic: "Fodbold med biler", setting: "En lukket arena", studio: "Psyonix", debut: "2015", detail: "Køretøjernes fart og spring bruges til at ramme en stor bold." },
      { title: "Civilization VI", mechanic: "Turbaseret strategi", setting: "En historisk verdenskortmodel", studio: "Firaxis Games", debut: "2016", detail: "En civilisation udvikles fra oldtid til moderne tid." },
      { title: "Stardew Valley", mechanic: "Drift af en gård", setting: "Pelican Town", studio: "ConcernedApe", debut: "2016", detail: "Én udvikler stod oprindeligt for næsten hele spillet." },
    ],
    relations: [
      { key: "game-mechanic", prompt: (r) => `Hvad er en central spilmekanik i ${r.title}?`, answer: (r) => r.mechanic, difficulty: 1 },
      { key: "game-setting", prompt: (r) => `Hvilket miljø passer bedst til ${r.title}?`, answer: (r) => r.setting, difficulty: 2 },
      { key: "game-studio", prompt: (r) => `Hvilket studie udviklede ${r.title}?`, answer: (r) => r.studio, difficulty: 3 },
      { key: "game-debut", prompt: (r) => `I hvilket årti udkom det første ${r.title}?`, answer: (r) => `${r.debut.slice(0, 3)}0'erne`, difficulty: 2 },
    ],
  },
  {
    categoryId: "cat-27",
    rows: [
      { concept: "Offside", purpose: "At modvirke målhængeri", signal: "Et løftet flag", restart: "Indirekte frispark", applies: "Ved en aflevering fra en medspiller", detail: "En spiller straffes kun, hvis positionen også påvirker spillet." },
      { concept: "Fordelsreglen", purpose: "At undgå at stoppe en lovende situation", signal: "Begge arme frem", restart: "Spillet fortsætter", applies: "Efter en forseelse", detail: "Dommeren kan vende tilbage med en advarsel ved næste stop." },
      { concept: "Målspark", purpose: "At genstarte efter bolden passerer baglinjen", signal: "Peg mod målfeltet", restart: "Spark fra målfeltet", applies: "Når angriberen rører bolden sidst", detail: "Bolden behøver ikke længere forlade straffesparksfeltet før en medspiller rører den." },
      { concept: "Hjørnespark", purpose: "At genstarte fra banens hjørne", signal: "Peg mod hjørnet", restart: "Spark fra hjørnefeltet", applies: "Når forsvareren rører bolden sidst", detail: "Der kan scores direkte på et hjørnespark." },
      { concept: "Straffespark", purpose: "At straffe en direkte frisparksforseelse i feltet", signal: "Peg på straffesparkspletten", restart: "Spark fra 11 meter", applies: "Ved en forseelse i eget straffesparksfelt", detail: "Målmanden skal have mindst en del af én fod på mållinjen ved sparket." },
      { concept: "Indkast", purpose: "At genstarte efter bolden passerer sidelinjen", signal: "Peg i angrebsretningen", restart: "Kast med begge hænder", applies: "Når modstanderen rørte bolden sidst", detail: "Begge fødder skal berøre jorden på eller uden for sidelinjen." },
    ],
    relations: [
      { key: "football-purpose", prompt: (r) => `Hvad er formålet med ${r.concept.toLowerCase()}?`, answer: (r) => r.purpose, difficulty: 2 },
      { key: "football-signal", prompt: (r) => `Hvordan viser dommeren typisk ${r.concept.toLowerCase()}?`, answer: (r) => r.signal, difficulty: 3 },
      { key: "football-restart", prompt: (r) => `Hvordan sættes spillet i gang ved ${r.concept.toLowerCase()}?`, answer: (r) => r.restart, difficulty: 2 },
      { key: "football-applies", prompt: (r) => `Hvornår bliver ${r.concept.toLowerCase()} aktuelt?`, answer: (r) => r.applies, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-41",
    rows: [
      { dish: "Skyr", base: "Skummetmælk", method: "Syrning og afdrypning", country: "Island", texture: "Tyk og syrlig", detail: "Skyr minder om yoghurt, men klassificeres traditionelt som friskost." },
      { dish: "Brunost", base: "Valle", method: "Lang indkogning", country: "Norge", texture: "Fast og karamelliseret", detail: "Mælkesukkeret karamelliserer under indkogningen." },
      { dish: "Gravlaks", base: "Rå laks", method: "Saltning med sukker og dild", country: "Sverige", texture: "Fast og mør", detail: "Navnet henviser til en ældre metode, hvor fisken blev gravet ned." },
      { dish: "Rugbrød", base: "Rugmel", method: "Lang hævning med surdej", country: "Danmark", texture: "Tæt og saftigt", detail: "Surdej bidrager både med hævning, syre og holdbarhed." },
      { dish: "Kalakukko", base: "Fisk og flæsk i rugdej", method: "Lang bagning", country: "Finland", texture: "Kompakt og saftig", detail: "Retten stammer især fra Savolax-regionen." },
      { dish: "Köttbullar", base: "Hakket kød", method: "Formning og stegning", country: "Sverige", texture: "Små og faste", detail: "De serveres ofte med kartofler, flødesauce og tyttebær." },
    ],
    relations: [
      { key: "food-base", prompt: (r) => `Hvad er hovedråvaren i ${r.dish}?`, answer: (r) => r.base, difficulty: 2 },
      { key: "food-method", prompt: (r) => `Hvilken metode er central, når man laver ${r.dish}?`, answer: (r) => r.method, difficulty: 3 },
      { key: "food-country", prompt: (r) => `Hvilket nordisk land forbindes især med ${r.dish}?`, answer: (r) => r.country, difficulty: 1 },
      { key: "food-texture", prompt: (r) => `Hvordan beskrives konsistensen af ${r.dish} bedst?`, answer: (r) => r.texture, difficulty: 2 },
    ],
  },
  {
    categoryId: "cat-3",
    rows: [
      { body: "Folketinget", task: "At vedtage landets love", selected: "Ved almindelige valg", oversight: "Regeringens arbejde", basis: "Grundloven", detail: "Folketinget har 179 medlemmer, heraf fire fra Færøerne og Grønland." },
      { body: "Regeringen", task: "At lede statens daglige politik", selected: "Udnævnes formelt af monarken", oversight: "Ministerierne", basis: "Parlamentarismen", detail: "En regering må ikke have et flertal i Folketinget imod sig." },
      { body: "Højesteret", task: "At afgøre principielle retssager", selected: "Dommerne udnævnes formelt af monarken", oversight: "Lavere retsinstansers afgørelser", basis: "Retsplejeloven", detail: "Højesteret er den øverste domstol i det danske retssystem." },
      { body: "Folketingets Ombudsmand", task: "At undersøge offentlig forvaltning", selected: "Vælges af Folketinget", oversight: "Myndigheders sagsbehandling", basis: "Ombudsmandsloven", detail: "Borgere kan klage over myndigheders afgørelser og behandling." },
      { body: "Rigsrevisionen", task: "At kontrollere statens regnskaber", selected: "Ledes af en rigsrevisor", oversight: "Brugen af statslige midler", basis: "Rigsrevisorloven", detail: "Institutionen arbejder uafhængigt under Folketinget." },
      { body: "Et stående udvalg", task: "At behandle lovforslag i detaljer", selected: "Medlemmer udpeges af folketingsgrupperne", oversight: "Et bestemt politisk fagområde", basis: "Folketingets forretningsorden", detail: "Udvalgene kan stille spørgsmål til ministre og afgive betænkninger." },
    ],
    relations: [
      { key: "dkpol-task", prompt: (r) => `Hvad er en hovedopgave for ${r.body}?`, answer: (r) => r.task, difficulty: 2 },
      { key: "dkpol-selected", prompt: (r) => `Hvordan vælges eller udpeges ${r.body}?`, answer: (r) => r.selected, difficulty: 3 },
      { key: "dkpol-oversight", prompt: (r) => `Hvad fører ${r.body} især kontrol med?`, answer: (r) => r.oversight, difficulty: 3 },
      { key: "dkpol-basis", prompt: (r) => `Hvilket regelsæt eller princip er centralt for ${r.body}?`, answer: (r) => r.basis, difficulty: 4 },
    ],
  },
  {
    categoryId: "cat-4",
    rows: [
      { body: "FN", purpose: "International fred og samarbejde", seat: "New York", decision: "Generalforsamlingsresolutioner", members: "Næsten alle verdens stater", detail: "Organisationen blev oprettet i 1945 efter Anden Verdenskrig." },
      { body: "NATO", purpose: "Kollektivt forsvar", seat: "Bruxelles", decision: "Beslutninger ved konsensus", members: "Lande i Europa og Nordamerika", detail: "Artikel 5 handler om et angreb på én allieret som et angreb på alle." },
      { body: "Europa-Kommissionen", purpose: "At foreslå og håndhæve EU-regler", seat: "Bruxelles", decision: "Lovforslag til EU's lovgivere", members: "Én kommissær fra hvert EU-land", detail: "Kommissionen skal varetage hele EU's interesser frem for nationale interesser." },
      { body: "Europa-Parlamentet", purpose: "At repræsentere EU's borgere", seat: "Strasbourg", decision: "Lovgivning sammen med Ministerrådet", members: "Direkte valgte medlemmer", detail: "Borgerne vælger parlamentet ved valg hvert femte år." },
      { body: "Den Internationale Domstol", purpose: "At afgøre tvister mellem stater", seat: "Haag", decision: "Bindende domme i konkrete sager", members: "15 uafhængige dommere", detail: "Domstolen er FN's vigtigste juridiske organ." },
      { body: "Verdenshandelsorganisationen", purpose: "At fastlægge regler for verdenshandel", seat: "Genève", decision: "Handelsaftaler og tvistafgørelser", members: "Stater og toldområder", detail: "Organisationen forkortes WTO og begyndte sit arbejde i 1995." },
    ],
    relations: [
      { key: "intpol-purpose", prompt: (r) => `Hvad er hovedformålet med ${r.body}?`, answer: (r) => r.purpose, difficulty: 2 },
      { key: "intpol-seat", prompt: (r) => `Hvor har ${r.body} sit vigtigste hovedsæde?`, answer: (r) => r.seat, difficulty: 2 },
      { key: "intpol-decision", prompt: (r) => `Hvilken type beslutning forbindes med ${r.body}?`, answer: (r) => r.decision, difficulty: 4 },
      { key: "intpol-members", prompt: (r) => `Hvem består ${r.body} af?`, answer: (r) => r.members, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-16",
    rows: [
      { work: "Lykke-Per", author: "Henrik Pontoppidan", form: "Udviklingsroman", period: "Det moderne gennembrud", focus: "Ambition og identitet", detail: "Romanen følger Per Sidenius' forsøg på at frigøre sig fra sin religiøse baggrund." },
      { work: "Kongens Fald", author: "Johannes V. Jensen", form: "Historisk roman", period: "Århundredskiftets litteratur", focus: "Forfald og ubeslutsomhed", detail: "Handlingen udspiller sig omkring Christian 2.s tid." },
      { work: "Barndommens gade", author: "Tove Ditlevsen", form: "Social roman", period: "Mellemkrigstiden", focus: "Opvækst og social arv", detail: "Romanens miljø er inspireret af forfatterens barndom på Vesterbro." },
      { work: "Den kroniske uskyld", author: "Klaus Rifbjerg", form: "Ungdomsroman", period: "Efterkrigstiden", focus: "Venskab og voksenliv", detail: "Janus fortæller historien om sit tætte forhold til Tore." },
      { work: "Frøken Smillas fornemmelse for sne", author: "Peter Høeg", form: "Spændingsroman", period: "1990'erne", focus: "Magt og sandhed", detail: "Smilla undersøger et grønlandsk barns dødsfald i København." },
      { work: "Intet", author: "Janne Teller", form: "Filosofisk ungdomsroman", period: "2000'erne", focus: "Mening og gruppepres", detail: "En skoleklasse forsøger at bevise, at noget har betydning." },
    ],
    relations: [
      { key: "dklit-author", prompt: (r) => `Hvem skrev ${r.work}?`, answer: (r) => r.author, difficulty: 2 },
      { key: "dklit-form", prompt: (r) => `Hvilken litterær form passer bedst på ${r.work}?`, answer: (r) => r.form, difficulty: 3 },
      { key: "dklit-period", prompt: (r) => `Hvilken periode forbindes ${r.work} bedst med?`, answer: (r) => r.period, difficulty: 3 },
      { key: "dklit-focus", prompt: (r) => `Hvilket tema er centralt i ${r.work}?`, answer: (r) => r.focus, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-18",
    rows: [
      { title: "Olsen-banden ser rødt", setting: "Det Kongelige Teater", object: "En ouverture af Friedrich Kuhlau", genre: "Kupkomedie", debut: "1976", detail: "Kupscenen er klippet præcist til musikken fra Elverhøj." },
      { title: "Festen", setting: "Et familiehotel", object: "En fødselsdagstale", genre: "Dogme-drama", debut: "1998", detail: "Filmen var den første udgivelse under Dogme 95-reglerne." },
      { title: "Blinkende lygter", setting: "En forladt landevejskro", object: "En kuffert med penge", genre: "Sort komedie", debut: "2000", detail: "Fire småkriminelle forsøger at skabe et nyt liv sammen." },
      { title: "Jagten", setting: "Et lille lokalsamfund", object: "En falsk anklage", genre: "Psykologisk drama", debut: "2012", detail: "Mads Mikkelsen spiller pædagogen Lucas." },
      { title: "Druk", setting: "Et gymnasium", object: "Et alkoholeksperiment", genre: "Tragikomedie", debut: "2020", detail: "Filmen vandt en Oscar for bedste internationale film." },
      { title: "Bænken", setting: "Et boligkvarter", object: "En offentlig bænk", genre: "Socialrealistisk drama", debut: "2000", detail: "Jesper Christensen spiller den alkoholiserede Kaj." },
    ],
    relations: [
      { key: "dkfilm-setting", prompt: (r) => `Hvilket miljø er centralt i ${r.title}?`, answer: (r) => r.setting, difficulty: 2 },
      { key: "dkfilm-object", prompt: (r) => `Hvad sætter især handlingen i ${r.title} i gang?`, answer: (r) => r.object, difficulty: 3 },
      { key: "dkfilm-genre", prompt: (r) => `Hvilken genre beskriver ${r.title} bedst?`, answer: (r) => r.genre, difficulty: 2 },
      { key: "dkfilm-debut", prompt: (r) => `I hvilket årti havde ${r.title} premiere?`, answer: (r) => `${r.debut.slice(0, 3)}0'erne`, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-43",
    rows: [
      { bake: "Surdejsbrød", base: "Mel, vand og surdej", technique: "Stræk og fold dejen", sign: "En elastisk og luftig dej", problem: "For kort fermentering", detail: "Lang fermentering udvikler både smag og dejens struktur." },
      { bake: "Croissanter", base: "Gærdej og smør", technique: "Laminering i flere lag", sign: "Tydelige sprøde lag", problem: "Smørret smelter under rulning", detail: "Kold dej holder smørlagene adskilt, så damp kan løfte dem." },
      { bake: "Marengs", base: "Æggehvider og sukker", technique: "Piskning til stabilt skum", sign: "Blank masse med faste toppe", problem: "Fedt i skålen", detail: "Selv lidt fedt kan gøre æggehvideskummet svært at stabilisere." },
      { bake: "Vandbakkelser", base: "Vand, smør, mel og æg", technique: "Afbagning af dejen i gryde", sign: "Et stort hult indre", problem: "Ovnen åbnes for tidligt", detail: "Damp puster dejen op, før skorpen bliver fast." },
      { bake: "Sandkage", base: "Smør, sukker, æg og mel", technique: "Piskning af smør og sukker", sign: "Fin og ensartet krumme", problem: "Dejen røres for længe efter melet", detail: "For meget omrøring efter melet kan udvikle gluten og gøre kagen sej." },
      { bake: "Rugbrød", base: "Rugmel og surdej", technique: "Lang, fugtig bagning", sign: "Tæt og saftig krumme", problem: "Brødet skæres, mens det er varmt", detail: "Krummen sætter sig under afkøling og kan blive klæg ved tidlig udskæring." },
    ],
    relations: [
      { key: "bake-base", prompt: (r) => `Hvilke råvarer er mest grundlæggende i ${r.bake}?`, answer: (r) => r.base, difficulty: 2 },
      { key: "bake-technique", prompt: (r) => `Hvilken teknik er særlig vigtig for ${r.bake}?`, answer: (r) => r.technique, difficulty: 3 },
      { key: "bake-sign", prompt: (r) => `Hvilket tegn viser, at ${r.bake} er lykkedes?`, answer: (r) => r.sign, difficulty: 2 },
      { key: "bake-problem", prompt: (r) => `Hvilken fejl kan især skade ${r.bake}?`, answer: (r) => r.problem, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-44",
    rows: [
      { drink: "Negroni", spirit: "Gin", partner: "Sød vermouth og Campari", profile: "Bitter og aromatisk", serve: "Kort glas med is", detail: "De tre hovedingredienser bruges klassisk i omtrent lige dele." },
      { drink: "Mojito", spirit: "Lys rom", partner: "Lime, mynte og sukker", profile: "Frisk og urtepræget", serve: "Højt glas med knust is", detail: "Mynten presses forsigtigt for at frigive aroma uden for megen bitterhed." },
      { drink: "Daiquiri", spirit: "Lys rom", partner: "Lime og sukker", profile: "Syrlig og ren", serve: "Afkølet cocktailglas uden is", detail: "Den klassiske udgave er shaken og langt enklere end frosne frugtversioner." },
      { drink: "Margarita", spirit: "Tequila", partner: "Lime og appelsinlikør", profile: "Syrlig med citrus", serve: "Glas med saltkant", detail: "Saltkanten er traditionel, men kan vælges fra." },
      { drink: "Old Fashioned", spirit: "Whiskey", partner: "Sukker og bitter", profile: "Stærk og let sød", serve: "Kort glas over en stor isterning", detail: "Cocktailen bygges ofte direkte i glasset og fortyndes ved omrøring." },
      { drink: "Dry Martini", spirit: "Gin eller vodka", partner: "Tør vermouth", profile: "Tør og spirituspræget", serve: "Afkølet cocktailglas", detail: "Omrøring giver typisk en klarere tekstur end hård shaking." },
    ],
    relations: [
      { key: "drink-spirit", prompt: (r) => `Hvilken basisspiritus bruges typisk i en ${r.drink}?`, answer: (r) => r.spirit, difficulty: 2 },
      { key: "drink-partner", prompt: (r) => `Hvilke ingredienser kendetegner en ${r.drink}?`, answer: (r) => r.partner, difficulty: 3 },
      { key: "drink-profile", prompt: (r) => `Hvordan smager en klassisk ${r.drink} typisk?`, answer: (r) => r.profile, difficulty: 2 },
      { key: "drink-serve", prompt: (r) => `Hvordan serveres en ${r.drink} traditionelt?`, answer: (r) => r.serve, difficulty: 3 },
    ],
  },
  {
    categoryId: "cat-58",
    rows: [
      { element: "Buen", function: "At spænde over en åbning", force: "Tryk føres ud mod siderne", material: "Sten eller tegl", example: "Romerske akvædukter", detail: "Kileformede sten leder belastningen ned gennem buens sider." },
      { element: "Fagværket", function: "At skabe en let, stiv ramme", force: "Træk og tryk i trekanter", material: "Træ eller stål", example: "Brodragere og tagkonstruktioner", detail: "Trekanter ændrer ikke form uden at længden på en side ændres." },
      { element: "Kuplen", function: "At overdække et stort centralt rum", force: "Tryk fordeles rundt i skallen", material: "Murværk eller beton", example: "Pantheon i Rom", detail: "En kuppel kan ses som en bue, der er drejet omkring sin lodrette akse." },
      { element: "Stræbepillen", function: "At støtte en høj ydermur", force: "Sidepres ledes mod jorden", material: "Tilhugget sten", example: "Gotiske katedraler", detail: "Støtten gjorde det muligt at bygge højere vægge med større vinduer." },
      { element: "Pælefundamentet", function: "At nå ned til et bæredygtigt jordlag", force: "Belastning føres dybt ned", material: "Beton, stål eller træ", example: "Byggeri på blød jord", detail: "Pæle kan bære ved spidsen eller ved friktion langs siderne." },
      { element: "Massedæmperen", function: "At mindske bygningens svingninger", force: "En modvægt bevæger sig modsat", material: "Stål og hydraulik", example: "Høje skyskrabere", detail: "Systemet kan forbedre komforten under vind og mindre jordskælv." },
    ],
    relations: [
      { key: "architecture-function", prompt: (r) => `Hvad er hovedformålet med ${r.element.toLowerCase()}?`, answer: (r) => r.function, difficulty: 2 },
      { key: "architecture-force", prompt: (r) => `Hvordan håndterer ${r.element.toLowerCase()} kræfter?`, answer: (r) => r.force, difficulty: 3 },
      { key: "architecture-material", prompt: (r) => `Hvilket materiale forbindes typisk med ${r.element.toLowerCase()}?`, answer: (r) => r.material, difficulty: 2 },
      { key: "architecture-example", prompt: (r) => `Hvor møder man typisk ${r.element.toLowerCase()}?`, answer: (r) => r.example, difficulty: 3 },
    ],
  },
];

const createdAt = "2026-07-17T00:00:00.000Z";
const allQuestions: Question[] = [];

for (const matrix of matrices) {
  for (const relation of matrix.relations) {
    const answers = [...new Set(matrix.rows.map(relation.answer))];
    if (answers.length < 4) continue;
    const usedAnswers = new Set<string>();
    for (const [rowIndex, row] of matrix.rows.entries()) {
      const answer = relation.answer(row);
      if (usedAnswers.has(answer)) continue;
      usedAnswers.add(answer);
      const id = `matrix-${matrix.categoryId}-${relation.key}-${rowIndex + 1}`;
      const offset = Number.parseInt(stableHash(id).slice(0, 8), 16) || 0;
      const distractors = answers
        .filter((candidate) => candidate !== answer)
        .sort((a, b) => Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length))
        .slice(offset % Math.max(1, answers.length - 2))
        .concat(answers.filter((candidate) => candidate !== answer))
        .filter((candidate, index, all) => all.indexOf(candidate) === index)
        .slice(0, 3);
      const prompt = relation.prompt(row);
      allQuestions.push({
        id,
        prompt,
        type: "multiple_choice",
        categoryId: matrix.categoryId,
        secondaryCategoryIds: relation.secondary ?? [],
        difficulty: relation.difficulty,
        options: [answer, ...distractors].map((text, index) => ({ id: `o${index + 1}`, text })),
        correctOptionId: "o1",
        explanation: `${answer} er korrekt. ${row.detail}`,
        sourceLabel: "KVIZY redaktion",
        tags: ["redaktionel-matrix", relation.key],
        origin: "curated",
        status: "active",
        fingerprint: fingerprint(prompt, answer, "multiple_choice"),
        qualityScore: 94,
        timeSensitive: false,
        createdAt,
        updatedAt: createdAt,
        playCount: 0,
        correctRate: 0,
        reportCount: 0,
      });
    }
  }
}

export const CATEGORY_MATRIX_QUESTIONS = allQuestions;
