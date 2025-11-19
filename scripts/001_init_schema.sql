-- Create profiles table for user information
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  clinic_name TEXT,
  phone TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  medical_history TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  notes TEXT,
  cost DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create revenue table
CREATE TABLE IF NOT EXISTS public.revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for patients
CREATE POLICY "Clinics can view their own patients" ON public.patients
  FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Clinics can insert their own patients" ON public.patients
  FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Clinics can update their own patients" ON public.patients
  FOR UPDATE USING (auth.uid() = clinic_id);

CREATE POLICY "Clinics can delete their own patients" ON public.patients
  FOR DELETE USING (auth.uid() = clinic_id);

-- RLS Policies for appointments
CREATE POLICY "Clinics can view their own appointments" ON public.appointments
  FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Clinics can insert their own appointments" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Clinics can update their own appointments" ON public.appointments
  FOR UPDATE USING (auth.uid() = clinic_id);

CREATE POLICY "Clinics can delete their own appointments" ON public.appointments
  FOR DELETE USING (auth.uid() = clinic_id);

-- RLS Policies for revenue
CREATE POLICY "Clinics can view their own revenue" ON public.revenue
  FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Clinics can insert their own revenue" ON public.revenue
  FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Clinics can update their own revenue" ON public.revenue
  FOR UPDATE USING (auth.uid() = clinic_id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
