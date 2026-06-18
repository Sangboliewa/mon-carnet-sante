-- ============================================================
-- Seed : Glossaire des examens médicaux courants
-- Appliquer via : Supabase Dashboard > SQL Editor
-- ============================================================

INSERT INTO exam_glossary (exam_type, display_name, description, educational_text, normal_ranges)
VALUES

-- ─── Bilan sanguin ───────────────────────────────────────────

('NFS', 'Numération Formule Sanguine (NFS)',
'Analyse complète des cellules du sang : globules rouges, globules blancs et plaquettes.',
'La NFS (ou hémogramme) est l''examen sanguin le plus courant. Elle mesure :

• Les globules rouges (érythrocytes) : transportent l''oxygène dans l''organisme.
• L''hémoglobine : protéine contenue dans les globules rouges, porteuse de l''oxygène.
• Le taux d''hématocrite : proportion du sang occupée par les globules rouges.
• Les globules blancs (leucocytes) : défendent l''organisme contre les infections.
• Les plaquettes (thrombocytes) : interviennent dans la coagulation du sang.

Un résultat anormal peut orienter vers une anémie, une infection, une inflammation ou une maladie du sang. Votre médecin interprétera les résultats dans le contexte de vos symptômes.',
'{
  "Hémoglobine (femme)": "12–16 g/dL",
  "Hémoglobine (homme)": "13–17 g/dL",
  "Globules blancs": "4 000–10 000 /mm³",
  "Plaquettes": "150 000–400 000 /mm³",
  "Hématocrite (femme)": "36–46 %",
  "Hématocrite (homme)": "40–52 %"
}'::jsonb),

('GLYCEMIE', 'Glycémie (taux de sucre dans le sang)',
'Mesure de la concentration de glucose dans le sang, à jeun ou après un repas.',
'La glycémie mesure la quantité de sucre (glucose) dans votre sang. Le glucose est la principale source d''énergie de l''organisme.

• À jeun : reflète la capacité du corps à réguler le sucre pendant la nuit.
• Après repas (postprandiale) : évalue la réponse de l''organisme à l''alimentation.

Des valeurs élevées à jeun (hyperglycémie) peuvent indiquer un diabète ou un prédiabète. Des valeurs trop basses (hypoglycémie) peuvent causer des malaises, vertiges ou perte de conscience.

L''examen est souvent complété par un dosage de l''HbA1c (hémoglobine glyquée) pour évaluer l''équilibre glycémique sur 3 mois.',
'{
  "À jeun (normale)": "< 1,10 g/L (6,1 mmol/L)",
  "À jeun (prédiabète)": "1,10–1,25 g/L",
  "À jeun (diabète)": "≥ 1,26 g/L (2 mesures)",
  "2h après repas (normale)": "< 1,40 g/L",
  "HbA1c (cible diabétique)": "< 7 %"
}'::jsonb),

('HBA1C', 'Hémoglobine glyquée (HbA1c)',
'Indicateur de l''équilibre glycémique sur les 2 à 3 derniers mois.',
'L''HbA1c mesure la proportion d''hémoglobine liée au glucose dans les globules rouges. Contrairement à la glycémie ponctuelle, elle reflète la moyenne des taux de sucre sur environ 3 mois.

C''est l''examen clé pour surveiller l''équilibre du diabète. Chez les personnes diabétiques, l''objectif habituel est d''avoir une HbA1c < 7 % (à adapter selon l''âge et les comorbidités).

Un taux élevé indique que le sucre a été trop haut de façon prolongée, augmentant le risque de complications (rein, yeux, nerfs, cœur).',
'{
  "Normale (non diabétique)": "< 5,7 %",
  "Prédiabète": "5,7–6,4 %",
  "Diabète": "≥ 6,5 %",
  "Objectif traitement diabète": "< 7 % (en général)"
}'::jsonb),

('BILAN_LIPIDIQUE', 'Bilan lipidique (cholestérol et triglycérides)',
'Mesure des graisses dans le sang : cholestérol total, LDL, HDL et triglycérides.',
'Le bilan lipidique évalue les graisses circulant dans votre sang :

• Cholestérol total : somme de tous les types de cholestérol.
• LDL (« mauvais cholestérol ») : peut s''accumuler dans les artères et former des plaques.
• HDL (« bon cholestérol ») : transporte le cholestérol vers le foie pour élimination. Plus il est élevé, mieux c''est.
• Triglycérides : graisses provenant principalement de l''alimentation et de l''alcool.

Des niveaux élevés de LDL et de triglycérides augmentent le risque cardiovasculaire (infarctus, AVC). Le traitement peut inclure des changements alimentaires, de l''exercice ou des médicaments (statines).',
'{
  "Cholestérol total": "< 2,0 g/L (souhaitable)",
  "LDL (bas risque cardiovasculaire)": "< 1,30 g/L",
  "LDL (haut risque cardiovasculaire)": "< 0,70 g/L",
  "HDL (femme)": "> 0,60 g/L",
  "HDL (homme)": "> 0,40 g/L",
  "Triglycérides": "< 1,50 g/L"
}'::jsonb),

('CREATININE', 'Créatinine et fonction rénale',
'Indicateur de la capacité des reins à filtrer le sang.',
'La créatinine est un déchet musculaire éliminé par les reins. Son taux dans le sang permet d''évaluer la fonction rénale.

En pratique, on calcule le DFG (débit de filtration glomérulaire) à partir de la créatinine, de l''âge, du sexe et du poids pour estimer la fonction rénale globale.

Un taux de créatinine élevé peut indiquer une insuffisance rénale aiguë ou chronique. L''analyse des urines (protéinurie, microalbuminurie) complète souvent cet examen.',
'{
  "Créatinine (femme)": "50–90 µmol/L (0,6–1,0 mg/dL)",
  "Créatinine (homme)": "60–115 µmol/L (0,7–1,3 mg/dL)",
  "DFG normal": "> 90 mL/min/1,73m²",
  "Insuffisance rénale légère": "60–89 mL/min",
  "Insuffisance rénale modérée": "30–59 mL/min",
  "Insuffisance rénale sévère": "< 30 mL/min"
}'::jsonb),

('TSH', 'TSH (hormone thyréostimulante)',
'Évalue la fonction de la glande thyroïde.',
'La TSH est une hormone produite par l''hypophyse (glande dans le cerveau) qui stimule la thyroïde à produire ses hormones (T3 et T4).

• TSH élevée : la thyroïde fonctionne insuffisamment (hypothyroïdie) — fatigue, prise de poids, froid, constipation.
• TSH basse : la thyroïde est hyperactive (hyperthyroïdie) — palpitations, perte de poids, nervosité, chaleur.

Si la TSH est anormale, le médecin demandera souvent les hormones T3 libre et T4 libre pour préciser le diagnostic.',
'{
  "TSH (adulte)": "0,4–4,0 mUI/L",
  "TSH (grossesse 1er trimestre)": "0,1–2,5 mUI/L",
  "TSH (grossesse 2e–3e trimestre)": "0,2–3,0 mUI/L"
}'::jsonb),

('TRANSAMINASES', 'Transaminases (ASAT / ALAT)',
'Enzymes hépatiques indiquant l''état du foie.',
'Les transaminases (ASAT/GOT et ALAT/GPT) sont des enzymes présentes dans les cellules du foie. Quand le foie est endommagé, elles se libèrent dans le sang.

• ALAT (alanine aminotransférase) : plus spécifique du foie.
• ASAT (aspartate aminotransférase) : présente aussi dans le cœur et les muscles.

Une élévation peut indiquer une hépatite virale, une stéatose hépatique (foie gras), une toxicité médicamenteuse, ou une consommation excessive d''alcool. Des valeurs légèrement élevées sont parfois transitoires.',
'{
  "ALAT (femme)": "< 35 UI/L",
  "ALAT (homme)": "< 45 UI/L",
  "ASAT (femme)": "< 35 UI/L",
  "ASAT (homme)": "< 40 UI/L",
  "Seuil d''inquiétude": "> 3× la normale"
}'::jsonb),

('CRP', 'CRP (Protéine C-Réactive)',
'Marqueur d''inflammation ou d''infection dans l''organisme.',
'La CRP est une protéine produite par le foie en réponse à une inflammation, une infection ou une lésion tissulaire. Elle monte rapidement (en quelques heures) lors d''une infection bactérienne ou d''une inflammation.

• CRP très élevée (> 100 mg/L) : souvent une infection bactérienne sévère.
• CRP modérée (10–100 mg/L) : infection, inflammation chronique.
• CRP hs (haute sensibilité) < 1 mg/L : risque cardiovasculaire faible.

La CRP ne dit pas où est l''inflammation — le médecin cherchera l''origine avec d''autres examens.',
'{
  "CRP normale": "< 5 mg/L",
  "CRP haute sensibilité (hs-CRP) risque bas": "< 1 mg/L",
  "CRP hs risque modéré": "1–3 mg/L",
  "CRP hs risque élevé": "> 3 mg/L"
}'::jsonb),

('FERRITINE', 'Ferritine (réserves en fer)',
'Reflète les réserves de fer stockées dans l''organisme.',
'La ferritine est la protéine de stockage du fer dans l''organisme. Son taux sanguin est le meilleur indicateur des réserves en fer.

• Ferritine basse : carence en fer (anémie ferriprive) — fatigue, pâleur, essoufflement, cheveux fragiles.
• Ferritine élevée : surcharge en fer (hémochromatose), inflammation chronique, maladie hépatique.

Une carence en fer peut exister même avant l''apparition d''une anémie (carence sans anémie). Un bilan complet inclut aussi la saturation de la transferrine.',
'{
  "Ferritine (femme adulte)": "15–150 µg/L",
  "Ferritine (homme adulte)": "30–300 µg/L",
  "Carence en fer": "< 15 µg/L",
  "Surcharge en fer": "> 300 µg/L"
}'::jsonb),

-- ─── Examens d''imagerie ──────────────────────────────────────

('RADIOGRAPHIE', 'Radiographie (radio)',
'Imagerie par rayons X pour visualiser os et structures internes.',
'La radiographie utilise des rayons X pour créer des images des structures internes. Elle est particulièrement utile pour :

• Les os : fractures, arthrose, infection osseuse.
• Les poumons : pneumonie, épanchement pleural, cancer, tuberculose.
• Le cœur : taille cardiaque, congestion pulmonaire.
• L''abdomen : obstruction intestinale, calculs.

L''exposition aux rayons X est faible pour un cliché standard. Des précautions particulières sont prises pendant la grossesse (protection abdominale ou report si possible).',
null),

('ECHOGRAPHIE', 'Échographie (ultrasons)',
'Imagerie par ultrasons pour visualiser les organes internes sans rayonnement.',
'L''échographie utilise des ultrasons (ondes sonores à haute fréquence) pour créer des images des organes internes en temps réel. Elle ne nécessite pas de rayonnement et est sans danger, y compris pendant la grossesse.

Applications courantes :
• Abdomen : foie, vésicule biliaire, pancréas, rate, reins.
• Pelvis : utérus, ovaires, prostate, vessie.
• Obstétrique : suivi de grossesse, estimation du terme, développement du bébé.
• Cœur (échographie cardiaque) : structure et fonction cardiaque.
• Vaisseaux (Doppler) : circulation sanguine, phlébite, sténose artérielle.

Selon la région examinée, un gel est appliqué sur la peau. Aucune préparation spéciale n''est nécessaire sauf pour l''abdomen (jeûne de 4–6 h) ou le pelvis (vessie pleine).',
null),

('IRM', 'IRM (Imagerie par Résonance Magnétique)',
'Imagerie avancée sans rayonnement utilisant un champ magnétique.',
'L''IRM utilise un puissant champ magnétique et des ondes radio pour créer des images très détaillées des organes et tissus mous. Elle est sans rayonnement ionisant.

Applications :
• Cerveau et moelle épinière : tumeurs, AVC, sclérose en plaques, hernies discales.
• Articulations : genoux, épaules, hanches (ménisques, ligaments, cartilage).
• Abdomen et pelvis : foie, pancréas, reins, prostate, utérus.
• Cœur : structure cardiaque complexe.

L''examen dure de 20 à 60 minutes. Le patient est allongé dans un tunnel cylindrique. L''appareil produit des bruits forts (bouchons ou casque fournis). Les implants métalliques doivent être signalés au préalable. Une injection de produit de contraste (gadolinium) est parfois réalisée.',
null),

('SCANNER', 'Scanner (TDM / tomodensitométrie)',
'Imagerie par rayons X 3D pour une visualisation détaillée des structures internes.',
'Le scanner (ou TDM — tomodensitométrie) utilise des rayons X sous plusieurs angles pour produire des coupes et des reconstructions 3D du corps. Il est plus rapide que l''IRM.

Applications :
• Urgences : traumatismes, hémorragies, embolie pulmonaire.
• Poumons : nodules, cancer, infections.
• Abdomen : appendicite, calculs rénaux, tumeurs.
• Cœur : coroscanner (artères coronaires).
• Os et rachis : fractures complexes.

L''examen peut nécessiter une injection de produit de contraste iodé (informer le médecin en cas d''allergie à l''iode ou d''insuffisance rénale). La dose de rayonnement est plus élevée que pour une radiographie simple.',
null),

-- ─── Examens cardiaques ───────────────────────────────────────

('ECG', 'Électrocardiogramme (ECG)',
'Enregistrement de l''activité électrique du cœur.',
'L''ECG enregistre l''activité électrique du cœur à l''aide d''électrodes placées sur la peau. Il est indolore et dure 5 à 10 minutes.

Il permet de détecter :
• Les troubles du rythme (arythmies) : fibrillation auriculaire, tachycardie, bradycardie.
• Les signes d''infarctus du myocarde (aigu ou ancien).
• Les troubles de la conduction (bloc de branche, allongement QT).
• L''hypertrophie ventriculaire gauche (en cas d''hypertension).
• Les péricardites et autres maladies cardiaques.

Un ECG normal ne garantit pas l''absence de maladie cardiaque. Des examens complémentaires (échographie cardiaque, test d''effort) peuvent être nécessaires.',
null),

-- ─── Examens urinaires ────────────────────────────────────────

('ECBU', 'ECBU (Examen cytobactériologique des urines)',
'Analyse des urines pour détecter une infection urinaire.',
'L''ECBU (Examen Cytobactériologique des Urines) est l''analyse de référence pour diagnostiquer une infection urinaire. Il comprend :

• La cytologie : compte des globules blancs (leucocytes) et rouges dans les urines.
• La bactériologie : identification du germe responsable et son antibiogramme (quels antibiotiques sont efficaces).

Comment prélever correctement les urines :
1. Se laver les mains et les organes génitaux.
2. Éliminer le premier jet d''urine.
3. Recueillir le milieu du jet dans le flacon stérile fourni.
4. Acheminer au laboratoire dans les 2 heures (ou conserver au réfrigérateur < 4h).

Un résultat positif oriente le médecin dans le choix de l''antibiotique.',
'{
  "Leucocytes (normale)": "< 10 000 /mL",
  "Bactéries (normale)": "< 10³ UFC/mL",
  "Infection probable": "> 10⁵ UFC/mL + leucocyturie"
}'::jsonb),

('PROTEINURIE', 'Protéinurie (protéines dans les urines)',
'Détection de protéines dans les urines, indicateur de la santé rénale.',
'Normalement, les reins filtrent les déchets mais retiennent les protéines. Une protéinurie (protéines dans les urines) indique que les reins ne fonctionnent pas correctement.

Types d''examens :
• Bandelette urinaire : dépistage rapide au cabinet.
• Protéinurie des 24h : quantification précise sur un recueil d''urines de 24 heures.
• Microalbuminurie : détecte de petites quantités d''albumine (marqueur précoce de néphropathie diabétique).

Causes possibles : diabète, hypertension, glomérulonéphrite, lupus, infection. Une protéinurie persistante nécessite une investigation approfondie.',
'{
  "Protéinurie normale": "< 150 mg/24h",
  "Microalbuminurie": "30–300 mg/24h",
  "Protéinurie clinique": "> 300 mg/24h",
  "Syndrome néphrotique": "> 3000 mg/24h"
}'::jsonb)

ON CONFLICT (exam_type) DO UPDATE SET
  display_name      = EXCLUDED.display_name,
  description       = EXCLUDED.description,
  educational_text  = EXCLUDED.educational_text,
  normal_ranges     = EXCLUDED.normal_ranges,
  updated_at        = NOW();
