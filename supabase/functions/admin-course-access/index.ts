import { createClient } from 'npm:@supabase/supabase-js@2.58.0'

const PRODUCTION_ORIGIN = 'https://cursos.cuidarseguro.com.br'
const ALLOWED_ORIGINS = new Set([
  PRODUCTION_ORIGIN,
  'http://127.0.0.1:4173',
  'http://localhost:4173'
])

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : PRODUCTION_ORIGIN
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

function json(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' }
  })
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin')

  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) })
  }

  if (request.method !== 'POST') {
    return json(origin, 405, { ok: false, error: 'Método não permitido.' })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return json(origin, 401, { ok: false, error: 'Sessão obrigatória.' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(origin, 500, { ok: false, error: 'Configuração do serviço incompleta.' })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return json(origin, 401, { ok: false, error: 'Sessão inválida ou expirada.' })
  }

  const { data: callerRole, error: roleError } = await adminClient
    .from('user_roles')
    .select('role, active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (roleError || callerRole?.role !== 'administrator' || !callerRole.active) {
    return json(origin, 403, { ok: false, error: 'Apenas administradores podem conceder acessos.' })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return json(origin, 400, { ok: false, error: 'Corpo JSON inválido.' })
  }

  if (payload.action !== 'invite') {
    return json(origin, 400, { ok: false, error: 'Ação inválida.' })
  }

  const email = String(payload.email || '').trim().toLowerCase()
  const role = String(payload.role || '')
  const courseCode = String(payload.courseCode || '')
  const requestedRedirect = String(payload.redirectTo || '')
  const redirectUrl = requestedRedirect.startsWith(PRODUCTION_ORIGIN)
    ? requestedRedirect
    : `${PRODUCTION_ORIGIN}/sp-anest-001/instrutores/`

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(origin, 400, { ok: false, error: 'E-mail inválido.' })
  }

  if (!['administrator', 'instructor'].includes(role)) {
    return json(origin, 400, { ok: false, error: 'Papel inválido.' })
  }

  const { data: course, error: courseError } = await adminClient
    .from('courses')
    .select('id, code')
    .eq('code', courseCode)
    .maybeSingle()

  if (courseError || !course) {
    return json(origin, 404, { ok: false, error: 'Curso não encontrado.' })
  }

  let invited = false
  let targetUserId: string | null = null
  const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) {
    return json(origin, 500, { ok: false, error: 'Não foi possível consultar os usuários.' })
  }

  const existingUser = usersPage.users.find((candidate) => candidate.email?.toLowerCase() === email)
  if (existingUser) {
    targetUserId = existingUser.id
  } else {
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectUrl,
      data: { invited_for_course: courseCode }
    })
    if (inviteError || !inviteData.user) {
      return json(origin, 400, { ok: false, error: 'Não foi possível enviar o convite.' })
    }
    targetUserId = inviteData.user.id
    invited = true
  }

  const { error: roleUpsertError } = await adminClient.from('user_roles').upsert({
    user_id: targetUserId,
    role,
    active: true,
    created_by: user.id
  }, { onConflict: 'user_id' })

  if (roleUpsertError) {
    return json(origin, 500, { ok: false, error: 'Não foi possível atribuir o papel.' })
  }

  if (role === 'instructor') {
    const { error: membershipError } = await adminClient.from('course_memberships').upsert({
      course_id: course.id,
      user_id: targetUserId,
      active: true,
      created_by: user.id
    }, { onConflict: 'course_id,user_id' })

    if (membershipError) {
      return json(origin, 500, { ok: false, error: 'O papel foi salvo, mas o vínculo com o curso falhou.' })
    }
  }

  return json(origin, 200, {
    ok: true,
    invited,
    userId: targetUserId,
    role,
    courseCode
  })
})
