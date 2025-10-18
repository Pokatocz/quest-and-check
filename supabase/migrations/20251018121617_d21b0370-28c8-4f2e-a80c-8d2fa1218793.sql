-- Allow authenticated users to find teams by join code
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;

CREATE POLICY "Users can view teams they own or are members of"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid() OR public.is_team_member(teams.id)
  );

CREATE POLICY "Users can find teams by join code"
  ON public.teams FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );