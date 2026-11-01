
const lists={abc:[['apple','mela','🍎'],['ball','palla','⚽'],['cat','gatto','🐈'],['dog','cane','🐕'],['elephant','elefante','🐘']],fgh:[['fish','pesce','🐟'],['giraffe','giraffa','🦒'],['house','casa','🏠'],['ice cream','gelato','🍦'],['juice','succo','🧃'],['kite','aquilone','🪁'],['lion','leone','🦁']],mno:[['monkey','scimmia','🐒'],['nose','naso','👃'],['orange','arancia','🍊'],['queen','regina','👑'],['rabbit','coniglio','🐇'],['sun','sole','☀️']]};lists.all=Object.values(lists).flat();
lists.colors=[['red','rosso','🔴'],['blue','blu','🔵'],['yellow','giallo','🟡'],['green','verde','🟢'],['orange','arancione','🟠'],['purple','viola','🟣'],['pink','rosa','🌸'],['brown','marrone','🟤'],['black','nero','⚫'],['white','bianco','⚪']];lists.numbers=['one','two','three','four','five','six','seven','eight'].map((w,i)=>[w,String(i+1),String(i+1)]);lists.teens=[['thirteen','13','13'],['fourteen','14','14'],['fifteen','15','15']];lists.toys=[['action figure','personaggio giocattolo','🦸'],['plane','aeroplano','✈️'],['building set','costruzioni','🧱'],['puzzle','puzzle','🧩'],['car','automobilina','🚗'],['robot','robot','🤖'],['dinosaur','dinosauro','🦕'],['teddy','orsacchiotto','🧸'],['doll','bambola','🪆'],['yo-yo','yo-yo','🪀']];lists.hello=[["hello", "ciao", "👋"], ["hi", "ciao", "👋"], ["how are you?", "come stai?", "💬"], ["I'm fine, thanks!", "sto bene, grazie!", "😊"], ["what is your name?", "come ti chiami?", "💬"], ["my name is Anna", "mi chiamo Anna", "🙋"], ["my name is Peter", "mi chiamo Peter", "🙋"], ["how old are you?", "quanti anni hai?", "🎂"], ["I'm eight years old", "ho otto anni", "8️⃣"], ["I'm nine", "ho nove anni", "9️⃣"], ["nice to meet you!", "piacere di conoscerti!", "🤝"], ["me too!", "anche io!", "😊"], ["goodbye!", "arrivederci!", "👋"]];lists.place=[['on','sopra','📦'],['in','dentro','📦'],['under','sotto','📦'],['by','vicino','📦'],['next to','accanto a','📦']];lists.body=[['head','testa','🧑'],['hair','capelli','💇'],['eye','occhio','👁️'],['eyes','occhi','👀'],['ear','orecchio','👂'],['ears','orecchie','👂👂'],['nose','naso','👃'],['mouth','bocca','👄'],['finger','dito della mano','☝️'],['stomach','pancia','🧍'],['leg','gamba','🦵'],['knee','ginocchio','🦵'],['foot','piede','🦶'],['feet','piedi','🦶🦶'],['toe','dito del piede','🦶']];lists.body.push(['arm','braccio','💪'],['hand','mano','✋'],['face','viso','🧑'],['teeth','denti','🦷'],['shoulder','spalla','🧍']);lists.focus=lists.body.filter(x=>['head','hair','eye','mouth','foot','arm','ear','nose','hand','leg'].includes(x[0]));lists.school=[['pen','penna','🖊️'],['pencil','matita','✏️'],['notebook','quaderno','📓']];lists.sentences=[["it's on the box",'è sopra la scatola','📦'],["it's in the box",'è dentro la scatola','📦'],["it's under the box",'è sotto la scatola','📦'],["it's by the box",'è vicino alla scatola','📦'],["it's next to the desk",'è accanto al banco','🪑'],["what's this?",'che cos’è?','💬'],["it's a plane",'è un aeroplano','✈️'],["it's a robot",'è un robot','🤖'],["it's a car",'è un’automobilina','🚗'],["it's a dinosaur",'è un dinosauro','🦕'],["it's a doll",'è una bambola','🪆']];
lists.all=Object.values(lists).filter(x=>x!==lists.all).flat();
const hints={apple:'Attenta alle due p: a · pp · le.',ball:'In fondo ci sono due l: ba · ll.',elephant:'Osserva il gruppo ph: ele · ph · ant.',fish:'Le lettere s e h stanno insieme: fi · sh.',giraffe:'Ricorda le due f e la e finale: gira · ff · e.',house:'Guarda tutte le lettere: h · ou · se. La e finale non si sente da sola.', 'ice cream':'Sono due parole: ice + cream. Ricorda lo spazio!',juice:'Osserva con calma: j · ui · ce.',kite:'Ricorda la e finale: k · i · t · e.',monkey:'Osserva il finale: monk · ey.',queen:'La q è seguita dalla u e poi da due e: qu · ee · n.',rabbit:'Al centro ci sono due b: ra · bb · it.'};
Object.assign(hints,{three:'Ricorda th all’inizio e due e alla fine: th · r · ee.',eight:'Ricorda tutte le lettere, anche g e h: e · i · g · h · t.',yellow:'In mezzo ci sono due l: ye · ll · ow.',green:'Ci sono due e: gr · ee · n.',thirteen:'Osserva thir + teen.',fourteen:'Unisci four + teen.',fifteen:'Osserva fif + teen.',puzzle:'In mezzo ci sono due z: pu · zz · le.',teddy:'Ricorda le due d: te · dd · y.'});

lists.place.push(["in front of", "davanti a", "📦"],["behind", "dietro", "📦"],["between", "tra due elementi", "📦"]);
lists.catpositions=[["the cat is on the box", "il gatto è sopra la scatola", "🐈"], ["the cat is in the box", "il gatto è dentro la scatola", "🐈"], ["the cat is under the box", "il gatto è sotto la scatola", "🐈"], ["the cat is on the table", "il gatto è sul tavolo", "🐈"]];
Object.assign(hints,{"in front of": "Sono tre parole: in + front + of. Ricorda gli spazi.", "behind": "Osserva la h dopo be: be · hind.", "between": "Al centro ci sono due e: betw · ee · n.", "how are you?": "Sono tre parole: how + are + you.", "how old are you?": "Per chiedere l’età: how + old + are + you.", "what is your name?": "Quattro parole: what + is + your + name."});

// Vocabulary shared by island adventures and server-verified missions.
lists.home=[["house","casa","🏡"],["door","porta","🚪"],["window","finestra","🪟"],["chair","sedia","🪑"],["table","tavolo","🪑"],["bed","letto","🛏️"],["lamp","lampada","💡"],["plant","pianta","🪴"]];
lists.animals=[["cat","gatto","🐱"],["dog","cane","🐶"],["rabbit","coniglio","🐰"],["fox","volpe","🦊"],["panda","panda","🐼"],["bird","uccello","🐦"],["horse","cavallo","🐴"],["turtle","tartaruga","🐢"]];
lists.transport=[["car","automobile","🚗"],["wheel","ruota","🛞"],["road","strada","🛣️"],["bus","autobus","🚌"],["bike","bicicletta","🚲"],["train","treno","🚂"],["boat","barca","⛵"],["plane","aeroplano","✈️"]];
lists.sport=[["ball","palla","⚽"],["goal","porta da calcio","🥅"],["team","squadra","👥"],["foot","piede","🦶"],["run","correre","🏃"],["jump","saltare","🤸"],["kick","calciare","⚽"],["win","vincere","🏆"]];
lists.space=[["star","stella","⭐"],["moon","luna","🌙"],["sun","sole","☀️"],["planet","pianeta","🪐"],["rocket","razzo","🚀"],["astronaut","astronauta","🧑‍🚀"],["Earth","Terra","🌍"],["sky","cielo","🌌"]];
lists.ocean=[["fish","pesce","🐟"],["dolphin","delfino","🐬"],["whale","balena","🐳"],["octopus","polpo","🐙"],["crab","granchio","🦀"],["shell","conchiglia","🐚"],["sea","mare","🌊"],["shark","squalo","🦈"]];
lists.dino=[["dinosaur","dinosauro","🦕"],["egg","uovo","🥚"],["tail","coda","🦕"],["tree","albero","🌳"],["rock","roccia","🪨"],["big","grande","🐘"],["small","piccolo","🐜"],["green","verde","🟢"]];

// School topics use fictional example names; no personal worksheet data.
lists.penpositions=[["it's on the book","è sopra il libro","🖊️"],["it's in the book","è dentro il libro","🖊️"],["it's under the book","è sotto il libro","🖊️"],["it's in front of the book","è davanti al libro","🖊️"],["it's behind the book","è dietro il libro","🖊️"],["it's by the book","è vicino al libro","🖊️"],["it's next to the book","è accanto al libro","🖊️"]];
lists.conversation=[["I'm fine, thanks!","sto bene, grazie","😊",{"type":"dialogue","prompt":"How are you?"}],["My name is Alex.","mi chiamo Alex","🙋",{"type":"dialogue","prompt":"What is your name?"}],["I'm seven years old.","ho sette anni","🎂",{"type":"dialogue","prompt":"How old are you?"}],["Nice to meet you, too!","piacere di conoscerti anche per me","🤝",{"type":"dialogue","prompt":"Nice to meet you!"}],["See you soon!","a presto","👋",{"type":"dialogue","prompt":"Goodbye!"}],["Yes, I am!","sì, sono pronto","✨",{"type":"dialogue","prompt":"Are you ready?"}]];
lists.family=[["mother","mamma","👩"],["father","papà","👨"],["sister","sorella","👧"],["brother","fratello","👦"],["grandmother","nonna","👵"],["grandfather","nonno","👴"],["family","famiglia","🏠"],["baby","bebè","👶"]];
lists.food=[["apple","mela","🍎"],["banana","banana","🍌"],["bread","pane","🍞"],["milk","latte","🥛"],["water","acqua","💧"],["cheese","formaggio","🧀"],["rice","riso","🍚"],["egg","uovo","🥚"],["carrot","carota","🥕"],["cake","torta","🍰"]];
lists.clothes=[["shirt","camicia","👔"],["T-shirt","maglietta","👕"],["dress","vestito","👗"],["shoes","scarpe","👟"],["socks","calzini","🧦"],["hat","cappello","🎩"],["coat","cappotto","🧥"],["trousers","pantaloni","👖"]];
lists.weather=[["sunny","soleggiato","☀️"],["rainy","piovoso","🌧️"],["cloudy","nuvoloso","☁️"],["windy","ventoso","🌬️"],["snowy","nevoso","🌨️"],["hot","caldo","🥵"],["cold","freddo","🥶"],["rainbow","arcobaleno","🌈"]];
lists.routines=[["wake up","svegliarsi","🌅"],["wash my hands","lavarmi le mani","🧼"],["brush my teeth","lavarmi i denti","🪥"],["eat breakfast","fare colazione","🥣"],["go to school","andare a scuola","🎒"],["read a book","leggere un libro","📖"],["play with friends","giocare con gli amici","🧒"],["go to bed","andare a letto","🛏️"]];
lists.aboutme=[["my name is Alex","mi chiamo Alex","🙋"],["I am a girl","sono una bambina","👧"],["I am a boy","sono un bambino","👦"],["I am seven years old","ho sette anni","🎂"],["my mother's name is Anna","mia mamma si chiama Anna","👩"],["my father's name is Peter","mio papà si chiama Peter","👨"]];
lists.counting=[["three pencils","3 matite","✏️✏️✏️",{"type":"count","count":3,"singular":"pencil","plural":"pencils","symbol":"✏️","prompt":"How many pencils?"}],["two pens","2 penne","🖊️🖊️",{"type":"count","count":2,"singular":"pen","plural":"pens","symbol":"🖊️","prompt":"How many pens?"}],["one notebook","1 quaderno","📓",{"type":"count","count":1,"singular":"notebook","plural":"notebooks","symbol":"📓","prompt":"How many notebooks?"}],["four girls","4 bambine","👧👧👧👧",{"type":"count","count":4,"singular":"girl","plural":"girls","symbol":"👧","prompt":"How many girls?"}],["ten boys","10 bambini","👦👦👦👦👦👦👦👦👦👦",{"type":"count","count":10,"singular":"boy","plural":"boys","symbol":"👦","prompt":"How many boys?"}],["five apples","5 mele","🍎🍎🍎🍎🍎",{"type":"count","count":5,"singular":"apple","plural":"apples","symbol":"🍎","prompt":"How many apples?"}],["six balls","6 palloni","⚽⚽⚽⚽⚽⚽",{"type":"count","count":6,"singular":"ball","plural":"balls","symbol":"⚽","prompt":"How many balls?"}],["seven stars","7 stelle","⭐⭐⭐⭐⭐⭐⭐",{"type":"count","count":7,"singular":"star","plural":"stars","symbol":"⭐","prompt":"How many stars?"}],["eight books","8 libri","📚📚📚📚📚📚📚📚",{"type":"count","count":8,"singular":"book","plural":"books","symbol":"📚","prompt":"How many books?"}],["nine flowers","9 fiori","🌸🌸🌸🌸🌸🌸🌸🌸🌸",{"type":"count","count":9,"singular":"flower","plural":"flowers","symbol":"🌸","prompt":"How many flowers?"}]];
lists.numbers=[["one", "1", "1"], ["two", "2", "2"], ["three", "3", "3"], ["four", "4", "4"], ["five", "5", "5"], ["six", "6", "6"], ["seven", "7", "7"], ["eight", "8", "8"], ["nine", "9", "9"], ["ten", "10", "10"]];
lists.focus=[["head", "testa", "🧑"], ["hair", "capelli", "💇"], ["eye", "occhio", "👁️"], ["ear", "orecchio", "👂"], ["nose", "naso", "👃"], ["mouth", "bocca", "👄"], ["finger", "dito della mano", "☝️"], ["leg", "gamba", "🦵"], ["foot", "piede", "🦶"], ["arm", "braccio", "💪"], ["hand", "mano", "✋"], ["shoulder", "spalla", "🧍"]];
const lessonTopics={"counting":{"name":"How many? Conta e rispondi","icon":"🔢","activity":"creative","description":"Conta le figure e scegli la risposta. Uno o tanti?"},"penpositions":{"name":"Preposizioni · La penna e il libro","icon":"🖊️","activity":"pets","description":"Sopra, sotto, davanti e dietro: completa la frase."},"conversation":{"name":"Parliamo in inglese","icon":"💬","activity":"pets","description":"Ascolta la domanda e scegli come rispondere."},"aboutme":{"name":"All about me","icon":"🙋","activity":"creative","description":"Frasi di esempio per parlare di sé e della famiglia."},"family":{"name":"La famiglia","icon":"🏡","activity":"treehouse","description":"Scopri le parole della famiglia."},"food":{"name":"Cibo e bevande","icon":"🍎","activity":"treehouse","description":"Una merenda di parole da ascoltare e scrivere."},"clothes":{"name":"Vestiti e accessori","icon":"👕","activity":"creative","description":"Cosa indossiamo? Gioca con le parole dei vestiti."},"weather":{"name":"Che tempo fa?","icon":"🌦️","activity":"space","description":"Sole, pioggia e vento: esplora il meteo."},"routines":{"name":"La mia giornata","icon":"🌅","activity":"treehouse","description":"Piccole frasi per le azioni di ogni giorno."}};
Object.assign(hints,{"head": "Osserva le lettere: h · ea · d. Poi ascolta la parola intera.", "mouth": "Osserva le lettere: m · ou · th. Poi ascolta la parola intera.", "shoulder": "Osserva le lettere: sh · ou · l · d · er. Poi ascolta la parola intera.", "ear": "Osserva le lettere: e · a · r. Poi ascolta la parola intera.", "finger": "Osserva le lettere: fin · ger. Poi ascolta la parola intera.", "foot": "Osserva le lettere: f · oo · t. Poi ascolta la parola intera.", "hand": "Osserva le lettere: h · a · n · d. Poi ascolta la parola intera.", "eye": "Osserva le lettere: e · y · e. Poi ascolta la parola intera.", "arm": "Osserva le lettere: a · r · m. Poi ascolta la parola intera.", "hair": "Osserva le lettere: h · air. Poi ascolta la parola intera.", "nose": "Osserva le lettere: n · o · s · e. Poi ascolta la parola intera.", "leg": "Osserva le lettere: l · e · g. Poi ascolta la parola intera."});
// Keep equivalent expressions available as targets, never as incorrect distractors.
function lessonChoiceKey(value){
 const word=String(value??'').toLowerCase().replace(/[’‘]/g,"'").trim().replace(/[?!., ]+$/,'').replace(/\s+/g,' ');
 if(['hello','hi'].includes(word))return '@greeting';
 if(/^(?:it's|it is|the (?:cat|mouse|pen|ball) is) (?:by|next to) the (?:book|box|table|desk)$/.test(word))return '@spatial:'+word.replace(/^it is /,"it's ").replace(' next to ',' by ');
 return word;
}
function makeLessonQuestion(row,index,total,pool){
 const meta=row[3]||{},q={word:row[0],translation:row[1],emoji:row[2],kind:index===total-1?'write':index===0?'choice':'build',number:index+1};
 if(meta.prompt)q.prompt=meta.prompt;
 if(index===0&&meta.type==='count'){
  q.kind='count';
  const counts=['one','two','three','four','five','six','seven','eight','nine','ten'];
  const alternatives=counts.map((name,i)=>[name+' '+(i===0?meta.singular:meta.plural),'','']).filter(r=>r[0]!==q.word);
  q.options=shuffle([row,...shuffle(alternatives).slice(0,3)]);
 }else if(index===0&&meta.type==='dialogue'){
  q.kind='dialogue';q.options=shuffle([row,...shuffle(pool.filter(r=>r[0]!==row[0]&&r[3]?.prompt!==meta.prompt)).slice(0,3)]);
 }else if(index===0){
  const alternatives=[...new Map(pool.filter(r=>lessonChoiceKey(r[0])!==lessonChoiceKey(row[0])).map(r=>[lessonChoiceKey(r[0]),r])).values()];
  q.options=shuffle([row,...shuffle(alternatives).slice(0,3)]);
 }
 if(index===1){
  const match=q.word.match(meta.type==='count'?/^([a-z]+)\s/i:/(?:^|\s)(in front of|next to|between|behind|under|on|in|by)(?=\s|$)/i);
  if(match){q.kind='gap';q.answer=match[1];const start=q.word.indexOf(match[1]);q.mask=q.word.slice(0,start)+'_'.repeat(match[1].length)+q.word.slice(start+match[1].length);}
 }
 return q;
}

lists.mousepositions=[["the mouse is in the box","il topolino è dentro la scatola","🐭"],["the mouse is next to the box","il topolino è accanto alla scatola","🐭"],["the mouse is on the box","il topolino è sopra la scatola","🐭"],["the mouse is between the boxes","il topolino è tra le scatole","🐭"],["the mouse is under the box","il topolino è sotto la scatola","🐭"],["the mouse is in front of the box","il topolino è davanti alla scatola","🐭"],["the mouse is behind the box","il topolino è dietro la scatola","🐭"]];
lessonTopics.mousepositions={name:"Preposizioni · Il topolino e la scatola",icon:"🐭",activity:"pets",description:"Abbina sette scene alle preposizioni e completa le frasi."};

// Cosmetics and earned rewards. Existing prices/IDs are preserved.
globalThis.wordylandRewardExtras=[
{"id":"hat-wizard","name":"Cappello delle magie","icon":"🧙","slot":"hat","price":30},
{"id":"hat-flowers","name":"Corona di fiori","icon":"🌸","slot":"hat","price":20},
{"id":"effect-bubbles","name":"Bolle di sapone","icon":"🫧","slot":"effect","price":25},
{"id":"effect-rainbow","name":"Cerchio arcobaleno","icon":"🌈","slot":"effect","price":35},
{"id":"pet-turtle","name":"Tartaruga curiosa","icon":"🐢","slot":"pet","price":20},
{"id":"pet-penguin","name":"Pinguino delle nevi","icon":"🐧","slot":"pet","price":25},
{"id":"room-lavender","name":"Casa lavanda","icon":"💜","slot":"room","price":20},
{"id":"room-sunset","name":"Casa tramonto","icon":"🌅","slot":"room","price":20},
{"id":"kart-gold","name":"Kart del sole","icon":"☀️","slot":"kart","price":25},
{"id":"kart-purple","name":"Kart galassia","icon":"💜","slot":"kart","price":25},
{"id":"paint-forest","name":"Colori della foresta","icon":"🌳","slot":"palette","price":15},
{"id":"paint-candy","name":"Colori delle caramelle","icon":"🍬","slot":"palette","price":15},
{"id":"trophy-star","name":"Stella da esporre","icon":"🌟","slot":"trophy","price":25},
{"id":"trophy-flower","name":"Fiore gigante","icon":"🌻","slot":"trophy","price":20},
{"id":"trophy-crystal","name":"Cristallo del mare","icon":"💎","slot":"trophy","price":30},
{"id":"ball-sun","name":"Pallone del sole","icon":"🟠","slot":"ball","price":15},
{"id":"ball-ocean","name":"Pallone dell’oceano","icon":"🔵","slot":"ball","price":15},
{"id":"rocket-mint","name":"Razzo menta","icon":"💚","slot":"rocket","price":25},
{"id":"rocket-galaxy","name":"Razzo galassia","icon":"🟣","slot":"rocket","price":30},
{"id":"badge-first","name":"Prima avventura","icon":"🏅","slot":"badge","price":0,"unlock":{"missions":1}},
{"id":"badge-explorer","name":"Tre mondi esplorati","icon":"🧭","slot":"badge","price":0,"unlock":{"activities":3}},
{"id":"badge-persistence","name":"Dieci avventure","icon":"🎖️","slot":"badge","price":0,"unlock":{"missions":10}},
{"id":"hat-santa","name":"Cappello di Babbo Natale","icon":"🎅","slot":"hat","price":0,"season":"christmas","event":"christmas","eventExercises":1},
{"id":"hat-elf","name":"Cappello da elfo","icon":"🧝","slot":"hat","price":0,"season":"christmas","event":"christmas","eventExercises":3},
{"id":"hat-reindeer","name":"Corna da renna","icon":"🦌","slot":"hat","price":0,"season":"christmas","event":"christmas","eventExercises":6},
{"id":"neck-scarf","name":"Sciarpa natalizia","icon":"🧣","slot":"neck","price":0,"season":"christmas","event":"christmas","eventExercises":2},
{"id":"neck-none","name":"Senza sciarpa","icon":"○","slot":"neck","price":0,"season":"christmas"},
{"id":"effect-snow","name":"Fiocchi di neve","icon":"❄️","slot":"effect","price":0,"season":"christmas","event":"christmas","eventExercises":5},
{"id":"kart-christmas","name":"Kart delle feste","icon":"🎁","slot":"kart","price":0,"season":"christmas","event":"christmas","eventExercises":9},
{"id":"trophy-tree","name":"Alberello di Natale","icon":"🎄","slot":"trophy","price":0,"season":"christmas","event":"christmas","eventExercises":4},
{"id":"souvenir-christmas-1","name":"Stella del villaggio","icon":"⭐","slot":"badge","price":0,"event":"christmas","eventDays":1,"season":"christmas"},
{"id":"souvenir-christmas-2","name":"Campanella delle feste","icon":"🔔","slot":"badge","price":0,"event":"christmas","eventDays":3,"season":"christmas"},
{"id":"souvenir-christmas-3","name":"Cristallo di Natale","icon":"❄️","slot":"badge","price":0,"event":"christmas","eventDays":5,"season":"christmas"},
{"id":"souvenir-carnival-1","name":"Maschera dei colori","icon":"🎭","slot":"badge","price":0,"event":"carnival","eventDays":1},
{"id":"souvenir-carnival-2","name":"Coriandolo brillante","icon":"🎊","slot":"badge","price":0,"event":"carnival","eventDays":3},
{"id":"souvenir-carnival-3","name":"Stella di Carnevale","icon":"🌟","slot":"badge","price":0,"event":"carnival","eventDays":5},
{"id":"souvenir-easter-1","name":"Uovo dipinto","icon":"🥚","slot":"badge","price":0,"event":"easter","eventDays":1},
{"id":"souvenir-easter-2","name":"Fiore di primavera","icon":"🌷","slot":"badge","price":0,"event":"easter","eventDays":3},
{"id":"souvenir-easter-3","name":"Pulcino delle scoperte","icon":"🐣","slot":"badge","price":0,"event":"easter","eventDays":5},
{"id":"souvenir-halloween-1","name":"Zucchetta sorridente","icon":"🎃","slot":"badge","price":0,"event":"halloween","eventDays":1},
{"id":"souvenir-halloween-2","name":"Luna delle storie","icon":"🌙","slot":"badge","price":0,"event":"halloween","eventDays":3},
{"id":"souvenir-halloween-3","name":"Fantasmino gentile","icon":"👻","slot":"badge","price":0,"event":"halloween","eventDays":5},
{"id":"hat-snowman","name":"Cappello del pupazzo","icon":"☃️","slot":"hat","price":0,"season":"christmas","event":"christmas","eventExercises":7},
{"id":"hat-cookie","name":"Cappello biscotto","icon":"🍪","slot":"hat","price":0,"season":"christmas","event":"christmas","eventExercises":10},
{"id":"hat-gift","name":"Cappello pacchetto","icon":"🎁","slot":"hat","price":0,"season":"christmas","event":"christmas","eventExercises":13},
{"id":"effect-stars","name":"Stelline delle feste","icon":"🌟","slot":"effect","price":0,"season":"christmas","event":"christmas","eventExercises":11},
{"id":"rocket-christmas","name":"Razzo pan di zenzero","icon":"🚀","slot":"rocket","price":0,"season":"christmas","event":"christmas","eventExercises":15},
{"id":"reindeer","name":"Rudy la renna","icon":"🦌","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":6},
{"id":"penguin","name":"Pip il pinguino","icon":"🐧","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":12},
{"id":"snowpal","name":"Fiocco il pupazzo","icon":"☃️","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":18},
{"id":"hat-leaf","name":"Cappello foglia","icon":"🍃","slot":"hat","price":0,"event":"journey","eventExercises":3,"collection":"bosco"},
{"id":"neck-ocean","name":"Sciarpa dell’oceano","icon":"🧣","slot":"neck","price":0,"event":"journey","eventExercises":6,"collection":"bosco"},
{"id":"effect-fireflies","name":"Lucciole amiche","icon":"✨","slot":"effect","price":0,"event":"journey","eventExercises":9,"collection":"bosco"},
{"id":"trophy-book","name":"Libro delle scoperte","icon":"📚","slot":"trophy","price":0,"event":"journey","eventExercises":12,"collection":"bosco"},
{"id":"bunny","name":"Lillo il coniglietto","icon":"🐰","slot":"avatar","price":0,"event":"journey","eventExercises":18,"collection":"viaggio"},
{"id":"kart-leaf","name":"Kart della foresta","icon":"🌳","slot":"kart","price":0,"event":"journey","eventExercises":24,"collection":"viaggio"},
{"id":"hat-explorer","name":"Cappello da esploratore","icon":"🧭","slot":"hat","price":0,"event":"journey","eventExercises":30,"collection":"viaggio"},
{"id":"rocket-ocean","name":"Razzo dell’oceano","icon":"🌊","slot":"rocket","price":0,"event":"journey","eventExercises":36,"collection":"viaggio"},
{"id":"trophy-moon","name":"Luna da collezione","icon":"🌙","slot":"trophy","price":0,"event":"journey","eventExercises":45,"collection":"sogni"},
{"id":"koala","name":"Kiki il koala","icon":"🐨","slot":"avatar","price":0,"event":"journey","eventExercises":60,"collection":"sogni"},
{"id":"effect-comets","name":"Comete gentili","icon":"💫","slot":"effect","price":0,"event":"journey","eventExercises":75,"collection":"sogni"},
{"id":"trophy-garden","name":"Giardino delle parole","icon":"🌷","slot":"trophy","price":0,"event":"journey","eventExercises":90,"collection":"sogni"},
{"id":"elf-boy","name":"Elio l’elfo","icon":"🧝‍♂️","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":3},
{"id":"elf-girl","name":"Stella l’elfa","icon":"🧝‍♀️","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":3},
{"id":"polar-bear","name":"Nubi l’orso polare","icon":"🐻‍❄️","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":9},
{"id":"gingerbread","name":"Biscottino pan di zenzero","icon":"🍪","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":12},
{"id":"silver-reindeer","name":"Fiaba la renna argentata","icon":"🦌","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":15},
{"id":"mrs-claus","name":"Nonna Natale","icon":"🤶","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":21},
{"id":"santa","name":"Babbo Natale","icon":"🎅","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":24},
{"id":"nutcracker","name":"Nico lo schiaccianoci","icon":"🥁","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":27},
{"id":"yeti","name":"Milo lo yeti gentile","icon":"☁️","slot":"avatar","price":0,"season":"christmas","event":"christmas","eventExercises":30}
];
