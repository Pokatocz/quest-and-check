-- Fix 1: Remove role from profiles table and update RLS policies
-- Drop the problematic RLS policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;

-- Create new policy without role protection (role is now only in user_roles)
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Remove role column from profiles (data is already synced to user_roles via trigger)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Fix 2: Make task-photos bucket private for security
UPDATE storage.buckets SET public = false WHERE id = 'task-photos';

-- Drop existing overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view task photos" ON storage.objects;

-- Create secure policy: only team members can view task photos
CREATE POLICY "Team members can view task photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-photos' AND
  auth.uid() IN (
    SELECT tm.user_id 
    FROM tasks t
    JOIN team_members tm ON tm.team_id = t.team_id
    WHERE t.photo_url IS NOT NULL 
      AND (
        -- Handle both single URL and JSON array formats
        t.photo_url = name OR
        t.photo_url::text LIKE '%' || name || '%'
      )
  )
);

-- Fix 3: Add input validation to join_team_by_code function
CREATE OR REPLACE FUNCTION public.join_team_by_code(_join_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_id UUID;
  _team_name TEXT;
  _user_id UUID := auth.uid();
  _sanitized_code TEXT;
BEGIN
  -- Check if user is authenticated
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Input validation: reject null or overly long input
  IF _join_code IS NULL OR length(_join_code) > 10 THEN
    RETURN json_build_object('success', false, 'message', 'Invalid join code format');
  END IF;
  
  -- Sanitize: remove all non-alphanumeric characters and convert to uppercase
  _sanitized_code := UPPER(regexp_replace(_join_code, '[^A-Z0-9]', '', 'g'));
  
  -- Validate length: join codes must be exactly 6 characters
  IF length(_sanitized_code) != 6 THEN
    RETURN json_build_object('success', false, 'message', 'Join code must be 6 characters');
  END IF;

  -- Find team by sanitized join code
  SELECT id, name INTO _team_id, _team_name
  FROM public.teams
  WHERE join_code = _sanitized_code;

  -- Check if team exists
  IF _team_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid join code');
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = _team_id AND user_id = _user_id
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Already a team member');
  END IF;

  -- Add user to team
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (_team_id, _user_id, 'employee');

  RETURN json_build_object(
    'success', true, 
    'message', 'Successfully joined team',
    'team_id', _team_id,
    'team_name', _team_name
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'Already a team member');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error joining team');
END;
$$;