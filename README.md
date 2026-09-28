# Pisica din campus — OSUT UTCN Observator

Un joc 2D top-down care rulează pe un ecran mare (laptop/proiector) și se
joacă de pe telefon. Telefonul devine controller scanând un cod QR; nu se
instalează nimic.

**Scopul jocului:** plimbi o pisică prin campusul Observator, te oprești la
standurile OSUT, răspunzi corect la trivia și strângi toate cele 13 medalii.

---

## Cum pornești

Ai nevoie de [Go ≥ 1.23](https://go.dev/dl/) și [Node ≥ 20](https://nodejs.org/).

**Terminal 1 — serverul realtime:**

```powershell
cd backend
go mod download
go run ./cmd/server          # ascultă pe :8080
```

**Terminal 2 — aplicația web:**

```powershell
cd frontend
npm install
# Copiază .env.example în .env și setează VITE_PUBLIC_APP_URL cu adresa ta LAN.
npm run dev                 # Vite ascultă și pe adresa LAN prin server.host
```

**Pe laptop:** deschide `http://<IP-ul-tău-din-rețea>:5173/game`

`frontend/.env` controlează adresele:

- `VITE_PUBLIC_APP_URL`: originea publică accesibilă telefonului, cu protocol și port, fără `/game`. QR-ul folosește `/controller?s=<cod>`, iar WebSocket-ul derivă aceeași adresă cu `/ws` și protocolul `ws`/`wss`.
- `BACKEND_URL`: adresa internă a serverului Go, folosită doar de proxy-ul Vite local. Exemplul implicit din `.env.example` este `http://127.0.0.1:8080`. Dacă schimbi `PORT` la backend, actualizează și această variabilă.
- `VITE_REALTIME_URL`: opțional, doar când WebSocket-ul public este găzduit separat.

Deschide monitorul folosind aceeași adresă LAN din `VITE_PUBLIC_APP_URL`, urmată de `/game`; telefonul trebuie să poată accesa acea adresă. Dacă deschizi monitorul pe `localhost`, WebSocket-ul va folosi tot adresa publică din `.env`, deci configurează `ALLOWED_ORIGINS` în mediul procesului Go pentru a permite și originea monitorului (de exemplu `localhost:5173`). Serverul Go citește variabilele din mediul procesului; nu încarcă automat un fișier `.env`.

**Flow:** monitorul deschide `/game` și afișează QR-ul → telefonul deschide `/controller?s=<cod>` → după asocierea WebSocket, monitorul navighează automat la `/game/start` → ACȚIUNE pe telefon deschide `/game/play`. Conexiunea și sesiunea rămân aceleași între cele trei rute.

După pornire, săgețile/WASD și Space/Enter funcționează și pe monitor. În lobby și pe ecranul de start, harta este oprită și nu primește comenzi.

**Hosting:** setează `VITE_PUBLIC_APP_URL=https://<domeniul-tău>` înainte de build sau las-o goală pentru a folosi domeniul paginii. Serverul de hosting trebuie să servească `index.html` pentru rutele aplicației și să trimită `/ws` către serverul Go, cu suport WebSocket. Proxy-ul din `vite.config.ts` este pentru dezvoltare, nu este inclus în fișierele statice din build. Repornește Vite după schimbarea `.env`; pentru producție refă buildul. Dacă WebSocket-ul are alt domeniu, configurează și `VITE_REALTIME_URL` și originile permise pe backend.

---

## Cum se joacă

| Buton | În hartă | În ecranul de trivia |
|---|---|---|
| SUS / JOS / STÂNGA / DREAPTA | mișcare | alege răspunsul 1 / 3 / 4 / 2 |
| ACȚIUNE | deschide standul de lângă tine | ieși înapoi pe hartă |

Răspunsurile sunt legate direct de direcții, pentru că butonul de acțiune e
rezervat pentru ieșire — nu există un buton separat de confirmare. Fiecare
răspuns își afișează săgeata pe ecran:

```
▲  1. ...        ◀  4. ...
▶  2. ...        ▼  3. ...
```

**Răspuns greșit:** rândul rămâne marcat cu roșu pentru tot jocul, apare un
indiciu și ai 10 secunde de cooldown în care nu mai poți încerca. Poți ieși și
te poți plimba în timpul cooldown-ului.

**Răspuns corect:** primești o medalie, iar deasupra standului apare o **bifă
verde** — singurul semn care există peste standuri. Stă lăsată pe copertină și
se ridică deasupra doar când intri în raza de interacțiune, ca să nu umple harta
cu bife plutitoare. Cât timp un stand n-a fost
rezolvat n-are nimic deasupra: harta rămâne curată, iar ce ai terminat se vede
dintr-o privire. Contorul e sus-stânga pe canvas și în bara de deasupra jocului.

Că un stand are o întrebare afli mergând la el — când intri în rază apare
îndemnul „ACȚIUNE · deschide".

---

## Butoanele din bara de sus

| Buton | Ce face |
|---|---|
| **Reset joc** | șterge tot progresul și repornește harta de la intrarea de sud |
| **Cod nou (QR)** | generează alt cod de asociere, **deconectează telefonul curent** și te duce la ecranul de conectare |
| **Ecran conectare** | arată codul QR fără să schimbe nimic; jocul rămâne exact unde era |
| **Viteză** | slider de la `0.4×` la `2.5×`; butonul „Normal" îl duce înapoi la `1.0×` |

Viteza se aplică imediat și se ține minte între sesiuni (`localStorage`). Valoarea
de bază e 290 de unități pe secundă, iar sliderul o înmulțește — deci `2×` înseamnă
580. Ca și input-ul, trece prin `bridge`, nu prin state-ul React: un `setState`
la fiecare pixel de tras ar re-randa pagina în timpul jocului.

„Cod nou” e butonul pentru schimbul de jucători: vechiul link devine invalid pe
loc, deci cine a jucat înainte nu mai poate interveni.

---

## Harta

Reconstruită după planul desenat de mână al campusului Observator. Două alei
paralele străbat campusul pe toată lungimea: un rând de clădiri între ele și un
rând dedesubt. Spre est terenul urcă — spina principală coteşte spre nord-est pe
lângă Căminul 2 și Căminul 1 către poarta de est, iar o ramură coboară spre
sud-est la poarta de sud.

```
┌─────────────── gard ────────────────┐         ╭─ Cămin 1 ─╮
│ Sediu OSUT    ALEEA DE NORD         │        Cămin 2      ╰── poarta est
│  Pașnic · proiecții · C6 · C4       │
│────────── ALEEA CENTRALĂ ───────────┴───╮     sport · cantina
│  fotbal · sport · C7 · C5 · C3          │         parcare
└─────────────── gard ────────────────────┴── poarta sud
```

Tot campusul e **împrejmuit cu gard**, nu cu drum — dar gardul **nu e un singur
inel**. E o listă de ziduri independente, fiecare cu unghiul lui:

- **Gardul campusului** — un zid deschis care înconjoară tot, dar **se oprește
  de o parte și de alta a străzii de vest**, ca să poți ieși spre Sediul OSUT
- **Gardul Sediului OSUT** — împrejmuiește buzunarul de vest pe nord, vest și
  sud, și rămâne deschis spre est, pe unde intră aleea de acces

Un zid **deschis** are două capete și acolo se trece; unul **închis** împrejmuiește
și ține decorul înăuntru. Deschiderea pentru o poartă se taie automat din zidul
de lângă ea, dar nu e obligatorie — un zid poate pur și simplu să se termine.

Intrări:

- **3 intrări principale:** Ceahlău (vest, în deschizătura dintre cele două
  garduri), Observatorului (sud), est
- **2 intrări secundare:** dinspre nord, prin spațiile dintre cămine

Laturile pot sta oblic. Fiecare bucată de zid între două porți devine un
dreptunghi de coliziune dacă e dreaptă, sau o scară de dreptunghiuri dacă e
înclinată — același mecanism ca la clădirile rotite.

### Editorul de hartă

```powershell
npm run map:edit     # → http://localhost:5174
```

Deschizi în browser și **muți obiectele cu mouse-ul peste fotografia aeriană a
campusului**. Când apeși Salvează, scrie direct în
[`campus.layout.ts`](frontend/src/game/campus.layout.ts) — nu trebuie să copiezi
nimic. Păstrează și un `.bak` cu versiunea anterioară.

| Acțiune | Cum |
|---|---|
| Mută un obiect | trage de el |
| Redimensionează | trage de colțul din dreapta-jos |
| **Mută o singură aripă** | **trage de ea** (asta e acum comportamentul normal) |
| **Mută tot blocul** | **trage de pătratul din centrul lui**, sau `Ctrl` + trage |
| Rotește tot blocul | trage de bila albastră de deasupra lui |
| Rotește o singură aripă | selecteaz-o, apoi trage de bila verde din stânga ei |
| Aripă nouă / dublează / șterge | butoanele din panoul de proprietăți |
| **Drum nou** | **`+ Drum nou`**, apoi clic pentru fiecare vârf; termini din bara de sus |
| **Gard nou** | **`+ Gard nou`**, la fel; în proprietăți îl faci închis sau îl ștergi |
| **Pădure nouă** | **`+ Pădure nouă`**, apoi **tragi un dreptunghi** pe hartă |
| **Schimbă un nume** | **dublu-clic pe el pe hartă**; `Enter` salvează, `Esc` renunță |
| **Mută un nume** | **trage de el**; în proprietăți ai „Nume la loc" ca să-l readuci |
| **Text pe firma porții** | câmpul „Text pe firmă" din proprietățile porții |
| Vârf nou pe un drum | dublu-clic pe drum |
| Șterge un vârf | clic-dreapta pe el |
| Șterge drumul | butonul din panoul de proprietăți |
| Aliniază fotografia | „Încadrează în lume", apoi `Shift` + trage |
| Pan / zoom | `spațiu`+trage sau butonul din mijloc / rotița |
| Fără snap | ține `Alt` |
| Undo / Salvează | `Ctrl+Z` / `Ctrl+S` |

Cât desenezi, sus apare o bară cu numărul de vârfuri și trei butoane:
**− ultimul vârf**, **Gata** și **Renunță**. „Gata" stă blocat până ai cel puțin
două vârfuri, ca să nu rămână un drum dintr-un punct. (`Enter` și `Esc` fac
același lucru, dacă preferi tastatura.)

### Pădurea din jur

Lumea se întinde cu 900 de unități dincolo de gard în toate direcțiile, iar
marginea aia e umplută cu pădure — altfel harta s-ar termina în gazon plat exact
acolo unde se oprește jucătorul. Sunt patru centuri (`pădure-nord`, `-sud`,
`-vest`, `-est`), dar poți adăuga oricâte: `+ Pădure nouă` și tragi un
dreptunghi.

O pădure e **doar decor** — n-are coliziune, fiindcă gardul e cel care oprește
pisica. În joc dreptunghiul nu se vede: podeaua e tăiată cu o margine
festonată, iar copacii se răresc spre exterior, așa că linia arborilor arată
neregulat. Copacii de pădure se sortează pe adâncime ca orice alt obiect, deci
au relief când îi privești dinspre campus.

Densitatea e reglată din `spacing` în `FOREST_TREES` (`campus.ts`). E și un
buton de performanță: fiecare copac e un sprite prin care trece sortarea la
fiecare cadru. La 132 ies ~1100 de copaci; la 96 ieșeau ~2100.

Copacii împrăștiați normal ocolesc pădurile, ca să nu se dubleze.

### Numele de pe hartă

Numele căminelor, zonelor, standurilor și porților se schimbă cu **dublu-clic
direct pe text**, nu doar din câmpul „Nume" al panoului. Se deschide o casetă
fix acolo unde stă numele, precompletată.

Numele sunt așezate automat — al unei clădiri deasupra blocului, al unei zone
deasupra ei — ceea ce e bine până când două se suprapun. Atunci **tragi de nume**
și se salvează un `labelOffset`, o abatere față de poziția automată. Butonul
„Nume la loc" o șterge.

Poziția automată e calculată într-un singur loc — `buildingLabelAnchor`,
`zoneLabelAnchor` și `gateLabelAnchor` din `campus.ts` — folosit de joc și de
`npm run map`, iar editorul îl oglindește cifră cu cifră. Contează: înainte
fiecare așeza numele în felul lui (editorul punea numele clădirii în centrul
blocului, jocul deasupra lui; la porți editorul folosea o abatere care se
schimba cu zoom-ul), așa că ce aliniai în editor ateriza în altă parte în joc.

Când ești depărtat, numele sunt mărite ca să rămână lizibile — **punctul
galben** e locul exact unde le așază jocul. Trasul numelui nu se aliniază la
grila hărții: o abatere de câțiva pixeli n-ar fi posibilă în pași de 20.

Standurile fac excepție: numele lor e pictat pe pancarda standului, deci se
poate rescrie, dar nu mutat. La fel și **firma porții** — scrie
`UTCN · OBSERVATOR` implicit, dar fiecare poartă își poate avea textul ei, iar
dacă e prea lung se micșorează singur ca să încapă pe tăbliță.

Un drum nou primește singur un id liber (`drum-1`, `drum-2`…), lățime 110 și
suprafață `paved`; le schimbi în panoul de proprietăți. Id-ul contează: lămpile
și băncile din `campus.ts` își caută aleea după id, iar două drumuri cu același
id ar trimite decorul pe cel greșit — de-aia atât editorul cât și `map:check`
semnalează acum id-urile dublate și drumurile cu mai puțin de două vârfuri.

Panoul „Verificare" din stânga rulează în timp real aceleași reguli ca
`npm run map:check`, deci vezi suprapunerile **în timp ce** muți, nu după.

`campus.layout.ts` conține doar date. Tipurile și tot ce se calculează din
poziții (copaci, lămpi, bănci, mașini) stau în `campus.ts`, pe care editorul nu-l
atinge.

### Căminele sunt înclinate

Căminele din Observator nu stau drept față de alei, așa că fiecare clădire are un
câmp `rotation` — grade, în sensul acelor de ceasornic, în jurul centrului
blocului. Aripile rămân drepte în date și se rotește tot blocul, deci un cămin în
L își păstrează forma când îl întorci. Acum toate cele 7 cămine sunt la `-10°`.

**Aripile nu trebuie să se atingă.** Fiecare aripă e o clădire în sine pentru
motor: are textura ei, unghiul ei și adâncimea ei, deci poți depărta două aripi
oricât și pisica trece printre ele sortându-se corect față de fiecare. Când
selectezi un cămin, o linie punctată arată ce aripi îi aparțin, iar aripile
apar și în lista din stânga, ca să le poți alege pe nume.

Fiecare **aripă** are la rândul ei un `rotation` propriu, aplicat în jurul
centrului ei *înainte* de rotația blocului. Căminele reale nu sunt L-uri
perfecte — cele două aripi se întâlnesc la ~105°, nu la 90 — așa că forma de
„V întors” (∧) din fotografie se face doar cu unghi separat pe fiecare aripă.
În fotografie aripa lungă e pe la −43°, iar întoarcerea pe la +32°.

Bila **albastră** de deasupra clădirii rotește blocul; selectezi o aripă și
bila **verde** din stânga ei o rotește doar pe ea. Sau scrii valorile în panoul
de proprietăți. `Alt` în timpul rotirii = zecimi de grad.

Cât timp ceva e întors, mutarea și redimensionarea se fac după axele *lui*, nu
după cele ale hărții — tragi de-a lungul zidului, nu pe orizontală. Aripile
rămân drepte în date; se rotesc doar la desenare și la coliziuni, deci poți
oricând pune unghiul înapoi pe 0 fără să pierzi dimensiunile.

Coliziunile nu se pot roti în Arcade Physics, așa că o clădire întoarsă e
acoperită cu o scară de dreptunghiuri verticale (`buildingColliders` în
`campus.ts`). La `-10°` ies 23 de dreptunghiuri per cămin și cu ~12% mai multă
suprafață decât forma reală: pisica se oprește câțiva pixeli mai devreme la un
colț, ceea ce e greșeala bună dintre cele două posibile.

Atenție la spațiu: la unghiuri mari un bloc de 560 de unități ajunge să ocupe
~550 pe verticală, iar rândurile dintre alei au acum 374–495. Panoul
„Verificare” îți spune imediat dacă ai ieșit pe alee sau peste un stand.

### Cum verifici harta după ce o modifici

```powershell
npm run map          # desenează harta în scripts/out/campus.png
npm run map:check    # caută suprapuneri, drumuri blocate, standuri izolate
```

`map` randează schema hărții (gard, drumuri, clădiri, zone, standuri, porți, pe
grilă de 500) într-un PNG, folosind Chrome sau Edge deja instalat. `map:check`
răspunde la altă întrebare: dacă layout-ul e *legal*. Cele două prind lucruri
diferite — randarea a prins o alee care se termina în iarbă, verificatorul a
prins standuri parcate fix pe axul aceleiași alei. Rulează-le pe amândouă.

Lumea are 6300×1820. Ca să muți ceva, folosește editorul (sau, la nevoie,
[`campus.layout.ts`](frontend/src/game/campus.layout.ts) direct) — coliziunile,
etichetele, gardul și decorul se recalculează din el. Copacii și tufele sunt împrăștiate prin rejection
sampling față de aceleași date, deci nu ajung niciodată într-un perete.

Capetele unui gard deschis sunt marcate cu bulină **portocalie** în editor —
acolo se întrerupe zidul, deci se vede dintr-o privire unde rămâne trecere.

## Unde pui întrebările

Un singur fișier: [`frontend/src/game/trivia.ts`](frontend/src/game/trivia.ts).
Un stand = un departament OSUT, 13 în total.

```ts
polihack: {
  question: 'Întrebarea ta aici?',
  answers: ['Primul', 'Al doilea', 'Al treilea', 'Al patrulea'],
  correct: 0,          // 0 = răspunsul 1, 1 = răspunsul 2, ...
  hint: 'Indiciul care apare după un răspuns greșit.',
},
```

Acum toate cele 13 au text `TODO:` ca marcaj. `answers` trebuie să aibă exact 4
elemente — TypeScript se plânge dacă nu.

Cheile: `bal-bobocilor`, `polihack`, `sport-sanatate`, `viitor-inginer`,
`infotech`, `divertisment`, `imagine`, `it`, `media`, `pr`, `tehnic`,
`tineret`, `financiar`.

Cheia din `trivia.ts`, id-ul din `campus.layout.ts` și uniunea `StandId` din
`campus.ts` trebuie să se potrivească — dacă adaugi sau scoți un stand, le
schimbi pe toate trei, altfel TypeScript se plânge.

Standurile sunt așezate **pe alei**, în spațiile dintre cămine — nu în fața
vreunei clădiri.

---

## Cum e construit

```
backend/                      Go — releu realtime prin WebSocket
  internal/realtime/
    message.go                tipurile de mesaje + validare
    hub.go                    slot joc + slot controller + codul de asociere
    handler.go                handshake, keepalive ping, bucla de citire

frontend/src/
  realtime/                   protocol.ts, RealtimeClient.ts (reconectare), hook React
  pages/GamePage.tsx          lobby cu QR + gazda canvas-ului + bara de control
  pages/ControllerPage.tsx    D-pad-ul de pe telefon
  game/
    campus.ts                 HARTA CA DATE — clădiri, alei, standuri, copaci
    textures.ts               TOATĂ grafica, desenată în canvas la pornire
    palette.ts                culorile
    bridge.ts                 puntea React ↔ Phaser + starea de joc
    trivia.ts                 întrebările
    scenes/BootScene.ts       generează texturile
    scenes/WorldScene.ts      harta, pisica, standurile
    scenes/TriviaScene.ts     ecranul de întrebări
```

Câteva decizii care contează dacă modifici ceva:

- **Nu există fișiere de imagine.** Fiecare textură — pisica, clădirile, copacii,
  standurile — e desenată cu Canvas 2D în `textures.ts`, la boot. Schimbi culorile
  din `palette.ts` și se schimbă peste tot.
- **Harta e date, nu cod.** Ca să muți un cămin sau un stand, editezi
  `campus.ts`. Coliziunile, etichetele și decorul se construiesc din el.
- **Input-ul nu trece prin state-ul React.** Socket-ul scrie într-un obiect
  mutabil (`bridge.input`) pe care bucla de joc îl citește în fiecare frame. Un
  `setState` per apăsare ar consuma bugetul de frame pe re-randări.
- **Codul de asociere e verificat pe server.** Un controller care nu prezintă
  codul curent e refuzat la handshake, cu cod de închidere 1008.

---

## Ce lipsește încă

- Întrebările de trivia (placeholder-e acum, 13 departamente).
- Sunet.
- Mai mulți jucători simultan — hub-ul are un singur slot de controller.

Analiza detaliată a arhitecturii și lista de îmbunătățiri sunt în
[ANALYSIS.md](ANALYSIS.md).
