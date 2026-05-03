import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Action = 'get-user-info' | 'update-role' | 'revoke-access' | 'reset-password' | 'add-empresa-access' | 'remove-empresa-access' | 'update-perfil'

interface ManageUserAccessRequest {
  action: Action
  funcionario_id?: string
  user_id?: string
  empresa_id: string
  new_role?: 'admin' | 'hr_manager' | 'employee'
  new_password?: string
  // Para novas actions de empresa
  target_empresa_id?: string
  perfil_id?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ManageUserAccessRequest = await req.json()
    const { action, funcionario_id, user_id, empresa_id, new_role, new_password, target_empresa_id, perfil_id } = body

    console.log('Managing user access, action:', action, 'by user:', currentUser.id)

    // Resolve target user_id from funcionario if not provided
    let targetUserId = user_id
    if (!targetUserId && funcionario_id) {
      const { data: func } = await supabaseAdmin
        .from('funcionarios')
        .select('user_id')
        .eq('id', funcionario_id)
        .single()
      targetUserId = func?.user_id
    }

    // Get grupo_empresarial_id for the target empresa
    const { data: targetEmpresa, error: targetError } = await supabaseAdmin
      .from('empresas')
      .select('grupo_empresarial_id')
      .eq('id', empresa_id)
      .single()

    console.log('Target empresa:', targetEmpresa, 'Error:', targetError)

    if (!targetEmpresa) {
      return new Response(
        JSON.stringify({ error: 'Empresa not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Permission model aligned with "menu de permissões" (perfis_acesso/permissoes_perfil)
    const requiredPermissionByAction: Record<Action, string | null> = {
      'get-user-info': 'func.aba.acesso',
      'update-role': 'func.aba.acesso',
      'revoke-access': 'func.aba.acesso',
      'reset-password': 'func.aba.acesso',
      'add-empresa-access': 'func.aba.acesso',
      'remove-empresa-access': 'func.aba.acesso',
      'update-perfil': 'func.aba.acesso',
    }

    // Self-access exception (read-only)
    let hasPermission =
      action === 'get-user-info' && !!targetUserId && targetUserId === currentUser.id

    // Otherwise, check group-based access via roles OR perfil permissions
    if (!hasPermission) {
      // 1) admin/hr_manager role in user_roles for same grupo_empresarial
      const { data: userRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role, empresa_id')
        .eq('user_id', currentUser.id)
        .in('role', ['admin', 'hr_manager'])

      if (userRoles && userRoles.length > 0) {
        const userEmpresaIds = userRoles.map((ur: any) => ur.empresa_id)
        const { data: userEmpresas } = await supabaseAdmin
          .from('empresas')
          .select('id, grupo_empresarial_id')
          .in('id', userEmpresaIds)

        hasPermission =
          userEmpresas?.some(
            (ue: any) => ue.grupo_empresarial_id === targetEmpresa.grupo_empresarial_id,
          ) || false
      }

      // 2) perfil system: usuarios_perfis + permissoes_perfil (same grupo empresarial)
      if (!hasPermission) {
        const requiredPermission = requiredPermissionByAction[action]

        // safety: if action isn't mapped, deny
        if (!requiredPermission) {
          hasPermission = false
        } else {
          const { data: userPerfis } = await supabaseAdmin
            .from('usuarios_perfis')
            .select(
              `
              perfil_id,
              empresa:empresas!usuarios_perfis_empresa_id_fkey(grupo_empresarial_id)
            `,
            )
            .eq('user_id', currentUser.id)

          const perfisInSameGrupo =
            userPerfis?.filter(
              (up: any) =>
                up.empresa?.grupo_empresarial_id === targetEmpresa.grupo_empresarial_id,
            ) || []

          if (perfisInSameGrupo.length > 0) {
            const perfilIds = perfisInSameGrupo.map((p: any) => p.perfil_id)

            const { data: permissions } = await supabaseAdmin
              .from('permissoes_perfil')
              .select('codigo_permissao')
              .in('perfil_id', perfilIds)
              .eq('codigo_permissao', requiredPermission)

            hasPermission = !!permissions && permissions.length > 0
          }
        }
      }
    }

    console.log('Has permission:', hasPermission)

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'get-user-info': {
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ user: null, hasAccess: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user info from auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
        
        if (authError || !authUser.user) {
          return new Response(
            JSON.stringify({ user: null, hasAccess: false }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user roles
        const { data: roles } = await supabaseAdmin
          .from('user_roles')
          .select('role, empresa_id')
          .eq('user_id', targetUserId)

        // Get user empresas with perfis
        const { data: usuariosEmpresas } = await supabaseAdmin
          .from('usuarios_empresas')
          .select('empresa_id, empresa:empresas(id, fantasia)')
          .eq('user_id', targetUserId)

        // Get user perfis
        const { data: usuariosPerfis } = await supabaseAdmin
          .from('usuarios_perfis')
          .select('empresa_id, perfil_id, perfil:perfis_acesso(id, nome)')
          .eq('user_id', targetUserId)

        // Build empresas com perfis
        const empresasComPerfis = usuariosEmpresas?.map((ue: any) => {
          const perfilInfo = usuariosPerfis?.find((up: any) => up.empresa_id === ue.empresa_id)
          return {
            ...ue.empresa,
            perfil_id: perfilInfo?.perfil_id || null,
            perfil_nome: perfilInfo?.perfil?.nome || null
          }
        }) || []

        return new Response(
          JSON.stringify({
            hasAccess: true,
            user: {
              id: authUser.user.id,
              email: authUser.user.email,
              created_at: authUser.user.created_at,
              last_sign_in_at: authUser.user.last_sign_in_at,
              roles: roles || [],
              empresas: empresasComPerfis
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update-role': {
        if (!targetUserId || !new_role) {
          return new Response(
            JSON.stringify({ error: 'user_id and new_role are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if role exists for this empresa
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('empresa_id', empresa_id)
          .single()

        if (existingRole) {
          // Update existing role
          const { error } = await supabaseAdmin
            .from('user_roles')
            .update({ role: new_role })
            .eq('user_id', targetUserId)
            .eq('empresa_id', empresa_id)

          if (error) {
            console.error('Error updating role:', error)
            return new Response(
              JSON.stringify({ error: 'Error updating role' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Insert new role
          const { error } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: targetUserId, empresa_id, role: new_role })

          if (error) {
            console.error('Error inserting role:', error)
            return new Response(
              JSON.stringify({ error: 'Error assigning role' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'revoke-access': {
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'user_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Remove from usuarios_perfis for this empresa
        await supabaseAdmin
          .from('usuarios_perfis')
          .delete()
          .eq('user_id', targetUserId)
          .eq('empresa_id', empresa_id)

        // Remove from user_roles for this empresa
        await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId)
          .eq('empresa_id', empresa_id)

        // Remove from usuarios_empresas for this empresa
        await supabaseAdmin
          .from('usuarios_empresas')
          .delete()
          .eq('user_id', targetUserId)
          .eq('empresa_id', empresa_id)

        // Clear user_id from funcionario
        if (funcionario_id) {
          await supabaseAdmin
            .from('funcionarios')
            .update({ user_id: null })
            .eq('id', funcionario_id)
        }

        // Check if user has access to any other empresa
        const { data: remainingAccess } = await supabaseAdmin
          .from('usuarios_empresas')
          .select('id')
          .eq('user_id', targetUserId)
          .limit(1)

        // If no more access, delete the user entirely
        if (!remainingAccess || remainingAccess.length === 0) {
          await supabaseAdmin.auth.admin.deleteUser(targetUserId)
          console.log('User deleted as they have no more company access')
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'reset-password': {
        if (!targetUserId || !new_password) {
          return new Response(
            JSON.stringify({ error: 'user_id and new_password are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Password must be at least 6 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: new_password
        })

        if (error) {
          console.error('Error resetting password:', error)
          return new Response(
            JSON.stringify({ error: 'Error resetting password' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'add-empresa-access': {
        if (!targetUserId || !target_empresa_id || !perfil_id) {
          return new Response(
            JSON.stringify({ error: 'user_id, target_empresa_id and perfil_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar que a empresa alvo pertence ao mesmo grupo
        const { data: newEmpresa } = await supabaseAdmin
          .from('empresas')
          .select('grupo_empresarial_id')
          .eq('id', target_empresa_id)
          .single()

        if (!newEmpresa || newEmpresa.grupo_empresarial_id !== targetEmpresa.grupo_empresarial_id) {
          return new Response(
            JSON.stringify({ error: 'Empresa não pertence ao mesmo grupo empresarial' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar se já tem acesso a esta empresa
        const { data: existingAccess } = await supabaseAdmin
          .from('usuarios_empresas')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('empresa_id', target_empresa_id)
          .single()

        if (existingAccess) {
          return new Response(
            JSON.stringify({ error: 'Usuário já possui acesso a esta empresa' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar se o perfil pertence ao mesmo grupo
        const { data: perfilData } = await supabaseAdmin
          .from('perfis_acesso')
          .select('empresa:empresas!perfis_acesso_empresa_id_fkey(grupo_empresarial_id)')
          .eq('id', perfil_id)
          .single()

        if (!perfilData || (perfilData.empresa as any)?.grupo_empresarial_id !== targetEmpresa.grupo_empresarial_id) {
          return new Response(
            JSON.stringify({ error: 'Perfil não pertence ao grupo empresarial' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Adicionar acesso
        const { error: ueError } = await supabaseAdmin
          .from('usuarios_empresas')
          .insert({ user_id: targetUserId, empresa_id: target_empresa_id })

        if (ueError) {
          console.error('Error inserting usuarios_empresas:', ueError)
          return new Response(
            JSON.stringify({ error: 'Erro ao vincular usuário à empresa' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUserId, empresa_id: target_empresa_id, role: 'employee' })

        if (roleError) {
          // Rollback
          await supabaseAdmin.from('usuarios_empresas').delete().eq('user_id', targetUserId).eq('empresa_id', target_empresa_id)
          console.error('Error inserting user_roles:', roleError)
          return new Response(
            JSON.stringify({ error: 'Erro ao atribuir role ao usuário' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: perfilError } = await supabaseAdmin
          .from('usuarios_perfis')
          .insert({ user_id: targetUserId, empresa_id: target_empresa_id, perfil_id })

        if (perfilError) {
          // Rollback
          await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId).eq('empresa_id', target_empresa_id)
          await supabaseAdmin.from('usuarios_empresas').delete().eq('user_id', targetUserId).eq('empresa_id', target_empresa_id)
          console.error('Error inserting usuarios_perfis:', perfilError)
          return new Response(
            JSON.stringify({ error: 'Erro ao atribuir perfil ao usuário' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'remove-empresa-access': {
        if (!targetUserId || !target_empresa_id) {
          return new Response(
            JSON.stringify({ error: 'user_id and target_empresa_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar se é a última empresa
        const { data: allAccess } = await supabaseAdmin
          .from('usuarios_empresas')
          .select('id')
          .eq('user_id', targetUserId)

        if (!allAccess || allAccess.length <= 1) {
          return new Response(
            JSON.stringify({ error: 'Não é possível remover a última empresa. Use "Revogar Acesso" para remover completamente o usuário.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar que a empresa alvo pertence ao mesmo grupo
        const { data: removeEmpresa } = await supabaseAdmin
          .from('empresas')
          .select('grupo_empresarial_id')
          .eq('id', target_empresa_id)
          .single()

        if (!removeEmpresa || removeEmpresa.grupo_empresarial_id !== targetEmpresa.grupo_empresarial_id) {
          return new Response(
            JSON.stringify({ error: 'Empresa não pertence ao mesmo grupo empresarial' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Remover acesso da empresa
        await supabaseAdmin.from('usuarios_perfis').delete().eq('user_id', targetUserId).eq('empresa_id', target_empresa_id)
        await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId).eq('empresa_id', target_empresa_id)
        await supabaseAdmin.from('usuarios_empresas').delete().eq('user_id', targetUserId).eq('empresa_id', target_empresa_id)

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update-perfil': {
        if (!targetUserId || !target_empresa_id || !perfil_id) {
          return new Response(
            JSON.stringify({ error: 'user_id, target_empresa_id and perfil_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar que a empresa alvo pertence ao mesmo grupo
        const { data: updateEmpresa } = await supabaseAdmin
          .from('empresas')
          .select('grupo_empresarial_id')
          .eq('id', target_empresa_id)
          .single()

        if (!updateEmpresa || updateEmpresa.grupo_empresarial_id !== targetEmpresa.grupo_empresarial_id) {
          return new Response(
            JSON.stringify({ error: 'Empresa não pertence ao mesmo grupo empresarial' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar se o perfil pertence ao mesmo grupo
        const { data: perfilToUpdate } = await supabaseAdmin
          .from('perfis_acesso')
          .select('empresa:empresas!perfis_acesso_empresa_id_fkey(grupo_empresarial_id)')
          .eq('id', perfil_id)
          .single()

        if (!perfilToUpdate || (perfilToUpdate.empresa as any)?.grupo_empresarial_id !== targetEmpresa.grupo_empresarial_id) {
          return new Response(
            JSON.stringify({ error: 'Perfil não pertence ao grupo empresarial' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verificar se já existe perfil para esta empresa
        const { data: existingPerfil } = await supabaseAdmin
          .from('usuarios_perfis')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('empresa_id', target_empresa_id)
          .single()

        if (existingPerfil) {
          // Update
          const { error } = await supabaseAdmin
            .from('usuarios_perfis')
            .update({ perfil_id })
            .eq('user_id', targetUserId)
            .eq('empresa_id', target_empresa_id)

          if (error) {
            console.error('Error updating usuarios_perfis:', error)
            return new Response(
              JSON.stringify({ error: 'Erro ao atualizar perfil' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Insert
          const { error } = await supabaseAdmin
            .from('usuarios_perfis')
            .insert({ user_id: targetUserId, empresa_id: target_empresa_id, perfil_id })

          if (error) {
            console.error('Error inserting usuarios_perfis:', error)
            return new Response(
              JSON.stringify({ error: 'Erro ao atribuir perfil' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
