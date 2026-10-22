# Carnet de Voiture V1 : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** livrer la PWA Carnet de Voiture décrite dans la spec : comptes séparés, voitures, journal, factures, échéances, accueil et coûts.

**Architecture :** une SPA React parle directement à Supabase (Auth, Postgres, Storage). Il n'y a pas de serveur applicatif. La sécurité repose sur les politiques RLS et sur des triggers d'appartenance, testés en pgTAP. La logique métier est pure, dans `src/domain/`, et testée unitairement. L'accès aux données passe par des hooks TanStack Query dans `src/api/`.

**Tech Stack :** Vite 6, React 19, TypeScript strict, React Router 7, TanStack Query 5, `@supabase/supabase-js` 2, Tailwind CSS 4, `vite-plugin-pwa`, `date-fns` 4, Vitest + Testing Library, Supabase CLI + pgTAP.

**Spec :** `docs/superpowers/specs/2026-10-22-carnet-voiture-design.md`

## Global Constraints

- L'interface est entièrement en français. Le code (identifiants, commentaires) est en anglais.
- Les montants sont stockés en centimes (`integer`), jamais en flottant. L'affichage utilise `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })`.
- Les dates métier sont des chaînes `YYYY-MM-DD` (colonne `date`). Ne jamais faire `new Date('YYYY-MM-DD')`, qui interprète la date en UTC. « Aujourd'hui » vient de `todayLocal(): string` (Task 2).
- Fichiers acceptés : `application/pdf`, `image/jpeg`, `image/png`, `image/heic`, `image/webp`, 10 Mo au maximum. Les photos sont redimensionnées à 2 000 px max et converties en JPEG avant l'envoi.
- Seuils des échéances : « bientôt » = 30 jours ou 1 000 km.
- Les fichiers sont rangés sous `{user_id}/{vehicle_id}/{uuid}.{ext}` dans le bucket privé `factures`. L'affichage passe par des URL signées de 300 s.
- Une date saisie ne peut pas dépasser aujourd'hui + 1 an. Les km et les litres sont strictement positifs. Ces règles sont vérifiées côté client et par des `check` en base.
- Seules la clé `anon` et l'URL publique sont dans le front (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Jamais de `service_role`.
- Mobile d'abord : tout écran doit être utilisable à 360 px de large.

## Review Focus

1. **Virgule décimale française** : « 45,3 » litres ou « 12,50 » € doit être accepté. Testé dans Task 2 (`parseDecimalFr`, `parseEurosToCents`).
2. **Kilométrage erroné ou décroissant** : un plein dont le km est inférieur au plein complet précédent ne doit produire ni consommation négative ni division par zéro (intervalle ignoré). Testé dans Task 3.
3. **Échéance du jour et fuseau horaire** : une échéance datée d'aujourd'hui est « bientôt », pas « en retard », quel que soit le fuseau. Testé dans Task 4.
4. **Photo non décodable (HEIC sur Chrome)** : si le redimensionnement échoue, on envoie l'original s'il fait 10 Mo ou moins, au lieu de bloquer. Testé dans Task 10 (`prepareUpload`).
5. **Voiture archivée** : ses échéances n'apparaissent plus sur l'accueil, mais son historique reste consultable. Testé dans Task 12 (`dashboardReminders`).

---

### Task 1 : socle du projet et CI

**Files :**
- Create : `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `.env.example`, `.github/workflows/ci.yml`, `README.md`, `.gitignore`
- Test : `src/App.test.tsx`

**Interfaces :**
- Produces : les scripts npm `dev`, `build`, `test` (`vitest run`), `lint` (`tsc --noEmit`). Un alias d'import `@/` vers `src/`.

- [ ] **Step 1 :** scaffolder avec `npm create vite@latest . -- --template react-ts`, puis ajouter les dépendances de la Tech Stack. Configurer Tailwind 4 (`@tailwindcss/vite`) et Vitest (`environment: 'jsdom'`, `setupFiles: src/test/setup.ts`, qui importe `@testing-library/jest-dom/vitest`).
- [ ] **Step 2 :** configurer `vite-plugin-pwa` avec `registerType: 'autoUpdate'` et un manifest `{ name: 'Carnet de Voiture', short_name: 'Carnet', lang: 'fr', display: 'standalone', theme_color: '#1e40af', background_color: '#ffffff' }`, avec les icônes 192 et 512 (des PNG simples générés, une voiture stylisée sur fond bleu).
- [ ] **Step 3 :** écrire le test `App.test.tsx`, qui rend `<App />` et vérifie `getByText('Carnet de Voiture')`. Le lancer : FAIL.
- [ ] **Step 4 :** `App` affiche le titre. `npm test` : PASS, puis `npm run build` réussit.
- [ ] **Step 5 :** écrire le workflow CI. Le job `web` exécute `npm ci`, `npm run lint`, `npm test` et `npm run build`. Le job `db` utilise `supabase/setup-cli@v1` et exécute `supabase db start` puis `supabase test db` (il s'active à partir de Task 6). `.env.example` contient les deux variables `VITE_`. Le README résume l'installation locale.
- [ ] **Step 6 :** commit `chore: socle Vite/React/PWA et CI`.

### Task 2 : types métier et utilitaires de saisie

**Files :**
- Create : `src/domain/types.ts`, `src/domain/format.ts`, `src/domain/odometer.ts`
- Test : `src/domain/format.test.ts`, `src/domain/odometer.test.ts`

**Interfaces :**
- Produces (`types.ts`) :
  ```ts
  type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'lpg' | 'other'
  type EntryKind = 'maintenance' | 'repair' | 'fuel' | 'other'
  type ReminderType = 'ct' | 'insurance' | 'oil' | 'tires' | 'timing_belt' | 'custom'
  interface Vehicle { id: string; nickname: string; make: string | null; model: string | null; year: number | null; plate: string | null; fuelType: FuelType; initialOdometer: number; photoPath: string | null; archivedAt: string | null }
  interface Entry { id: string; vehicleId: string; kind: EntryKind; date: string; odometer: number | null; title: string; category: string | null; garage: string | null; amountCents: number | null; liters: number | null; fullTank: boolean | null; notes: string | null }
  interface Reminder { id: string; vehicleId: string; type: ReminderType; label: string; dueDate: string | null; dueOdometer: number | null; everyMonths: number | null; everyKm: number | null; doneAt: string | null; doneEntryId: string | null }
  interface DocumentFile { id: string; vehicleId: string; entryId: string | null; storagePath: string; fileName: string; mimeType: string; sizeBytes: number; title: string | null; docDate: string | null }
  ```
- Produces (`format.ts`) : `parseDecimalFr(input: string): number | null`, `parseEurosToCents(input: string): number | null`, `formatEuros(cents: number): string`, `formatKm(km: number): string` (« 123 456 km »), `todayLocal(): string`, `addMonthsIso(date: string, months: number): string`.
- Produces (`odometer.ts`) : `currentOdometer(vehicle: Pick<Vehicle, 'initialOdometer'>, entries: Pick<Entry, 'odometer'>[]): number`.

- [ ] **Step 1 : tests de `format.test.ts`.**
  `parseDecimalFr('45,3') === 45.3`, `parseDecimalFr(' 45.3 ') === 45.3`, `parseDecimalFr('1 234,5') === 1234.5`, `parseDecimalFr('abc') === null`, `parseDecimalFr('') === null`.
  `parseEurosToCents('12,50') === 1250`, `parseEurosToCents('0,1') === 10`, `parseEurosToCents('19,99 €') === 1999`, `parseEurosToCents('1,005') === 101` (arrondi au centime), `parseEurosToCents('-3') === null`.
  `formatKm(123456)` vaut `'123 456 km'`, avec l'espace insécable fine de `Intl` (comparer après `.replace(/\s/g, ' ')`).
  `addMonthsIso('2026-01-31', 1) === '2026-02-28'`, `addMonthsIso('2026-10-22', 12) === '2027-10-22'`.
  Pour `todayLocal()`, avec `vi.setSystemTime(new Date(2026, 9, 22, 23, 30))` (heure locale), le résultat vaut `'2026-10-22'`.
- [ ] **Step 2 :** lancer les tests : FAIL.
- [ ] **Step 3 :** implémenter `format.ts`. `parseEurosToCents` doit travailler sur la chaîne (séparer partie entière et décimales) ou faire `Math.round(n * 100)` sur la valeur de `parseDecimalFr`. `addMonthsIso` utilise `date-fns` `addMonths` sur une date construite en local avec `parseISO`.
- [ ] **Step 4 : tests de `odometer.test.ts`.** Sans entrée, on obtient `initialOdometer`. Les entrées `[{odometer: 50000}, {odometer: null}, {odometer: 52000}]` avec un initial de 48000 donnent 52000. Une entrée à 40000 avec un initial de 48000 donne 48000.
- [ ] **Step 5 :** implémenter `currentOdometer`. Lancer `npm test` : PASS.
- [ ] **Step 6 :** commit `feat(domain): types, saisie FR et kilométrage actuel`.

### Task 3 : consommation (plein à plein)

**Files :**
- Create : `src/domain/consumption.ts`
- Test : `src/domain/consumption.test.ts`

**Interfaces :**
- Consumes : `Entry` (Task 2).
- Produces : `consumptionIntervals(entries: Entry[]): { fromKm: number; toKm: number; liters: number; lPer100: number }[]` et `averageConsumption(entries: Entry[]): number | null`.

- [ ] **Step 1 : tests.** Chaque cas utilise une fabrique `fuel(date, odometer, liters, fullTank)`.
  - Deux pleins complets (10 000 km puis 10 500 km avec 35 L) donnent un intervalle de `lPer100 = 7`.
  - Plein complet à 10 000, partiel de 20 L à 10 300, complet de 15 L à 10 500 : un intervalle de 35 L, `lPer100 = 7`.
  - Un seul plein complet : `[]`, et `averageConsumption` vaut `null`.
  - Plein complet à 10 000, plein complet **sans km**, plein complet de 30 L à 11 000 : l'ancre est réinitialisée par le plein sans km, donc `[]`.
  - (Review Focus 2) Plein complet à 10 000, puis plein complet de 30 L à 9 800 : intervalle ignoré, `[]`, sans `NaN` ni `Infinity`.
  - Moyenne pondérée : deux intervalles, 500 km à 7 L/100 et 1 000 km à 4 L/100, donnent `averageConsumption = (35 + 40) / 1500 * 100 = 5`.
  - Les entrées qui ne sont pas des pleins sont ignorées, et l'ordre d'entrée des données n'a pas d'importance.
- [ ] **Step 2 :** lancer les tests : FAIL.
- [ ] **Step 3 :** implémenter l'algorithme suivant.
  ```
  fuels = entries.filter(kind === 'fuel'), triés par (date, odometer ?? +∞)
  anchor = null; acc = 0
  pour chaque f :
    si anchor !== null : acc += f.liters
    si f.fullTank :
      si f.odometer === null : anchor = null
      sinon :
        si anchor !== null et f.odometer > anchor : push({fromKm: anchor, toKm: f.odometer, liters: acc, lPer100: acc / (f.odometer - anchor) * 100})
        anchor = f.odometer
      acc = 0
  average = Σliters / Σ(toKm - fromKm) * 100, ou null si aucun intervalle
  ```
- [ ] **Step 4 :** lancer les tests : PASS.
- [ ] **Step 5 :** commit `feat(domain): consommation plein à plein`.

### Task 4 : statut et récurrence des échéances

**Files :**
- Create : `src/domain/reminders.ts`
- Test : `src/domain/reminders.test.ts`

**Interfaces :**
- Consumes : `Reminder`, `addMonthsIso` (Task 2).
- Produces :
  - `type ReminderStatus = 'overdue' | 'soon' | 'upcoming' | 'done'`, `SOON_DAYS = 30`, `SOON_KM = 1000`.
  - `reminderStatus(r: Reminder, currentKm: number, today: string): ReminderStatus`.
  - `nextReminder(r: Reminder, doneDate: string, doneKm: number | null): Omit<Reminder, 'id' | 'doneAt' | 'doneEntryId'> | null`.
  - `sortByUrgency<T extends { status: ReminderStatus; dueDate: string | null; kmLeft: number | null }>(items: T[]): T[]` : `overdue` d'abord, puis `soon`, puis `upcoming`. À statut égal, date la plus proche en premier, les valeurs `null` en dernier, puis `kmLeft` croissant.
  - `REMINDER_LABELS: Record<ReminderType, string>` : `{ ct: 'Contrôle technique', insurance: 'Assurance', oil: 'Vidange', tires: 'Pneus', timing_belt: 'Distribution', custom: 'Autre' }`.

- [ ] **Step 1 : tests de statut**, avec `today = '2026-10-22'` et `currentKm = 50 000`.
  - `doneAt` renseigné : `'done'`.
  - `dueDate = '2026-10-21'` : `'overdue'`. `'2026-10-22'` : `'soon'` (Review Focus 3). `'2026-11-21'` (30 jours) : `'soon'`. `'2026-11-22'` : `'upcoming'`.
  - Kilométrage seul : `dueOdometer = 50 000` donne `'overdue'`, 51 000 donne `'soon'`, 51 001 donne `'upcoming'`.
  - Les deux critères : on retient le pire. `dueDate = '2027-06-01'` avec `dueOdometer = 49 000` donne `'overdue'`.
- [ ] **Step 2 : tests de récurrence.**
  - `everyMonths = 24` fait le 2026-10-22 donne `dueDate = '2028-10-22'`.
  - `everyKm = 15 000` à 50 000 km donne `dueOdometer = 65 000`, et `dueDate = null` si `everyMonths` est null.
  - `everyKm` défini mais `doneKm = null`, sans `everyMonths` : `null` (impossible à calculer).
  - Aucune récurrence : `null`. Le `type`, le `label`, `everyMonths` et `everyKm` sont recopiés tels quels.
- [ ] **Step 3 :** lancer les tests : FAIL. Implémenter : les comparaisons de dates se font sur les chaînes ISO, et les écarts en jours via `differenceInCalendarDays(parseISO(due), parseISO(today))`. Lancer les tests : PASS.
- [ ] **Step 4 :** commit `feat(domain): statut et récurrence des échéances`.

### Task 5 : agrégats de coûts

**Files :**
- Create : `src/domain/costs.ts`
- Test : `src/domain/costs.test.ts`

**Interfaces :**
- Consumes : `Entry`, `EntryKind`.
- Produces : `costsByMonth(entries: Entry[]): { month: string; totalCents: number }[]` (`'YYYY-MM'`, ordre chronologique, seulement les mois non vides) ; `costsByYear(entries: Entry[]): { year: number; totalCents: number }[]` ; `costsByKind(entries: Entry[]): Record<EntryKind, number>` (toutes les clés présentes, 0 par défaut) ; `ENTRY_KIND_LABELS: Record<EntryKind, string>` = `{ maintenance: 'Entretien', repair: 'Réparation', fuel: 'Carburant', other: 'Autre dépense' }`.

- [ ] **Step 1 : tests.** Avec trois entrées (`2026-01-05`, 1 000 c, fuel ; `2026-01-20`, 2 500 c, maintenance ; `2025-12-31`, 500 c, other) et une entrée sans montant :
  - `costsByMonth` donne `[{'2025-12', 500}, {'2026-01', 3500}]` ;
  - `costsByYear` donne `[{2025, 500}, {2026, 3500}]` ;
  - `costsByKind` donne `{maintenance: 2500, repair: 0, fuel: 1000, other: 500}`.
- [ ] **Step 2 :** FAIL, implémenter (`date.slice(0, 7)`), puis PASS.
- [ ] **Step 3 :** commit `feat(domain): agrégats de coûts`.

### Task 6 : schéma Supabase, RLS et tests d'isolation

**Files :**
- Create : `supabase/config.toml` (via `supabase init`), `supabase/migrations/20261022000001_schema.sql`, `supabase/migrations/20261022000002_rls.sql`, `supabase/migrations/20261022000003_storage.sql`
- Test : `supabase/tests/isolation.test.sql`

**Interfaces :**
- Produces : les tables `vehicles`, `entries`, `reminders` et `documents`, avec les colonnes de la spec §4 en snake_case (`nickname`, `fuel_type`, `initial_odometer`, `photo_path`, `archived_at`, `vehicle_id`, `kind`, `date`, `odometer`, `title`, `category`, `garage`, `amount_cents`, `liters`, `full_tank`, `notes`, `type`, `label`, `due_date`, `due_odometer`, `every_months`, `every_km`, `done_at`, `done_entry_id`, `entry_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `doc_date`). Le bucket `factures`. La fonction RPC `delete_my_account()`.

- [ ] **Step 1 : migration schema.**
  - Colonnes communes : `id uuid primary key default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `created_at timestamptz not null default now()`.
  - Énumérations par `check (... in (...))` avec les valeurs de Task 2.
  - Contraintes :
    - `odometer > 0`, `liters > 0`, `amount_cents >= 0` ;
    - `date <= current_date + interval '1 year'` ;
    - `kind <> 'fuel' or liters is not null` ;
    - sur `reminders`, `due_date is not null or due_odometer is not null` ;
    - `size_bytes <= 10485760` ;
    - `mime_type in (...)` avec la liste des Global Constraints.
  - `vehicle_id ... on delete cascade`, `entry_id ... on delete set null`, `done_entry_id ... on delete set null`.
  - Index sur `(user_id)` et `(vehicle_id)`.
- [ ] **Step 2 : migration rls.**
  - `enable row level security` sur les 4 tables.
  - Une politique `for all using (user_id = auth.uid()) with check (user_id = auth.uid())` par table.
  - Un trigger `before insert or update` sur `entries`, `reminders` et `documents`, `check_ownership()` (`security definer`, `set search_path = ''`). Il lève une exception si `vehicle_id` n'appartient pas à `auth.uid()`, ou si `entry_id` / `done_entry_id` n'appartiennent pas à la même voiture.
  - `delete_my_account()` (`security definer`) fait `delete from auth.users where id = auth.uid()`. Le cascade vide les tables.
- [ ] **Step 3 : migration storage.**
  - Créer le bucket `factures` avec `public = false`, `file_size_limit = 10485760` et `allowed_mime_types` = la liste des Global Constraints.
  - Politiques select, insert, update et delete sur `storage.objects` : `bucket_id = 'factures' and (storage.foldername(name))[1] = auth.uid()::text`.
  - Fonction `purge_orphan_files()` (`security definer`) : supprime de `storage.objects` (bucket `factures`) les objets de `auth.uid()` dont le `name` n'est référencé ni par `documents.storage_path` ni par `vehicles.photo_path`.
- [ ] **Step 4 : tests pgTAP** (`supabase/tests/isolation.test.sql`, avec `begin; select plan(n); ... select * from finish(); rollback;`). Créer les utilisateurs A et B dans `auth.users`, puis simuler chaque session avec `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`.
  - B voit 0 ligne des 4 tables de A (`is((select count(*) from vehicles), 0::bigint)`).
  - `update` et `delete` de B sur la voiture de A affectent 0 ligne.
  - L'insertion par B d'une entrée avec `vehicle_id` = voiture de A échoue (`throws_ok`).
  - L'insertion par B d'un document avec `entry_id` = entrée de A échoue.
  - B ne voit aucun objet `storage.objects` sous `<A>/...`, et l'insertion par B d'un objet sous `<A>/x.pdf` échoue.
  - Un plein sans `liters` échoue (`throws_ok`).
  - A voit bien ses propres lignes.
- [ ] **Step 5 :** lancer `supabase db start && supabase test db` : tout PASS. Si Docker n'est pas disponible en local, s'en remettre au job CI `db`, qui doit être vert.
- [ ] **Step 6 :** commit `feat(db): schéma, RLS, stockage et tests d'isolation`.

### Task 7 : client Supabase, mapping et authentification

**Files :**
- Create : `src/lib/supabase.ts`, `src/api/mappers.ts`, `src/features/auth/AuthProvider.tsx`, `src/features/auth/LoginPage.tsx`, `src/features/auth/RequireAuth.tsx`, `src/components/Layout.tsx`, `src/components/OfflineBanner.tsx`
- Modify : `src/App.tsx` (routes : `/connexion`, et `/` protégée)
- Test : `src/api/mappers.test.ts`, `src/features/auth/LoginPage.test.tsx`, `src/components/OfflineBanner.test.tsx`

**Interfaces :**
- Consumes : les types de Task 2 et les colonnes de Task 6.
- Produces :
  - `supabase` (client typé), et `useAuth(): { session: Session | null; user: User | null; loading: boolean; signOut(): Promise<void> }`.
  - Les mappers `toVehicle`, `fromVehicle`, `toEntry`, `fromEntry`, `toReminder`, `fromReminder`, `toDocument` et `fromDocument` (de row snake_case vers camelCase et inversement ; les `from*` omettent `id` et `user_id` s'ils sont absents).
  - `useOnline(): boolean`.
  - `<Layout>` : en-tête « Carnet de Voiture », un menu avec Accueil et Compte, `OfflineBanner`, et un `<Outlet/>`.

- [ ] **Step 1 :** tests des mappers (aller-retour sur un objet de chaque type, `amount_cents` vers `amountCents`). Tests de `LoginPage` : il affiche « Recevoir un lien de connexion », « Continuer avec Google » et le formulaire email + mot de passe. Le clic sur Google appelle `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` (module mocké). Test d'`OfflineBanner` : sur l'événement `offline`, il affiche « Hors ligne : les modifications ne peuvent pas être enregistrées ».
- [ ] **Step 2 :** FAIL, implémenter, PASS. Utiliser `onAuthStateChange` dans `AuthProvider`. `RequireAuth` redirige vers `/connexion`. La connexion par mot de passe utilise `signInWithPassword`, l'inscription `signUp`, et le lien magique `signInWithOtp`. Les erreurs Supabase sont affichées en français (« Email ou mot de passe incorrect », etc.).
- [ ] **Step 3 :** commit `feat(auth): connexion email/Google et layout`.

### Task 8 : voitures

**Files :**
- Create : `src/api/vehicles.ts`, `src/features/vehicles/VehicleForm.tsx`, `src/features/vehicles/VehiclePage.tsx` (en-tête et onglets Journal / Échéances / Factures / Coûts / Infos, chacun une route enfant), `src/features/vehicles/VehicleInfoTab.tsx`
- Test : `src/features/vehicles/VehicleForm.test.tsx`

**Interfaces :**
- Produces :
  - `useVehicles(opts?: { includeArchived?: boolean }): UseQueryResult<Vehicle[]>`, `useVehicle(id: string)`.
  - `useSaveVehicle()` (insert ou update selon `id`), `useArchiveVehicle()`, `useDeleteVehicle()` (delete puis `rpc('purge_orphan_files')`).
  - Clés de requête : `['vehicles']` et `['vehicle', id]`.
  - Routes : `/voitures/nouvelle`, `/voitures/:id/{journal|echeances|factures|couts|infos}`.
  - Toutes les mutations invalident `['vehicles']` et les clés de la voiture concernée.

- [ ] **Step 1 :** tests de `VehicleForm`. Le surnom vide affiche « Le surnom est obligatoire ». Un km initial de « -5 » est refusé. La soumission valide appelle `onSubmit` avec `fuelType` et `initialOdometer` numériques. Les libellés d'énergie sont « Essence », « Diesel », « Hybride », « Électrique », « GPL » et « Autre ».
- [ ] **Step 2 :** FAIL, implémenter, PASS. La photo de la voiture passe par `uploadFile` (Task 10). Tant que Task 10 n'est pas faite, le champ photo est masqué. L'onglet Infos propose « Modifier », « Archiver » et « Supprimer », avec une confirmation qui rappelle que la suppression efface aussi les factures.
- [ ] **Step 3 :** commit `feat(vehicles): création, modification, archivage`.

### Task 9 : journal (entrées)

**Files :**
- Create : `src/api/entries.ts`, `src/features/entries/EntryForm.tsx`, `src/features/entries/JournalTab.tsx`
- Test : `src/features/entries/EntryForm.test.tsx`

**Interfaces :**
- Consumes : `currentOdometer`, `parseDecimalFr`, `parseEurosToCents`, `ENTRY_KIND_LABELS`.
- Produces : `useEntries(vehicleId: string): UseQueryResult<Entry[]>` (clé `['entries', vehicleId]`, tri par date décroissante), `useSaveEntry()` et `useDeleteEntry()`. Les routes `/voitures/:id/entrees/nouvelle?type=<kind>` et `/voitures/:id/entrees/:entryId`. `<EntryForm vehicle entries initial? onSaved(entry: Entry)>`.

- [ ] **Step 1 :** tests d'`EntryForm`.
  - Avec `kind = fuel`, les champs Litres et « Plein complet » (coché par défaut) sont présents, Catégorie et Garage sont absents, et des litres vides affichent « Indiquez le nombre de litres ».
  - Avec `kind = maintenance`, la catégorie propose Vidange, Freins, Pneus, Distribution, Carrosserie, Contrôle technique et Autre.
  - Le km est prérempli avec `currentOdometer`.
  - Un km inférieur au km actuel affiche l'avertissement « Kilométrage inférieur au dernier relevé (X km) » mais n'empêche pas l'envoi.
  - « 45,3 » litres et « 62,10 » € donnent `liters = 45.3` et `amountCents = 6210`.
  - Une date à plus d'un an dans le futur est refusée.
- [ ] **Step 2 :** FAIL, implémenter, PASS. `JournalTab` affiche la liste avec un filtre par type (puces), une icône par type, le montant et le km. Le titre par défaut d'un plein est « Plein ». `useSaveEntry` invalide `['entries', vehicleId]` et `['vehicles']`.
- [ ] **Step 3 :** commit `feat(entries): journal et formulaires`.

### Task 10 : factures

**Files :**
- Create : `src/api/documents.ts`, `src/lib/upload.ts`, `src/features/documents/DocumentPicker.tsx`, `src/features/documents/DocumentsTab.tsx`, `src/features/documents/DocumentViewer.tsx`
- Modify : `src/features/entries/EntryForm.tsx` (bloc « Joindre une facture »), `src/features/vehicles/VehicleForm.tsx` (photo)
- Test : `src/lib/upload.test.ts`, `src/features/documents/DocumentPicker.test.tsx`

**Interfaces :**
- Produces :
  - `ACCEPTED_TYPES`, `MAX_BYTES = 10 * 1024 * 1024`.
  - `prepareUpload(file: File, resize?: (f: File) => Promise<Blob>): Promise<{ blob: Blob; mimeType: string; ext: string } | { error: string }>`.
  - `uploadFile(userId: string, vehicleId: string, file: File): Promise<{ storagePath: string; mimeType: string; sizeBytes: number }>`.
  - `useDocuments(vehicleId)` (clé `['documents', vehicleId]`), `useAddDocument()`, `useDeleteDocument()` (objet Storage puis ligne), `signedUrl(path: string): Promise<string>` (300 s).

- [ ] **Step 1 :** tests de `prepareUpload` (redimensionnement injecté).
  - Un PDF passe tel quel, avec `ext = 'pdf'`.
  - Un PNG redimensionné ressort en `image/jpeg`, avec `ext = 'jpg'`.
  - Un `text/plain` donne `{ error: 'Format non pris en charge (PDF, JPEG, PNG, HEIC, WebP)' }`.
  - Un PDF de 11 Mo donne `{ error: 'Fichier trop lourd (10 Mo maximum)' }`.
  - (Review Focus 4) Un HEIC de 4 Mo dont `resize` rejette passe en original, avec `mimeType = 'image/heic'`.
  - Un HEIC de 12 Mo dont `resize` rejette donne l'erreur de poids.
- [ ] **Step 2 :** FAIL, implémenter. `defaultResize` utilise `createImageBitmap` puis un `OffscreenCanvas` ou un canvas, avec un côté max de 2 000 px et `toBlob('image/jpeg', 0.85)`. PASS.
- [ ] **Step 3 :** tests de `DocumentPicker`.
  - Il propose deux boutons : « Prendre une photo » (`<input type=file accept="image/*" capture="environment">`) et « Choisir un fichier » (`accept` = `ACCEPTED_TYPES`).
  - Une erreur de `prepareUpload` s'affiche.
  - Si l'envoi échoue, le message « L'envoi de la facture a échoué » apparaît avec un bouton « Réessayer » qui relance `uploadFile`.
- [ ] **Step 4 :** FAIL, implémenter, PASS.
  - Dans `EntryForm`, l'entrée est enregistrée d'abord, puis les fichiers sont envoyés et rattachés (`entry_id`). Un échec d'envoi laisse l'entrée enregistrée (spec §7).
  - `DocumentsTab` affiche une grille de miniatures (image via URL signée, icône PDF sinon), ainsi qu'un bouton « Ajouter une facture » sans entrée liée.
  - `DocumentViewer` ouvre l'image en plein écran ou le PDF dans un nouvel onglet, avec les boutons Télécharger et Supprimer.
- [ ] **Step 5 :** commit `feat(documents): import et consultation des factures`.

### Task 11 : échéances

**Files :**
- Create : `src/api/reminders.ts`, `src/features/reminders/ReminderForm.tsx`, `src/features/reminders/RemindersTab.tsx`, `src/features/reminders/ReminderBadge.tsx`
- Test : `src/features/reminders/ReminderForm.test.tsx`, `src/api/reminders.test.ts`

**Interfaces :**
- Consumes : `reminderStatus`, `nextReminder`, `sortByUrgency` et `REMINDER_LABELS` (Task 4), `currentOdometer`.
- Produces :
  - `useReminders(vehicleId?: string)` : toutes les échéances de l'utilisateur si `vehicleId` est absent. Clé `['reminders', vehicleId ?? 'all']`.
  - `useSaveReminder()`, `useDeleteReminder()`.
  - `completeReminder(r: Reminder, doneDate: string, doneKm: number | null, entryId: string | null): Promise<void>` : met à jour `done_at` et `done_entry_id`, puis insère `nextReminder(...)` s'il n'est pas `null`.
  - `<ReminderBadge status>` : rouge « En retard », orange « Bientôt », gris « À venir », vert « Fait ».

- [ ] **Step 1 :** tests.
  - `ReminderForm` : sans date ni km, il affiche « Indiquez une date, un kilométrage, ou les deux ». Choisir le type « Contrôle technique » préremplit le libellé et `everyMonths = 24`. « Vidange » préremplit `everyMonths = 12` et `everyKm = 15000`. Ces valeurs restent modifiables.
  - `completeReminder` (client Supabase mocké) : une échéance récurrente donne 1 update et 1 insert avec la date calculée. Une échéance sans récurrence donne seulement l'update.
- [ ] **Step 2 :** FAIL, implémenter, PASS.
  - `RemindersTab` montre les échéances non faites triées par urgence, avec « dans X jours / X km » ou « dépassée de … », puis une section repliée « Historique ».
  - « Marquer comme fait » ouvre une feuille : date (aujourd'hui par défaut), km (actuel par défaut), et une case « Créer aussi l'entrée d'entretien » cochée par défaut, qui crée une entrée `maintenance` et passe son id.
- [ ] **Step 3 :** commit `feat(reminders): échéances récurrentes`.

### Task 12 : accueil et bouton d'ajout rapide

**Files :**
- Create : `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/dashboardReminders.ts`, `src/components/QuickAddButton.tsx`
- Test : `src/features/dashboard/dashboardReminders.test.ts`, `src/features/dashboard/DashboardPage.test.tsx`

**Interfaces :**
- Produces : `dashboardReminders(vehicles: Vehicle[], reminders: Reminder[], entriesByVehicle: Record<string, Entry[]>, today: string): { reminder: Reminder; vehicle: Vehicle; status: ReminderStatus; dueDate: string | null; kmLeft: number | null }[]`. Le résultat exclut les voitures archivées et les échéances faites, ne garde que `overdue` et `soon`, et est trié par `sortByUrgency`.

- [ ] **Step 1 :** tests.
  - (Review Focus 5) L'échéance en retard d'une voiture archivée est absente.
  - Une échéance faite est absente, une `upcoming` aussi.
  - L'ordre est : en retard d'abord, puis bientôt.
  - `kmLeft = dueOdometer - currentOdometer`.
  - `DashboardPage` sans voiture affiche « Ajoutez votre première voiture » et un bouton vers `/voitures/nouvelle`.
- [ ] **Step 2 :** FAIL, implémenter, PASS. Une seule requête charge les entrées de l'utilisateur pour calculer les km (`select vehicle_id, odometer`). `QuickAddButton` est un bouton flottant « + » qui propose Plein, Entretien, Facture et Échéance. Il demande la voiture s'il y en a plusieurs actives, ou la choisit directement s'il n'y en a qu'une. Les cartes voiture affichent photo, surnom, km et nombre d'échéances urgentes.
- [ ] **Step 3 :** commit `feat(dashboard): accueil et ajout rapide`.

### Task 13 : onglet Coûts

**Files :**
- Create : `src/features/costs/CostsTab.tsx`
- Test : `src/features/costs/CostsTab.test.tsx`

**Interfaces :**
- Consumes : `costsByMonth`, `costsByYear`, `costsByKind`, `averageConsumption`, `consumptionIntervals`, `formatEuros`.

- [ ] **Step 1 :** tests.
  - Avec des entrées réparties sur 2 ans, le sélecteur d'année montre les totaux de l'année choisie.
  - La consommation affiche « 6,2 L/100 km », ou « Pas assez de données (2 pleins complets avec kilométrage nécessaires) ». Pour une voiture électrique, la consommation est masquée.
  - La répartition par type affiche les 4 libellés avec montants et pourcentages.
- [ ] **Step 2 :** FAIL, implémenter, PASS. Le graphique mensuel est un histogramme simple en barres CSS ou SVG, sans bibliothèque de graphiques : 12 mois de l'année choisie, avec le montant au survol ou au toucher.
- [ ] **Step 3 :** commit `feat(costs): coûts et consommation`.

### Task 14 : compte, finitions PWA et mise en ligne

**Files :**
- Create : `src/features/auth/AccountPage.tsx`, `docs/mise-en-place.md`, `vercel.json` (rewrite SPA `/(.*)` → `/index.html`)
- Modify : `README.md`
- Test : `src/features/auth/AccountPage.test.tsx`

- [ ] **Step 1 :** tests d'`AccountPage`. Elle affiche l'email et le bouton « Se déconnecter ». « Supprimer mon compte » demande de saisir `SUPPRIMER` avant d'appeler `rpc('delete_my_account')`, puis `signOut`.
- [ ] **Step 2 :** FAIL, implémenter, PASS. Avant le RPC, supprimer les fichiers de l'utilisateur : `storage.from('factures').list(userId)` récursivement, puis `remove`.
- [ ] **Step 3 :** écrire `docs/mise-en-place.md` en français pas à pas :
  - créer le projet Supabase (région Europe), puis `supabase link` et `supabase db push` ;
  - configurer les URL de redirection Auth ;
  - créer le client OAuth Google et le renseigner dans Supabase ;
  - importer le dépôt sur Vercel avec les 2 variables `VITE_` ;
  - installer l'appli sur Android et sur iOS (Partager → Sur l'écran d'accueil).
- [ ] **Step 4 :** vérifications finales. Les commandes `npm run lint && npm test && npm run build` passent. Le build Lighthouse (`npx lighthouse` sur `npm run preview`) indique que l'appli est installable. Contrôle visuel à 360 px avec Playwright (`/opt/pw-browsers/chromium`) sur la connexion et sur l'accueil vide.
- [ ] **Step 5 :** commit `feat: page compte, guide de mise en place, config Vercel`.
