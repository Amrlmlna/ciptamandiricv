-- Add new columns to appointments table for treatment type and frequency
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS treatment_type TEXT DEFAULT 'one-time' CHECK (treatment_type IN ('one-time', 'ongoing'));
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly', NULL));
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add index for efficient querying by status and appointment_date
CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON public.appointments(clinic_id, status, appointment_date);

-- Add index for efficient querying by treatment_type
CREATE INDEX IF NOT EXISTS idx_appointments_treatment_type ON public.appointments(clinic_id, treatment_type);
