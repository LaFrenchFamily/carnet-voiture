# Carnet de Voiture : conception de la V1

Date : 2026-10-22 · Demandé par Alex

## 1. Objectif

Une appli web installable (PWA) en français pour tenir le carnet de ses voitures. Elle sert à ne rater aucune échéance, à garder l'historique des entretiens et des factures (utile à la revente) et à suivre ce que coûte chaque voiture.

L'appli est ouverte à plusieurs utilisateurs. Chacun crée son propre compte et ne voit que ses propres voitures. Une voiture n'est jamais partagée entre deux comptes.

**Critères de réussite de la V1**

- Un nouvel utilisateur crée un compte, ajoute une voiture et enregistre un plein ou un entretien en moins de 2 minutes, sur téléphone.
- Une facture prise en photo au téléphone se retrouve, en moins de 3 actions, rattachée à la bonne voiture.
- L'écran d'accueil montre immédiatement les échéances en retard ou proches.
- Aucun utilisateur ne peut lire ni modifier les données ou les factures d'un autre compte, ce qui est vérifié par des tests.

## 2. Périmètre

### Inclus dans la V1

| Domaine | Contenu |
|---|---|
| Compte | Inscription et connexion par email (lien magique ou mot de passe) ou par Google. Déconnexion. Suppression du compte avec toutes ses données. |
| Voitures | Créer, modifier et archiver une voiture : surnom, marque, modèle, année, immatriculation, énergie, kilométrage à l'ajout, photo facultative. |
| Journal | Entrées de type **entretien**, **réparation**, **plein** ou **autre dépense** (assurance, péage, lavage…). Chaque entrée porte une date, un kilométrage facultatif, un montant et des notes. Un plein ajoute les litres et la case « plein complet ». Un entretien ou une réparation ajoute une catégorie et un garage. |
| Factures | Import d'un PDF ou d'une image (photo prise directement au téléphone, ou fichier). Une facture est rattachée à une voiture et, si on le souhaite, à une entrée du journal. On peut la consulter, la télécharger et la supprimer. |
| Échéances | Contrôle technique, assurance, vidange, pneus, distribution ou libellé libre. Chaque échéance a une date et/ou un kilométrage, et peut être récurrente (tous les N mois et/ou N km). La marquer « faite » crée automatiquement la suivante. |
| Accueil | Liste des voitures avec leur kilométrage actuel, et échéances **en retard** puis **à venir**, triées par urgence. |
| Coûts | Pour chaque voiture : total par mois et par an, répartition par type de dépense et consommation moyenne en L/100 km. |
| PWA | Installable sur l'écran d'accueil (Android, iOS, ordinateur). Interface pensée d'abord pour le mobile. |

### Hors V1 (plus tard)

- Rappels par email ou par notification push.
- Lecture automatique des montants et des dates sur les factures (OCR).
- Export (PDF ou ZIP du dossier voiture pour la revente).
- Mode hors ligne avec saisie différée. En V1, l'appli se charge hors ligne mais l'enregistrement demande une connexion.
- Partage d'une voiture entre plusieurs comptes.

## 3. Architecture

```
Téléphone / navigateur
  └─ PWA React (hébergée sur Vercel)
       ├─ Supabase Auth      : comptes (email, Google)
       ├─ Supabase Postgres  : données, isolées par des règles RLS
       └─ Supabase Storage   : bucket privé « factures »
```

Il n'y a pas de serveur applicatif propre : la PWA parle directement à Supabase avec la clé publique (anon). La sécurité repose entièrement sur les politiques Row Level Security de Postgres et de Storage, d'où les tests dédiés (section 7).

**Stack**

- Vite + React + TypeScript, React Router.
- TanStack Query pour les appels à Supabase (cache et états de chargement).
- `@supabase/supabase-js`.
- Tailwind CSS.
- `vite-plugin-pwa` pour le manifest et le service worker.
- Vitest et Testing Library pour les tests front. pgTAP (`supabase test db`) pour les tests de sécurité en base.
- Supabase CLI pour les migrations SQL, versionnées dans `supabase/migrations/`.

**Organisation du code**

```
src/
  lib/supabase.ts          client Supabase
  domain/                  logique pure, sans React ni réseau (testée unitairement)
    odometer.ts            kilométrage actuel d'une voiture
    consumption.ts         consommation L/100 km
    costs.ts               agrégats par mois, an et type
    reminders.ts           statut des échéances et calcul de la suivante
  api/                     un fichier par table : requêtes et mutations TanStack Query
  features/
    auth/  vehicles/  entries/  documents/  reminders/  dashboard/  costs/
  components/              composants UI partagés
supabase/
  migrations/              schéma, RLS, bucket
  tests/                   tests pgTAP d'isolation
```

## 4. Modèle de données

Toutes les tables ont `id uuid`, `user_id uuid` (référence `auth.users`, valeur par défaut `auth.uid()`) et `created_at`. Les montants sont stockés **en centimes** (entier) pour éviter les erreurs d'arrondi.

**vehicles**
`nickname` texte obligatoire, `make`, `model`, `year`, `plate`, `fuel_type` (essence, diesel, hybride, électrique, GPL, autre), `initial_odometer` entier, `photo_path` facultatif, `archived_at` facultatif.

**entries** (journal)
`vehicle_id`, `kind` (`maintenance` | `repair` | `fuel` | `other`), `date` obligatoire, `odometer` facultatif, `title`, `category` facultatif (vidange, freins, pneus, carrosserie…), `garage` facultatif, `amount_cents` facultatif, `liters` numérique (pleins uniquement), `full_tank` booléen (pleins uniquement), `notes`.
Contrainte : `liters` est obligatoire si `kind = 'fuel'`.

**reminders** (échéances)
`vehicle_id`, `type` (`ct` | `insurance` | `oil` | `tires` | `timing_belt` | `custom`), `label`, `due_date` facultatif, `due_odometer` facultatif (au moins l'un des deux est obligatoire), `every_months` facultatif, `every_km` facultatif, `done_at` facultatif, `done_entry_id` facultatif.

**documents** (factures)
`vehicle_id`, `entry_id` facultatif, `storage_path`, `file_name`, `mime_type`, `size_bytes`, `title`, `doc_date`.

**Sécurité (RLS)**

- Sur chaque table : `select`, `insert`, `update` et `delete` sont autorisés seulement si `user_id = auth.uid()`.
- Les clés étrangères `vehicle_id` et `entry_id` sont vérifiées par un trigger : la voiture ou l'entrée référencée doit appartenir au même utilisateur. Sans cela, on pourrait rattacher une donnée à la voiture d'un autre compte.
- Le bucket `factures` est privé. Les fichiers sont rangés sous `{user_id}/{vehicle_id}/{uuid}.{ext}`, et la politique Storage n'autorise l'accès que si le premier dossier vaut `auth.uid()`. L'affichage passe par des URL signées à durée courte.
- La suppression d'une voiture supprime en cascade ses entrées, échéances et documents, y compris les fichiers du bucket (suppression côté client, puis nettoyage par une fonction SQL des objets orphelins). La suppression du compte suit le même principe.

## 5. Règles de calcul

- **Kilométrage actuel** : le maximum entre `initial_odometer` et les `odometer` de ses entrées.
- **Consommation (méthode plein à plein)** : entre deux pleins complets consécutifs, on divise la somme des litres versés après le premier (le second inclus) par la distance parcourue, puis on multiplie par 100. Les intervalles sans kilométrage sont ignorés. La moyenne affichée est pondérée par la distance. Sans au moins deux pleins complets avec kilométrage, l'appli affiche « pas assez de données ».
- **Statut d'une échéance non faite** :
  - **en retard** si `due_date` est passée ou si `due_odometer` est inférieur ou égal au kilométrage actuel ;
  - **bientôt** si la date tombe dans les 30 jours ou si l'écart est de 1 000 km ou moins ;
  - **à venir** sinon.
  On retient le pire des deux critères.
- **Échéance faite** : on renseigne `done_at` (et `done_entry_id` si on vient de saisir l'entretien correspondant). Si `every_months` ou `every_km` est défini, une nouvelle échéance est créée avec `due_date = date de réalisation + every_months` et `due_odometer = km de réalisation + every_km`.
- **Coûts** : somme de `amount_cents` par mois civil, par année et par `kind`. Les entrées sans montant sont ignorées.

## 6. Parcours et écrans

1. **Connexion / inscription**.
2. **Accueil** : cartes des voitures (photo, surnom, km actuel), bloc « Échéances » (en retard en rouge, bientôt en orange) et un bouton flottant **+** pour ajouter un plein, un entretien, une facture ou une échéance.
3. **Fiche voiture**, en onglets : Journal (chronologique, avec filtre par type) · Échéances · Factures · Coûts · Infos.
4. **Formulaires** courts et adaptés au type d'entrée. Le kilométrage est prérempli avec le kilométrage actuel. Le formulaire d'entretien propose « Joindre une facture » (appareil photo ou fichier).
5. **Factures** : grille de miniatures, avec ouverture en plein écran (image) ou dans le lecteur PDF du navigateur.

## 7. Erreurs, limites et tests

**Erreurs et limites**

- Fichiers acceptés : PDF, JPEG, PNG, HEIC et WebP, 10 Mo au maximum. Les photos sont redimensionnées côté client (2 000 px max, JPEG) avant l'envoi.
- Si l'envoi d'un fichier échoue, l'entrée du journal est quand même enregistrée, avec un message et un bouton « Réessayer ».
- Sans connexion, un bandeau « Hors ligne » s'affiche et les boutons d'enregistrement sont désactivés.
- Validation des formulaires côté client (km positif, litres positifs, date pas plus de 1 an dans le futur), doublée de contraintes `check` en base.
- Un kilométrage inférieur au précédent déclenche un avertissement, sans bloquer la saisie.

**Tests**

- Unitaires (Vitest) sur `src/domain/` : kilométrage actuel, consommation (cas limites : un seul plein, plein partiel, km manquant), agrégats de coûts et statut des échéances (date seule, km seul, les deux, échéance récurrente).
- Sécurité (pgTAP) : deux utilisateurs A et B. B ne peut ni lire, ni modifier, ni supprimer les lignes de A, ni rattacher une entrée à la voiture de A, ni lire un fichier du dossier de A.
- Composants (Testing Library) : formulaire de plein et calcul affiché.

## 8. Mise en place (côté Alex)

1. Créer un compte gratuit sur supabase.com, créer un projet (région Europe), puis me transmettre l'URL du projet et la clé `anon`. Ces deux valeurs sont publiques par nature, mais il ne faut jamais transmettre la clé `service_role`.
2. Créer un compte gratuit sur vercel.com, puis importer le dépôt GitHub `carnet-voiture`.
3. Pour la connexion Google : créer des identifiants OAuth dans la console Google. Je fournirai la marche à suivre pas à pas.

Remarque : le dépôt est actuellement **public**. Le code ne contient aucun secret, mais il peut être passé en privé dans les réglages GitHub si Alex préfère.
