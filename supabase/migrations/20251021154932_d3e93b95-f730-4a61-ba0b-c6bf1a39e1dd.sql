-- Create chat messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Team members can view team messages
CREATE POLICY "Team members can view team messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = messages.team_id
    AND team_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = messages.team_id
    AND teams.owner_id = auth.uid()
  )
);

-- Team members can send messages
CREATE POLICY "Team members can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = messages.team_id
      AND team_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = messages.team_id
      AND teams.owner_id = auth.uid()
    )
  )
);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
USING (user_id = auth.uid());

-- Create storage bucket for chat photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-photos', 'chat-photos', false);

-- Chat photos storage policies
CREATE POLICY "Team members can view chat photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-photos'
  AND (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN team_members tm ON tm.team_id = m.team_id
      WHERE m.photo_url LIKE '%' || storage.objects.name || '%'
      AND tm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM messages m
      JOIN teams t ON t.id = m.team_id
      WHERE m.photo_url LIKE '%' || storage.objects.name || '%'
      AND t.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Team members can upload chat photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'chat-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add index for better performance
CREATE INDEX idx_messages_team_id_created_at ON public.messages(team_id, created_at DESC);