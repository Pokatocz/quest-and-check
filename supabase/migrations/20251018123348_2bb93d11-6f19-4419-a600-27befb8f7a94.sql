-- Add role column to team_members for manager functionality
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'employee' CHECK (role IN ('employee', 'manager'));

-- Add approval status to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Allow employers and managers to delete tasks
CREATE POLICY "Employers and managers can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tasks.team_id
        AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'manager'
    )
  );

-- Allow employers and managers to approve/reject tasks
DROP POLICY IF EXISTS "Employers can update their team tasks" ON public.tasks;

CREATE POLICY "Employers and managers can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tasks.team_id
        AND teams.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = tasks.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'manager'
    )
  );

-- Allow team owners to delete teams
CREATE POLICY "Owners can delete teams"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

-- Allow owners and managers to update team member roles
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;

CREATE POLICY "Users can view their team memberships"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid() OR 
    is_team_owner(team_id) OR
    (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'manager'
      )
    )
  );

CREATE POLICY "Owners and managers can update team member roles"
  ON public.team_members FOR UPDATE
  USING (
    is_team_owner(team_id) OR
    (
      EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_members.team_id
          AND tm.user_id = auth.uid()
          AND tm.role = 'manager'
      )
    )
  );