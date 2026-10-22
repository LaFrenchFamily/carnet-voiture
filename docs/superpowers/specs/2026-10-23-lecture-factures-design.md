# Lecture automatique des factures : conception

Date : 2026-10-23 · Demandé par Alex · Fait suite à la V1 (`2026-10-22-carnet-voiture-design.md`)

## 1. Objectif

Saisir une entrée du journal à partir d'une facture, sans tout retaper. L'utilisateur prend la facture en photo ou choisit un PDF. L'appli lit le document dans le téléphone, devine les champs principaux et ouvre le formulaire d'entrée prérempli, avec la facture jointe. L'utilisateur vérifie, corrige si besoin, puis enregistre.

**Choix d'Alex :** la lecture se fait dans le téléphone, gratuitement. Aucun service d'IA n'est utilisé et aucune clé API n'est demandée.

**Critères de réussite**

- Pour un PDF de garage avec texte (cas le plus courant), la date et le montant TTC sont trouvés justes dans la grande majorité des cas.
- Pour une photo nette, la lecture prend moins de 15 s sur un téléphone récent, hors premier téléchargement de l'outil de lecture.
- Une lecture ratée ne bloque jamais la saisie : on arrive au formulaire normal, avec la facture jointe.
- Le contenu de la facture ne quitte pas l'appareil pour la lecture. Comme aujourd'hui, seul l'envoi de la facture jointe à Supabase a lieu, à l'enregistrement.

## 2. Périmètre

**Inclus**

- Un bouton « 📷 Lire une facture » dans le menu « + » de l'accueil et en tête du journal d'une voiture.
- Lecture d'un PDF, par son texte intégré, ou d'une photo (JPEG, PNG, WebP, et HEIC quand le navigateur sait le décoder).
- Champs devinés :
  - type d'entrée : plein, entretien, réparation ou autre ;
  - date ;
  - montant TTC ;
  - kilométrage ;
  - garage ;
  - catégorie ;
  - litres, pour un plein.
- Formulaire prérempli :
  - chaque champ deviné porte la mention « à vérifier », qui disparaît dès qu'on modifie le champ ;
  - le type deviné peut être changé avant l'enregistrement.
- La facture lue est jointe automatiquement à l'entrée, comme une facture ajoutée à la main.

**Hors périmètre**

- PDF scanné sans texte : pas de reconnaissance d'image dans les PDF. On arrive au formulaire avec la facture jointe.
- Factures de plusieurs pages en photo : une seule photo par lecture.
- Apprentissage à partir des corrections de l'utilisateur.
- Lecture des factures déjà enregistrées dans l'onglet Factures.

## 3. Parcours

1. L'utilisateur touche « 📷 Lire une facture ».
   - Depuis l'accueil, s'il a plusieurs voitures, il choisit d'abord la voiture, comme pour les autres actions du menu « + ».
2. Le sélecteur de fichier s'ouvre. Sur téléphone, il propose l'appareil photo et les fichiers.
3. Un écran « Lecture de la facture… » s'affiche :
   - il montre une barre de progression ;
   - il précise « Première utilisation : téléchargement de l'outil de lecture (≈ 5 Mo) » quand c'est le cas ;
   - un bouton « Passer » permet d'aller directement au formulaire vide, facture jointe.
4. Le formulaire d'entrée s'ouvre avec le type deviné, les champs préremplis et la facture dans la liste des fichiers à joindre.
   - Un bandeau indique « Vérifiez les champs surlignés ».
   - Si rien n'a été trouvé, il indique « Aucune information lue, complétez le formulaire ».
5. « Enregistrer » suit le chemin habituel : création de l'entrée, puis envoi de la facture.

## 4. Architecture

Tout se passe dans le navigateur. Rien ne change dans la base Supabase.

```
src/
  domain/invoice/
    parseInvoice.ts      texte brut → InvoiceGuess (logique pure, testée unitairement)
    patterns.ts          mots-clés, enseignes, expressions régulières
  lib/ocr/
    readInvoice.ts       File → texte (PDF : pdf.js ; image : Tesseract), chargé à la demande
  features/scan/
    ScanPage.tsx         route /voitures/:id/entrees/lire : choix du fichier, progression, redirection
```

**`InvoiceGuess`**

```ts
interface InvoiceGuess {
  kind: EntryKind | null
  date: string | null          // YYYY-MM-DD
  amountCents: number | null
  odometer: number | null
  garage: string | null
  category: Category | null
  liters: number | null
}
```

**Passage au formulaire.**

- `ScanPage` navigue vers `entrees/nouvelle?type=<kind>` avec, dans l'état de navigation, `{ guess, file }`. Un objet `File` passe sans problème dans l'état de l'historique.
- `EntryPage` lit cet état : il ajoute le fichier aux factures en attente et transmet `guess` à `EntryForm` comme valeurs initiales, avec la liste des champs devinés pour les surligner.
- Si la page est rechargée, l'état peut être perdu. On obtient alors simplement un formulaire vide, ce qui est acceptable.

**Outils de lecture, chargés seulement au premier usage** (`import()` dynamique), pour ne pas alourdir l'appli :

- **PDF :** `pdfjs-dist`. On extrait le texte des 3 premières pages. Si on obtient moins de 20 caractères, le PDF est considéré comme scanné : `guess` est vide.
- **Photo :** `tesseract.js` 7, en langue française.
  - Avant la lecture, l'image est ramenée à 2 000 px au plus et passée en niveaux de gris.
  - Les fichiers de Tesseract (worker, moteur wasm, données `fra`) sont **hébergés par l'appli elle-même**, dans `public/ocr/`, et copiés depuis `node_modules` par un script lancé avant `dev` et `build`. Aucun CDN tiers n'est contacté.
  - Le service worker met ces fichiers en cache à la première utilisation (stratégie CacheFirst), sans les précharger à l'installation.
  - Ensuite, la lecture marche hors ligne.

## 5. Règles de lecture (`parseInvoice`)

Le texte est d'abord normalisé : minuscules, accents retirés, espaces multiples réduits. On garde aussi les lignes d'origine pour trouver le garage.

- **Montant TTC**
  - On cherche les montants (format `1 234,56`, `1234.56` ou `1234,56 €`) placés sur la même ligne que, ou juste après, l'un des mots-clés suivants, par ordre de priorité : « net a payer », « total ttc », « montant ttc », « total a payer », « a payer », « total ».
  - On retient le premier mot-clé trouvé dans cet ordre.
  - S'il y a plusieurs montants pour ce mot-clé, on prend le plus grand.
  - Sans mot-clé, on ne devine pas de montant.
- **Date**
  - Formats acceptés : `jj/mm/aaaa`, `jj-mm-aaaa`, `jj.mm.aaaa`, `jj/mm/aa` et `jj mois aaaa` (mois en toutes lettres).
  - On préfère une date proche des mots « date », « facture » ou « le ».
  - Sinon, on prend la plus récente des dates qui ne sont pas dans le futur.
  - Une date à plus d'un jour dans le futur ou avant 1990 est ignorée.
- **Kilométrage**
  - On prend un nombre de 1 à 7 chiffres (espaces ou points de milliers autorisés) proche de « km », « kilometrage » ou « compteur ».
  - Il doit être compris entre 1 et 2 000 000.
  - On ne vérifie pas la cohérence avec les relevés précédents : l'avertissement habituel du formulaire s'en charge.
- **Litres**
  - On prend un nombre décimal suivi de « l » ou « litres », ou proche de « volume » ou « quantite ».
  - Il doit être compris entre 1 et 200.
- **Type**
  - **Plein :** mots « carburant », « gazole », « gasoil », « sp95 », « sp98 », « e10 », « e85 », « super », « station ». Des litres seuls ne suffisent pas, car une facture de vidange mentionne aussi des litres d'huile. Les litres ne sont retenus que si le type deviné est « plein ».
  - **Réparation :** mots « reparation », « remplacement », « diagnostic », « carrosserie », « sinistre ».
  - **Entretien :** mots « vidange », « revision », « entretien », « filtre », « controle technique », ou présence d'un garage.
  - Sinon, le type reste vide et le formulaire « entretien » est choisi par défaut, comme aujourd'hui.
- **Catégorie** : selon les mots trouvés, dans les catégories existantes.
  - vidange ou huile → `oil` ;
  - plaquette, disque ou frein → `brakes` ;
  - pneu ou pneumatique → `tires` ;
  - distribution → `timing_belt` ;
  - carrosserie → `body` ;
  - controle technique → `ct`.
- **Garage**
  - On cherche d'abord une enseigne connue n'importe où dans le texte : Norauto, Feu Vert, Speedy, Midas, Point S, Euromaster, Carglass, Vulco, Roady, Leclerc auto, Dekra, Autosur, Securitest, Renault, Peugeot, Citroën, Toyota, Volkswagen…
  - Sinon, on prend la première ligne des 5 premières lignes qui contient au moins 3 lettres et qui n'est ni une date, ni un montant, ni « facture ».
  - Le nom est coupé à 60 caractères.

Chaque règle est indépendante. Un champ non trouvé vaut `null` et n'est pas surligné.

## 6. Erreurs et limites

- **Fichier trop lourd ou format refusé** : on affiche le même message que pour les factures jointes, et on n'ouvre pas le formulaire.
- **Échec du téléchargement de l'outil de lecture** (hors ligne à la première utilisation) : on affiche « Lecture impossible pour l'instant », puis on ouvre le formulaire vide avec la facture jointe.
- **HEIC non décodable par le navigateur** : on ouvre le formulaire vide avec la facture jointe.
- **Délai** : au-delà de 45 s de lecture, on abandonne et on ouvre le formulaire vide, avec la facture jointe.
- La lecture n'enregistre rien. Tant qu'on n'a pas touché « Enregistrer », aucune donnée n'est créée.

## 7. Tests

- **Unitaires (Vitest) sur `parseInvoice`**, avec une dizaine de textes de factures types écrits à la main :
  - facture de garage avec « Net à payer » ;
  - ticket de station-service avec litres ;
  - contrôle technique ;
  - facture de pneus ;
  - montants avec espaces de milliers ;
  - date en toutes lettres ;
  - texte d'OCR bruité ;
  - texte vide.
- **Composants (Testing Library)**, avec `readInvoice` simulé :
  - `ScanPage` : progression, puis redirection avec l'état ;
  - `EntryForm` : préremplissage, surlignage « à vérifier » qui disparaît à la modification, facture présente dans les fichiers en attente.
- **Test manuel sur téléphone**, une fois en ligne : une photo et un PDF réels d'Alex.
