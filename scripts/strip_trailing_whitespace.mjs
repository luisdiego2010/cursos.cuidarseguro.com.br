import fs from 'node:fs'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Informe ao menos um arquivo.')
  process.exit(2)
}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const normalized = content.replace(/[ \t]+$/gm, '')
  fs.writeFileSync(file, normalized)
}
