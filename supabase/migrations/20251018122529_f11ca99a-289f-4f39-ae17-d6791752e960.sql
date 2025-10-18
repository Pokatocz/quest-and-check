-- Add photo verification and location to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Add rewards for top 3 places to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS first_place_reward INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_place_reward INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS third_place_reward INTEGER DEFAULT 0;

-- Update RLS policy for tasks to handle assigned tasks
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;

CREATE POLICY "Team members can view team tasks"
  ON public.tasks FOR SELECT
  USING (
    (
      EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = tasks.team_id
          AND team_members.user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = tasks.team_id
          AND teams.owner_id = auth.uid()
      )
    ) AND (
      assigned_to IS NULL OR
      assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = tasks.team_id
          AND teams.owner_id = auth.uid()
      )
    )
  );

-- Allow assigned employees to mark tasks complete
DROP POLICY IF EXISTS "Assigned employees can mark tasks complete" ON public.tasks;

CREATE POLICY "Assigned employees can mark tasks complete"
  ON public.tasks FOR UPDATE
  USING (
    (assigned_to IS NULL OR assigned_to = auth.uid()) AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = tasks.team_id
        AND team_members.user_id = auth.uid()
    )
  );