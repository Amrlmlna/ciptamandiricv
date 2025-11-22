-- Fix missing updated_at column in revenue table that's required by the update trigger

-- Add the missing updated_at column to the revenue table
ALTER TABLE public.revenue 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Also add the updated_by column that's expected by the trigger
ALTER TABLE public.revenue 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);