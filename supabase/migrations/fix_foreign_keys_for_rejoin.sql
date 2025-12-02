-- Fix foreign key constraints to support user_id updates during rejoin
-- This allows transferring profile data to new anonymous sessions

-- Drop and recreate canvas_contributions foreign key with CASCADE on update
ALTER TABLE public.canvas_contributions
DROP CONSTRAINT IF EXISTS canvas_contributions_user_id_fkey;

ALTER TABLE public.canvas_contributions
ADD CONSTRAINT canvas_contributions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Drop and recreate transactions sender_id foreign key with CASCADE on update
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_sender_id_fkey;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Also fix mentor_feedback if it exists
ALTER TABLE public.mentor_feedback
DROP CONSTRAINT IF EXISTS mentor_feedback_mentor_id_fkey;

ALTER TABLE public.mentor_feedback
ADD CONSTRAINT mentor_feedback_mentor_id_fkey
FOREIGN KEY (mentor_id) REFERENCES public.profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Fix user_notes if it exists
ALTER TABLE public.user_notes
DROP CONSTRAINT IF EXISTS user_notes_user_id_fkey;

ALTER TABLE public.user_notes
ADD CONSTRAINT user_notes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- Fix jury_scores if it exists
ALTER TABLE public.jury_scores
DROP CONSTRAINT IF EXISTS jury_scores_jury_id_fkey;

ALTER TABLE public.jury_scores
ADD CONSTRAINT jury_scores_jury_id_fkey
FOREIGN KEY (jury_id) REFERENCES public.profiles(id)
ON DELETE CASCADE
ON UPDATE CASCADE;
