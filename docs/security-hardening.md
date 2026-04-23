# Securitate platforma

Acest document noteaza masurile active si regulile operationale pentru platforma
Milsami Ticketing.

## Protectii aplicate in aplicatie

- Headere de securitate setate din `src/proxy.ts`: CSP, HSTS, `frame-ancestors`,
  `nosniff`, referrer policy si permissions policy.
- Validare de origine pentru server actions si endpoint-uri sensibile.
- Raspunsuri fara cache pentru PDF, imagine bilet, CSV si fluxuri de autentificare.
- Rate limiting aplicativ pentru scanarea QR.
- Erori de autentificare si scanare sanitizate, fara mesaje SQL brute catre utilizator.
- Functii Supabase critice executabile doar de rolurile corecte, cu `search_path`
  fixat si grant-uri restranse.
- View-uri admin filtrate server-side dupa rol.

## Vercel Firewall activ

Configuratia Vercel Firewall este activa pentru proiectul de productie.

Reguli active:

- `Block common web probes`: blocheaza sonde comune pentru WordPress, PHP, `.env`,
  `.git`, `phpmyadmin`, `xmlrpc.php` si rute similare care nu exista in aplicatie.
- `Rate limit scanner validation API`: limiteaza `POST /api/scanner/validate` la
  `240` cereri/minut/IP. Este suficient de permisiv pentru stewardzi, dar blocheaza
  brute force-ul de token-uri QR.
- `Challenge scripted API clients`: aplica browser challenge pentru user-agent-uri
  de tip `curl`, `wget`, `python-requests`, `Go-http-client`, `Scrapy` pe rute API.
- `bot_protection`: activ cu actiunea `challenge`.
- `ai_bots`: activ cu actiunea `deny`.

## OWASP CRS

Vercel raporteaza CRS in mod `log` pentru `sqli`, `xss`, `rce` si `gen`. Nu am trecut
CRS in `deny` automat, deoarece poate genera false positive pe formulare admin, nume
de echipe sau continut introdus manual. Recomandarea este:

- monitorizare in log timp de cateva zile;
- daca nu apar false positive, activare progresiva `deny` pentru `sqli`, `xss`,
  apoi `rce`;
- evitarea activarii agresive pentru `gen` fara observare.

## Operare in ziua meciului

- Stewardzii trebuie sa foloseasca pagina dedicata de scanner, nu endpoint-uri brute.
- Daca un steward este blocat de rate limit, verificati daca dispozitivul foloseste
  acelasi IP public cu multe alte telefoane. Limita poate fi crescuta temporar.
- Nu activati Attack Challenge Mode permanent. Folositi-l doar sub atac real, deoarece
  poate adauga un pas vizibil pentru suporteri.
- Sub atac, mergeti in Vercel Dashboard -> Project -> Firewall si activati Attack
  Challenge Mode temporar.

## Verificari periodice

- Verificati evenimentele din Vercel Firewall dupa fiecare meci.
- Verificati logurile Supabase pentru erori RLS sau apeluri respinse.
- Rotiti parolele si token-urile daca au fost expuse in conversatii, fisiere sau
  capturi de ecran.
- Pastrati `.env.local`, `.env.vercel*` si orice backup cu secrete in afara Git.
