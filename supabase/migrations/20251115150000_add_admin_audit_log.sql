-- Add an admin audit log table to track admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'invite_user', 'delete_user', 'update_role'
  target_user_id UUID,
  previous_role TEXT,
  new_role TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins can view audit logs (or authenticated users with appropriate permissions)
CREATE POLICY "Superadmins can view audit logs" ON public.admin_audit_log
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE (id = auth.uid())
      AND (role = 'superadmin')
    )
  );

-- Admins and superadmins can insert audit logs
CREATE POLICY "Admins and superadmins can insert audit logs" ON public.admin_audit_log
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE (id = auth.uid())
      AND (role = 'admin' OR role = 'superadmin')
    )
  );

-- Update the invite user API to create an audit entry
-- Since this is a schema change, we'll need to update the invite API to log actions
-- This will be done in the application code