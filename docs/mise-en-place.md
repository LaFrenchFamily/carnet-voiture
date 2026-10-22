# Mise en place de Carnet de Voiture

Ce guide met l'appli en ligne, étape par étape. Compter environ 30 minutes. Tout est gratuit.

Valeurs du projet Supabase :

- URL du projet : `https://rihiqekeclcrnrwgiglz.supabase.co`
- Clé publique (publishable) : celle de *Project Settings → API Keys*

> La clé **secret / service_role** ne doit jamais être copiée dans l'appli ni dans Vercel.

## 1. Créer les tables dans Supabase

1. Ouvrir le projet sur [supabase.com/dashboard](https://supabase.com/dashboard).
2. Menu de gauche → **SQL Editor** → **New query**.
3. Copier-coller le contenu de chaque fichier ci-dessous, **dans cet ordre**, puis cliquer sur **Run** à chaque fois :
   1. [`supabase/migrations/20261022000001_schema.sql`](../supabase/migrations/20261022000001_schema.sql)
   2. [`supabase/migrations/20261022000002_rls.sql`](../supabase/migrations/20261022000002_rls.sql)
   3. [`supabase/migrations/20261022000003_storage.sql`](../supabase/migrations/20261022000003_storage.sql)
4. Vérifier : **Table Editor** affiche `vehicles`, `entries`, `reminders` et `documents`, et **Storage** affiche le bucket `factures` (privé).

Variante en ligne de commande, si Node est installé : `npx supabase login`, puis `npx supabase link --project-ref rihiqekeclcrnrwgiglz`, puis `npx supabase db push`.

## 2. Mettre l'appli en ligne avec Vercel

1. Se connecter sur [vercel.com](https://vercel.com) avec son compte GitHub.
2. **Add New… → Project**, puis choisir le dépôt `carnet-voiture` → **Import**.
3. Vercel détecte Vite tout seul. Dans **Environment Variables**, ajouter :
   - `VITE_SUPABASE_URL` = `https://rihiqekeclcrnrwgiglz.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = la clé publishable (`sb_publishable_…`)
4. Cliquer sur **Deploy**. À la fin, Vercel donne l'adresse de l'appli, par exemple `https://carnet-voiture.vercel.app`.

Chaque modification fusionnée sur `main` est ensuite redéployée automatiquement.

## 3. Autoriser cette adresse pour la connexion

Dans Supabase → **Authentication → URL Configuration** :

- **Site URL** : l'adresse Vercel (par exemple `https://carnet-voiture.vercel.app`).
- **Redirect URLs** : ajouter cette même adresse, et `http://localhost:5173` pour le développement.

## 4. Envoi des emails (inscription et lien magique)

Le service d'email intégré à Supabase n'envoie qu'aux membres de l'équipe du projet, avec quelques emails par heure. Pour que **d'autres personnes** puissent créer un compte par email :

1. Créer un compte gratuit chez un fournisseur d'emails, par exemple [Resend](https://resend.com), et récupérer ses identifiants SMTP.
2. Supabase → **Authentication → Emails → SMTP Settings** : activer **Custom SMTP** et renseigner ces identifiants.

La connexion avec Google (étape 5) ne dépend pas des emails.

## 5. Connexion avec Google (facultatif mais pratique)

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com) et créer un projet, nommé par exemple « Carnet de Voiture ».
2. **APIs & Services → OAuth consent screen** : type **External**. Renseigner le nom de l'appli et son email, puis publier (**Publish app**).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** :
   - Type : **Web application**.
   - **Authorized redirect URIs** : `https://rihiqekeclcrnrwgiglz.supabase.co/auth/v1/callback`.
4. Copier le **Client ID** et le **Client secret**.
5. Supabase → **Authentication → Sign In / Providers → Google** : activer, coller les deux valeurs, puis enregistrer.

## 6. Installer l'appli sur son téléphone

- **Android (Chrome)** : ouvrir l'adresse Vercel, puis menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
- **iPhone (Safari)** : ouvrir l'adresse Vercel, puis bouton **Partager** → **Sur l'écran d'accueil**.
- **Ordinateur (Chrome, Edge)** : cliquer sur l'icône d'installation dans la barre d'adresse.

## Bon à savoir

- Sur l'offre gratuite, Supabase **met le projet en pause après 7 jours sans aucune utilisation**. Il suffit de le relancer depuis le tableau de bord. Une utilisation régulière de l'appli évite la pause.
- Quotas gratuits : 500 Mo de base de données et 1 Go de fichiers, ce qui représente plusieurs milliers de factures en photo compressée.
- Chaque utilisateur ne voit que ses propres voitures. Cette isolation est vérifiée par les tests automatiques de `supabase/tests/`.
