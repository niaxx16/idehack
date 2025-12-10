-- InovaSprint Hackathon Management Platform - Database Schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Event status enum
CREATE TYPE event_status AS ENUM (
  'WAITING',      -- Pre-event, teams are forming
  'IDEATION',     -- Teams are working on their projects
  'LOCKED',       -- Ideation phase ended, no more edits
  'PITCHING',     -- Teams are pitching
  'VOTING',       -- Students are voting
  'COMPLETED'     -- Event finished
);

-- User role enum
CREATE TYPE user_role AS ENUM (
  'student',
  'jury',
  'admin'
);

-- ============================================
-- TABLES
-- ============================================

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status event_status NOT NULL DEFAULT 'WAITING',
  current_team_id UUID,
  stream_url TEXT,
  pitch_timer_end TIMESTAMPTZ,  -- When the current pitch timer ends
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  access_token UUID NOT NULL DEFAULT uuid_generate_v4(),

  -- Canvas data (Problem/Solution framework)
  canvas_data JSONB DEFAULT '{
    "problem": "",
    "solution": "",
    "target_audience": "",
    "revenue_model": ""
  }'::jsonb,

  presentation_url TEXT,  -- Supabase Storage URL
  total_investment INTEGER DEFAULT 0,  -- Calculated from transactions
  pitch_order INTEGER,  -- Order in which teams pitch

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_id, table_number),
  UNIQUE(access_token)
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'student',
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  wallet_balance INTEGER NOT NULL DEFAULT 1000,
  display_name TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User notes (private notes students take during pitches)
CREATE TABLE public.user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  note_text TEXT,
  temp_rating INTEGER CHECK (temp_rating >= 1 AND temp_rating <= 10),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, target_team_id)
);

-- Transactions (portfolio investments)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jury scores
CREATE TABLE public.jury_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jury_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Scoring criteria (1-20 scale, 5 criteria, 100 points total)
  scores JSONB NOT NULL DEFAULT '{
    "problem_understanding": 10,
    "innovation": 10,
    "value_impact": 10,
    "feasibility": 10,
    "presentation_teamwork": 10
  }'::jsonb,

  comments TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(jury_id, team_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_teams_event_id ON public.teams(event_id);
CREATE INDEX idx_teams_access_token ON public.teams(access_token);
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX idx_user_notes_target_team_id ON public.user_notes(target_team_id);
CREATE INDEX idx_transactions_sender_id ON public.transactions(sender_id);
CREATE INDEX idx_transactions_receiver_team_id ON public.transactions(receiver_team_id);
CREATE INDEX idx_jury_scores_jury_id ON public.jury_scores(jury_id);
CREATE INDEX idx_jury_scores_team_id ON public.jury_scores(team_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jury_scores ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Events are editable by admins only"
  ON public.events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Teams policies
CREATE POLICY "Teams are viewable by everyone"
  ON public.teams FOR SELECT
  USING (true);

CREATE POLICY "Teams can be created by admins"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Teams can be updated by team members or admins"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.team_id = teams.id OR profiles.role = 'admin')
    )
  );

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Profiles can be created for authenticated users"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User notes policies (private - only owner can see)
CREATE POLICY "Users can view their own notes"
  ON public.user_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
  ON public.user_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.user_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.user_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Transactions are viewable by everyone"
  ON public.transactions FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Jury scores policies
CREATE POLICY "Jury scores are viewable by admins and the scoring jury"
  ON public.jury_scores FOR SELECT
  USING (
    auth.uid() = jury_id OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Jury members can create their own scores"
  ON public.jury_scores FOR INSERT
  WITH CHECK (
    auth.uid() = jury_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'jury'
    )
  );

CREATE POLICY "Jury members can update their own scores"
  ON public.jury_scores FOR UPDATE
  USING (
    auth.uid() = jury_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'jury'
    )
  );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jury_scores_updated_at BEFORE UPDATE ON public.jury_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', 'Anonymous User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- Function to join a team using access token
CREATE OR REPLACE FUNCTION join_team_by_token(access_token_input UUID)
RETURNS JSONB AS $$
DECLARE
  team_record RECORD;
  user_id_val UUID;
BEGIN
  user_id_val := auth.uid();

  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the team
  SELECT * INTO team_record FROM public.teams WHERE access_token = access_token_input;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid access token');
  END IF;

  -- Update user's profile
  UPDATE public.profiles
  SET team_id = team_record.id
  WHERE id = user_id_val;

  RETURN jsonb_build_object(
    'success', true,
    'team_id', team_record.id,
    'team_name', team_record.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit portfolio investments (batch transaction)
CREATE OR REPLACE FUNCTION submit_portfolio(votes JSONB)
RETURNS JSONB AS $$
DECLARE
  user_id_val UUID;
  user_balance INTEGER;
  total_amount INTEGER := 0;
  vote_item JSONB;
  team_id_val UUID;
  amount_val INTEGER;
BEGIN
  user_id_val := auth.uid();

  IF user_id_val IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get user's current balance
  SELECT wallet_balance INTO user_balance
  FROM public.profiles
  WHERE id = user_id_val;

  -- Calculate total amount
  FOR vote_item IN SELECT * FROM jsonb_array_elements(votes)
  LOOP
    amount_val := (vote_item->>'amount')::INTEGER;
    total_amount := total_amount + amount_val;
  END LOOP;

  -- Check if user has enough balance
  IF total_amount > user_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Process each vote
  FOR vote_item IN SELECT * FROM jsonb_array_elements(votes)
  LOOP
    team_id_val := (vote_item->>'team_id')::UUID;
    amount_val := (vote_item->>'amount')::INTEGER;

    IF amount_val > 0 THEN
      -- Insert transaction
      INSERT INTO public.transactions (sender_id, receiver_team_id, amount)
      VALUES (user_id_val, team_id_val, amount_val);

      -- Update team's total investment
      UPDATE public.teams
      SET total_investment = total_investment + amount_val
      WHERE id = team_id_val;
    END IF;
  END LOOP;

  -- Deduct from user's balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - total_amount
  WHERE id = user_id_val;

  RETURN jsonb_build_object('success', true, 'invested', total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate leaderboard
-- 70% jury score (100 points max) + 30% student investment (normalized to 100)
CREATE OR REPLACE FUNCTION get_leaderboard(event_id_input UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  total_investment INTEGER,
  jury_avg_score NUMERIC,
  final_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.total_investment,
    -- New 5-criteria scoring (100 points total)
    COALESCE(AVG(
      COALESCE((js.scores->>'problem_understanding')::INTEGER, 0) +
      COALESCE((js.scores->>'innovation')::INTEGER, 0) +
      COALESCE((js.scores->>'value_impact')::INTEGER, 0) +
      COALESCE((js.scores->>'feasibility')::INTEGER, 0) +
      COALESCE((js.scores->>'presentation_teamwork')::INTEGER, 0)
    ), 0) as jury_avg_score,
    -- Final score: 70% jury score (out of 100) + 30% investment (normalized to 100)
    (COALESCE(AVG(
      COALESCE((js.scores->>'problem_understanding')::INTEGER, 0) +
      COALESCE((js.scores->>'innovation')::INTEGER, 0) +
      COALESCE((js.scores->>'value_impact')::INTEGER, 0) +
      COALESCE((js.scores->>'feasibility')::INTEGER, 0) +
      COALESCE((js.scores->>'presentation_teamwork')::INTEGER, 0)
    ), 0) * 0.7) +
    (t.total_investment::NUMERIC / NULLIF((SELECT MAX(total_investment) FROM public.teams WHERE event_id = event_id_input), 0) * 100 * 0.3) as final_score
  FROM public.teams t
  LEFT JOIN public.jury_scores js ON js.team_id = t.id
  WHERE t.event_id = event_id_input
  GROUP BY t.id, t.name, t.total_investment
  ORDER BY final_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Note: You need to create this bucket manually in Supabase Dashboard
-- Bucket name: 'presentations'
-- Public: false
-- Allowed MIME types: application/pdf, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- ============================================
-- REALTIME SETUP
-- ============================================
-- Enable realtime for events table (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Insert a default event
INSERT INTO public.events (name, status) VALUES ('Demo Hackathon 2025', 'WAITING');
