-- =============================================================================
-- Catalogue de medicaments + extension de l'annuaire (officines et hopitaux)
-- =============================================================================
-- Medicaments : molecules du Guide Therapeutique senegalais (DCI, presentations
-- et noms commerciaux courants). Au Senegal le prix d'une presentation est
-- reglemente et identique dans toutes les officines, mais il n'existe aucune
-- base publique exhaustive : seuls six prix ont pu etre sources (dapmed-africa,
-- consulte le 05/08/2026). Les autres restent a 0 — c'est a chaque pharmacie de
-- renseigner son prix et son stock, et l'absence de prix est affichee comme
-- telle plutot que devinee.
--
-- Annuaire : huit officines de Dakar et seize hopitaux regionaux et nationaux
-- hors Dakar, qui manquaient a un repertoire jusqu'ici centre sur la capitale.
-- Les identifiants reprennent le hachage deterministe du seed SanteMap, donc
-- rejouer cette migration mord sur les memes lignes au lieu de les dupliquer.
-- =============================================================================

-- 1. Catalogue de medicaments -------------------------------------------------
insert into public.medications (name, description, category, price, stock, requires_prescription)
select
  v.name, v.description, v.category, v.price, 0, v.requires_prescription
from (values
  -- Antalgiques et anti-inflammatoires
  ('Paracetamol 500 mg comprime',
   'Doliprane, Efferalgan, Panadol. Comprimes 500 mg et 1 g ; sirop ; suppositoires. Prix fixe par l''officine.',
   'Antalgique et antipyretique', 0::numeric, false),
  ('Ibuprofene 400 mg comprime',
   'Ibufen, Advil, Brufen, Sirofen. Comprimes 200, 400 et 600 mg ; sirop ; suppositoires. Prix source : REMOFEN 400 mg, boite de 30.',
   'Anti-inflammatoire non steroidien', 1150::numeric, false),
  ('Diclofenac 50 mg comprime',
   'Voltarene. Comprimes 50 et 75 mg ; gel ; solution injectable. Prix fixe par l''officine.',
   'Anti-inflammatoire non steroidien', 0::numeric, true),
  ('Tramadol 50 mg gelule',
   'Topalgic, Contramal. Gelules 50 mg ; solution injectable. Stupefiant soumis a ordonnance securisee.',
   'Antalgique opioide', 0::numeric, true),

  -- Antibiotiques
  ('Amoxicilline 1 g comprime',
   'Clamoxyl, Hiconcyl, Ospamox. Comprimes 500 mg et 1 g. Prix source : AMOXI-DENK 1000 mg, boite de 10.',
   'Antibiotique (penicilline)', 4125::numeric, true),
  ('Amoxicilline 250 mg/5 ml suspension buvable',
   'Poudre pour suspension buvable, flacon 60 ml. Presentation pediatrique. Prix source : flacon 60 ml.',
   'Antibiotique (penicilline)', 495::numeric, true),
  ('Amoxicilline + acide clavulanique 250/62,5 mg/5 ml suspension',
   'Augmentin, Novoclin. Suspension buvable pediatrique. Prix source : flacon.',
   'Antibiotique (penicilline)', 3925::numeric, true),
  ('Ceftriaxone 1 g injectable',
   'Rocephine. Poudre pour solution injectable 250 mg, 500 mg, 1 g. Usage hospitalier et ambulatoire.',
   'Antibiotique (cephalosporine)', 0::numeric, true),
  ('Cefixime 200 mg comprime',
   'Oroken. Comprimes 200 mg ; suspension buvable 100 mg/5 ml.',
   'Antibiotique (cephalosporine)', 0::numeric, true),
  ('Ciprofloxacine 500 mg comprime',
   'Ciflox, Ciprolon. Comprimes 250 et 500 mg ; solution injectable ; collyre.',
   'Antibiotique (fluoroquinolone)', 0::numeric, true),
  ('Azithromycine 500 mg comprime',
   'Zithromax. Comprimes 250 et 500 mg ; suspension buvable 200 mg/5 ml.',
   'Antibiotique (macrolide)', 0::numeric, true),
  ('Doxycycline 100 mg comprime',
   'Vibramycine, Doxylis. Comprimes et gelules 100 mg.',
   'Antibiotique (cycline)', 0::numeric, true),
  ('Metronidazole 500 mg comprime',
   'Flagyl. Comprimes 250 et 500 mg ; suspension buvable ; solution injectable ; ovules.',
   'Antibacterien et antiparasitaire', 0::numeric, true),
  ('Cloxacilline 500 mg gelule',
   'Orbenine. Gelules 500 mg ; poudre injectable. Infections a staphylocoques.',
   'Antibiotique (penicilline)', 0::numeric, true),

  -- Antipaludiques : premiere cause de consultation en saison des pluies
  ('Artemether 80 mg/ml solution injectable',
   'Paludisme grave. Solution injectable intramusculaire. Protocole national.',
   'Antipaludique', 0::numeric, true),
  ('Artesunate 60 mg poudre pour injection',
   'Traitement de reference du paludisme grave, voie intraveineuse ou intramusculaire.',
   'Antipaludique', 0::numeric, true),
  ('Quinine 300 mg comprime',
   'Comprimes 300 mg ; solution injectable. Paludisme, notamment chez la femme enceinte au premier trimestre.',
   'Antipaludique', 0::numeric, true),

  -- Antiviraux
  ('Aciclovir 200 mg comprime',
   'Zovirax, Lovir. Comprimes 200, 400 et 800 mg. Prix source : LOVIR 200 mg, boite de 25.',
   'Antiviral', 6600::numeric, true),
  ('Aciclovir creme 5%',
   'Alvir, Zovirax creme. Tube de 5 g. Herpes labial. Prix source : ALVIR tube 5 g.',
   'Antiviral topique', 2875::numeric, false),

  -- Antiparasitaires
  ('Albendazole 400 mg comprime',
   'Zentel, Verzol, Alben. Comprimes 400 mg ; suspension buvable 200 mg/5 ml. Deparasitage.',
   'Antiparasitaire', 0::numeric, false),
  ('Mebendazole 100 mg comprime',
   'Vermox. Comprimes 100 mg ; suspension buvable. Deparasitage.',
   'Antiparasitaire', 0::numeric, false),
  ('Praziquantel 600 mg comprime',
   'Biltricide. Comprimes 600 mg. Bilharziose, frequente dans la vallee du fleuve.',
   'Antiparasitaire', 0::numeric, true),

  -- Chroniques : diabete et hypertension
  ('Metformine 850 mg comprime',
   'Glucophage, Stagid. Comprimes 500, 850 et 1000 mg.',
   'Antidiabetique oral', 0::numeric, true),
  ('Gliclazide 80 mg comprime',
   'Diamicron. Comprimes 30, 60 et 80 mg.',
   'Antidiabetique oral', 0::numeric, true),
  ('Insuline NPH 100 UI/ml',
   'Insulatard. Suspension injectable, flacon ou stylo. Conservation entre 2 et 8 degres.',
   'Antidiabetique injectable', 0::numeric, true),
  ('Amlodipine 5 mg comprime',
   'Amlor, Amlodis, Amapine. Comprimes 5 et 10 mg.',
   'Antihypertenseur', 0::numeric, true),
  ('Losartan 50 mg comprime',
   'Cozaar. Comprimes 50 et 100 mg.',
   'Antihypertenseur', 0::numeric, true),
  ('Furosemide 40 mg comprime',
   'Lasilix. Comprimes 40 mg ; solution injectable 20 mg/2 ml.',
   'Diuretique', 0::numeric, true),

  -- Respiratoire, allergie, corticoides
  ('Salbutamol 100 microgrammes aerosol doseur',
   'Ventoline. Aerosol doseur ; solution pour nebulisation. Crise d''asthme.',
   'Bronchodilatateur', 0::numeric, true),
  ('Prednisolone 20 mg comprime effervescent',
   'Solupred. Comprimes 5 et 20 mg. Corticotherapie courte.',
   'Corticoide', 0::numeric, true),
  ('Cetirizine 10 mg comprime',
   'Zyrtec. Comprimes 10 mg ; solution buvable. Allergies saisonnieres.',
   'Antihistaminique', 0::numeric, false),

  -- Digestif et pediatrie
  ('Omeprazole 20 mg gelule',
   'Mopral, Omez. Gelules 20 et 40 mg. Reflux et ulcere.',
   'Antiulcereux', 0::numeric, false),
  ('Sulfate de zinc 20 mg comprime dispersible',
   'Associe aux sels de rehydratation orale dans la diarrhee de l''enfant, protocole OMS.',
   'Pediatrie et rehydratation', 0::numeric, false),
  ('Diosmectite 3 g poudre pour suspension',
   'Smecta. Sachets de 3 g. Antidiarrheique adsorbant.',
   'Antidiarrheique', 0::numeric, false),

  -- Vitamines et supplementation
  ('Acide folique 5 mg comprime',
   'Acfol, Zanitra, Hupfoliq. Comprimes 0,4 et 5 mg. Supplementation de la grossesse. Prix source : boite de 40.',
   'Vitamine et supplementation', 700::numeric, false),
  ('Acide ascorbique 1000 mg comprime effervescent',
   'Vitamine C UPSA, Laroscobine. Comprimes 500 et 1000 mg. Prix source : CA C 1000 SANDOZ, tube de 10.',
   'Vitamine', 1800::numeric, false),

  -- Tuberculose : programme national
  ('Rifampicine 300 mg gelule',
   'Rifadine. Gelules 150 et 300 mg. Programme national de lutte contre la tuberculose.',
   'Antituberculeux', 0::numeric, true),
  ('Isoniazide 300 mg comprime',
   'Comprimes 100 et 300 mg. Programme national de lutte contre la tuberculose.',
   'Antituberculeux', 0::numeric, true)
) as v(name, description, category, price, requires_prescription)
where not exists (
  select 1 from public.medications m
  where lower(btrim(m.name)) = lower(btrim(v.name))
);

-- 2. Annuaire : officines de Dakar et hopitaux regionaux ----------------------
with public_directory(name, type, city, region) as (
  values
    -- Officines de Dakar
    ('Pharmacie Guigon', 'pharmacy', 'Dakar-Plateau', 'Dakar'),
    ('Pharmacie du Point E', 'pharmacy', 'Point E', 'Dakar'),
    ('Pharmacie Mermoz', 'pharmacy', 'Mermoz', 'Dakar'),
    ('Pharmacie Sacre-Coeur', 'pharmacy', 'Sacre-Coeur', 'Dakar'),
    ('Pharmacie de la Patte d''Oie', 'pharmacy', 'Patte d''Oie', 'Dakar'),
    ('Pharmacie des Parcelles Assainies', 'pharmacy', 'Parcelles Assainies', 'Dakar'),
    ('Pharmacie de Ouakam', 'pharmacy', 'Ouakam', 'Dakar'),
    ('Pharmacie de Grand-Yoff', 'pharmacy', 'Grand-Yoff', 'Dakar'),
    -- Hopitaux regionaux et nationaux hors Dakar
    ('Hopital Regional El Hadji Ahmadou Sakhir Ndieguene', 'hospital', 'Thies', 'Thies'),
    ('Hopital Saint Jean de Dieu', 'hospital', 'Thies', 'Thies'),
    ('Hopital Grand Mbour', 'hospital', 'Mbour', 'Thies'),
    ('Hopital Regional de Saint-Louis', 'hospital', 'Saint-Louis', 'Saint-Louis'),
    ('Hopital de la Paix', 'hospital', 'Ziguinchor', 'Ziguinchor'),
    ('Hopital Regional El Hadji Ibrahima Niasse', 'hospital', 'Kaolack', 'Kaolack'),
    ('Hopital Regional de Tambacounda', 'hospital', 'Tambacounda', 'Tambacounda'),
    ('Hopital Regional Amadou Sakhir Mbaye', 'hospital', 'Louga', 'Louga'),
    ('Hopital Regional Heinrich Lubke', 'hospital', 'Diourbel', 'Diourbel'),
    ('Hopital Matlaboul Fawzeyni', 'hospital', 'Touba', 'Diourbel'),
    ('Hopital Ndamatou', 'hospital', 'Touba', 'Diourbel'),
    ('Hopital Regional de Kolda', 'hospital', 'Kolda', 'Kolda'),
    ('Hopital Regional de Fatick', 'hospital', 'Fatick', 'Fatick'),
    ('Hopital Regional de Matam', 'hospital', 'Matam', 'Matam'),
    ('Hopital Regional de Sedhiou', 'hospital', 'Sedhiou', 'Sedhiou'),
    ('Hopital Regional Amath Dansokho', 'hospital', 'Kedougou', 'Kedougou')
), normalized as (
  select
    (
      substr(md5('santemap|' || name || '|' || city), 1, 8) || '-' ||
      substr(md5('santemap|' || name || '|' || city), 9, 4) || '-' ||
      substr(md5('santemap|' || name || '|' || city), 13, 4) || '-' ||
      substr(md5('santemap|' || name || '|' || city), 17, 4) || '-' ||
      substr(md5('santemap|' || name || '|' || city), 21, 12)
    )::uuid as id,
    name,
    type::public.health_structure_type as type,
    city,
    region
  from public_directory
)
insert into public.health_structures (
  id,
  owner_user_id,
  name,
  type,
  address,
  city,
  region,
  phone_landline,
  phone_mobile,
  email,
  manager_name,
  description,
  verified
)
select
  id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  name,
  type,
  case when city = region then 'Region de ' || region else city || ', region de ' || region end,
  city,
  region,
  '',
  null,
  '',
  'Repertoire public AYMANE',
  'Structure repertoriee publiquement. Confirmez les coordonnees et horaires avant de vous deplacer.',
  true
from normalized
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  address = excluded.address,
  city = excluded.city,
  region = excluded.region,
  manager_name = excluded.manager_name,
  description = excluded.description,
  verified = true,
  updated_at = now();
