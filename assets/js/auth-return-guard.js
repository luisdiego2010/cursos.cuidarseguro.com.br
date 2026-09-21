(() => {
  const INSTRUCTOR_PATH = '/sp-anest-001/instrutores/'
  const LOGIN_MARKER = 'cuidarseguro:instructor-login-pending'
  const MAX_PENDING_AGE_MS = 2 * 60 * 60 * 1000
  const hasAuthCallback = /(?:^|[?#&])(code|access_token|refresh_token|error|error_code|error_description)=/i.test(window.location.href)
  const cameFromSupabaseAuth = /^https:\/\/qouylryampbwdqubfcbx\.supabase\.co(?:\/|$)/i.test(document.referrer)
  const requestedAt = Number(localStorage.getItem(LOGIN_MARKER) || 0)
  const hasRecentPendingLogin = requestedAt > 0 && Date.now() - requestedAt <= MAX_PENDING_AGE_MS

  if (requestedAt > 0 && !hasRecentPendingLogin) {
    localStorage.removeItem(LOGIN_MARKER)
  }

  if (window.location.pathname !== INSTRUCTOR_PATH && (hasAuthCallback || hasRecentPendingLogin || cameFromSupabaseAuth)) {
    const suffix = `${window.location.search}${window.location.hash}`
    window.location.replace(`${INSTRUCTOR_PATH}${suffix}`)
  }
})()
