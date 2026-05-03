-- Create role enum for the application
CREATE TYPE public.app_role AS ENUM ('admin', 'hr_manager', 'employee');

-- Create user_roles table to store user role assignments
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can manage all roles in their company
CREATE POLICY "Admins can insert roles in their company"
ON public.user_roles
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.empresa_id = user_roles.empresa_id
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can update roles in their company"
ON public.user_roles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.empresa_id = user_roles.empresa_id
    AND ur.role = 'admin'
  )
);

CREATE POLICY "Admins can delete roles in their company"
ON public.user_roles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.empresa_id = user_roles.empresa_id
    AND ur.role = 'admin'
  )
);

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _empresa_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND empresa_id = _empresa_id
      AND role = _role
  )
$$;

-- Create security definer function to check if user has admin or hr_manager role
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id UUID, _empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND empresa_id = _empresa_id
      AND role IN ('admin', 'hr_manager')
  )
$$;

-- Drop existing funcionarios policies
DROP POLICY IF EXISTS "Users can view funcionarios from their companies" ON public.funcionarios;
DROP POLICY IF EXISTS "Users can create funcionarios in their companies" ON public.funcionarios;
DROP POLICY IF EXISTS "Users can update funcionarios from their companies" ON public.funcionarios;
DROP POLICY IF EXISTS "Users can delete funcionarios from their companies" ON public.funcionarios;

-- Create new RLS policies for funcionarios table with role-based access

-- SELECT policy: All users can see basic info, only admin/hr_manager can see sensitive data
CREATE POLICY "Users can view funcionarios basic info from their companies"
ON public.funcionarios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = funcionarios.empresa_id
  )
);

-- INSERT policy: Only admin and hr_manager can create employees
CREATE POLICY "Admins and HR managers can create funcionarios"
ON public.funcionarios
FOR INSERT
WITH CHECK (
  public.can_view_sensitive_data(auth.uid(), empresa_id)
);

-- UPDATE policy: Only admin and hr_manager can update employees
CREATE POLICY "Admins and HR managers can update funcionarios"
ON public.funcionarios
FOR UPDATE
USING (
  public.can_view_sensitive_data(auth.uid(), empresa_id)
);

-- DELETE policy: Only admins can delete employees
CREATE POLICY "Admins can delete funcionarios"
ON public.funcionarios
FOR DELETE
USING (
  public.has_role(auth.uid(), empresa_id, 'admin')
);

-- Add trigger for updated_at on user_roles
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment to document the security model
COMMENT ON TABLE public.user_roles IS 'Stores user role assignments per company. Roles: admin (full access), hr_manager (can view/edit all employee data), employee (limited access to basic info only)';
COMMENT ON FUNCTION public.can_view_sensitive_data IS 'Returns true if user has admin or hr_manager role for the specified company, granting access to sensitive employee data like CPF, salary, bank details';
