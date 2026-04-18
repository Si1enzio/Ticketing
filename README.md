# Milsami Ticketing MVP

Platforma MVP de ticketing pentru Stadionul Municipal "Orhei", construita cu Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui si Supabase.

Aplicatia este gandita pentru bilete gratuite in prezent, dar schema, rolurile, statusurile si fluxurile server-side sunt pregatite pentru a suporta ulterior bilete platite, transferuri, campanii, membership si integrare cu turnicheti.

## Ce include

- autentificare cu Supabase Auth: inregistrare, login, reset parola
- pagina publica cu meciuri publicate
- pagina de meci cu harta interactiva de locuri
- hold temporar pe locuri si confirmare de rezervare
- generare de bilete individuale cu QR semnat
- cabinet personal cu bilete active si istoric
- pagina individuala de bilet, print, PDF si share
- scanner mobil pentru stewardi cu validare server-side
- admin panel pentru meciuri, stadion, locuri, moderare si export CSV
- schema SQL modulara cu RLS, view-uri de raportare si functii tranzactionale
- seed demo pentru Stadionul Municipal "Orhei"

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
- `src/lib/actions` contine Server Actions pentru admin si rezervari
- `src/lib/supabase` contine clientii si query helpers
- `src/lib/security/tickets.ts` gestioneaza token-urile QR semnate

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

- `guest`: vede meciurile publice si disponibilitatea generala
- `user`: poate rezerva pana la limita configurata pe meci, isi vede biletele si istoricul
- `steward`: foloseste scannerul si valideaza accesul
- `admin`: gestioneaza meciuri, stadion, locuri, moderare si rapoarte
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
- 3 meciuri demo:
  - unul publicat cu scanner activ
  - unul publicat cu override pe sectoare
  - unul finalizat pentru rapoarte si no-show
- rezervari demo pentru `supporter.demo@orhei.local` daca utilizatorul exista
- utilizator flag-uit, temp ban si note interne pentru `supporter.flagged@orhei.local` daca utilizatorul exista

## Fluxuri principale

### Rezervare

1. utilizatorul intra pe pagina unui meci
2. selecteaza locurile disponibile din harta
3. sistemul creeaza un hold temporar
4. utilizatorul confirma rezervarea
5. se genereaza cate un bilet per loc
6. biletele apar in `Cabinet personal`

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

- `/` - homepage cu meciuri publicate
- `/autentificare` - login, signup, reset
- `/meciuri/[slug]` - detalii meci
- `/meciuri/[slug]/rezerva` - seat map si selectie locuri
- `/confirmare/[reservationId]` - confirmare rezervare
- `/cabinet` - cabinet personal
- `/bilete/[ticketCode]` - bilet individual cu QR
- `/bilete/[ticketCode]/pdf` - export PDF
- `/scanner` - steward scanner
- `/admin` - dashboard admin
- `/admin/meciuri` - management meciuri
- `/admin/stadion` - builder stadion si editare locuri
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
