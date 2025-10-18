-- Create both helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = _team_id
      AND owner_id = auth.uid()
  );
$$;

-- Re-create policies using the helper functions
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid() OR public.is_team_member(teams.id)
  );

DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
CREATE POLICY "Users can view their team memberships"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR public.is_team_owner(team_members.team_id)
  );

DROP POLICY IF EXISTS "Owners can remove team members" ON public.team_members;
CREATE POLICY "Owners can remove team members"
  ON public.team_members FOR DELETE
  USING (
    public.is_team_owner(team_members.team_id)
  );
