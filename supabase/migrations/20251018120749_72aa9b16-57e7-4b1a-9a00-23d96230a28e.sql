-- Fix infinite recursion in teams policies
-- Create security definer function to check if user is employer
CREATE OR REPLACE FUNCTION public.is_employer(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = user_id
      AND role = 'employer'::user_role
  );
$$;

-- Drop and recreate the problematic policy
DROP POLICY IF EXISTS "Employers can create teams" ON public.teams;

CREATE POLICY "Employers can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id AND public.is_employer(auth.uid())
  );