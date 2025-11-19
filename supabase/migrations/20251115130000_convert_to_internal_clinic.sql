-- MIGRATION: Convert multi-tenant SaaS to internal clinic management system
-- Changes: Remove clinic_id, restrict roles to admin/superadmin, remove approval process

-- First, update the profiles table: change default role and ensure approved by default
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'admin';

-- Update existing 'user' roles to 'admin' and set approved to true
UPDATE public.profiles 
SET role = 'admin', approved = true 
WHERE role = 'user';

-- Update any existing 'admin' users to be approved
UPDATE public.profiles 
SET approved = true
WHERE approved = false;

-- Add constraint to ensure only admin/superadmin roles are allowed
DO $$ 
BEGIN
  -- Drop the old constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles 
    DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- Add the constraint to only allow admin and superadmin
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'superadmin'));
END $$;

-- Remove clinic_id columns from all tables (cascade to drop dependent policies)
ALTER TABLE public.patients DROP COLUMN IF EXISTS clinic_id CASCADE;
ALTER TABLE public.appointments DROP COLUMN IF EXISTS clinic_id CASCADE;
ALTER TABLE public.revenue DROP COLUMN IF EXISTS clinic_id CASCADE;

-- Add audit columns to track who created/updated records
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.revenue ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- Remove the old RLS policies that used clinic_id
DROP POLICY IF EXISTS "Clinics can view their own patients" ON public.patients;
DROP POLICY IF EXISTS "Clinics can insert their own patients" ON public.patients;
DROP POLICY IF EXISTS "Clinics can update their own patients" ON public.patients;
DROP POLICY IF EXISTS "Clinics can delete their own patients" ON public.patients;

DROP POLICY IF EXISTS "Clinics can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinics can insert their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinics can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinics can delete their own appointments" ON public.appointments;

DROP POLICY IF EXISTS "Clinics can view their own revenue" ON public.revenue;
DROP POLICY IF EXISTS "Clinics can insert their own revenue" ON public.revenue;
DROP POLICY IF EXISTS "Clinics can update their own revenue" ON public.revenue;

-- Create new RLS policies for shared data access
-- Profiles policies: users can only access their own profiles
-- Superadmin access is handled via the all_users_for_admins_view which will be access-controlled separately
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Superadmins can delete profiles
CREATE POLICY "Superadmins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superadmin')
  );

CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (true);

-- Patients policies: all authenticated users can access, but only admins/superadmins can delete
CREATE POLICY "Authenticated users can view patients" ON public.patients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert patients" ON public.patients
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients" ON public.patients
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins and superadmins can delete patients" ON public.patients
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE (id = auth.uid()) AND (role = 'admin' OR role = 'superadmin'))
  );

-- Appointments policies: all authenticated users can access, but only admins/superadmins can delete
CREATE POLICY "Authenticated users can view appointments" ON public.appointments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert appointments" ON public.appointments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins and superadmins can delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE (id = auth.uid()) AND (role = 'admin' OR role = 'superadmin'))
  );

-- Revenue policies: all authenticated users can access, but only admins/superadmins can delete
CREATE POLICY "Authenticated users can view revenue" ON public.revenue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert revenue" ON public.revenue
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update revenue" ON public.revenue
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins and superadmins can delete revenue" ON public.revenue
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE (id = auth.uid()) AND (role = 'admin' OR role = 'superadmin'))
  );

-- Create the view for superadmins to see all users
CREATE OR REPLACE VIEW public.all_users_for_admins_view AS
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role,
  p.clinic_name,
  p.phone,
  p.approved,
  p.created_at
FROM public.profiles p
WHERE 
  EXISTS (
    SELECT 1 
    FROM public.profiles AS current_user_profile
    WHERE (current_user_profile.id = auth.uid()) 
    AND (current_user_profile.role = 'superadmin')
  );

-- Update the trigger function for new user creation to set default role as admin and approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, approved)
  VALUES (new.id, new.email, 'admin', true)  -- New users default to admin and are approved
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger functions for audit columns
CREATE OR REPLACE FUNCTION public.set_created_by_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    IF TG_TABLE_NAME IN ('patients', 'appointments', 'revenue') THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    IF TG_TABLE_NAME IN ('patients', 'appointments', 'revenue') THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to handle audit columns
CREATE TRIGGER set_patients_created_at 
    BEFORE INSERT ON public.patients 
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_created_by_column();

CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON public.patients 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_appointments_created_at 
    BEFORE INSERT ON public.appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_created_by_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_revenue_created_at 
    BEFORE INSERT ON public.revenue 
    FOR EACH ROW 
    EXECUTE FUNCTION public.set_created_by_column();

CREATE TRIGGER update_revenue_updated_at 
    BEFORE UPDATE ON public.revenue 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();