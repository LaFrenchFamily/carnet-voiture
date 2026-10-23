# Lecture automatique des factures : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lire une photo ou un PDF de facture dans le navigateur et ouvrir le formulaire d'entrée prérempli, avec la facture jointe.

**Architecture:**
- Le parseur pur `parseInvoice(text)` transforme le texte en `InvoiceGuess`.
- `readInvoice(file)`, chargé à la demande, extrait ce texte avec pdf.js (PDF) ou Tesseract (photo).
- `ScanPage` relie les deux et redirige vers `EntryPage` en passant `{ guess, file }` dans l'état de navigation. `EntryPage` préremplit alors `EntryForm`.

**Tech Stack:**
- Code existant : React 19, React Router 8, Vitest 5 avec Testing Library, vite-plugin-pwa (Workbox).
- Nouveaux paquets : `tesseract.js@7`, `@tesseract.js-data/fra@1`, `pdfjs-dist@6`.

**Spec:** `docs/superpowers/specs/2026-10-23-lecture-factures-design.md`

## Global Constraints

- Aucune modification de la base Supabase. Tout se passe dans le navigateur.
- Le texte de la facture ne quitte jamais l'appareil. Les fichiers Tesseract sont servis depuis `/ocr/` (même origine), jamais depuis un CDN.
- Le code de lecture est chargé uniquement par `import()` dynamique : il ne doit pas grossir le bundle principal.
- Textes de l'interface en français. Les libellés ci-dessous sont à reprendre mot pour mot.
- Bornes :
  - km entre 1 et 2 000 000 ;
  - litres entre 1 et 200 ;
  - dates entre le 1990-01-01 et aujourd'hui + 1 jour ;
  - nom du garage coupé à 60 caractères ;
  - abandon de la lecture après 45 s ;
  - PDF sans texte : moins de 20 caractères sur les 3 premières pages.
- Une lecture ratée mène toujours au formulaire, avec la facture jointe. Seul un fichier refusé (format ou taille) n'y mène pas.

## Review Focus

1. Pour un montant avec espace insécable ou espace fine (`1 234,56`, U+00A0 ou U+202F, fréquents dans les PDF), le parseur doit lire 123456 centimes. Le test est ajouté à la tâche 1.
2. Une facture de vidange qui mentionne « 5 L » d'huile ne doit pas devenir un plein. Test ajouté à la tâche 1.
3. Un numéro de facture ou de téléphone proche de « km » ne doit pas être pris pour un kilométrage s'il fait plus de 7 chiffres. Test ajouté à la tâche 1.
4. Si la page est rechargée sur le formulaire après une lecture, l'état de navigation est absent : on doit obtenir un formulaire vide, sans plantage. Test ajouté à la tâche 3.
5. Si l'outil de lecture ne se télécharge pas (hors ligne au premier usage), on doit afficher « Lecture impossible pour l'instant », puis ouvrir le formulaire avec la facture jointe. Test ajouté à la tâche 4.

---

### Task 1: Parseur `parseInvoice`

**Files:**
- Create: `src/domain/invoice/patterns.ts`, `src/domain/invoice/parseInvoice.ts`
- Test: `src/domain/invoice/parseInvoice.test.ts`

**Interfaces:**
- Consumes: `EntryKind` (`@/domain/types`), `Category` (`@/domain/categories`).
- Produces :
  ```ts
  export interface InvoiceGuess {
    kind: EntryKind | null; date: string | null; amountCents: number | null; odometer: number | null
    garage: string | null; category: Category | null; liters: number | null
  }
  export const EMPTY_GUESS: InvoiceGuess
  export function parseInvoice(text: string, today: string): InvoiceGuess   // today = YYYY-MM-DD
  ```
  `today` est injecté pour que les tests ne dépendent pas de la date du jour. Les appelants passent `todayLocal()`.

- [ ] **Step 1: Write the failing tests.** Un `test` par cas, avec des textes écrits à la main dans le fichier de test. Assertions :
  - `garage`, avec le texte « NORAUTO Bayonne / Facture n° 2024-118 / Date : 14/03/2026 / Vidange huile 5W30 5 L / Filtre à huile / Kilométrage : 87 412 km / Total TTC 189,90 € / Net à payer 189,90 € » → `{ kind: 'maintenance', date: '2026-03-14', amountCents: 18990, odometer: 87412, garage: 'Norauto', category: 'oil', liters: null }`. Ce cas couvre aussi le point 2 de la Review Focus.
  - `station`, avec « TOTAL ENERGIES Relais / 03.10.2026 / GAZOLE / Volume 42,35 L / Montant TTC 76,23 EUR » → `kind: 'fuel'`, `liters: 42.35`, `amountCents: 7623`, `date: '2026-10-03'`.
  - `controle technique`, avec « DEKRA … contrôle technique … le 2 février 2026 … A payer 78,00 » → `kind: 'maintenance'`, `category: 'ct'`, `date: '2026-02-02'`, `garage: 'Dekra'`.
  - `pneus` : un texte avec « 2 pneumatiques Michelin » et « Total TTC 1 234,56 », où l'espace de milliers est U+00A0 → `category: 'tires'`, `amountCents: 123456`. Couvre le point 1 de la Review Focus.
  - `reparation` : un texte avec « Remplacement plaquettes et disques AV » → `kind: 'repair'`, `category: 'brakes'`.
  - `net à payer prioritaire` : un texte avec « Total HT 100,00 / TVA 20,00 / Total TTC 120,00 / Acompte 50,00 / Net à payer 70,00 » → `amountCents: 7000`.
  - `pas de mot-clé de montant` : un texte qui ne contient que « 45,00 » → `amountCents: null`.
  - `dates futures ignorées` : avec `today = '2026-10-23'` et un texte contenant « 01/01/2030 » et « 12/10/2026 » → `date: '2026-10-12'`.
  - `km trop long ignoré` : « Tél 0559123456 km » → `odometer: null`. Couvre le point 3 de la Review Focus.
  - `garage depuis l'en-tête` : premières lignes « FACTURE / Garage Dupont & Fils / 12 rue X » → `garage: 'Garage Dupont & Fils'`.
  - `texte vide` : `parseInvoice('', today)` doit être égal à `EMPTY_GUESS`.
  - `texte bruité` : « T0tal TTC : 89,9O € » ne doit pas planter ; `amountCents` vaut `null` ou 8990.

- [ ] **Step 2: Run `npx vitest run src/domain/invoice`.** Expected: FAIL (module absent).

- [ ] **Step 3: Implement `patterns.ts` and `parseInvoice.ts`.** Les règles sont celles de la section 5 de la spec, dans cet ordre de priorité.
  - **Mots-clés et enseignes :** les listes de la spec, mises en constantes dans `patterns.ts`.
  - **Normalisation :** `normalize(s)` passe en minuscules, retire les accents (NFD puis suppression des diacritiques) et remplace U+00A0 et U+202F par une espace.
  - **Montants :** expression `/(\d{1,3}(?:[ .]\d{3})+|\d+)[,.](\d{2})\b/`.
  - **Mois en lettres :** une table de `janvier` à `decembre`.
  - **Libellé du garage :** une enseigne connue est rendue dans la casse de la liste (par exemple `'Norauto'`). Une ligne d'en-tête est rendue telle quelle, sans retouche.
  - **Litres :** on ne les renvoie que si `kind === 'fuel'`.

- [ ] **Step 4: Run `npx vitest run src/domain/invoice`.** Expected: PASS.

- [ ] **Step 5: Commit.** Message : `Lecture factures : parseur de texte`.

### Task 2: Extraction du texte `readInvoice` et fichiers OCR

**Files:**
- Create: `scripts/copy-ocr-assets.mjs`, `src/lib/ocr/readInvoice.ts`, `src/lib/ocr/pdfText.ts`, `src/lib/ocr/imageText.ts`
- Modify: `package.json` (dépendances, scripts `predev` et `prebuild`), `.gitignore` (`public/ocr/`), `vite.config.ts` (Workbox), `src/lib/upload.ts` (export de `rejectReason`)
- Test: `src/lib/ocr/readInvoice.test.ts`, `src/lib/upload.test.ts` (ajout)

**Interfaces:**
- Produces :
  ```ts
  // src/lib/upload.ts
  export function rejectReason(file: File): string | null   // même message que prepareUpload (UNSUPPORTED / TOO_BIG)
  // src/lib/ocr/readInvoice.ts
  export type ReadProgress = { stage: 'download' | 'reading'; ratio: number }   // ratio 0..1
  export class OcrUnavailableError extends Error {}
  export async function readInvoice(file: File, onProgress?: (p: ReadProgress) => void): Promise<string>
  ```
- Détails :
  - `readInvoice` aiguille selon le type de fichier : `application/pdf` vers `pdfText(file)`, `image/*` vers `imageText(file, onProgress)`. Chaque module est chargé par `await import('./pdfText')` ou `await import('./imageText')`.
  - Si `pdfText` renvoie moins de 20 caractères (après `trim`), `readInvoice` renvoie `''`.
  - Un échec de chargement d'un module, ou de `createWorker`, est converti en `OcrUnavailableError`. Les autres erreurs (image indécodable) remontent telles quelles.
  - `prepareUpload` doit utiliser `rejectReason`, sans changer son comportement. Pour les images, la règle des 10 Mo reste vérifiée après redimensionnement.

- [ ] **Step 1: Write the failing tests.**
  - `readInvoice.test.ts` simule `./pdfText` et `./imageText` avec `vi.mock` :
    - un PDF (`new File([...], 'f.pdf', { type: 'application/pdf' })`) appelle `pdfText` et renvoie son texte ;
    - un PDF dont le texte fait 5 caractères renvoie `''` ;
    - une image `image/jpeg` appelle `imageText` et lui passe `onProgress` ;
    - quand `imageText` rejette avec une erreur de chargement simulée (`new TypeError('Failed to fetch')`), la promesse rejette avec un `OcrUnavailableError`.
  - `upload.test.ts` : `rejectReason` renvoie le message UNSUPPORTED pour `text/plain`, TOO_BIG pour un PDF de 11 Mo, et `null` pour un PDF de 1 Mo.

- [ ] **Step 2: Run `npx vitest run src/lib`.** Expected: FAIL.

- [ ] **Step 3: Install and wire assets.**
  - `npm i tesseract.js@7 @tesseract.js-data/fra@1 pdfjs-dist@6`.
  - `scripts/copy-ocr-assets.mjs` copie vers `public/ocr/` :
    - `node_modules/tesseract.js/dist/worker.min.js` ;
    - les fichiers `tesseract-core-lstm.wasm.js`, `tesseract-core-simd-lstm.wasm.js` et `tesseract-core-relaxedsimd-lstm.wasm.js` de `node_modules/tesseract.js-core/` ;
    - `node_modules/@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz`.
  - Scripts : `"predev"` et `"prebuild"` lancent `node scripts/copy-ocr-assets.mjs`.
  - `vite.config.ts` : ajouter dans `VitePWA` l'option `workbox: { globIgnores: ['ocr/**'], runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'), handler: 'CacheFirst', options: { cacheName: 'ocr' } }] }`.
  - Ajouter `public/ocr/` à `.gitignore`.

- [ ] **Step 4: Implement the modules.**
  - `pdfText(file): Promise<string>` :
    - utilise `pdfjs-dist`, avec `GlobalWorkerOptions.workerSrc` venant de `import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'` ;
    - lit les 3 premières pages au plus ;
    - joint les `items[].str` d'une même ligne par une espace, sépare les lignes par `\n` (changement de `transform[5]`), et sépare les pages par `\n`.
  - `imageText(file, onProgress): Promise<string>` :
    - **Préparation de l'image :** `createImageBitmap`, réduction à 2 000 px au plus sur le plus grand côté, puis canvas avec `ctx.filter = 'grayscale(1)'`.
    - **Création du worker :** `createWorker('fra', 1, { workerPath: '/ocr/worker.min.js', corePath: '/ocr/', langPath: '/ocr/', gzip: true, logger })`. Le `logger` convertit `status === 'recognizing text'` en `stage: 'reading'` et tous les autres statuts en `stage: 'download'`, avec `ratio = progress`.
    - **Lecture :** `worker.recognize(canvas)`, puis `worker.terminate()` dans un `finally`. On renvoie `data.text`.

- [ ] **Step 5: Run `npx vitest run src/lib && npm run lint && npm run build`.**
  - Expected : PASS, puis build OK.
  - `dist/ocr/` contient les 5 fichiers.
  - Aucun chunk principal ne contient la chaîne `tesseract`. Vérifier avec `grep -l tesseract dist/assets/index-*.js`, qui ne doit rien sortir.

- [ ] **Step 6: Commit.** Message : `Lecture factures : extraction du texte (pdf.js, Tesseract hébergé)`.

### Task 3: Préremplissage du formulaire d'entrée

**Files:**
- Modify: `src/features/entries/EntryForm.tsx`, `src/features/entries/EntryPage.tsx`
- Test: `src/features/entries/EntryForm.test.tsx`, `src/features/entries/EntryPage.test.tsx` (ajouts)

**Interfaces:**
- Consumes: `InvoiceGuess` (tâche 1).
- Produces :
  ```ts
  export type ScanState = { scan: { guess: InvoiceGuess; file: File } }   // dans src/features/entries/EntryPage.tsx
  // EntryForm : nouvelle prop facultative
  prefill?: InvoiceGuess
  ```
- Comportement :
  - Avec `prefill`, et seulement pour une nouvelle entrée (`initial` absent), un champ non nul de `prefill` remplace la valeur par défaut correspondante : date, km, montant (affiché en `12,50`), garage, catégorie, litres.
  - Chaque champ prérempli affiche l'indication `À vérifier`, par la prop `hint` existante. L'indication disparaît dès que l'utilisateur modifie ce champ. L'avertissement de km existant reste prioritaire sur `À vérifier`.
  - `EntryPage` lit `useLocation().state` avec une garde de type (`isScanState`). S'il trouve une lecture :
    - les fichiers en attente valent `[file]` dès le départ ;
    - il passe `prefill` à `EntryForm` ;
    - il affiche au-dessus du formulaire un bandeau. Le texte est `Vérifiez les champs surlignés` si au moins un champ hors `kind` est non nul, sinon `Aucune information lue, complétez le formulaire`.

- [ ] **Step 1: Write the failing tests.**
  - `EntryForm.test.tsx` :
    - avec `kind='fuel'` et `prefill = { ...EMPTY_GUESS, date: '2026-10-03', amountCents: 7623, liters: 42.35 }`, les champs Date, Montant et Litres valent `2026-10-03`, `76,23` et `42,35`, et `À vérifier` apparaît trois fois ;
    - après avoir tapé dans Montant, `À vérifier` apparaît deux fois.
  - `EntryPage.test.tsx` :
    - un rendu avec `initialEntries={[{ pathname: '/voitures/v1/entrees/nouvelle', search: '?type=maintenance', state: { scan: { guess: { ...EMPTY_GUESS, garage: 'Norauto' }, file } } }]}` affiche le bandeau `Vérifiez les champs surlignés` et le nom du fichier dans la liste des factures à joindre ;
    - un enregistrement appelle `addDocument` avec ce `file` ;
    - un second test sans état n'affiche aucun bandeau et ne joint aucun fichier. Couvre le point 4 de la Review Focus.

- [ ] **Step 2: Run `npx vitest run src/features/entries`.** Expected: FAIL.

- [ ] **Step 3: Implement.** Garder `key` sur `EntryForm` comme aujourd'hui.

- [ ] **Step 4: Run `npx vitest run src/features/entries`.** Expected: PASS.

- [ ] **Step 5: Commit.** Message : `Lecture factures : formulaire prérempli`.

### Task 4: Écran de lecture et points d'entrée

**Files:**
- Create: `src/features/scan/ScanPage.tsx`
- Modify: `src/App.tsx` (route `entrees/lire`, déclarée **avant** `entrees/:entryId`), `src/components/QuickAddButton.tsx`, `src/features/entries/JournalTab.tsx`
- Test: `src/features/scan/ScanPage.test.tsx`, `src/components/QuickAddButton.test.tsx` (ajout s'il existe, sinon création)

**Interfaces:**
- Consumes: `readInvoice`, `ReadProgress`, `OcrUnavailableError`, `rejectReason` (tâche 2) ; `parseInvoice`, `EMPTY_GUESS` (tâche 1) ; `ScanState` (tâche 3) ; `todayLocal`.
- Produces: la route `/voitures/:vehicleId/entrees/lire`.
- Comportement de `ScanPage`. Le navigateur exige un geste de l'utilisateur pour ouvrir le sélecteur de fichier, donc l'écran ne peut pas l'ouvrir tout seul.
  1. **Écran de départ :**
     - titre `Lire une facture` ;
     - deux boutons-étiquettes, `📷 Prendre en photo` (`accept="image/*" capture="environment"`) et `📎 Choisir un fichier` (`accept={ACCEPT_ATTR}`) ;
     - le texte `La lecture se fait dans votre téléphone.`
  2. **Après le choix :**
     - si `rejectReason(file)` renvoie un message, on l'affiche avec `ErrorMessage` et on reste sur l'écran ;
     - sinon, on affiche `Lecture de la facture…`, une barre de progression `<progress>` et un bouton `Passer` ;
     - pendant `stage === 'download'`, on affiche aussi `Première utilisation : téléchargement de l'outil de lecture (≈ 5 Mo)`.
  3. **Fin de la lecture :**
     - **Résultat obtenu :** on calcule `guess = parseInvoice(text, todayLocal())`, puis `navigate(\`../entrees/nouvelle?type=${guess.kind ?? 'maintenance'}\`, { replace: true, state: { scan: { guess, file } } })`.
     - **`Passer`, délai de 45 s dépassé ou erreur quelconque :** même navigation avec `EMPTY_GUESS`. Le résultat d'une lecture abandonnée est ignoré : utiliser un drapeau `done` local.
     - **`OcrUnavailableError` :** on affiche d'abord `Lecture impossible pour l'instant` avec un bouton `Continuer`, qui fait la même navigation avec `EMPTY_GUESS`.
- Points d'entrée :
  - `QuickAddButton` : ajouter `['📷', 'Lire une facture', 'entrees/lire']` en **première** position de `ACTIONS`.
  - `JournalTab` : un lien `📷 Lire une facture` vers `../entrees/lire`, au-dessus de la rangée des liens d'ajout, en reprenant le style de ces liens.

- [ ] **Step 1: Write the failing tests.** `ScanPage.test.tsx` simule `@/lib/ocr/readInvoice` et utilise un `MemoryRouter` avec la route `entrees/nouvelle`, qui rend un composant sonde affichant `JSON.stringify(location.state.scan.guess)` et `scan.file.name`. Cas à couvrir :
  - un fichier choisi, `readInvoice` résolu avec le texte « Net à payer 70,00 » : la sonde affiche `"amountCents":7000` et le nom du fichier ;
  - un fichier `text/plain` affiche le message de format refusé, et `readInvoice` n'est pas appelé ;
  - `Passer`, cliqué pendant que `readInvoice` reste en attente, mène à la sonde avec `"amountCents":null` ;
  - avec `vi.useFakeTimers({ shouldAdvanceTime: true })` et `readInvoice` en attente, avancer de 45 000 ms mène à la sonde ;
  - un rejet `OcrUnavailableError` affiche `Lecture impossible pour l'instant`, puis `Continuer` mène à la sonde avec le fichier. Couvre le point 5 de la Review Focus ;
  - un appel de `onProgress({ stage: 'download', ratio: 0.3 })` affiche le message de première utilisation.
  
  Test du menu « + » : avec une seule voiture `v1`, cliquer sur `Ajouter` puis `Lire une facture` mène à `/voitures/v1/entrees/lire`.

- [ ] **Step 2: Run `npx vitest run src/features/scan src/components`.** Expected: FAIL.

- [ ] **Step 3: Implement** `ScanPage`, la route et les deux points d'entrée.

- [ ] **Step 4: Run `npm test && npm run lint && npm run build`.** Expected: tout PASS, build OK.

- [ ] **Step 5: Commit.** Message : `Lecture factures : écran de lecture et accès depuis le menu et le journal`.

### Task 5: Vérification dans le navigateur et PR

- [ ] **Step 1:** Lancer `npm run build && npx vite preview`. Avec Playwright (Chromium déjà installé), sur une page de test qui importe `readInvoice`, lire :
  - un PDF généré avec du texte de facture ;
  - une image PNG rendue à partir du même texte.
  
  Expected : le texte contient « Net à payer » et le montant. Les requêtes réseau ne visent que l'origine locale. Cette page de test est jetable et n'est pas commitée.
- [ ] **Step 2:** Mettre à jour `README.md` en une ligne sous les fonctionnalités : la lecture des factures, faite dans le téléphone.
- [ ] **Step 3:** Commit, push de `feat/lecture-factures`, PR en brouillon, CI verte.
