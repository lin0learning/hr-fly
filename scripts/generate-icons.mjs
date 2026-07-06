#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = resolve(root, 'apps/web/public')
const iconsDir = resolve(publicDir, 'icons')
mkdirSync(iconsDir, { recursive: true })

const iconSvg = readFileSync(resolve(iconsDir, 'icon.svg'))
const maskableSvg = readFileSync(resolve(iconsDir, 'icon-maskable.svg'))

/** @type {{ name: string; size: number; input: Buffer }[]} */
const outputs = [
  { name: 'icon-192.png', size: 192, input: iconSvg },
  { name: 'icon-512.png', size: 512, input: iconSvg },
  { name: 'icon-512-maskable.png', size: 512, input: maskableSvg },
  { name: 'apple-touch-icon.png', size: 180, input: iconSvg },
]

for (const { name, size, input } of outputs) {
  const buf = await sharp(input).resize(size, size).png().toBuffer()
  writeFileSync(resolve(iconsDir, name), buf)
}

// favicon.ico: 16 + 32 px
const fav16 = await sharp(iconSvg).resize(16, 16).png().toBuffer()
const fav32 = await sharp(iconSvg).resize(32, 32).png().toBuffer()
writeFileSync(resolve(publicDir, 'favicon-16.png'), fav16)
writeFileSync(resolve(publicDir, 'favicon-32.png'), fav32)
writeFileSync(resolve(publicDir, 'favicon.ico'), await toIco([fav16, fav32]))

console.log('Icons written to', iconsDir)
console.log('Favicon written to', publicDir)
