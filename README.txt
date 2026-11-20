PUZZLE TRADER V2 - JURNAL TEHNIC SI PLAN DE LUCRU
Data: 2026-11-20 (Europe/Bucharest)
Repo: amadalin/Puzzle-Trader-v2
ETAPA 01 - FUNDATIE / STATUS: FINALIZAT PE GITHUB; NEPUBLICAT PE RENDER
Regula: etape mici, fiecare cel mult 10 minute de lucru; oprim dupa verificarea fiecarei etape.

1. OBIECTIV
- Construirea unui proiect NOU, independent de botul curent Puzzle Trader LIVE.
- Pregatirea unei aplicatii Node.js minime, compatibila cu un viitor serviciu Render.
- Activarea explicita a modului READ_ONLY: fara chei de exchange si fara executie de ordine.
- Crearea unui registru stabil de functii, variabile, teste si punct de reluare.

2. CERINTE DE PRODUS (TINTA, NU FUNCTIONALITATI IMPLEMENTATE)
- Maximum 5 utilizatori autentificati simultan; conturi si permisiuni separate.
- KuCoin Futures si Binance Futures, cu date si executie separate pe exchange.
- FEED-1 -> A0/A1/A2/A3/A4 -> confirmare M1 -> Quality/Risk ->
  Supervisor 3TP -> Executor; refolosirea logicii existente doar dupa audit.
- Setari si risc independente pe utilizator; chei API criptate in viitoarea baza de date.
- Interfata web si istoric/jurnal individual, cu recuperare dupa repornire.
- Un singur executor LIVE autorizat per cont; fara executori duplicati.
- PAPER nu este un mod activ al proiectului curent. V2 ramane read-only in dezvoltare.
- Buget tinta: cel mult 20 USD/luna, supus masurarii consumului si preturilor.

3. CE EXISTA DUPA ETAPA 01
- package.json: start (server Node fara dependinte externe), test (node --test).
- src/config/safety.mjs: gard READ_ONLY; orice intentie LIVE configurata explicit
  este refuzata la pornire. Functie separata care blocheaza mutatii exchange.
- src/server.mjs: doar GET /health; toate celelalte rute => 404; fara API de ordine.
- tests/safety.test.mjs: teste pentru configuratie, semnale LIVE si refuzul ordinelor.
- docs/ARCHITECTURE.txt: harta modulelor si granita dintre mediul curent si V2.
- .gitignore: exclude .env, credite, chei, loguri si fisiere locale.
- README.md: trimite la acest jurnal.

4. FUNCTII INTRODUSE
src/config/safety.mjs:
  assertReadOnlyConfiguration(env = process.env)
    Param: env (obiect cu variabile de mediu, fara valori secrete logate).
    Rezultat: { mode:'READ_ONLY', orderExecution:'DISABLED' } imutabil.
    Comportament: arunca eroare la mod/flag LIVE activ.
  denyExchangeWrite()
    Param: niciunul. Rezultat: arunca V2_ORDER_WRITE_FORBIDDEN.
    Intentie: gard suplimentar pentru viitoarele adaptoare, fara adaptor azi.
src/server.mjs:
  Server HTTP Node folosind biblioteca standard.
  GET /health -> 200 JSON cu starea V2 / READ_ONLY.
  Orice alta ruta -> 404; nu exista rute de scriere sau ordine.

5. VARIABILE DE MEDIU FOLOSITE
  PORT: numar TCP 1..65535; implicit 10000 pentru serviciul viitor.
  TRADING_MODE: trebuie READ_ONLY (implicit READ_ONLY).
  ORDER_EXECUTION_MODE: trebuie DISABLED (implicit DISABLED).
  LIVE_TRADING_ENABLED: daca este adevarat => refuza pornirea.
  LIVE_EXECUTION_ENABLED: daca este adevarat => refuza pornirea.
  EXECUTION_ENABLED: daca este adevarat => refuza pornirea.
  ORDER_WRITES_ENABLED: daca este adevarat => refuza pornirea.
  EXCHANGE_WRITE_ENABLED: daca este adevarat => refuza pornirea.
  Nota: Nicio cheie KuCoin/Binance nu este necesara in etapa 01.
  Valorile sensibile vor fi gestionate numai prin secrete de mediu, ulterior.

6. LEGATURI SI LIMITARI
- Repo-ul V2 nu este conectat la Render; niciun deployment.
- Cloudflare LIVE, Render smc-futures-feed-probe si repo-ul vechi raman neatinse.
- Nu exista inca FEED real, baza de date, login, Supervisor sau Executor in V2.
- Testele locale/node verifica doar gardul minimal; nu dovedesc izolarea multiuser.
- Nu exista promisiune de izolarea ordinelor pana la teste end-to-end.
- Repo-ul a fost creat PUBLIC; NU adaugam strategia proprietara sau secrete.
  Recomandare: setare PRIVATE in GitHub inainte de a transfera logica reala.

7. CRITERII DE ACCEPTARE ETAPA 01
[x] Toate fisierele prezente in repo si accesibile din main.
[x] node --test trece (5/5 teste, copie locala a surselor publicate).
[x] Pornirea cu LIVE_TRADING_ENABLED=true este refuzata (exit code 1).
[x] /health raspunde local HTTP 200, fara conexiuni externe; POST /api/orders -> 404.
[x] Nu s-a initiat deployment Render si nu s-au modificat resursele LIVE.
Jurnal: verificate la 2026-11-20. Nota: mediul local nu poate clona GitHub direct; testele au fost executate pe o copie locala a codului din commit, iar prezenta fisierelor a fost verificata separat prin API GitHub.

8. ETAPE URMATOARE (SUBETAPE MAX 10 MIN)
02: Render Free V2 separat, deploy controlat si GET /health.
03: storage persistent si autentificare Signup/Login (maxim 5 useri).
04: conectare exchange si credentiale criptate per utilizator.
05: FEED-1 multi-exchange cu rutare automata din profil.
06: audit si transfer secvential A0-A4, fara schimbarea regulilor.
07: confirmare M1 si Quality.
08: Supervisor + executie, initial numai teste fara ordine LIVE.
09: teste de sarcina, 5 utilizatori, cost total, decizie Starter.
Dupa fiecare subetapa: actualizam README.txt cu data, fisiere, functii,
variabile, teste, commit, deployment si urmatorul pas.

9. PUNCT DE RELUARE
ETAPA 02 a fost executata pe Render Free. Ultima verificare HTTP publica ramane in asteptare.\nCommitul initial al etapei 01: 9080fe1872d4b8455a461a68226914231b8922ba.


=====================================================================
ETAPA 02 - SERVICIU RENDER FREE SEPARAT - 2026-11-20
STATUS: SERVICIU CREAT, BUILD SI START VALIDATE; HTTP /health EXTERN NEVERIFICAT
=====================================================================

OBIECTIV
- Creat serviciu de dezvoltare separat pe Render Free, fara chei API
  si fara activarea executiei LIVE.
- Conectat numai repo-ul nou Puzzle-Trader-v2 / main.
- Pornirea Node.js, protectiile si publicarea controlata sa fie verificabile.

RESURSE CREATE
- Workspace: My Workspace (existent, neschimbat).
- Service: puzzle-trader-v2-dev
- Service ID: srv-dc06lp5g1s2s73ea61g0
- Dashboard: https://dashboard.render.com/web/srv-dc06lp5g1s2s73ea61g0
- URL public: https://puzzle-trader-v2-dev.onrender.com
- Endpoint definit in cod: GET /health
- Plan: Free (fara abonament nou pentru acest serviciu).
- Region: Frankfurt; runtime: Node; branch: main.
- AutoDeploy: no (fara deploy automat la fiecare commit).
- Build command: npm test
- Start command: npm start
- Versiune Node aleasa automat de Render: 26.13.1.
- Nu s-au creat baze de date, disc persistent, alte servicii sau joburi.
- Nu s-a efectuat upgrade la plan platit.

DEPLOYMENT
- Deploy ID: dep-dc06lpdg1s2s73ea629g
- Commit sursa: 90b757b89cee475d07c965e1284b0ced997dcd81
- Rezultat Render: LIVE (2026-11-20 15:45:01 UTC / 17:45:01 Romania).
- Build log: "Build successful"; node --test: 5 trecute, 0 esuate.
- Log startup: "Puzzle Trader V2 started: READ_ONLY; execution DISABLED".
- Log Render: "Your service is live".
- IMPORTANT: GET extern direct /health nu a putut fi verificat din
  mediul asistentului (eroare de rezolvare/acces retea).
  Nu se declara HTTP 200 extern confirmat. Deschiderea linkului /health
  dintr-un browser este necesara pentru criteriul de acceptare complet.

FUNCTII SI RUTE
- Nu s-au introdus functii noi in Etapa 02.
- assertReadOnlyConfiguration(): apelata la startup in src/server.mjs,
  refuza configuratiile LIVE.
- denyExchangeWrite(): gard de cod neconectat inca la vreun executor.
- GET /health: codul defineste raspuns JSON cu
  application=puzzle-trader-v2; mode=READ_ONLY; orderExecution=DISABLED.
- Toate celelalte rute: 404. Nu exista endpoint pentru ordine.
- Nu exista apel catre API private KuCoin/Binance din proiectul V2.

VARIABILE RENDER (numai nume si setari non-secrete)
- TRADING_MODE=READ_ONLY
- ORDER_EXECUTION_MODE=DISABLED
- LIVE_TRADING_ENABLED=false
- LIVE_EXECUTION_ENABLED=false
- EXECUTION_ENABLED=false
- ORDER_WRITES_ENABLED=false
- EXCHANGE_WRITE_ENABLED=false
- PORT: acordat automat de Render; codul foloseste implicit 10000.
- Fara variabile API_KEY, API_SECRET, PASSPHRASE sau alte credentiale.

TESTE SI DOVEZI
[x] Serviciu nou exista separat, plan Free, autoDeploy no.
[x] Repo V2 corect, commitul asteptat.
[x] Build npm test 5/5, fara esecuri.
[x] Server Node pornit cu READ_ONLY, conform jurnalului.
[x] Render confirma status deploy LIVE si serviciu not_suspended.
[x] smc-futures-feed-probe exista in continuare, Free, nealterat.
[ ] GET /health pe URL-ul public cu HTTP 200 verificat extern.
[ ] Test 24/7 de continuitate (nu se poate certifica pe Free).
[x] Nicio activare de ordine, nicio baza de date, niciun cost platit nou.

LIMITARI / SIGURANTA
- Free poate intra in repaus, RAM/CPU sunt limitate, fara disc persistent.
- Repozitoriul GitHub este PUBLIC: NU adaugam strategie privata sau chei.
- Nimic din Cloudflare LIVE / Render existent nu a fost migrat.
- Modificarile README dupa deployment NU apar automat in instanta:
  autoDeploy este dezactivat; viitorul deploy le va prelua.
- Evitam accesul la executie LIVE pana la validare si autorizare separata.
- Nu adaugam un al doilea executor LIVE.

PUNCT DE RELUARE
- Confirmare directa /health in browser sau cu un client HTTP autorizat,
  fara modificari de infrastructura.
- Dupa aceea: ETAPA 03, baza de date persistenta si Signup/Login; FEED-1 dupa conectarea contului.
- Nu porni etapa 03, CI, sau deploymenturi suplimentare fara comanda.

=====================================================================
SPECIFICATIE RUTARE AUTOMATA FEED-1 PE EXCHANGE (ETAPA 05)
Data: 2026-11-20
STATUS: DECIZIE FUNCTIONALA DOCUMENTATA; NU ESTE IMPLEMENTATA
=====================================================================

CERINTA CONFIRMATA
- Exchange-ul este ales la SIGNUP, nu dintr-un selector in aplicatie dupa login.
- Utilizatorul selecteaza KuCoin Futures sau Binance Futures la SIGNUP.
- Dupa inregistrarea sigura a contului (etapa 03), utilizatorul conecteaza
  credentialele corespunzatoare in acelasi flux ghidat, ca pas separat (etapa 04).
- KuCoin: API key + API secret + API passphrase.
- Binance: API key + API secret (fara passphrase KuCoin).
- Dupa autentificare, sistemul citeste exchange_id din profilul utilizatorului
  si conecteaza automat acel utilizator la FEED-1 corespunzator.
- Nu cerem selectarea repetata KuCoin/Binance la fiecare pornire sau scanare.

FLUXUL PREVAZUT
  SIGNUP -> username + parola unica + exchange_id -> cont creat in DB persistenta
  CONECTARE API -> chei specifice -> validare -> stocare criptata
  LOGIN -> identitatea utilizatorului -> profil exchange_id
  ROUTER FEED-1 -> KUCOIN_FUTURES sau BINANCE_FUTURES
  FEED-1 -> date publice de piata pentru exchange-ul ales
  A0-A4 -> M1 -> Supervisor -> Executor specific utilizatorului/exchange-ului

ARHITECTURA PLANIFICATA
- FEED-1 este un subsistem logic cu doua adaptoare: kucoin si binance.
- Fluxurile publice de piata pot fi partajate intre utilizatorii aceluiasi
  exchange pentru reducerea conexiunilor si ratelor API.
- Un utilizator KuCoin NU primeste candlesticks sau semnale Binance.
- Ordinele, API credentials, soldurile, pozitiile si riscul NU sunt comune;
  acestea raman separate pe user_id si exchange_id.
- API credentials private NU sunt transmise catre modulul de feed public.
- Niciun API key sau secret nu este scris in README sau cod.
- Daca nu exista utilizatori activi pe un exchange, adaptorul aferent poate
  ramane inactiv; aceasta optimizare va fi evaluata ulterior.
- Limita de maxim 5 utilizatori ramane cerinta proiectului.

INTERFATA PLANIFICATA
- Signup: username, parola unica si alegerea exchange-ului.
- Pas securizat imediat urmator: campurile API specifice exchange-ului.
- Login/dashboard: feed selectat automat din profil.
- Nu exista selector manual de exchange in interfata principala.
- Modificarea ulterioara a exchange-ului necesita flux explicit de
  reconectare/revalidare (de proiectat, nu implementat).

MODULE SI VARIABILE DE PROIECT (PROPUNERI, NU COD ACTIV)
- user_id: identitatea utilizatorului autentificat.
- exchange_id: KUCOIN_FUTURES | BINANCE_FUTURES, atribuit profilului.
- resolveFeedForUser(user_id): identifica adaptorul din profilul autorizat.
- feedAdapter(exchange_id): alege conexiunea WS/REST publica.
- api_key, api_secret, api_passphrase: secrete stocate criptat in viitorul
  modul accounts; passphrase numai pentru KuCoin; NU in FEED-1.
- subscription_key: simbol + exchange_id + timeframe; doar date publice.
- Aceste nume sunt contracte preliminare, nu implementari existente.

SECURITATE SI STARE
- Nu s-a activat niciun endpoint LIVE.
- Conturile, baza de date, signup si rutarea FEED-1 NU exista in V2 inca.
- Nu s-a pornit niciun deploy; modificarile exista numai in GitHub.
- Render autoDeploy este dezactivat: documentul ajunge pe instanta
  V2 la urmatorul deployment aprobat.

PUNCT DE RELUARE
- Etapa 03.1: alege o DB persistenta si pregateste schema/account security.
- Etapa 03.2: Signup/Login si limitarea atomica la 5 conturi.
- Etapa 04: conectare exchange in interfata securizata, teste read-only.
- Etapa 05: FEED-1 si rutare implicita; fara chei reale in feed.
- Nu crea feed-urile sau loginul real in afara subetapei aprobate.

=====================================================================
DECIZIE ARHITECTURALA CONFIRMATA - ORDINE AUTH INAINTE DE FEED
Data: 2026-11-20
STATUS: PLAN ACTUALIZAT; FARA MODIFICARI IN COD SAU RENDER
=====================================================================

RATIONAMENT
- Mai intai identitatea utilizatorului si alegerea exchange-ului,
  apoi conectarea criptata a credentialelor sale, apoi FEED-1 automat.
- Cheile deja configurate in proiectul vechi LIVE NU se importa automat
  in V2. Nu se citesc, copiaza sau reintroduc in cod/loguri/README.
- Public market data poate fi citit fara credentiale private; FEED-1
  trebuie sa depinda de exchange_id, NU de disponibilitatea API key.
- Formularul poate avea un wizard unificat, dar cele 2 operatii
  (Signup si Connect API) se executa separat si sigur in backend.

ETAPA 03 - INCEPEM AICI (MAX 10 MIN PER SUBETAPA)
03.1: Alegere DB persistenta conform bugetului si modelul de date.
      Fara DB pe filesystemul efemer Render Free; fara cost nou fara acord.
03.2: Signup cu max 5 utilizatori, parola unica generata, hash Argon2id,
      exchange_id stocat definitiv in profil, fara chei API la acest pas.
03.3: Login cu sesiuni sigure (HttpOnly, Secure, SameSite), throttling,
      controale de acces, teste de izolare intre useri.

ETAPA 04 - EXCHANGE CONNECTION
04.1: Dupa Signup, intr-un pas securizat, userul introduce:
      KUCOIN_FUTURES: API key, API secret, API passphrase;
      BINANCE_FUTURES: API key, API secret.
04.2: Verificari de format/permisii si conexiune READ-ONLY,
      fara tranzactii, retrageri sau expunerea secretelor.
04.3: Criptare autentificata pentru credentiale (ex. AES-256-GCM);
      cheia de criptare in Render secret manager/env, separata de DB.
      Cheile personale NU sunt stocate in parola, localStorage sau loguri.

ETAPA 05 - FEED-1
05.1: getAuthenticatedUser() -> exchange_id din profil -> adaptor public.
05.2: WS/REST KuCoin sau Binance in functie de exchange_id.
05.3: Streaming si cache pentru date PUBLICE reutilizabile per exchange,
      date private si executie izolate per user_id + exchange_id.
05.4: Cand API credentialele nu sunt completate, contul poate vedea
      date publice daca este autorizat, dar orice functie privata
      ramane blocata. Fara comutator manual exchange la fiecare pornire.

FUNCTII PLANIFICATE (NU IMPLEMENTATE)
- createUser(username, generatedPassword, exchange_id)
- authenticateUser(username, password)
- createSession(user_id)
- saveEncryptedExchangeCredentials(user_id, exchange_id, encryptedSecret)
- resolvePublicFeedForUser(user_id)

VARIABILE PLANIFICATE (NU EXISTENTE IN RENDER)
- user_id; username; password_hash; exchange_id.
- CREDENTIAL_ENCRYPTION_KEY: secret configurat numai in backend, nu in DB.
- DATABASE_URL: conexiunea la viitoarea baza de date persistenta.
- api_key / api_secret / api_passphrase: date sensibile doar in formular
  protejat si stocare criptata, niciodata in jurnalul README.
- Numele exacte pot fi stabilite in Etapa 03.1.

CRITERII DE ACCEPTARE
[ ] DB persistenta aprobata si configurata.
[ ] Signup si max 5 utilizatori verificat.
[ ] Login si izolarea sesiunilor verificate.
[ ] Credentiale API criptate si validate fara ordine.
[ ] FEED-1 selectat automat numai din exchange_id autentificat.
[ ] Nicio cheie preluata automat din proiectul LIVE.
[ ] Botul LIVE, Render probe si Cloudflare raman neatinse.

PUNCT DE RELUARE
Etapa 03.1: DB persistenta si schema. Nu porni Etapa 04/05 inainte.

=====================================================================
ETAPA 03.1 - CLOUDFLARE D1 AUTH (EXECUTATA 2026-11-20)
STATUS: COMPLETATA - SCHEMA REALA, AUTH API NEIMPLEMENTAT
=====================================================================

DECIZIE DE COST
- Refolosim planul deja activ Cloudflare Workers Paid.
- Cloudflare D1 are cote incluse; pentru maxim 5 utilizatori costul
  incremental asteptat este 0 USD/luna la nivelul folosirii prevazute,
  cu posibil cost suplimentar doar daca se depasesc limitele planului.
- Nu am creat Neon sau PostgreSQL Render si nu am cumparat un plan nou.
- Referinta: https://developers.cloudflare.com/d1/platform/pricing/

RESURSA REALA CLOUD
- Nume: puzzle-trader-v2-auth
- UUID D1: d375b749-1e14-461e-941b-4dfa06165ccd
- Cont Cloudflare: cel existent; jurisdiction=eu; read_replication=disabled.
- Bazele anterioare puzzle-trader-paper si puzzle-trader-auth-lab
  au ramas neatinse; NU le reutilizam pentru conturile V2.
- Nu s-a creat niciun Worker nou si nu s-a modificat Render V2.

FISIER SURSA / MIGRARE
- migrations/0001_auth.sql (git, nonsecret).
- Migrarea 1 aplicata cu succes (11/11 instructiuni SQL).
- 5 tabele: users, user_sessions, exchange_credentials,
  auth_rate_limits, schema_migrations.
- 4 trigger-e: users_max_five, users_exchange_immutable,
  credentials_exchange_match_insert, credentials_exchange_match_update.
- 1 index pentru sesiuni.
- D1 confirma 0 users, 0 sessions, 0 credentials, 0 auth_rate_limits.

PROTECTII REALIZATE IN SCHEMA
- Limita de 5 utilizatori aplicata atomic la nivel DB.
- Exchange-ul ales la signup nu poate fi modificat prin UPDATE banal.
- Campul password_hash nu permite parola nehashuita intentionat,
  dar calculul/validarea reala Argon2id revine aplicatiei (urmeaza).
- Sesiunile vor stoca doar hash-ul tokenului, cu expirare/revocare.
- Cheile exchange au doar camp de pachet criptat, nonce si versiune;
  nicio cheie reala nu a fost stocata si nicio cheie maestra nu se pune
  in D1 sau GitHub.
- Verificare de consistenta exchange_id intre user si credentiale.
- Tabel pentru rate limiting; logica de blocare HTTP urmeaza.
- Jurisdictie UE pentru stocarea bazei.

TESTE
[x] Cloudflare a creat baza separata si metadata indica EU.
[x] 11/11 instructiuni schema aplicate fara eroare.
[x] Tabele, triggere si index enumerate direct din sqlite_master.
[x] Migrare versiune=1 confirmata in D1.
[x] Toate tabelele personale sunt goale.
[x] Test local SQLite: al saselea user este respins cu MAX_FIVE_USERS.
[x] Test local SQLite: schimbarea exchange_id este respinsa.
[ ] Teste end-to-end Signup/Login - inca nu exista endpointurile.
[ ] Teste criptare credentiale si sesiuni - etapa viitoare.

PUNCT DE RELUARE
- Etapa 03.2: Worker de autentificare V2, separat, conectat
  exclusiv la D1 puzzle-trader-v2-auth.
- Signup: parola generata si hash Argon2id (niciodata in DB/loguri).
- Login: sesiuni sigure HttpOnly/Secure/SameSite, protectie brute force.
- Conectarea API reala abia in Etapa 04, din cont autentificat.
- FEED-1 abia in Etapa 05.
- Nicio activare LIVE/tranzactionare fara aprobarea distincta.
