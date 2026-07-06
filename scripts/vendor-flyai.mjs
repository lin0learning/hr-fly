#!/usr/bin/env node
import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const pkgPath = require.resolve('@fly-ai/flyai-cli/package.json')
const src = join(dirname(pkgPath), 'dist/flyai-bundle.cjs')
const outDir = join(root, 'lib')
const dest = join(outDir, 'flyai-bundle.cjs')

mkdirSync(outDir, { recursive: true })
copyFileSync(src, dest)
console.log('Vendored flyai-bundle.cjs to', dest)
