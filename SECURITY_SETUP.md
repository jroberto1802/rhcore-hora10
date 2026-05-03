# Security Implementation - Role-Based Access Control (RBAC)

## Overview
This project now implements a comprehensive Role-Based Access Control (RBAC) system to protect sensitive employee data. The system ensures that only authorized users can view, create, edit, or delete employee information.

## Security Issue Addressed
**Employee Personal Data Could Be Stolen by Unauthorized Users** (CRITICAL)

Previously, the `funcionarios` table contained highly sensitive personal information (CPF, RG, bank account details, phone numbers, emails, home addresses, emergency contacts, and salary information) that was accessible to ANY user within the same company. This created a significant security vulnerability.

## Solution Implemented

### 1. User Roles System
Three roles have been defined:
- **admin**: Full access to all employee data and functionality
- **hr_manager**: Can view and edit all employee data, including sensitive information
- **employee**: Limited access - can only view basic employee information, sensitive data is masked

### 2. Database Structure

#### `user_roles` Table
Stores user role assignments per company:
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  empresa_id UUID NOT NULL,
  role app_role NOT NULL, -- 'admin' | 'hr_manager' | 'employee'
  UNIQUE(user_id, empresa_id, role)
);
```

#### Security Definer Functions
Two helper functions were created to check user permissions without causing RLS recursion:

1. **`has_role(user_id, empresa_id, role)`**: Checks if user has a specific role
2. **`can_view_sensitive_data(user_id, empresa_id)`**: Returns true if user has admin or hr_manager role

### 3. Updated RLS Policies

#### `funcionarios` Table Policies
- **SELECT**: All company users can view employee records, but sensitive data is masked client-side for non-privileged users
- **INSERT**: Only admins and HR managers can create employee records
- **UPDATE**: Only admins and HR managers can update employee records  
- **DELETE**: Only admins can delete employee records

### 4. Client-Side Protection

#### `useUserRole` Hook
A custom hook (`src/hooks/useUserRole.tsx`) that:
- Fetches the current user's role for a given company
- Determines if the user can view sensitive data
- Provides a loading state

#### `maskSensitiveField` Function
Masks sensitive data for unauthorized users while showing partial information:
- Fields under 4 characters: `***`
- Longer fields: Shows first 2 and last 2 characters (e.g., `12***89`)

#### Protected UI Elements
The following components now implement role-based protection:

1. **`src/pages/Funcionarios.tsx`**:
   - "Novo Funcionário" button only visible to admins/HR managers
   - Edit and Delete actions only available to admins/HR managers
   - Warning alert displayed to users with limited access

2. **`src/pages/FuncionarioDetalhes.tsx`**:
   - Edit button only visible to admins/HR managers
   - Sensitive fields masked: CPF, RG, CTPS, PIS, bank details, PIX key, salary
   - Warning alert displayed about restricted access

3. **`src/pages/FuncionarioEdicao.tsx`**:
   - Entire page restricted to admins/HR managers only (enforced by RLS)

## Sensitive Data Protected
The following fields are now protected and masked for unauthorized users:

### Personal Documents
- CPF (Brazilian SSN)
- RG (ID number)
- CTPS (Work card)
- Série (Work card series)
- PIS (Social integration program number)

### Financial Information
- Salário Atual (Current salary)
- Banco (Bank name)
- Agência (Bank branch)
- Número da Conta (Account number)
- Chave PIX (PIX key)

## Setup Instructions

### 1. Assign User Roles
After running the migration, you need to assign roles to users. You can do this directly in the Supabase SQL Editor:

```sql
-- Assign admin role
INSERT INTO public.user_roles (user_id, empresa_id, role)
VALUES ('user-uuid-here', 'empresa-uuid-here', 'admin');

-- Assign hr_manager role
INSERT INTO public.user_roles (user_id, empresa_id, role)
VALUES ('user-uuid-here', 'empresa-uuid-here', 'hr_manager');

-- Assign employee role
INSERT INTO public.user_roles (user_id, empresa_id, role)
VALUES ('user-uuid-here', 'empresa-uuid-here', 'employee');
```

### 2. Create Initial Admin
**IMPORTANT**: Make sure to create at least one admin user for each company to manage other users' roles:

```sql
-- Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Get your company ID
SELECT id, fantasia FROM public.empresas;

-- Assign admin role
INSERT INTO public.user_roles (user_id, empresa_id, role)
VALUES ('your-user-id', 'your-empresa-id', 'admin');
```

## Testing the Security

### Test as Admin
1. Login as a user with admin role
2. Verify you can:
   - See all employee data including CPF, RG, salary, bank details
   - Create new employees
   - Edit existing employees
   - Delete employees

### Test as HR Manager
1. Login as a user with hr_manager role
2. Verify you can:
   - See all employee data including sensitive information
   - Create and edit employees
   - Cannot delete employees

### Test as Employee
1. Login as a user with employee role (or no role assigned)
2. Verify you:
   - Can see basic employee information
   - Sensitive fields are masked (e.g., CPF shows as `12***89`)
   - Cannot create, edit, or delete employees
   - See warning alerts about restricted access

## Security Best Practices Implemented

1. **Server-Side Enforcement**: All permission checks use RLS policies and security definer functions
2. **No Client-Side Role Storage**: Roles are never stored in localStorage or sessionStorage
3. **Defense in Depth**: Both database-level (RLS) and client-level (UI) protections
4. **Principle of Least Privilege**: Users only get the minimum access they need
5. **Secure Functions**: Using `SECURITY DEFINER` with fixed `search_path` prevents SQL injection
6. **Audit Trail**: All role assignments are logged with timestamps

## Future Enhancements

Consider implementing:
1. Role management UI for admins
2. Audit logging for sensitive data access
3. Time-based access controls
4. Two-factor authentication for admin accounts
5. Data export restrictions for employee roles
6. IP-based access restrictions for sensitive operations

## Troubleshooting

### Users Can't See Any Data
- Check if the user has a role assigned in the `user_roles` table
- Verify the `empresa_id` matches the company they're trying to access
- Check if RLS policies are enabled on the `funcionarios` table

### Users Can't Create/Edit Employees
- Ensure the user has `admin` or `hr_manager` role
- Check the `can_view_sensitive_data` function is working correctly
- Verify RLS policies on `funcionarios` table

### Sensitive Data Still Visible
- Clear browser cache and reload
- Check if `useUserRole` hook is properly imported and used
- Verify `maskSensitiveField` is applied to all sensitive fields

## Support
For security-related questions or to report vulnerabilities, please contact your system administrator.
