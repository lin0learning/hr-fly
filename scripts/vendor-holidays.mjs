import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'packages/holidays/data')
mkdirSync(outDir, { recursive: true })

const years = [2025, 2026, 2027]

for (const year of years) {
  const url = `https://unpkg.com/holiday-calendar/data/CN/${year}.json`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.text()
    writeFileSync(resolve(outDir, `${year}.json`), data)
    console.log(`Vendored ${year}.json`)
  } catch (e) {
    console.warn(`Skip ${year}:`, e)
  }
}
