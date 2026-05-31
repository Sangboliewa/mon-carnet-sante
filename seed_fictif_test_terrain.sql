-- ============================================================
-- Seed fictif — Test Terrain
-- DONNÉES ENTIÈREMENT FICTIVES. Ne jamais utiliser de vraies données.
-- ============================================================
-- Prérequis : créer deux comptes via l'interface signup :
--   user_A@fictif.test  (notera son UUID ci-dessous comme USER_A_ID)
--   user_B@fictif.test  (USER_B_ID)
--
-- Remplacez 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' par les vrais UUIDs.

-- Personnes fictives
-- Note : normalement créées via l'interface. Ce seed est un exemple pour
-- des tests manuels ou une instance de dev fraîche.

-- Exemple de données glossaire (indépendant des utilisateurs)
INSERT INTO exam_glossary (exam_type, display_name, description, educational_text, normal_ranges)
VALUES
(
  'NFS',
  'Numération Formule Sanguine',
  'Analyse du sang la plus courante',
  E'La NFS (Numération Formule Sanguine) est un bilan sanguin de base qui analyse les différentes cellules présentes dans le sang.\n\n**Globules rouges (érythrocytes)**\nTransportent l''oxygène des poumons vers les organes. Un manque peut indiquer une anémie.\n\n**Globules blancs (leucocytes)**\nCellules du système immunitaire. Un taux élevé peut indiquer une infection ou une inflammation.\n\n**Plaquettes (thrombocytes)**\nEssentielles à la coagulation du sang. Un taux bas peut augmenter le risque de saignement.\n\n**Hémoglobine**\nProtéine contenue dans les globules rouges, qui fixe et transporte l''oxygène.',
  '{"hemoglobine_g_dl": {"homme": "13.5-17.5", "femme": "12.0-15.5"}, "globules_blancs_G_L": "4.0-11.0", "plaquettes_G_L": "150-400"}'
),
(
  'Glycémie',
  'Glycémie à jeun',
  'Mesure du taux de glucose dans le sang',
  E'La glycémie mesure la concentration de glucose (sucre) dans le sang.\n\nElle est généralement réalisée à jeun (après 8 heures sans manger).\n\n**Pourquoi la mesure-t-on ?**\nPour dépister ou surveiller un diabète, ou évaluer une hypoglycémie.\n\n**Interprétation générale**\nUne valeur élevée de façon persistante peut indiquer un diabète ou un prédiabète. Une valeur très basse peut provoquer malaises et vertiges.\n\nSeul votre médecin peut interpréter votre résultat dans le contexte de votre santé globale.',
  '{"a_jeun_mmol_L": "3.9-5.5", "a_jeun_g_L": "0.70-1.00"}'
),
(
  'Bilan lipidique',
  'Bilan lipidique (cholestérol)',
  'Mesure des graisses dans le sang',
  E'Le bilan lipidique analyse les différentes graisses circulant dans le sang.\n\n**Cholestérol total**\nSomme de tous les types de cholestérol. Un taux élevé peut augmenter le risque cardiovasculaire.\n\n**LDL (mauvais cholestérol)**\nTransporte le cholestérol vers les artères. Un taux élevé est un facteur de risque.\n\n**HDL (bon cholestérol)**\nElimine l''excès de cholestérol. Un taux élevé est protecteur.\n\n**Triglycérides**\nGraisses stockées et utilisées comme énergie. Un taux élevé est associé à des risques cardiovasculaires.',
  '{"cholesterol_total_g_L": "< 2.0 souhaitable", "LDL_g_L": "< 1.6 normal", "HDL_g_L": "> 0.4 homme / > 0.5 femme", "triglycerides_g_L": "< 1.5"}'
),
(
  'TSH',
  'TSH (Thyroid Stimulating Hormone)',
  'Hormone de stimulation thyroïdienne',
  E'La TSH est une hormone produite par l''hypophyse (glande dans le cerveau) qui commande la thyroïde.\n\n**Rôle**\nElle régule la production des hormones thyroïdiennes, essentielles au métabolisme, à la croissance et au développement.\n\n**TSH élevée**\nPeut indiquer que la thyroïde fonctionne insuffisamment (hypothyroïdie). Symptômes possibles : fatigue, prise de poids, froid.\n\n**TSH basse**\nPeut indiquer que la thyroïde est trop active (hyperthyroïdie). Symptômes possibles : nervosité, perte de poids, palpitations.',
  '{"TSH_mUI_L": "0.4-4.0"}'
),
(
  'Créatinine',
  'Créatinine sérique',
  'Indicateur de la fonction rénale',
  E'La créatinine est un déchet produit par les muscles, éliminé par les reins.\n\nSon taux dans le sang reflète la capacité des reins à filtrer le sang.\n\n**Taux élevé**\nPeut indiquer que les reins filtrent moins bien. Cela peut être lié à une déshydratation, une maladie rénale, ou d''autres conditions.\n\n**Taux normal**\nIndique généralement une bonne fonction rénale.\n\nLa créatinine seule ne suffit pas — le médecin calcule souvent le DFG (débit de filtration glomérulaire) pour une évaluation plus complète.',
  '{"creatinine_umol_L": {"homme": "62-115", "femme": "44-97"}}'
)
ON CONFLICT (exam_type) DO NOTHING;
