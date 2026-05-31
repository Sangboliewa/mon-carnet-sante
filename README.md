# Mon Carnet Santé — PWA Test Terrain

PWA de démonstration healthtech sur **données fictives**. Stack : Next.js 15 App Router · TypeScript strict · Tailwind · Supabase.

> ⚠️ Version de démonstration uniquement. Ne jamais saisir de vraies données patient à ce stade.

---

## Prérequis

- Node.js 20+
- Un projet Supabase (gratuit) : https://supabase.com
- (Optionnel) pnpm ou yarn — npm fonctionne aussi

---

## 1. Créer le projet Supabase

1. Créer un nouveau projet sur https://app.supabase.com
2. Dans **Settings > API** : copier `Project URL` et `anon public key`

---

## 2. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplir `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 3. Appliquer le schéma Supabase

Dans **Supabase Dashboard > SQL Editor**, exécuter dans cet ordre :

```sql
-- 1. Schéma + RLS
\i schema_supabase_rls.sql

-- 2. Données fictives (glossaire)
\i seed_fictif_test_terrain.sql
```

Ou copier-coller le contenu de chaque fichier dans l'éditeur SQL.

---

## 4. Créer le bucket Storage

Dans **Supabase Dashboard > Storage** :
- Cliquer **New Bucket**
- Nom : `medical-documents`
- **Public : NON** (laisser privé)
- Créer

Puis dans **Storage > Policies**, ajouter une policy pour `medical-documents` :

```sql
-- Lecture : seul l'utilisateur propriétaire du document peut lire
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'medical-documents' AND auth.uid() IS NOT NULL
  );

-- Upload : utilisateurs authentifiés
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'medical-documents' AND auth.uid() IS NOT NULL
  );
```

---

## 5. Installer les dépendances et lancer

```bash
npm install
npm run dev
```

L'application tourne sur http://localhost:3000

---

## 6. Créer un compte de test

1. Ouvrir http://localhost:3000/signup
2. Remplir prénom, nom, e-mail, mot de passe
3. Un profil `persons` est créé automatiquement, avec l'accès `owner`

---

## 7. Lancer les tests

```bash
npm test
```

Les tests vérifient :
- L'isolation des accès (ownership) : un user ne voit que ses propres persons
- La validation des uploads (types, taille)
- Le chemin 3 — « Comprendre cet examen » sans LLM

---

## Architecture des pages

| Route | Description |
|---|---|
| `/` | Redirection login/dashboard |
| `/login` | Connexion Supabase Auth |
| `/signup` | Inscription + création de person |
| `/dashboard` | Tableau de bord |
| `/profil` | Voir/éditer le profil santé |
| `/antecedents` | Hub antécédents |
| `/antecedents/allergies` | CRUD allergies |
| `/antecedents/maladies` | CRUD maladies chroniques |
| `/antecedents/traitements` | CRUD traitements |
| `/antecedents/vaccins` | CRUD vaccinations |
| `/documents` | Coffre-fort (liste + upload) |
| `/documents/[id]` | Détail + « Comprendre cet examen » |
| `/urgence` | Carte d'urgence + QR code |
| `/partage` | Liens de partage temporaire |

---

## Fonctionnement de « Comprendre cet examen »

**Chemin 3 — aucun LLM.** L'explication est lue depuis la table `exam_glossary` par `exam_type`. Aucune donnée patient n'est envoyée à un service externe. Le disclaimer réglementaire est toujours affiché.

---

## Note de sécurité — avant pilote sur données réelles

Le partage actuel utilise des URLs signées Supabase (durée limitée). Avant tout passage en données réelles, remplacer par :
- Edge function validant un **token haché** (stocké haché dans `shared_links`)
- Usage unique + révocation + journal `share_access_log`

Voir §5 du document de spécification.

---

## PWA — Installation

Sur mobile (Chrome / Safari iOS) : ouvrir l'app, puis **"Ajouter à l'écran d'accueil"**.
