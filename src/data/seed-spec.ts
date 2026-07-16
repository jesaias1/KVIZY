// Seks selvstændige, redaktionelle kernefakta pr. kategori. Byggeren matcher
// distraktorer efter svar- og spørgsmålstype og tilføjer komplet metadata.
export const seedSpecs: { categoryId:string; items:[string,string,string?][] }[] = [
{categoryId:"cat-1",items:[
["Hvilket grundstof har det kemiske symbol Au?","Guld"],["Hvor mange sider har en regulær sekskant?","6"],["Hvad kaldes verdens største ocean?","Stillehavet"],["Hvilket organ pumper blod rundt i kroppen?","Hjertet"],["Hvad er hovedstaden i Canada?","Ottawa"],["Hvilken farve får man ved at blande blå og gul?","Grøn"]]},
{categoryId:"cat-2",items:[
["Hvilken by er Danmarks næststørste målt på indbyggertal?","Aarhus"],["Hvad hedder Danmarks længste å?","Gudenåen"],["Hvilket år trådte Danmarks Riges Grundlov i kraft?","1849"],["Hvilken ø er Danmarks største?","Sjælland"],["Hvad hedder broforbindelsen mellem Fyn og Sjælland?","Storebæltsforbindelsen"],["Hvilken dansk by kaldes ofte Nordens Paris?","Aalborg"]]},
{categoryId:"cat-3",items:[
["Hvor mange medlemmer har Folketinget inklusive de nordatlantiske mandater?","179"],["Hvad kaldes Folketingets formand traditionelt?","Folketingets formand"],["Hvor ofte skal der senest afholdes folketingsvalg?","Hvert fjerde år"],["Hvilken myndighed vedtager love i Danmark?","Folketinget"],["Hvad hedder Danmarks øverste domstol?","Højesteret"],["Hvilken grundlovsparagraf handler om religionsfrihed?","Paragraf 67"]]},
{categoryId:"cat-4",items:[
["Hvor ligger FN's hovedkvarter?","New York"],["Hvor mange permanente medlemmer har FN's Sikkerhedsråd?","5"],["Hvad står NATO for på dansk?","Den Nordatlantiske Traktats Organisation"],["Hvilken institution foreslår normalt ny EU-lovgivning?","Europa-Kommissionen"],["Hvilken by huser Den Internationale Domstol?","Haag"],["Hvilket land er ikke permanent medlem af FN's Sikkerhedsråd?","Tyskland"]]},
{categoryId:"cat-5",items:[
["I hvilket år faldt Berlinmuren?","1989"],["Hvilket rige byggede Colosseum?","Romerriget"],["Hvem var den første romerske kejser?","Augustus"],["Hvilket år begyndte den franske revolution?","1789"],["Hvilken pest ramte Europa hårdt i 1300-tallet?","Den sorte død"],["Hvilken fred afsluttede Trediveårskrigen?","Den Westfalske Fred"]]},
{categoryId:"cat-6",items:[
["Hvilken flod løber gennem Budapest?","Donau"],["Hvad er Afrikas højeste bjerg?","Kilimanjaro"],["Hvilket land har længst kystlinje?","Canada"],["Hvad er Europas største sø målt på areal?","Ladoga"],["Hvilken ørken dækker meget af Botswana?","Kalahari"],["Hvilket stræde skiller Spanien fra Marokko?","Gibraltarstrædet"]]},
{categoryId:"cat-7",items:[
["Hvilken partikel har negativ elektrisk ladning?","Elektronen"],["Hvad er vands kemiske formel?","H₂O"],["Hvilken kraft holder planeter i bane?","Tyngdekraften"],["Hvad måles i enheden pascal?","Tryk"],["Hvilket vitamin danner huden ved sollys?","D-vitamin"],["Hvad kaldes celledeling til to genetisk ens celler?","Mitose"]]},
{categoryId:"cat-8",items:[
["Hvilken planet er nærmest Solen?","Merkur"],["Hvad hedder vores galakse?","Mælkevejen"],["Hvilken planet har den store røde plet?","Jupiter"],["Hvad kaldes en eksploderende stjerne?","Supernova"],["Hvem var første menneske på Månen?","Neil Armstrong"],["Hvilken måne kredser om Saturn og har tæt atmosfære?","Titan"]]},
{categoryId:"cat-9",items:[
["Hvem forbindes med opfindelsen af World Wide Web?","Tim Berners-Lee"],["Hvad betyder CPU?","Central Processing Unit"],["Hvilken teknologi lagrer data i blokke kædet sammen?","Blockchain"],["Hvad gør en kompilator?","Oversætter kildekode til maskinkode"],["Hvilken enhed måles processorfrekvens i?","Hertz"],["Hvad er formålet med tofaktorgodkendelse?","Et ekstra sikkerhedslag"]]},
{categoryId:"cat-10",items:[
["Hvad står URL for?","Uniform Resource Locator"],["Hvilken protokol bruges normalt til sikre websider?","HTTPS"],["Hvad gør DNS?","Oversætter domænenavne til IP-adresser"],["Hvad er phishing?","Forsøg på at stjæle oplysninger via bedrag"],["Hvilket årti blev den første webside offentliggjort?","1990'erne"],["Hvad gemmer en browsercookie typisk?","Små oplysninger om en session"]]},
{categoryId:"cat-11",items:[
["Hvem skrev Staten?","Platon"],["Hvilken filosof formulerede 'Jeg tænker, altså er jeg'?","René Descartes"],["Hvad kaldes læren om viden?","Erkendelsesteori"],["Hvem forbindes med det kategoriske imperativ?","Immanuel Kant"],["Hvilken retning forbindes med Jean-Paul Sartre?","Eksistentialisme"],["Hvad undersøger etik?","Hvad der er rigtigt og forkert"]]},
{categoryId:"cat-12",items:[
["Hvad beskriver kognitiv dissonans?","Ubehag ved modstridende tanker"],["Hvad er placeboeffekten?","Bedring skabt af forventning"],["Hvilken hukommelse holder kortvarigt information aktiv?","Arbejdshukommelsen"],["Hvad er empati?","Evnen til at forstå andres følelser"],["Hvad betyder introversion typisk?","Energi orienteret mod indre refleksion"],["Hvad er en fobi?","En vedvarende og stærk frygt"]]},
{categoryId:"cat-13",items:[
["Hvem udviklede teorien om klassisk betingning?","Ivan Pavlov"],["Hvem forbindes med operant betingning?","B.F. Skinner"],["Hvilken teori handler om tilknytning mellem barn og omsorgsperson?","Tilknytningsteori"],["Hvem udviklede den sociokulturelle læringsteori?","Lev Vygotskij"],["Hvad måler Big Five-modellen?","Fem brede personlighedstræk"],["Hvilken psykolog beskrev flow?","Mihaly Csikszentmihalyi"]]},
{categoryId:"cat-14",items:[
["Hvad kaldes spørgsmålet om fri vilje over for årsagsbestemthed?","Determinismeproblemet"],["Hvilken disciplin undersøger livets mening filosofisk?","Eksistensfilosofi"],["Hvad er et tankeeksperiment?","En forestillet situation til at teste en idé"],["Hvad spørger identitetsproblemet især til?","Hvad der gør en person til den samme over tid"],["Hvad er altruïsme?","At handle for andres skyld"],["Hvad undersøger bevidsthedsfilosofi?","Forholdet mellem sind og krop"]]},
{categoryId:"cat-15",items:[
["Hvem skrev romanen 1984?","George Orwell"],["Hvem skabte Sherlock Holmes?","Arthur Conan Doyle"],["I hvilken roman optræder Atticus Finch?","Dræb ikke en sangfugl"],["Hvem skrev Hundrede års ensomhed?","Gabriel García Márquez"],["Hvad hedder kaptajnen i Moby-Dick?","Ahab"],["Hvem skrev Frankenstein?","Mary Shelley"]]},
{categoryId:"cat-16",items:[
["Hvem skrev Lykke-Per?","Henrik Pontoppidan"],["Hvem er forfatter til Barndommens gade?","Tove Ditlevsen"],["Hvilken digter skrev I Danmark er jeg født?","H.C. Andersen"],["Hvem skrev Kongens fald?","Johannes V. Jensen"],["Hvem skabte Pelle Erobreren?","Martin Andersen Nexø"],["Hvem skrev Den kroniske uskyld?","Klaus Rifbjerg"]]},
{categoryId:"cat-17",items:[
["Hvem instruerede Jurassic Park?","Steven Spielberg"],["Hvilken film foregår på rumskibet Nostromo?","Alien"],["Hvem spiller hovedrollen i Forrest Gump?","Tom Hanks"],["Hvilken filmserie har figuren Ethan Hunt?","Mission: Impossible"],["Hvem instruerede Parasite?","Bong Joon-ho"],["Hvilken film handler om bokseren Rocky Balboa?","Rocky"]]},
{categoryId:"cat-18",items:[
["Hvem instruerede Jagten fra 2012?","Thomas Vinterberg"],["Hvilken dansk filmserie har Egon, Benny og Kjeld?","Olsen-banden"],["Hvem spiller Tonny i Pusher-filmene?","Mads Mikkelsen"],["Hvilken film vandt Danmarks første Oscar for bedste internationale film?","Babettes gæstebud"],["Hvem instruerede Blinkende lygter?","Anders Thomas Jensen"],["Hvilken skuespiller spiller præsten Ivan i Adams æbler?","Mads Mikkelsen"]]},
{categoryId:"cat-19",items:[
["I hvilken serie findes byen Hawkins?","Stranger Things"],["Hvad hedder familien i Succession?","Roy-familien"],["Hvilken serie følger kemilæreren Walter White?","Breaking Bad"],["Hvad er navnet på kaffebaren i Friends?","Central Perk"],["Hvilken fantasyserie foregår blandt andet i Westeros?","Game of Thrones"],["Hvem er hovedfigur i The Queen's Gambit?","Beth Harmon"]]},
{categoryId:"cat-20",items:[
["Hvilken serie følger statsminister Birgitte Nyborg?","Borgen"],["Hvad hedder hotellet i Badehotellet?","Andersens Badehotel"],["Hvilken dansk serie foregår på en politistation i København?","Station 2"],["Hvem skabte Riget?","Lars von Trier"],["Hvilken julekalender introducerede Pyrus?","Alletiders jul"],["Hvilken serie handler om familien Andersen-Skjern?","Matador"]]},
{categoryId:"cat-21",items:[
["Hvilket band udgav Bohemian Rhapsody?","Queen"],["Hvem komponerede Måneskinssonaten?","Ludwig van Beethoven"],["Hvilket instrument har normalt 88 tangenter?","Klaver"],["Hvilken genre forbindes med Miles Davis?","Jazz"],["Hvem sang Purple Rain?","Prince"],["Hvilket band udgav albummet Abbey Road?","The Beatles"]]},
{categoryId:"cat-22",items:[
["Hvem sang Kvinde min?","Gasolin'"],["Hvilken dansk gruppe udgav Barbie Girl?","Aqua"],["Hvem komponerede Tango Jalousie?","Jacob Gade"],["Hvilken sanger står bag Tusind stykker?","Anne Linnet"],["Hvilket band havde Steffen Brandt som frontfigur?","TV-2"],["Hvem udgav albummet No. 1?","Thomas Helmig"]]},
{categoryId:"cat-23",items:[
["Hvad styrer en kompressor i et lydsignal?","Dynamikområdet"],["Hvad betyder BPM?","Beats per minute"],["Hvad gør equalization?","Justerer frekvensområder"],["Hvad er MIDI primært?","Data om musikalske hændelser"],["Hvad skaber rumklangseffekten reverb?","En oplevelse af akustisk rum"],["Hvad gør en limiter?","Begrænser signalets topniveau"]]},
{categoryId:"cat-24",items:[
["Hvilket firma skabte Super Mario?","Nintendo"],["Hvilket spil foregår i landet Hyrule?","The Legend of Zelda"],["Hvad hedder hovedfiguren i Halo?","Master Chief"],["Hvilket studie udviklede Minecraft oprindeligt?","Mojang"],["I hvilket spil kæmper man på Summoner's Rift?","League of Legends"],["Hvad hedder byen i Grand Theft Auto V?","Los Santos"]]},
{categoryId:"cat-25",items:[
["Hvor mange ringe er der i det olympiske symbol?","5"],["I hvilken sport bruges en scrum?","Rugby"],["Hvor lang er en maraton officielt?","42,195 kilometer"],["Hvilket land opfandt judo?","Japan"],["Hvad kaldes nul point i tennis?","Love"],["Hvor mange spillere er der på banen pr. volleyballhold?","6"]]},
{categoryId:"cat-26",items:[
["Hvem er den mest vindende danske Tour de France-vinder pr. 2025?","Jonas Vingegaard"],["Hvilken dansk badmintonspiller vandt OL-guld i 1996?","Poul-Erik Høyer Larsen"],["Hvilken by er hjemsted for håndboldklubben GOG?","Gudme"],["Hvem vandt EM i fodbold med Danmark i 1992?","Herrelandsholdet"],["Hvilken dansk tennisspiller vandt Australian Open 2018?","Caroline Wozniacki"],["Hvad hedder Danmarks nationale cykelarena i Ballerup?","Ballerup Super Arena"]]},
{categoryId:"cat-27",items:[
["Hvor mange spillere starter et fodboldhold med på banen?","11"],["Hvad kaldes tre mål af samme spiller i en kamp?","Hattrick"],["Hvilket land vandt det første VM i 1930?","Uruguay"],["Hvor langt er et straffespark fra mållinjen?","11 meter"],["Hvilken klub spiller hjemmekampe på Anfield?","Liverpool FC"],["Hvad betyder VAR?","Video Assistant Referee"]]},
{categoryId:"cat-28",items:[
["Hvilket landdyr er hurtigst?","Geparden"],["Hvor mange hjerter har en blæksprutte?","3"],["Hvilket pattedyr kan flyve aktivt?","Flagermusen"],["Hvad kaldes en gruppe løver?","En flok"],["Hvilket dyr har sorte og hvide striber?","Zebraen"],["Hvilken fugl er verdens største?","Strudsen"]]},
{categoryId:"cat-29",items:[
["Hvilket hjortedyr er størst i Norden?","Elgen"],["Hvad kaldes fjeldræven også?","Polarræv"],["Hvilken sæl er almindelig i danske farvande?","Spættet sæl"],["Hvilken rovfugl har hvid hale som voksen?","Havørnen"],["Hvilket dyr bygger dæmninger?","Bæveren"],["Hvad er Danmarks største landrovdyr?","Grævlingen"]]},
{categoryId:"cat-30",items:[
["Hvad kaldes det nordiske skovbælte domineret af nåletræer?","Taiga"],["Hvilket træ er Danmarks nationaltræ?","Bøgen"],["Hvad er en fjord?","En smal havarm skabt af is"],["Hvilken naturtype lagrer meget kulstof i tørv?","Højmosen"],["Hvad kaldes nordlys videnskabeligt?","Aurora borealis"],["Hvilken plante forbindes med de svenske skove om sommeren?","Skovstjerne"]]},
{categoryId:"cat-31",items:[
["Hvem er gudernes konge i græsk mytologi?","Zeus"],["Hvem er visdommens gudinde?","Athene"],["Hvilken helt dræbte Minotauros?","Theseus"],["Hvem fløj for tæt på Solen?","Ikaros"],["Hvad vogtede Kerberos?","Indgangen til dødsriget"],["Hvem var havets gud?","Poseidon"]]},
{categoryId:"cat-32",items:[
["Hvem er tordenguden i nordisk mytologi?","Thor"],["Hvad hedder Odins ottebenede hest?","Sleipner"],["Hvilket træ forbinder verdenerne?","Yggdrasil"],["Hvem er Lokes datter og dødsrigets hersker?","Hel"],["Hvad kaldes verdens undergang?","Ragnarok"],["Hvilken gud mistede sin hånd til Fenrisulven?","Tyr"]]},
{categoryId:"cat-33",items:[
["Hvilket kollegium tilhører Harry Potter?","Gryffindor"],["Hvad hedder Harrys ugle?","Hedvig"],["Hvilken sport spilles på koste?","Quidditch"],["Hvem er rektor på Hogwarts i de første bøger?","Albus Dumbledore"],["Hvad er Lord Voldemorts fødenavn?","Tom Riddle"],["Hvilken trylleformular afvæbner en modstander?","Expelliarmus"]]},
{categoryId:"cat-34",items:[
["Hvilket brand forbindes med sloganet Just Do It?","Nike"],["Hvilket bilmærke producerer modellen Golf?","Volkswagen"],["Hvilket mærke har et krokodillelogo?","Lacoste"],["Hvilket firma fremstiller PlayStation?","Sony"],["Hvilket brand sælger møbler i flade pakker?","IKEA"],["Hvilket urmærke har en krone som logo?","Rolex"]]},
{categoryId:"cat-35",items:[
["Hvilken virksomhed har et bidt æble som logo?","Apple"],["Hvilken virksomhed bruger fire sammenkædede ringe?","Audi"],["Hvilket logo forestiller en havfrue med krone?","Starbucks"],["Hvilken streamingtjeneste bruger et rødt N?","Netflix"],["Hvilket fragtfirma skjuler en pil i sit ordmærke?","FedEx"],["Hvilket sportsmærke bruger tre striber?","Adidas"]]},
{categoryId:"cat-36",items:[
["Hvilken japansk kunstform arrangerer blomster?","Ikebana"],["Hvad kaldes den portugisiske musikstil præget af saudade?","Fado"],["Hvilken fest markerer lysets sejr i Indien?","Diwali"],["Hvad er en kimono?","En traditionel japansk dragt"],["Hvilken dans stammer fra Argentina?","Tango"],["Hvad kaldes den koreanske bølge af populærkultur?","Hallyu"]]},
{categoryId:"cat-37",items:[
["Hvem malede Mona Lisa?","Leonardo da Vinci"],["Hvilken kunstner skabte Guernica?","Pablo Picasso"],["Hvilken stil forbindes med Claude Monet?","Impressionisme"],["Hvem skabte skulpturen Tænkeren?","Auguste Rodin"],["Hvilken dansk maler skabte Hip, hip, hurra!?","P.S. Krøyer"],["Hvad kaldes kunst lavet af små farvede stenstykker?","Mosaik"]]},
{categoryId:"cat-38",items:[
["Hvad er et palindrom?","Et ord der læses ens begge veje"],["Hvad er et synonym?","Et ord med samme eller lignende betydning"],["Hvilken ordklasse tilhører 'hurtigt' ofte?","Biord"],["Hvad betyder præfikset bio-?","Liv"],["Hvad kaldes læren om ords oprindelse?","Etymologi"],["Hvilket tegn afslutter normalt et spørgsmål?","Spørgsmålstegn"]]},
{categoryId:"cat-39",items:[
["Hvem forbedrede glødepæren til praktisk massebrug?","Thomas Edison"],["Hvem opfandt dynamitten?","Alfred Nobel"],["Hvilken opfindelse forbindes med Alexander Graham Bell?","Telefonen"],["Hvem udviklede den første effektive koppevaccine?","Edward Jenner"],["Hvilket århundrede blev bogtrykkerkunsten udbredt i Europa?","1400-tallet"],["Hvem patenterede en tidlig moderne lynlås?","Gideon Sundback"]]},
{categoryId:"cat-40",items:[
["Hvem var den første kvinde til at vinde en Nobelpris?","Marie Curie"],["Hvem holdt talen I Have a Dream?","Martin Luther King Jr."],["Hvem skrev dagbog under skjul i Amsterdam?","Anne Frank"],["Hvem var Sydafrikas første sorte præsident?","Nelson Mandela"],["Hvem udviklede relativitetsteorien?","Albert Einstein"],["Hvem var den første kvinde i rummet?","Valentina Teresjkova"]]},
{categoryId:"cat-41",items:[
["Hvad er hovedingrediensen i svensk kroppkakor?","Kartoffel"],["Hvilken norsk ret er tørret torsk behandlet med lud?","Lutefisk"],["Hvad er rugbrød typisk lavet med?","Rugmel"],["Hvilken dansk dessert består af ris, fløde og mandler?","Risalamande"],["Hvad er skyr oprindeligt?","Et islandsk syrnet mælkeprodukt"],["Hvilken fisk bruges traditionelt i gravlaks?","Laks"]]},
{categoryId:"cat-42",items:[
["Hvilket land forbindes med ceviche?","Peru"],["Hvad er hovedingrediensen i hummus?","Kikærter"],["Hvor stammer paella fra?","Spanien"],["Hvad er miso lavet af traditionelt?","Fermenterede sojabønner"],["Hvilken ost bruges klassisk i græsk salat?","Feta"],["Hvad er kimchi?","Fermenterede grøntsager"]]},
{categoryId:"cat-43",items:[
["Hvad får gærdej til at hæve?","Kuldioxid fra gæren"],["Hvad er marengs primært lavet af?","Æggehvider og sukker"],["Hvilket mel bruges traditionelt til rugbrød?","Rugmel"],["Hvad betyder det at temperere chokolade?","At styre krystalliseringen i kakaosmørret"],["Hvad gør bagepulver i en dej?","Frigiver gas og hæver dejen"],["Hvad er en ganache?","En blanding af chokolade og fløde"]]},
{categoryId:"cat-44",items:[
["Hvilken spiritus er basen i en mojito?","Rom"],["Hvad består en klassisk gin og tonic af?","Gin og tonicvand"],["Hvilken bitter aperitif indgår i en negroni?","Campari"],["Hvilken cocktail laves med tequila, lime og appelsinlikør?","Margarita"],["Hvad er sake brygget af?","Ris"],["Hvilken drue giver rødvin farve fra skallerne?","Blå druer"]]},
{categoryId:"cat-45",items:[
["Hvad kom først: trykpressen eller dampmaskinen?","Trykpressen"],["Hvad kom først: radioen eller fjernsynet?","Radioen"],["Hvad kom først: Titanic-forliset eller Første Verdenskrig?","Titanic-forliset"],["Hvad kom først: e-mail eller World Wide Web?","E-mail"],["Hvad kom først: LEGO-klodsen eller Barbie-dukken?","LEGO-klodsen"],["Hvad kom først: penicillin eller DNA's dobbeltspiral?","Penicillin"]]},
{categoryId:"cat-46",items:[
["Hvilken passer ikke ind: violin, cello, bratsch eller trompet?","Trompet"],["Hvilken passer ikke ind: Mars, Venus, Månen eller Jupiter?","Månen"],["Hvilken passer ikke ind: eg, bøg, gran eller løve?","Løve"],["Hvilken passer ikke ind: København, Oslo, Stockholm eller Berlin?","Berlin"],["Hvilken passer ikke ind: kobber, jern, guld eller glas?","Glas"],["Hvilken passer ikke ind: sonet, roman, novelle eller symfoni?","Symfoni"]]},
{categoryId:"cat-47",items:[
["Sandt eller falsk: Venus er varmere end Merkur.","Sandt"],["Sandt eller falsk: Flagermus er blinde.","Falsk"],["Sandt eller falsk: Et døgn på Jorden er præcis 24 timer astronomisk.","Falsk"],["Sandt eller falsk: Vand udvider sig, når det fryser.","Sandt"],["Sandt eller falsk: Australien er bredere end Månen.","Sandt"],["Sandt eller falsk: Mennesker har flere end 200 knogler som voksne.","Sandt"]]},
{categoryId:"cat-48",items:[
["Hvilket dyr har fingeraftryk, der kan ligne menneskers?","Koalaen"],["Hvilken frugt er botanisk et bær?","Bananen"],["Hvilket metal kan smelte i hånden?","Gallium"],["Hvilket land har et nationalflag, der ikke er firkantet?","Nepal"],["Hvilket dyr laver terningformet afføring?","Vombatten"],["Hvad kan en gruppe flamingoer kaldes på engelsk?","A flamboyance"]]},
{categoryId:"cat-49",items:[
["Hvilken spillekonsol udgav Nintendo i Japan i 1983?","Famicom"],["Hvilken mur faldt i 1989?","Berlinmuren"],["Hvem sang Like a Prayer?","Madonna"],["Hvilken film introducerede figuren E.T.?","E.T. the Extra-Terrestrial"],["Hvilken rumfærge eksploderede i 1986?","Challenger"],["Hvilket arkadespil har en gul figur, der spiser prikker?","Pac-Man"]]},
{categoryId:"cat-50",items:[
["Hvilket band udgav Smells Like Teen Spirit?","Nirvana"],["Hvilken søgemaskine blev grundlagt i 1998?","Google"],["Hvilken film fra 1997 foregår på et berømt skib?","Titanic"],["Hvad er en Tamagotchi?","Et digitalt kæledyr"],["Hvilken europæisk valuta blev indført elektronisk i 1999?","Euroen"],["Hvilken tv-serie havde premiere med Ross og Rachel i 1994?","Friends"]]},
{categoryId:"cat-51",items:[
["Hvilken onlineencyklopædi blev lanceret i 2001?","Wikipedia"],["Hvilken smartphone blev lanceret af Apple i 2007?","iPhone"],["Hvilken filmtrilogi begyndte med Eventyret om Ringen i 2001?","Ringenes Herre"],["Hvilken social platform blev grundlagt i 2004?","Facebook"],["Hvilket dansk band vandt Eurovision i 2000?","Olsen Brothers"],["Hvilken dværgplanet mistede planetstatus i 2006?","Pluto"]]},
{categoryId:"cat-52",items:[
["Hvilken streamingtjeneste lancerede House of Cards i 2013?","Netflix"],["Hvilket spil blev et globalt fænomen med Battle Royale i 2017?","Fortnite"],["Hvilken rumsonde passerede Pluto i 2015?","New Horizons"],["Hvilket land vandt VM i fodbold i 2018?","Frankrig"],["Hvilken dansk serie havde international premiere som The Rain?","The Rain"],["Hvilken platform blev kendt for korte dansevideoer?","TikTok"]]},
{categoryId:"cat-53",items:[
["Hvad kaldes kunstig intelligens, der kan skabe nyt indhold?","Generativ AI"],["Hvilken energikilde udnytter bevægelse i luft?","Vindenergi"],["Hvad er et deepfake?","Syntetisk manipuleret lyd eller video"],["Hvad betyder cirkulær økonomi?","At holde materialer i kredsløb"],["Hvilken type bil drives kun af batteri og elmotor?","Elbil"],["Hvad er en podcast?","Et digitalt lydprogram i episoder"]]},
];
