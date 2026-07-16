# KVIZY

**Vælg. Tænk. Vind.** KVIZY er et komplet dansk, mobil-first quizspil til venner, familier, fester, undervisning og pubquiz. Første version er lokal multiplayer på én enhed og virker uden login, database eller AI-nøgle.

## Produktflow

1. Vælg Alle mod alle, Holdkamp, Solo, Hurtig quiz, Risiko eller Mystery Mix.
2. Tilføj 1–12 spillere eller 2–6 hold, og vælg mellem 59 søgbare kategorier.
3. Indstil 3–100 spørgsmål, niveau 1–5, fast/blandet/stigende sværhedsgrad samt valgfrie timer-, tidsbonus-, minuspoint- og finaleindstillinger.
4. Giv enheden videre. Svar låses, forklaring og point vises, og spillet gemmes løbende.
5. Se vinder, scoreboard, svarprocent, streaks, gennemgang, historik og revanche.

## Stack og arkitektur

- Next.js 16 App Router, React 19.2 og strict TypeScript
- Tailwind CSS 4, shadcn/ui, Motion og AI Elements
- 2.982 indbyggede spørgsmål med plausible, type-matchende svarmuligheder; offline kernespil og PWA-service worker
- 12 spørgsmålstyper, blandt andet rækkefølge, nærmest vinder, udsagn, beskrivelser og kategorikryds
- localStorage til aktivt spil, historik, indstillinger, set-historik og offline spillerrapporter
- Drizzle ORM + valgfri Neon PostgreSQL med lazy klientinitialisering
- Vercel AI SDK 6 `generateText` + `Output.object()` + Zod til validerede AI-batches
- Vitest og Playwright i Chromium på mobil- og desktop-viewports

## Lokal installation

Krav: Node.js 20.9+ og npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Appen virker uden værdier i `.env.local`. Åbn `http://localhost:3000`.

## Miljøvariabler

| Variabel             |             Påkrævet | Formål                                               |
| -------------------- | -------------------: | ---------------------------------------------------- |
| `DATABASE_URL`       |                  Nej | Neon/PostgreSQL til central spørgsmålsadministration |
| `ADMIN_SECRET`       |         Ja for admin | Lang tilfældig hemmelighed; kontrolleres server-side |
| `VERCEL_OIDC_TOKEN`  | Automatisk på Vercel | AI Gateway-godkendelse                               |
| `AI_GATEWAY_API_KEY` |           Alternativ | Lokal AI Gateway-adgang                              |
| `AI_MODEL`           |                  Nej | Standard: `openai/gpt-5.4-mini`                      |

## Database

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Drizzle-skemaet modellerer kategorier, spørgsmål, spil, runder, spillere, hold, svar, plays, rapporter, generationsbatches og indstillinger. Klienten oprettes først ved faktisk brug, så build og kernespil aldrig afhænger af `DATABASE_URL`.

## Spørgsmålsbank og import/eksport

Seedbanken kombinerer håndskrevne spørgsmål med lokale snapshots fra Wikidata CC0. Distraktorer vælges inden for samme faktatype: eksempelvis hovedstæder mod hovedstæder, instruktører mod instruktører og sportsgrene mod sportsgrene. Ingen kategori har færre end ti tilgængelige spørgsmål, og udvælgeren kan også bruge relevante sekundære kategorier. Nye kategorier tilføjes i `src/lib/categories.ts`.

Wikidata-importerne er langsomme, genoptagelige og gemmer efter hver relation. `--missing` springer allerede hentede relationer over:

```bash
npm run questions:update-wikidata
npm run questions:update-culture
npm run questions:update-thin -- --missing
```

```bash
npm run questions:export -- eksport.json
npm run questions:import -- eksport.json
```

Importkommandoen Zod-validerer hele filen og afviser dublerede fingerprints. Admin på `/admin` kan søge, filtrere, redigere, aktivere/deaktivere, eksportere, previewe AI-batches, se automatiske kvalitetsadvarsler og læse centralt synkroniserede spillerrapporter. Databaseændringer hentes som små overrides ved appstart; den komplette indbyggede bank forbliver offline-fallback. AI vises som utilgængelig, hvis credentials mangler.

Efter hvert svar kan spilleren rapportere forkert svar, uklar formulering, forkert niveau, dårlige svarmuligheder eller forældet information. Rapporten gemmes først lokalt og synkroniseres derefter via `POST /api/reports`, når en database er tilgængelig. Generiske faktafelter skjules automatisk i spillet.

## AI-generator

`POST /api/admin/generate` er beskyttet af HttpOnly-admincookie og en enkel IP-rate-limit. Generatoren modtager kategori, sekundær kategori, niveau, antal og type. Output skal bestå schema-, sprog-, options-, banned phrase-, kilde- og nær-dubletkontrol. Godkendte spørgsmål lander som `draft`; de aktiveres ikke automatisk.

## Anti-repeat

Udvælgeren kombinerer stabil normalisering/hash, tokenbaseret Jaccard-similaritet, core-fact fingerprint, spillerens set-historik, seneste dato, antal visninger, sværhedsafstand, kategorifavoritter og type-/kategorisekvenser. Et spørgsmål eller en nær-dublet kan aldrig vælges to gange i samme spil.

## Test og kvalitet

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run check
```

E2E-flowet dækker nyt spil, spillernavn, kategorier, niveau/længde, svar, spillerskift, refresh/fortsæt, afslutning, resultat, revanche, tomt udvalg, adminbeskyttelse samt mobil og desktop.

## Deployment på Vercel

```bash
vercel link
vercel env add ADMIN_SECRET production
vercel env add DATABASE_URL production  # valgfri
vercel --prod
```

Kør migration og seed mod produktions-`DATABASE_URL` før adminaktivering. AI Gateway kan bruge Vercel OIDC; uden AI-adgang fungerer alle 2.982 seedspørgsmål stadig.

## Installation som mobilapp

Manifest, service worker, safe areas og standalone/fullscreen-visning er inkluderet. På understøttede Android-browsere vises en native “Installér KVIZY”-knap nederst i “Sådan spiller I”. På iPhone vises Safari-trinene “Del → Føj til hjemmeskærm”. Installationssektionen vises kun på mobil og skjules, når appen allerede kører installeret.

## Projektstruktur

- `src/components/game-shell.tsx` – samlet gæstespil og lokale flows
- `src/lib/engine.ts` – point, sværhedsgrad, shuffle, fingerprints og udvalg
- `src/data/` – kategoridrevet seedbank
- `src/lib/ai/` – struktureret generation og kvalitetskontrol
- `src/lib/db/` + `drizzle/` – typesikkert skema og migration
- `src/app/admin` + `src/app/api/admin` – beskyttet admin og generator
- `e2e/` og `src/lib/*.test.ts` – browser- og enhedstests

## Senere realtime-multiplayer

Den lokale `Game`-model og deterministiske `PlayerAnswer`-events kan flyttes til server-authoritative rooms. Tilføj rumkode, WebSocket/Realtime-transport og optimistic event reconciliation, mens den nuværende lokale reducer bevares som offline fallback. Login og profiler kan lægges ovenpå uden at ændre spørgsmålsbanken.
