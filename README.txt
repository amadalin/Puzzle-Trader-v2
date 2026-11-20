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
03: plan FEED multi-exchange, apoi implementare incremental.
04: audit si transfer secvential A0-A4, fara schimbarea regulilor.
05: confirmare M1 si Quality.
06: multiuser + baza de date, izolarea cheilor/securitate.
07: Supervisor + executie, initial numai simulari.
08: teste de sarcina, 5 utilizatori, cost total, decizie Starter.
Dupa fiecare subetapa: actualizam README.txt cu data, fisiere, functii,
variabile, teste, commit, deployment si urmatorul pas.

9. PUNCT DE RELUARE
ETAPA 02 este urmatoarea. Nu o incepe automat.\nCommitul initial al etapei 01: 9080fe1872d4b8455a461a68226914231b8922ba.
