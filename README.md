# AYMANE — La santé intelligente, partout avec vous

AYMANE digitalise et centralise les services de santé en Afrique :
téléconsultations, dossier médical numérique, pharmacie, urgences/SOS,
banque de sang, espaces dédiés pour médecins, pharmaciens et laboratoires.

> Projet construit avec [Lovable](https://lovable.dev) sur **React + Vite + Tailwind**,
> propulsé par **Lovable Cloud** (Supabase) pour l'authentification, la base de
> données, le stockage et les edge functions.

---

## 🚀 Stack technique

| Domaine             | Technologie                                                 |
| ------------------- | ----------------------------------------------------------- |
| Framework UI        | React 18 + TypeScript 5                                     |
| Build / Dev server  | Vite 5 + SWC                                                |
| Styling             | Tailwind CSS 3 + tokens HSL sémantiques + shadcn/ui         |
| Animations          | Framer Motion                                               |
| State & data        | TanStack Query, React Hook Form, Zod                        |
| Backend             | Lovable Cloud (Supabase : Postgres, Auth, Storage, Edge Fn) |
| Tests               | Vitest + Testing Library                                    |
| Lint                | ESLint 9 + typescript-eslint                                |

---

## 🧭 Structure du projet

```
src/
  components/          UI réutilisable (Navbar, Footer, cards, smart inputs…)
    ui/                Primitives shadcn/ui
  hooks/               Hooks React (useAuth, use-mobile, use-toast…)
  integrations/
    supabase/          Client Supabase auto-généré + types DB
  lib/                 Utilitaires (cn, medical-data, vitals…)
  pages/               Pages routées (Index, Auth, Dashboard, SOS, Tarifs…)
  test/                Setup Vitest
  index.css            Tokens design (HSL) + base layer
supabase/
  config.toml          Config locale Lovable Cloud
  functions/           Edge functions Deno (symptom-triage)
  migrations/          Migrations SQL versionnées
```

---

## 🛠️ Démarrage local

```bash
# 1. Installer les dépendances
bun install         # ou npm install / pnpm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# puis renseigner VITE_SUPABASE_URL / _PROJECT_ID / _PUBLISHABLE_KEY

# 3. Lancer le serveur de dev
bun run dev         # http://localhost:8080
```

### Scripts disponibles

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `bun run dev`       | Démarrage Vite en mode développement     |
| `bun run build`     | Build de production                      |
| `bun run build:dev` | Build avec source maps & mode dev        |
| `bun run preview`   | Prévisualisation du build de production  |
| `bun run lint`      | Lint du codebase                         |
| `bun run test`      | Tests Vitest (one-shot)                  |
| `bun run test:watch`| Tests Vitest en mode watch               |

---

## 🔐 Sécurité & rôles

Les rôles utilisateur (`patient`, `doctor`, `pharmacist`, `nurse`, `midwife`,
`dentist`, `lab_technician`, `other_provider`, `admin`) sont stockés dans la
table dédiée `public.user_roles` — **jamais** sur `profiles`. L'accès est
contrôlé via la fonction `SECURITY DEFINER` `public.has_role(uuid, app_role)`
utilisée dans toutes les policies RLS.

Chaque table publique a :
- des `GRANT` explicites (`anon` / `authenticated` / `service_role`),
- la RLS activée,
- des policies scoping par `auth.uid()` et `has_role(...)`.

---

## 💳 Paiements

Le module de paiement **PayDunya** (Mobile Money — Orange Money, Wave,
Free Money — et carte bancaire) sera intégré dans une itération
ultérieure. La page `/tarifs` affiche actuellement les plans en mode
"bientôt disponible".

---

## 🚢 Déploiement

- **Hébergement par défaut** : Lovable (`Publish` dans l'éditeur).
- **Hébergement externe** : ce projet est une SPA Vite standard,
  hébergeable sur Vercel, Netlify, Cloudflare Pages, etc. Configurer les
  trois variables `VITE_SUPABASE_*` et activer la réécriture `/* → /index.html`
  pour le routage client.

---

## 📄 Licence

Propriétaire — © AYMANE. Tous droits réservés.
