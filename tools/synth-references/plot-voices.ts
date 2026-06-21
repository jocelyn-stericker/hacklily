// Plot F0 (pitch) vs avg(F1,F2) (a coarse resonance proxy) for the English
// Kokoro voices, from the medians measured by measure-voices.ts. Writes an SVG
// scatter and prints an ASCII one. Run: npx tsx plot-voices.ts

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

type V = {
  id: string
  f0: number
  f1: number
  f2: number
  g: 'F' | 'M'
  a: 'US' | 'GB'
  grade: string
}

// medians from measure-voices.ts
const DATA: V[] = [
  { id: 'am_onyx', f0: 83, f1: 424, f2: 1420, g: 'M', a: 'US', grade: 'D' },
  { id: 'am_echo', f0: 100, f1: 452, f2: 1485, g: 'M', a: 'US', grade: 'D' },
  { id: 'bm_lewis', f0: 101, f1: 527, f2: 1836, g: 'M', a: 'GB', grade: 'D+' },
  {
    id: 'am_michael',
    f0: 110,
    f1: 650,
    f2: 1933,
    g: 'M',
    a: 'US',
    grade: 'C+',
  },
  { id: 'am_puck', f0: 112, f1: 429, f2: 1697, g: 'M', a: 'US', grade: 'C+' },
  { id: 'bm_fable', f0: 113, f1: 492, f2: 1685, g: 'M', a: 'GB', grade: 'C' },
  { id: 'am_adam', f0: 115, f1: 531, f2: 1756, g: 'M', a: 'US', grade: 'F+' },
  { id: 'am_liam', f0: 116, f1: 496, f2: 1775, g: 'M', a: 'US', grade: 'D' },
  { id: 'bm_daniel', f0: 121, f1: 471, f2: 1638, g: 'M', a: 'GB', grade: 'D' },
  { id: 'af_alloy', f0: 137, f1: 447, f2: 1678, g: 'F', a: 'US', grade: 'C' },
  { id: 'am_fenrir', f0: 137, f1: 444, f2: 1662, g: 'M', a: 'US', grade: 'C+' },
  { id: 'bm_george', f0: 140, f1: 448, f2: 2185, g: 'M', a: 'GB', grade: 'C' },
  { id: 'af_nicole', f0: 141, f1: 650, f2: 1830, g: 'F', a: 'US', grade: 'B-' },
  { id: 'am_eric', f0: 152, f1: 394, f2: 1635, g: 'M', a: 'US', grade: 'D' },
  { id: 'af_kore', f0: 156, f1: 429, f2: 1734, g: 'F', a: 'US', grade: 'C+' },
  { id: 'af_nova', f0: 156, f1: 628, f2: 1809, g: 'F', a: 'US', grade: 'C' },
  { id: 'am_santa', f0: 161, f1: 481, f2: 1490, g: 'M', a: 'US', grade: 'D-' },
  { id: 'af_sky', f0: 164, f1: 537, f2: 1914, g: 'F', a: 'US', grade: 'C-' },
  { id: 'af_sarah', f0: 177, f1: 548, f2: 1933, g: 'F', a: 'US', grade: 'C+' },
  { id: 'af_river', f0: 178, f1: 558, f2: 1693, g: 'F', a: 'US', grade: 'D' },
  { id: 'bf_emma', f0: 180, f1: 474, f2: 1805, g: 'F', a: 'GB', grade: 'B-' },
  { id: 'bf_lily', f0: 180, f1: 546, f2: 1810, g: 'F', a: 'GB', grade: 'D' },
  { id: 'af_aoede', f0: 184, f1: 492, f2: 1817, g: 'F', a: 'US', grade: 'C+' },
  { id: 'af_heart', f0: 194, f1: 594, f2: 1975, g: 'F', a: 'US', grade: 'A' },
  { id: 'af_bella', f0: 196, f1: 509, f2: 1996, g: 'F', a: 'US', grade: 'A-' },
  {
    id: 'bf_isabella',
    f0: 202,
    f1: 499,
    f2: 1963,
    g: 'F',
    a: 'GB',
    grade: 'C',
  },
  { id: 'af_jessica', f0: 205, f1: 559, f2: 1663, g: 'F', a: 'US', grade: 'D' },
  { id: 'bf_alice', f0: 212, f1: 506, f2: 1776, g: 'F', a: 'GB', grade: 'D' },
]

// Voices under consideration to ship (highlighted).
const SELECTED = new Set([
  'am_onyx',
  'am_michael',
  'am_fenrir',
  'bm_george',
  'af_kore',
  'af_sarah',
  'bf_emma',
  'af_heart',
])

const res = (v: V) => v.f1
const xMin = 380
const xMax = 670
const yMin = 80
const yMax = 215

// ---- ASCII scatter ----
function ascii() {
  const W = 64
  const H = 30
  const grid: string[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => ' '),
  )
  const col = (x: number) => Math.round(((x - xMin) / (xMax - xMin)) * (W - 1))
  const row = (y: number) => Math.round(((yMax - y) / (yMax - yMin)) * (H - 1))

  const sorted = [...DATA].sort((a, b) => a.f0 - b.f0)
  const legend: string[] = []
  sorted.forEach((v, i) => {
    const n = String(i + 1)
    const r = row(v.f0)
    const c = Math.min(W - n.length, col(res(v)))
    for (let k = 0; k < n.length; k++) grid[r]![c + k] = n[k]!
    const star = SELECTED.has(v.id) ? '★' : ' '
    legend.push(
      `${star}${n.padStart(2)}. ${v.id.padEnd(12)} F0 ${String(v.f0).padStart(3)}  F1 ${Math.round(res(v))}  (${v.grade})`,
    )
  })

  const out: string[] = []
  out.push('  F0 (Hz)')
  for (let r = 0; r < H; r++) {
    const yVal = Math.round(yMax - (r / (H - 1)) * (yMax - yMin))
    const axis = r % 4 === 0 ? String(yVal).padStart(4) : '    '
    out.push(`${axis} |${grid[r]!.join('')}`)
  }
  out.push(`     +${'-'.repeat(W)}`)
  const xlabel = `${xMin}${' '.repeat(W - 8)}${xMax}`
  out.push(`      ${xlabel}`)
  out.push(`      F1 (Hz) — resonance →   ★ = candidate set`)
  out.push('')
  // two-column legend
  const half = Math.ceil(legend.length / 2)
  for (let i = 0; i < half; i++) {
    const left = legend[i] ?? ''
    const right = legend[i + half] ?? ''
    out.push(`${left.padEnd(46)}${right}`)
  }
  return out.join('\n')
}

// ---- SVG scatter ----
function svg() {
  const w = 860
  const h = 620
  const m = { l: 70, r: 220, t: 50, b: 60 }
  const px = (x: number) => m.l + ((x - xMin) / (xMax - xMin)) * (w - m.l - m.r)
  const py = (y: number) => m.t + ((yMax - y) / (yMax - yMin)) * (h - m.t - m.b)
  const color = (v: V) =>
    v.g === 'F'
      ? v.a === 'US'
        ? '#e2436a'
        : '#c026d3'
      : v.a === 'US'
        ? '#2563eb'
        : '#0d9488'

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="sans-serif">`,
  )
  parts.push(`<rect width="${w}" height="${h}" fill="white"/>`)
  parts.push(
    `<text x="${w / 2}" y="28" text-anchor="middle" font-size="18" font-weight="bold">Kokoro English voices — pitch vs resonance</text>`,
  )
  // gridlines + Y ticks (F0)
  for (let y = 80; y <= 210; y += 20) {
    parts.push(
      `<line x1="${m.l}" y1="${py(y)}" x2="${w - m.r}" y2="${py(y)}" stroke="#eee"/>`,
    )
    parts.push(
      `<text x="${m.l - 8}" y="${py(y) + 4}" text-anchor="end" font-size="11" fill="#666">${y}</text>`,
    )
  }
  // X ticks (resonance)
  for (let x = 400; x <= 650; x += 50) {
    parts.push(
      `<line x1="${px(x)}" y1="${m.t}" x2="${px(x)}" y2="${h - m.b}" stroke="#eee"/>`,
    )
    parts.push(
      `<text x="${px(x)}" y="${h - m.b + 18}" text-anchor="middle" font-size="11" fill="#666">${x}</text>`,
    )
  }
  parts.push(
    `<text x="${(m.l + w - m.r) / 2}" y="${h - 16}" text-anchor="middle" font-size="13">F1 — resonance (Hz) →</text>`,
  )
  parts.push(
    `<text x="18" y="${(m.t + h - m.b) / 2}" text-anchor="middle" font-size="13" transform="rotate(-90 18 ${(m.t + h - m.b) / 2})">F0 — pitch (Hz) →</text>`,
  )

  for (const v of DATA) {
    const sel = SELECTED.has(v.id)
    const cx = px(res(v))
    const cy = py(v.f0)
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${sel ? 7 : 4.5}" fill="${color(v)}" ${sel ? 'stroke="black" stroke-width="2"' : 'opacity="0.5"'}/>`,
    )
    parts.push(
      `<text x="${cx + 9}" y="${cy + 4}" font-size="10" ${sel ? 'font-weight="bold"' : 'fill="#777"'}>${v.id.replace(/^[ab][fm]_/, '')}</text>`,
    )
  }
  // legend
  const lx = w - m.r + 20
  let ly = m.t + 10
  const swatches: [string, string][] = [
    ['US female', '#e2436a'],
    ['GB female', '#c026d3'],
    ['US male', '#2563eb'],
    ['GB male', '#0d9488'],
  ]
  for (const [lab, c] of swatches) {
    parts.push(`<circle cx="${lx}" cy="${ly - 4}" r="5" fill="${c}"/>`)
    parts.push(`<text x="${lx + 12}" y="${ly}" font-size="12">${lab}</text>`)
    ly += 20
  }
  ly += 6
  parts.push(
    `<circle cx="${lx}" cy="${ly - 4}" r="6" fill="#999" stroke="black" stroke-width="2"/>`,
  )
  parts.push(
    `<text x="${lx + 12}" y="${ly}" font-size="12">candidate set</text>`,
  )
  parts.push('</svg>')
  return parts.join('\n')
}

const outPath = join(import.meta.dirname, '..', '..', 'voices-scatter.svg')
writeFileSync(outPath, svg())
console.log(ascii())
console.log(`\nSVG written to ${outPath}`)
