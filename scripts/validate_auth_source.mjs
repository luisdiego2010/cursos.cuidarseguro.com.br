import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const files = [
  'src/instructor-portal.js',
  'sp-anest-001/instrutores/index.html',
  'supabase/functions/admin-course-access/index.ts',
  'supabase/migrations/20260921132000_create_course_access_control.sql'
]

const errors = []
for (const relative of files) {
  const absolute = path.join(root, relative)
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size === 0) {
    errors.push(`${relative}: arquivo ausente ou vazio`)
  }
}

const client = fs.readFileSync(path.join(root, 'src/instructor-portal.js'), 'utf8')
const html = fs.readFileSync(path.join(root, 'sp-anest-001/instrutores/index.html'), 'utf8')
const functionSource = fs.readFileSync(path.join(root, 'supabase/functions/admin-course-access/index.ts'), 'utf8')
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20260921132000_create_course_access_control.sql'), 'utf8')

const clientForbidden = [
  ['service role key', /service_role|SUPABASE_SERVICE_ROLE_KEY/i],
  ['shared password input', /type=["']password["']/i],
  ['automatic account creation', /shouldCreateUser\s*:\s*true/i],
  ['client-side authorization list', /EMAILS_AUTORIZADOS/i],
  ['legacy shared password', /sba@imers/i]
]
for (const [label, pattern] of clientForbidden) {
  if (pattern.test(client) || pattern.test(html)) errors.push(`cliente: padrão proibido (${label})`)
}

const requiredClient = [
  ['publishable key', /sb_publishable_/],
  ['prevent auto signup', /shouldCreateUser\s*:\s*false/],
  ['magic-link sign-in', /signInWithOtp/],
  ['short-lived signed URL', /createSignedUrl/]
]
for (const [label, pattern] of requiredClient) {
  if (!pattern.test(client)) errors.push(`cliente: requisito ausente (${label})`)
}

const requiredFunction = [
  ['server-side service key', /SUPABASE_SERVICE_ROLE_KEY/],
  ['caller validation', /auth\.getUser\(\)/],
  ['administrator check', /callerRole\?\.role\s*!==\s*'administrator'/],
  ['invite API', /inviteUserByEmail/],
  ['production origin restriction', /https:\/\/cursos\.cuidarseguro\.com\.br/]
]
for (const [label, pattern] of requiredFunction) {
  if (!pattern.test(functionSource)) errors.push(`edge function: requisito ausente (${label})`)
}

const requiredMigration = [
  ['RLS roles', /alter table public\.user_roles enable row level security/i],
  ['RLS courses', /alter table public\.courses enable row level security/i],
  ['RLS memberships', /alter table public\.course_memberships enable row level security/i],
  ['RLS documents', /alter table public\.course_documents enable row level security/i],
  ['private bucket', /'course-materials'[\s\S]*?false/i],
  ['authenticated storage select', /course_materials_select_authorized/i],
  ['admin storage insert', /course_materials_insert_admin/i],
  ['active course authorization', /c\.status\s*=\s*'active'/i],
  ['exact document storage path', /d\.storage_path\s*=\s*object_name/i],
  ['revoke public grants', /from public, anon, authenticated/i],
  ['last administrator protection', /prevent_last_active_administrator/i]
]
for (const [label, pattern] of requiredMigration) {
  if (!pattern.test(migration)) errors.push(`migração: requisito ausente (${label})`)
}

if (errors.length) {
  console.error(`FALHA — ${errors.length} problema(s)`)
  errors.forEach((error, index) => console.error(`${index + 1}. ${error}`))
  process.exit(1)
}

console.log('OK — cliente, Edge Function e migração atendem aos controles estáticos configurados.')
