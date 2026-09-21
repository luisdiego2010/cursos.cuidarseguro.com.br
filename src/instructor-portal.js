import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qouylryampbwdqubfcbx.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Avp5BALuwurhGA66Tnp48w_6vcdwVs6'
const COURSE_CODE = 'SP-ANEST-001'
const BUCKET = 'course-materials'
const SIGNED_URL_TTL_SECONDS = 60
const LOGIN_MARKER = 'cuidarseguro:instructor-login-pending'

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

const state = {
  session: null,
  role: null,
  course: null,
  documents: []
}

const byId = (id) => document.getElementById(id)
const show = (id, visible = true) => byId(id)?.toggleAttribute('hidden', !visible)

function setStatus(message, tone = 'neutral') {
  const element = byId('auth-status')
  if (!element) return
  element.textContent = message
  element.dataset.tone = tone
  element.hidden = !message
}

function setBusy(button, busy, busyLabel = 'Aguarde…') {
  if (!button) return
  if (busy) {
    button.dataset.label = button.textContent
    button.textContent = busyLabel
    button.disabled = true
  } else {
    button.textContent = button.dataset.label || button.textContent
    button.disabled = false
  }
}

function canonicalRedirectUrl() {
  return `${window.location.origin}/sp-anest-001/instrutores/`
}

function isEmailRateLimitError(error) {
  const message = String(error?.message || '')
  return error?.status === 429
    || error?.code === 'over_email_send_rate_limit'
    || /rate limit|too many requests/i.test(message)
}

async function sendMagicLink(event) {
  event.preventDefault()
  const form = event.currentTarget
  const email = form.email.value.trim().toLowerCase()
  const button = form.querySelector('button[type="submit"]')

  if (!email) {
    setStatus('Informe seu e-mail.', 'error')
    return
  }

  setBusy(button, true, 'Enviando…')
  setStatus('')

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: canonicalRedirectUrl()
    }
  })

  setBusy(button, false)
  if (error) {
    if (isEmailRateLimitError(error)) {
      setStatus('O limite temporário de dois e-mails por hora do Supabase foi atingido. Não solicite novamente agora; aguarde cerca de uma hora e tente uma única vez.', 'error')
      return
    }
    setStatus('Não foi possível enviar o link. Confirme que o e-mail foi previamente autorizado.', 'error')
    return
  }

  localStorage.setItem(LOGIN_MARKER, String(Date.now()))
  form.reset()
  setStatus('Se o e-mail estiver autorizado, um link de acesso será enviado. Verifique também a pasta de spam.', 'success')
}

async function signOut() {
  const button = byId('sign-out')
  setBusy(button, true, 'Saindo…')
  await supabase.auth.signOut()
  localStorage.removeItem(LOGIN_MARKER)
  state.session = null
  state.role = null
  state.course = null
  state.documents = []
  renderSignedOut()
  setBusy(button, false)
}

function renderSignedOut() {
  show('loading-panel', false)
  show('login-panel', true)
  show('unauthorized-panel', false)
  show('portal-panel', false)
  setStatus('')
}

function renderUnauthorized(email) {
  show('loading-panel', false)
  show('login-panel', false)
  show('portal-panel', false)
  show('unauthorized-panel', true)
  byId('unauthorized-email').textContent = email || 'usuário autenticado'
}

function documentCard(documentRow) {
  const article = document.createElement('article')
  article.className = 'document-card'

  const heading = document.createElement('h3')
  heading.textContent = documentRow.title
  article.appendChild(heading)

  const meta = document.createElement('p')
  meta.className = 'document-meta'
  const parts = [labelForCategory(documentRow.category)]
  if (documentRow.version_label) parts.push(documentRow.version_label)
  if (documentRow.size_bytes) parts.push(formatBytes(documentRow.size_bytes))
  if (state.role === 'administrator') parts.push(documentRow.published ? 'Publicado' : 'Rascunho')
  meta.textContent = parts.join(' · ')
  article.appendChild(meta)

  const actions = document.createElement('div')
  actions.className = 'document-actions'

  const openButton = document.createElement('button')
  openButton.type = 'button'
  openButton.className = 'btn btn-primary'
  openButton.textContent = 'Abrir arquivo'
  openButton.addEventListener('click', () => openDocument(documentRow, openButton))
  actions.appendChild(openButton)

  if (state.role === 'administrator') {
    const publishButton = document.createElement('button')
    publishButton.type = 'button'
    publishButton.className = 'btn btn-outline'
    publishButton.textContent = documentRow.published ? 'Retirar publicação' : 'Publicar'
    publishButton.addEventListener('click', () => toggleDocumentPublished(documentRow, publishButton))
    actions.appendChild(publishButton)

    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.className = 'btn btn-danger'
    deleteButton.textContent = 'Excluir'
    deleteButton.addEventListener('click', () => deleteDocument(documentRow, deleteButton))
    actions.appendChild(deleteButton)
  }

  article.appendChild(actions)
  return article
}

function labelForCategory(category) {
  const labels = {
    facilitator_guide: 'Guia do facilitador',
    scenario: 'Cenário',
    checklist: 'Checklist',
    assessment: 'Avaliação',
    answer_key: 'Gabarito',
    slides: 'Slides',
    reference: 'Referência',
    other: 'Outro'
  }
  return labels[category] || 'Documento'
}

function formatBytes(bytes) {
  if (!Number.isFinite(Number(bytes))) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let value = Number(bytes)
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function renderDocuments() {
  const container = byId('documents-list')
  container.replaceChildren()
  show('documents-empty', state.documents.length === 0)
  state.documents.forEach((documentRow) => container.appendChild(documentCard(documentRow)))
}

async function openDocument(documentRow, button) {
  setBusy(button, true, 'Gerando acesso…')
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(documentRow.storage_path, SIGNED_URL_TTL_SECONDS, { download: false })
  setBusy(button, false)

  if (error || !data?.signedUrl) {
    setStatus('Não foi possível liberar o arquivo. Atualize a sessão e tente novamente.', 'error')
    return
  }

  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

async function toggleDocumentPublished(documentRow, button) {
  setBusy(button, true, 'Salvando…')
  const { error } = await supabase
    .from('course_documents')
    .update({ published: !documentRow.published })
    .eq('id', documentRow.id)
  setBusy(button, false)

  if (error) {
    setStatus('Não foi possível alterar a publicação do documento.', 'error')
    return
  }

  await loadDocuments()
  setStatus('Estado de publicação atualizado.', 'success')
}

async function deleteDocument(documentRow, button) {
  const confirmed = window.confirm(`Excluir permanentemente “${documentRow.title}”?`)
  if (!confirmed) return

  setBusy(button, true, 'Excluindo…')
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([documentRow.storage_path])
  if (storageError) {
    setBusy(button, false)
    setStatus('O arquivo não pôde ser excluído do armazenamento.', 'error')
    return
  }

  const { error: metadataError } = await supabase
    .from('course_documents')
    .delete()
    .eq('id', documentRow.id)
  setBusy(button, false)

  if (metadataError) {
    setStatus('O arquivo foi removido, mas os metadados precisam de revisão administrativa.', 'error')
    return
  }

  await loadDocuments()
  setStatus('Documento excluído.', 'success')
}

function safeFilename(name) {
  const extensionIndex = name.lastIndexOf('.')
  const extension = extensionIndex >= 0 ? name.slice(extensionIndex).toLowerCase() : ''
  const base = (extensionIndex >= 0 ? name.slice(0, extensionIndex) : name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'documento'}${extension}`
}

async function uploadDocument(event) {
  event.preventDefault()
  const form = event.currentTarget
  const file = form.file.files[0]
  const button = form.querySelector('button[type="submit"]')

  if (!file || !state.course) {
    setStatus('Selecione um arquivo válido.', 'error')
    return
  }

  if (file.size > 25 * 1024 * 1024) {
    setStatus('O arquivo ultrapassa o limite de 25 MB.', 'error')
    return
  }

  const path = `${state.course.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`
  const publishAfterUpload = form.published.checked
  setBusy(button, true, 'Enviando…')
  setStatus('')

  const { data: metadata, error: metadataError } = await supabase.from('course_documents').insert({
    course_id: state.course.id,
    title: form.title.value.trim(),
    category: form.category.value,
    version_label: form.version.value.trim() || null,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
    published: false,
    created_by: state.session.user.id
  }).select('id').single()

  if (metadataError) {
    setBusy(button, false)
    setStatus('Os metadados não puderam ser preparados para o upload.', 'error')
    return
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
    upsert: false
  })

  if (uploadError) {
    await supabase.from('course_documents').delete().eq('id', metadata.id)
    setBusy(button, false)
    setStatus('O arquivo não pôde ser enviado. Os metadados temporários foram removidos.', 'error')
    return
  }

  if (publishAfterUpload) {
    const { error: publishError } = await supabase
      .from('course_documents')
      .update({ published: true })
      .eq('id', metadata.id)

    if (publishError) {
      setBusy(button, false)
      await loadDocuments()
      setStatus('O documento foi enviado, mas permaneceu como rascunho. Publique-o manualmente.', 'error')
      return
    }
  }

  form.reset()
  setBusy(button, false)
  await loadDocuments()
  setStatus('Documento enviado com sucesso.', 'success')
}

async function inviteUser(event) {
  event.preventDefault()
  const form = event.currentTarget
  const button = form.querySelector('button[type="submit"]')
  setBusy(button, true, 'Enviando convite…')
  setStatus('')

  const { data, error } = await supabase.functions.invoke('admin-course-access', {
    body: {
      action: 'invite',
      email: form.email.value.trim().toLowerCase(),
      role: form.role.value,
      courseCode: COURSE_CODE,
      redirectTo: canonicalRedirectUrl()
    }
  })

  setBusy(button, false)
  if (error || !data?.ok) {
    setStatus(data?.error || 'Não foi possível concluir o convite.', 'error')
    return
  }

  form.reset()
  setStatus(data.invited ? 'Convite enviado e acesso concedido.' : 'Usuário existente atualizado e acesso concedido.', 'success')
}

async function loadDocuments() {
  const { data, error } = await supabase
    .from('course_documents')
    .select('id, course_id, title, category, version_label, storage_path, mime_type, size_bytes, published, display_order, created_at')
    .eq('course_id', state.course.id)
    .order('display_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) throw error
  state.documents = data || []
  renderDocuments()
}

async function loadAuthorizedPortal(session) {
  localStorage.removeItem(LOGIN_MARKER)
  state.session = session

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role, active')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (roleError || !roleRow?.active) {
    renderUnauthorized(session.user.email)
    return
  }

  state.role = roleRow.role

  const { data: courseRow, error: courseError } = await supabase
    .from('courses')
    .select('id, code, title, status')
    .eq('code', COURSE_CODE)
    .maybeSingle()

  if (courseError || !courseRow) {
    renderUnauthorized(session.user.email)
    return
  }

  state.course = courseRow
  byId('signed-in-email').textContent = session.user.email || 'Usuário autenticado'
  byId('role-badge').textContent = state.role === 'administrator' ? 'Administrador' : 'Instrutor'
  byId('course-title').textContent = courseRow.title

  show('loading-panel', false)
  show('login-panel', false)
  show('unauthorized-panel', false)
  show('portal-panel', true)
  show('admin-panel', state.role === 'administrator')

  try {
    await loadDocuments()
  } catch {
    setStatus('Não foi possível carregar a biblioteca privada.', 'error')
  }
}

async function initialize() {
  byId('magic-link-form').addEventListener('submit', sendMagicLink)
  byId('sign-out').addEventListener('click', signOut)
  byId('upload-form').addEventListener('submit', uploadDocument)
  byId('invite-form').addEventListener('submit', inviteUser)

  const urlError = new URLSearchParams(window.location.search).get('error_description')
  if (urlError) {
    localStorage.removeItem(LOGIN_MARKER)
    setStatus('O link expirou ou não pôde ser validado. Solicite um novo acesso.', 'error')
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) await loadAuthorizedPortal(session)
  else renderSignedOut()

  supabase.auth.onAuthStateChange(async (event, nextSession) => {
    if (event === 'SIGNED_OUT' || !nextSession) renderSignedOut()
    if (event === 'SIGNED_IN' && nextSession) await loadAuthorizedPortal(nextSession)
  })
}

initialize().catch(() => {
  show('loading-panel', false)
  show('login-panel', true)
  setStatus('Não foi possível iniciar a área docente. Tente novamente mais tarde.', 'error')
})
