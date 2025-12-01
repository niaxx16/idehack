-- Add language column to events table for multi-language support
-- Default language is English (en)

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en' NOT NULL;

-- Add check constraint to ensure only supported languages
ALTER TABLE public.events
ADD CONSTRAINT events_language_check
CHECK (language IN ('en', 'tr'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_language ON public.events(language);

-- Update existing events to have English as default
UPDATE public.events
SET language = 'en'
WHERE language IS NULL;
