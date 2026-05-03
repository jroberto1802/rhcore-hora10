-- Expand can_view_sensitive_data to work at grupo empresarial level
CREATE OR REPLACE FUNCTION public.can_view_sensitive_data(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.empresas e_role
      ON e_role.id = ur.empresa_id
    JOIN public.empresas e_target
      ON e_target.id = _empresa_id
    WHERE ur.user_id = _user_id
      AND ur.role IN ('admin', 'hr_manager')
      AND e_role.grupo_empresarial_id = e_target.grupo_empresarial_id
  );
$function$;