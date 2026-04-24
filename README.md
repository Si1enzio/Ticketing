# Ticket Hub MVP

Platforma independenta de ticketing pentru evenimente, construita cu Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui si Supabase.

Aplicatia este gandita pentru bilete gratuite in prezent, dar schema, rolurile, statusurile si fluxurile server-side sunt pregatite pentru a suporta ulterior bilete platite, transferuri, campanii, abonamente, membership si integrare cu turnicheti. Primul demo operational este sportiv, cu Stadionul Municipal "Orhei", dar produsul nu este legat de un singur club, stadion sau tip de eveniment.

## Ce include

- autentificare cu Supabase Auth: inregistrare, login, reset parola
- pagina publica cu evenimente publicate
- pagina de eveniment cu harta interactiva de locuri
- hold temporar pe locuri si confirmare de rezervare
- generare de bilete individuale cu QR semnat
- cabinet personal cu bilete active si istoric
- pagina individuala de bilet, print, PDF si share
- scanner mobil pentru stewardi cu validare server-side
- admin panel pentru evenimente, venue-uri/stadioane, locuri, moderare si export CSV
- schema SQL modulara cu RLS, view-uri de raportare si functii tranzactionale
- seed demo pentru Stadionul Municipal "Orhei" ca prima configuratie sportiva

## Stack

- Next.js 16.2 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- Supabase Auth + Postgres + RLS
- jose pentru QR token signing
- `@react-pdf/renderer` pentru export PDF
- `@yudiel/react-qr-scanner` pentru scanare QR

## Arhitectura pe scurt

### Frontend

- `src/app` contine rutele App Router pentru public, cabinet, scanner si admin
- `src/components` contine componente UI reutilizabile si zonele interactive
- `src/components/stadium` contine modulul reutilizabil pentru overview map, tribune, sectoare si seat map detaliat
- `src/lib/actions` contine Server Actions pentru admin si rezervari
- `src/lib/supabase` contine clientii si query helpers
- `src/lib/security/tickets.ts` gestioneaza token-urile QR semnate
- `src/lib/stadium` contine tipurile, registry-ul, utilitarele de geometrie si localizarea modulului de stadion
- `src/data/stadiums` contine configuratiile per stadion si template-ul pentru stadioane noi

### Database

Migrarea SQL defineste tabelele principale:

- `profiles`
- `user_roles`
- `stadiums`
- `gates`
- `stadium_sectors`
- `seats`
- `matches`
- `match_settings`
- `match_sector_overrides`
- `seat_holds`
- `reservations`
- `reservation_items`
- `tickets`
- `ticket_scans`
- `user_blocks`
- `abuse_flags`
- `audit_logs`
- `admin_notes`
- `waitlist_entries`

Functiile cheie din baza de date:

- `generate_sector_seats`
- `hold_seats`
- `confirm_hold_reservation`
- `scan_ticket_token`
- `cancel_ticket_admin`
- `reissue_ticket_qr`
- `sync_abuse_flags_for_user`

View-urile de raportare folosite de UI:

- `public_match_cards`
- `match_seat_status`
- `ticket_delivery_view`
- `match_admin_overview`
- `admin_user_overview`
- `ticket_usage_summary`
- `user_abuse_metrics`

## Roluri

- `guest`: vede evenimentele publice si disponibilitatea generala
- `user`: poate obtine bilete pana la limita configurata pe eveniment, isi vede biletele si istoricul
- `steward`: foloseste scannerul si valideaza accesul
- `admin`: gestioneaza evenimente, venue-uri/stadioane, locuri, moderare si rapoarte
- `superadmin`: are toate drepturile, inclusiv acordarea de roluri si override la limite

Rolurile sunt stocate in `public.user_roles`, iar validarea se face server-side in query-uri, Server Actions si functii SQL.

## Pornire locala

### 1. Instalare

```bash
npm install
```

### 2. Configureaza mediul

Pleaca de la `.env.example`:

```bash
cp .env.example .env.local
```

Seteaza:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sau `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`

`SUPABASE_JWT_SECRET` trebuie sa fie acelasi secret JWT configurat in proiectul Supabase. Acesta este folosit pentru semnarea si verificarea token-urilor QR.

### 3. Ruleaza migrarea si seed-ul

Varianta SQL editor / Supabase Studio:

1. ruleaza, in ordine, fisierele din `supabase/migrations`
2. ruleaza `supabase/seed.sql`

Varianta Supabase CLI, daca proiectul este deja initializat sau link-uit:

```bash
supabase db push
psql "YOUR_CONNECTION_STRING" -f supabase/seed.sql
```

### 4. Porneste aplicatia

```bash
npm run dev
```

Aplicatia porneste implicit la [http://localhost:3000](http://localhost:3000).

## Conturi demo si roluri

Seed-ul nu forteaza crearea de utilizatori in `auth.users`, pentru a evita dependente fragile intre versiuni Supabase. In schimb, daca aceste conturi exista deja in Supabase Auth, seed-ul le atribuie automat nume si roluri:

- `superadmin.demo@orhei.local`
- `admin.demo@orhei.local`
- `steward.demo@orhei.local`
- `supporter.demo@orhei.local`
- `supporter.flagged@orhei.local`

Flux recomandat:

1. creeaza conturile din UI sau din Supabase Auth
2. ruleaza din nou `supabase/seed.sql`
3. conturile vor primi automat rolurile si, unde este cazul, bilete demo si flag-uri de risc

### Ce populeaza seed-ul

- Stadionul Municipal "Orhei"
- porti: Vest, Est, Nord
- sectoare: V1, V2, E1, N
- locuri generate automat din `rows_count x seats_per_row`
- locuri dezactivate, obstructionate si interne
- evenimente sportive demo:
  - unul publicat cu scanner activ
  - unul publicat cu override pe sectoare
  - unul finalizat pentru rapoarte si no-show
- rezervari demo pentru `supporter.demo@orhei.local` daca utilizatorul exista
- utilizator flag-uit, temp ban si note interne pentru `supporter.flagged@orhei.local` daca utilizatorul exista

## Fluxuri principale

### Rezervare

1. utilizatorul intra pe pagina unui eveniment
2. selecteaza locurile disponibile din harta
3. sistemul creeaza un hold temporar
4. utilizatorul confirma rezervarea
5. se genereaza cate un bilet per loc
6. biletele apar in `Cabinet personal`

### Modul stadion

Fluxul de selectie foloseste acum un modul reutilizabil pe 3 niveluri:

1. `overview stadion` - SVG interactiv cu sectoare clickabile
2. `tribuna / sector` - selectie operationala pe zone, cu capacitate si status
3. `seat map sector` - randuri si locuri, integrat in fluxul existent de hold / emitere / checkout

Modulul nu redeseneaza toata aplicatia de ticketing. El este integrat in pagina:

- `/meciuri/[slug]/rezerva`

iar logica de business ramane in:

- `src/lib/actions/reservations.ts`
- functiile SQL `hold_seats`, `confirm_hold_reservation`, `complete_demo_payment`

### Cum adaugi un stadion nou

1. creezi un config nou in `src/data/stadiums/<nume-stadion>.ts`
2. definesti:
   - `viewBox`
   - `tribunes`
   - `tiers` daca ai nevoie
   - `sectors` cu `code`, `tribuneId`, `shape`, `isVisible`, `isBookable`
   - eventual `decorations`
3. inregistrezi config-ul in `src/lib/stadium/stadium-config-registry.ts`
4. adaugi aliasurile folosite pentru rezolvare:
   - `mapKey`
   - slug stadion
   - nume stadion
   - optional `stadiumId` daca vrei legare directa pe baza de date

Exista deja:

- `src/data/stadiums/orhei.ts` - prima implementare reala
- `src/data/stadiums/stadium-template.ts` - punct de plecare pentru alte stadioane

### Cum functioneaza registry-ul

Registry-ul incearca sa rezolve configuratia in ordinea:

1. `mapKey`
2. `stadiumSlug`
3. `stadiumName`
4. `stadiumId`

Daca nu exista configuratie custom, modulul foloseste automat un fallback generat din sectoarele reale ale meciului. Astfel, stadionul continua sa functioneze chiar si inainte de a avea o geometrie SVG desenata manual.

### Cum editezi sectoare, randuri si locuri

- pentru administrare structurala:
  - `Admin -> Stadion`
  - editezi tribune, sectoare, culori si numarul de randuri / locuri
- pentru builder-ul overview SVG reutilizabil:
  - `Admin -> Harta stadion`
  - sau butonul `Deschide builderul pentru harta SVG` din `Admin -> Stadion`
  - configurezi `mapKey`, `viewBox`, shape-urile sectoarelor si preview-ul overview
  - salvarile sunt persistate in `public.stadium_map_configs` si sunt folosite direct in fluxul public al meciului
- pentru editare de status loc:
  - `SeatFlagEditor` din `src/components/seat-flag-editor.tsx`
  - poti marca `dezactivat`, `obstructionat`, `intern`
- pentru geometria overview-ului:
  - poti folosi builder-ul admin pentru configuratii persistate in baza de date
  - sau, pentru seed/configuri versionate, modifici config-ul din `src/data/stadiums/...`
  - harta mare este separata de seat map-ul operational

Aceasta separare este intentionata:

- overview map = navigare vizuala
- sector seat map = selectie detaliata si statusuri live

### Ready pentru extindere

Modulul este pregatit pentru:

- stadioane multiple
- tribune si tiers diferite
- sectoare ascunse
- zone VIP / media / upper-lower tiers
- sectoare curbe sau custom-path
- alocare viitoare a `mapKey` direct din admin sau din baza de date

### Scanare

1. stewardul selecteaza meciul din `/scanner`
2. scaneaza QR-ul
3. backend-ul valideaza semnatura, meciul, statusul si versiunea tokenului
4. daca este valid, biletul devine `used` atomic
5. rezultatul este logat in `ticket_scans`

### Moderare si abuz

Scorul de abuz este calculat din:

- total bilete rezervate
- total bilete scanate
- raport no-show
- recurenta pe mai multe meciuri

Cand scorul depaseste pragul, functia `sync_abuse_flags_for_user` creeaza sau actualizeaza intrari in `abuse_flags`.

## Pagini importante

- `/` - homepage cu evenimente publicate
- `/autentificare` - login, signup, reset
- `/meciuri/[slug]` - detalii eveniment
- `/meciuri/[slug]/rezerva` - seat map si selectie locuri
- `/confirmare/[reservationId]` - confirmare rezervare
- `/cabinet` - cabinet personal
- `/bilete/[ticketCode]` - bilet individual cu QR
- `/bilete/[ticketCode]/pdf` - export PDF
- `/scanner` - steward scanner
- `/admin` - dashboard admin
- `/admin/meciuri` - management evenimente
- `/admin/stadion` - builder stadion si editare locuri
- `/admin/stadion/harta` - builder pentru overview SVG si configuratia reutilizabila a hartii stadionului
- `/admin/utilizatori` - moderare si roluri
- `/admin/abuz` - utilizatori suspecti
- `/admin/export?kind=tickets|scans|users` - export CSV

## Observatii de implementare

- Aplicatia functioneaza si fara Supabase configurat, folosind mock data pentru demo vizual si dezvoltare UI.
- In productie, toate actiunile privilegiate trebuie rulate doar cu Supabase configurat si migrarea aplicata.
- Semnarea QR-urilor foloseste `SUPABASE_JWT_SECRET`. In lipsa lui, codul foloseste un secret local demo doar pentru build local, nu pentru productie.
- RLS este activ pe tabelele sensibile; utilizatorii vad doar propriile rezervari si bilete.
- Pentru scanare si rezervari, logica critica este mutata in functii SQL `security definer` pentru a reduce race conditions.

## Comenzi utile

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Extensii viitoare deja pregatite de arhitectura

- bilete platite si checkout
- discount codes / promo campaigns
- season passes / memberships
- transfer de bilete
- waitlist activa
- wallet passes
- integrare SMS / email
- turnstile si offline QR validation

## Repository

Repository-ul sursa: [Si1enzio/Ticketing](https://github.com/Si1enzio/Ticketing)
