-- Add reserved_by column to tasks table for task reservation
ALTER TABLE public.tasks 
ADD COLUMN reserved_by uuid REFERENCES auth.users(id);

-- Add reserved_at timestamp to track when task was reserved
ALTER TABLE public.tasks 
ADD COLUMN reserved_at timestamp with time zone;

-- Update RLS policy to allow managers to create tasks
DROP POLICY IF EXISTS "Employers can create tasks" ON public.tasks;

CREATE POLICY "Employers and managers can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  (auth.uid() = created_by) AND (
    -- Check if user is team owner
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = tasks.team_id AND teams.owner_id = auth.uid()
    )
    OR
    -- Check if user is team manager
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.team_id = tasks.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'manager'
    )
  )
);

-- Update policy for task completion to respect reservations
DROP POLICY IF EXISTS "Assigned employees can mark tasks complete" ON public.tasks;

CREATE POLICY "Assigned or reserved employees can mark tasks complete"
ON public.tasks
FOR UPDATE
USING (
  (
    -- Task is assigned to user or reserved by user
    (assigned_to IS NULL OR assigned_to = auth.uid() OR reserved_by = auth.uid())
    AND
    -- User is team member
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = tasks.team_id 
        AND team_members.user_id = auth.uid()
    )
  )
  OR
  -- Employers and managers can update for approval
  (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = tasks.team_id AND teams.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = tasks.team_id 
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'manager'
    )
  )
);