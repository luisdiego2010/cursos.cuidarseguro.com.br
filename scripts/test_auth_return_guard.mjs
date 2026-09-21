import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../assets/js/auth-return-guard.js', import.meta.url), 'utf8')
const MARKER = 'cuidarseguro:instructor-login-pending'

function run({ pathname, search = '', hash = '', marker }) {
  const values = new Map()
  if (marker !== undefined) values.set(MARKER, String(marker))
  let replacedWith = null

  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  }
  const href = `https://cursos.cuidarseguro.com.br${pathname}${search}${hash}`
  const context = {
    Date,
    localStorage: storage,
    window: {
      location: {
        href,
        pathname,
        search,
        hash,
        replace: (value) => { replacedWith = value }
      }
    }
  }

  vm.runInNewContext(source, context)
  return { replacedWith, marker: values.get(MARKER) ?? null }
}

const now = Date.now()
const cases = [
  {
    name: 'callback que caiu em participantes volta para docentes',
    actual: run({ pathname: '/sp-anest-001/participantes/', search: '?code=abc' }).replacedWith,
    expected: '/sp-anest-001/instrutores/?code=abc'
  },
  {
    name: 'login recente que caiu em participantes volta para docentes',
    actual: run({ pathname: '/sp-anest-001/participantes/', marker: now }).replacedWith,
    expected: '/sp-anest-001/instrutores/'
  },
  {
    name: 'navegação pública normal permanece em participantes',
    actual: run({ pathname: '/sp-anest-001/participantes/' }).replacedWith,
    expected: null
  },
  {
    name: 'callback já na rota docente não redireciona novamente',
    actual: run({ pathname: '/sp-anest-001/instrutores/', search: '?code=abc' }).replacedWith,
    expected: null
  },
  {
    name: 'marcador expirado é removido',
    actual: run({ pathname: '/', marker: now - 3 * 60 * 60 * 1000 }).marker,
    expected: null
  }
]

const failures = cases.filter(({ actual, expected }) => actual !== expected)
if (failures.length) {
  console.error(`FALHA — ${failures.length} teste(s)`)
  for (const failure of failures) {
    console.error(`${failure.name}: esperado ${JSON.stringify(failure.expected)}, recebido ${JSON.stringify(failure.actual)}`)
  }
  process.exit(1)
}

console.log(`OK — ${cases.length} cenários de retorno de autenticação validados.`)
