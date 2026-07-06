import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

// Root .env then .env.local (local overrides, gitignored)
for (const file of ['.env', '.env.local']) {
  const path = resolve(root, file)
  if (existsSync(path)) config({ path, override: file === '.env.local' })
}
