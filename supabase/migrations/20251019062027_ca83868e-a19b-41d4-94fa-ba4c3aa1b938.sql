-- Fix 1: Create proper role system to prevent privilege escalation
-- Note: user_role enum already exists with 'employer' and 'employee' values

-- Create user_roles table to store roles securely
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Security definer function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Update profiles table policies to prevent role updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile except role"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- Trigger function to automatically assign role when profile is created
CREATE OR REPLACE FUNCTION public.handle_profile_role_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into user_roles when profile is created
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign roles
DROP TRIGGER IF EXISTS on_profile_created_assign_role ON public.profiles;

CREATE TRIGGER on_profile_created_assign_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_role_assignment();

-- Fix 2: Create security definer function to check team manager status (fixes infinite recursion)
CREATE OR REPLACE FUNCTION public.is_team_manager(_team_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = _team_id
      AND user_id = _user_id
      AND role = 'manager'
  );
$$;

-- Update team_members policies to use security definer function (fixes infinite recursion)
DROP POLICY IF EXISTS "Users can view their team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Owners and managers can update team member roles" ON public.team_members;

CREATE POLICY "Users can view their team memberships"
ON public.team_members
FOR SELECT
USING (
  user_id = auth.uid() 
  OR is_team_owner(team_id)
  OR is_team_manager(team_id, auth.uid())
);

CREATE POLICY "Owners and managers can update team member roles"
ON public.team_members
FOR UPDATE
USING (
  is_team_owner(team_id) 
  OR is_team_manager(team_id, auth.uid())
);

-- Fix 3: Remove public team access and create secure join function
DROP POLICY IF EXISTS "Users can find teams by join code" ON public.teams;

-- Create secure function to join team by code
CREATE OR REPLACE FUNCTION public.join_team_by_code(_join_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _team_id UUID;
  _team_name TEXT;
  _user_id UUID := auth.uid();
BEGIN
  -- Check if user is authenticated
  IF _user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Find team by join code
  SELECT id, name INTO _team_id, _team_name
  FROM public.teams
  WHERE join_code = UPPER(_join_code);

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

-- Update is_employer function to use new role system
CREATE OR REPLACE FUNCTION public.is_employer(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT has_role(user_id, 'employer'::user_role);
$function$;