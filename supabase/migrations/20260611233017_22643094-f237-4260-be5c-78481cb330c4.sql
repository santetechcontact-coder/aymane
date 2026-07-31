
-- 1. Consultations : restreindre l'UPDATE patient à l'annulation uniquement
DROP POLICY IF EXISTS "Patient cancels own consultation" ON public.consultations;
CREATE POLICY "Patient cancels own consultation"
ON public.consultations
FOR UPDATE
TO authenticated
USING (auth.uid() = patient_id AND status::text IN ('pending','confirmed'))
WITH CHECK (auth.uid() = patient_id AND status::text = 'cancelled');
-- Note : le trigger guard_consultation_patient_update reste actif comme défense en profondeur.

-- 2. provider_structures : règles d'INSERT strictes (USING ignoré sur INSERT)
DROP POLICY IF EXISTS "Structure owner manages links" ON public.provider_structures;
DROP POLICY IF EXISTS "Admin manages all links" ON public.provider_structures;

-- SELECT : propriétaire structure, admin, ou praticien lié
CREATE POLICY "Structure owner reads links"
ON public.provider_structures
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id
      AND s.owner_user_id = auth.uid()
  )
);

-- INSERT : seuls le propriétaire de la structure ou un admin peuvent créer un lien
CREATE POLICY "Structure owner inserts links"
ON public.provider_structures
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id
      AND s.owner_user_id = auth.uid()
  )
);

-- UPDATE : propriétaire structure ou admin
CREATE POLICY "Structure owner updates links"
ON public.provider_structures
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id
      AND s.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id
      AND s.owner_user_id = auth.uid()
  )
);

-- DELETE : propriétaire structure, admin (le praticien peut déjà supprimer son propre lien via la policy existante)
CREATE POLICY "Structure owner deletes links"
ON public.provider_structures
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.health_structures s
    WHERE s.id = provider_structures.structure_id
      AND s.owner_user_id = auth.uid()
  )
);
