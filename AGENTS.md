# Mon Carnet Santé — Règles de développement (Test Terrain)

Tu construis une PWA healthtech de DÉMONSTRATION sur données fictives.

Non négociable :
- DONNÉES FICTIVES UNIQUEMENT. Jamais de vraie donnée patient à ce stade.
- Ne désactive jamais la RLS. Le schéma (schema_supabase_rls.sql) fait foi ;
  n'altère pas les policies, ne crée pas de table patient sans RLS.
- CHEMIN 3 : n'envoie JAMAIS un document ou des valeurs patient à un LLM.
  L'explication d'un examen = lecture de exam_glossary par exam_type. Pas d'appel
  LLM à l'exécution dans cette tranche.
- Affiche toujours le disclaimer sur toute fiche d'explication :
  "Ceci n'est pas un diagnostic. Cette information explique des termes médicaux
   généraux et ne tient pas compte de votre situation personnelle. Consultez un
   professionnel de santé."
- Toute lecture d'un document doit être journalisée côté application (les triggers
  Postgres ne captent pas les SELECT).
- Upload : PDF, JPG, PNG uniquement + contrôle de taille.
- TypeScript strict. Aucun secret en dur. Variables d'environnement.
- Auth obligatoire sur toute page touchant une donnée patient.
- Écris des tests sur l'accès (ownership) : un utilisateur ne voit que les
  personnes auxquelles il a accès via person_access.

UI :
- Mobile-first (PWA installable). Sobre, médical : bleu, blanc, vert santé.
- Grands boutons, navigation simple, français.
