# Carnet de Voiture

Appli web installable (PWA) pour tenir le carnet de ses voitures : entretiens, pleins, factures, échéances et coûts.

- Conception : [`docs/superpowers/specs/2026-10-22-carnet-voiture-design.md`](docs/superpowers/specs/2026-10-22-carnet-voiture-design.md)
- Plan : [`docs/superpowers/plans/2026-10-22-carnet-voiture-v1.md`](docs/superpowers/plans/2026-10-22-carnet-voiture-v1.md)

## Mise en ligne

Voir le guide pas à pas : [`docs/mise-en-place.md`](docs/mise-en-place.md).

## Développement local

```bash
npm install
cp .env.example .env.local   # puis renseigner l'URL et la clé publique Supabase
npm run dev
```

| Commande | Rôle |
|---|---|
| `npm test` | tests unitaires et de composants (Vitest) |
| `npm run lint` | vérification des types et lint |
| `npm run build` | build de production |
| `supabase db start && supabase test db` | tests de sécurité de la base (Docker requis) |
