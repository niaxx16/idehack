-- Fix security issue: Add search_path to update_updated_at_column trigger function
-- This prevents potential SQL injection via search_path manipulation

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
