import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmpresaAcesso {
  empresa_id: string
  perfil_id: string
}

interface CreateUserAccessRequest {
  funcionario_id: string
  email: string
  password: string
  // Suporta múltiplas empresas ou modo legado (única empresa)
  empresas_acesso?: EmpresaAcesso[]
  // Modo legado (mantido para compatibilidade)
  perfil_id?: string
  empresa_id?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Client with user's token to verify permissions
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

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !currentUser) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: CreateUserAccessRequest = await req.json()
    const { funcionario_id, email, password, empresas_acesso, perfil_id, empresa_id } = body

    console.log('Creating user access for funcionario:', funcionario_id, 'by user:', currentUser.id)

    // Converter modo legado para novo formato
    let empresasToProcess: EmpresaAcesso[] = []
    if (empresas_acesso && empresas_acesso.length > 0) {
      empresasToProcess = empresas_acesso
    } else if (perfil_id && empresa_id) {
      // Modo legado - única empresa
      empresasToProcess = [{ empresa_id, perfil_id }]
    }

    // Validate required fields
    if (!funcionario_id || !email || !password || empresasToProcess.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: funcionario_id, email, password, and at least one empresa with perfil' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar todas as empresas pertencem ao mesmo grupo empresarial
    const empresaIds = empresasToProcess.map(e => e.empresa_id)
    const { data: empresas, error: empresasError } = await supabaseAdmin
      .from('empresas')
      .select('id, grupo_empresarial_id')
      .in('id', empresaIds)

    if (empresasError || !empresas || empresas.length !== empresaIds.length) {
      console.error('Error fetching empresas:', empresasError)
      return new Response(
        JSON.stringify({ error: 'Uma ou mais empresas não foram encontradas' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se todas as empresas são do mesmo grupo
    const grupoIds = [...new Set(empresas.map(e => e.grupo_empresarial_id))]
    if (grupoIds.length > 1) {
      return new Response(
        JSON.stringify({ error: 'Todas as empresas devem pertencer ao mesmo grupo empresarial' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const targetGrupoId = grupoIds[0]

    // Verificar se todos os perfis existem e pertencem às respectivas empresas
    for (const ea of empresasToProcess) {
      const { data: perfil, error: perfilError } = await supabaseAdmin
        .from('perfis_acesso')
        .select('id, nome, empresa:empresas!perfis_acesso_empresa_id_fkey(grupo_empresarial_id)')
        .eq('id', ea.perfil_id)
        .single()

      if (perfilError || !perfil) {
        console.error('Error fetching perfil:', perfilError)
        return new Response(
          JSON.stringify({ error: `Perfil de acesso não encontrado: ${ea.perfil_id}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verificar se o perfil pertence ao mesmo grupo empresarial
      if ((perfil.empresa as any)?.grupo_empresarial_id !== targetGrupoId) {
        return new Response(
          JSON.stringify({ error: 'Perfil de acesso não pertence ao grupo empresarial' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Permission model aligned with "menu de permissões": require func.aba.acesso OR admin/hr_manager (same grupo)
    const requiredPermission = 'func.aba.acesso'

    // 1) Check if current user has admin or hr_manager role for any empresa in the same grupo empresarial
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('empresa_id')
      .eq('user_id', currentUser.id)
      .in('role', ['admin', 'hr_manager'])

    if (rolesError) {
      console.error('Error checking user roles:', rolesError)
      return new Response(
        JSON.stringify({ error: 'Error checking permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let hasPermission = false

    if (userRoles && userRoles.length > 0) {
      const userEmpresaIds = userRoles.map((r: any) => r.empresa_id)
      const { data: empresasAdmin } = await supabaseAdmin
        .from('empresas')
        .select('grupo_empresarial_id')
        .in('id', userEmpresaIds)

      hasPermission =
        empresasAdmin?.some((e: any) => e.grupo_empresarial_id === targetGrupoId) ?? false
    }

    // 2) If not role-based, check perfil permissions in same grupo
    if (!hasPermission) {
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
          (up: any) => up.empresa?.grupo_empresarial_id === targetGrupoId,
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

    if (!hasPermission) {
      console.error('User does not have permission for this grupo empresarial')
      return new Response(
        JSON.stringify({ error: 'Permission denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Get funcionario data
    const { data: funcionario, error: funcError } = await supabaseAdmin
      .from('funcionarios')
      .select('nome_completo, user_id, empresa_id')
      .eq('id', funcionario_id)
      .single()

    if (funcError || !funcionario) {
      console.error('Error fetching funcionario:', funcError)
      return new Response(
        JSON.stringify({ error: 'Funcionário not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if funcionario already has a user
    if (funcionario.user_id) {
      return new Response(
        JSON.stringify({ error: 'Este funcionário já possui acesso ao sistema' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if email is already in use
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(u => u.email === email)
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este email já está em uso por outro usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        nome: funcionario.nome_completo
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      return new Response(
        JSON.stringify({ error: createError?.message || 'Error creating user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = newUser.user.id
    console.log('User created:', newUserId)

    // Insert records for each empresa
    const insertedEmpresas: string[] = []
    const insertedRoles: string[] = []
    const insertedPerfis: string[] = []

    try {
      for (const ea of empresasToProcess) {
        // Insert into usuarios_empresas
        const { error: ueError } = await supabaseAdmin
          .from('usuarios_empresas')
          .insert({
            user_id: newUserId,
            empresa_id: ea.empresa_id
          })

        if (ueError) {
          console.error('Error inserting usuarios_empresas:', ueError)
          throw new Error('Error linking user to company')
        }
        insertedEmpresas.push(ea.empresa_id)

        // Insert into user_roles with default 'employee' role for backward compatibility
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUserId,
            empresa_id: ea.empresa_id,
            role: 'employee' // Default role, actual permissions come from perfil
          })

        if (roleError) {
          console.error('Error inserting user_roles:', roleError)
          throw new Error('Error assigning user role')
        }
        insertedRoles.push(ea.empresa_id)

        // Insert into usuarios_perfis (new profile system)
        const { error: perfilInsertError } = await supabaseAdmin
          .from('usuarios_perfis')
          .insert({
            user_id: newUserId,
            perfil_id: ea.perfil_id,
            empresa_id: ea.empresa_id
          })

        if (perfilInsertError) {
          console.error('Error inserting usuarios_perfis:', perfilInsertError)
          throw new Error('Error assigning user profile')
        }
        insertedPerfis.push(ea.empresa_id)
      }

      // Update funcionarios.user_id
      const { error: updateError } = await supabaseAdmin
        .from('funcionarios')
        .update({ user_id: newUserId })
        .eq('id', funcionario_id)

      if (updateError) {
        console.error('Error updating funcionario:', updateError)
        // Don't rollback here, user was created successfully
      }

      console.log('User access created successfully for', empresasToProcess.length, 'empresas')

      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: newUserId,
          email: email,
          empresas_count: empresasToProcess.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (insertError) {
      // Rollback: delete all inserted records and the user
      console.error('Rollback triggered:', insertError)
      
      for (const empresaId of insertedPerfis) {
        await supabaseAdmin.from('usuarios_perfis').delete().eq('user_id', newUserId).eq('empresa_id', empresaId)
      }
      for (const empresaId of insertedRoles) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId).eq('empresa_id', empresaId)
      }
      for (const empresaId of insertedEmpresas) {
        await supabaseAdmin.from('usuarios_empresas').delete().eq('user_id', newUserId).eq('empresa_id', empresaId)
      }
      await supabaseAdmin.auth.admin.deleteUser(newUserId)

      return new Response(
        JSON.stringify({ error: (insertError as Error).message || 'Error creating user access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
