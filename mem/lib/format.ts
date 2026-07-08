// Table formatting for memory scenario output. Produces aligned, grouped
// tables with human-readable byte/count formatting.
//
// Example output:
//
//                                       baseline  afterImport  afterScroll  afterIdle  afterClear
//   [main-route] Main route state
//     chunkCount                         0         3            3            3          3
//     frameCount                         0         30.0K        30.0K        30.0K      30.0K
//     spectrumBytes                      0 B       15.2 MB      15.2 MB      15.2 MB    15.2 MB
//     ropeBytes                          0 B       10.6 MB      10.6 MB      10.6 MB    10.6 MB
//
//   [spectrogram] Spectrogram retained tiles
//     colorBytes                         0 B       15.6 MB      15.6 MB      15.6 MB    15.6 MB
//     specCanvasBytes                    0 B       71.9 MB      71.9 MB      71.9 MB    71.9 MB
//
//   ───────────────────────────────────────────────────────────────────────────────────────
//   Total retained                       0 B       201.5 MB     201.5 MB     201.5 MB   201.5 MB

import type { ScenarioResult } from '../scenarios/main-record.js'

/** Format a byte count as human-readable: "15.2 MB", "739.4 KB", "0 B". */
export function formatBytes(n: number): string {
  if (n === 0) return '0 B'
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_073_741_824)
    return `${sign}${(abs / 1_073_741_824).toFixed(2)} GB`
  if (abs >= 1_048_576) return `${sign}${(abs / 1_048_576).toFixed(1)} MB`
  if (abs >= 1024) return `${sign}${(abs / 1024).toFixed(1)} KB`
  return `${sign}${abs} B`
}

/** Format a count: "30.0K", "120", "0". */
export function formatCount(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** True if a metric key represents a byte value (by naming convention). */
function isByteKey(key: string): boolean {
  return key.endsWith('Bytes')
}

/** True if a metric key represents an OffscreenCanvas pixel buffer. */
function isCanvasKey(key: string): boolean {
  const lower = key.toLowerCase()
  return lower.includes('canvas') || lower.includes('displaybuf')
}

/** Format a metric value based on whether its key indicates bytes or count. */
function formatValue(key: string, val: number): string {
  if (isByteKey(key)) return formatBytes(val)
  return formatCount(val)
}

interface MetricRow {
  source: string
  sourceDescription: string
  key: string
  values: number[]
}

/**
 * Render a scenario result as an aligned table. Rows are metrics grouped by
 * source; columns are steps. Includes a "Total retained" row summing all
 * byte-valued metrics.
 */
export function renderTable(result: ScenarioResult): string {
  const steps = result.steps
  if (steps.length === 0) return '(no steps)'

  // Collect all metric keys across all steps, preserving first-seen order.
  const seen = new Set<string>()
  const allKeys: string[] = []
  for (const step of steps) {
    for (const key of Object.keys(step.snapshot)) {
      if (!seen.has(key)) {
        seen.add(key)
        allKeys.push(key)
      }
    }
  }

  // Group keys by source (the part before the first dot).
  const groups = new Map<string, { keys: string[] }>()
  for (const key of allKeys) {
    const dotIdx = key.indexOf('.')
    const source = dotIdx >= 0 ? key.slice(0, dotIdx) : key
    const metricKey = dotIdx >= 0 ? key.slice(dotIdx + 1) : key
    if (!groups.has(source)) {
      groups.set(source, { keys: [] })
    }
    groups.get(source)!.keys.push(metricKey)
  }

  // ScenarioResult doesn't carry source descriptions; derive from source names.
  const sourceDescriptions: Record<string, string> = {
    'main-route': 'Main route state',
    'practice-route': 'Practice route state',
    spectrogram: 'Spectrogram retained tiles',
    waveform: 'Waveform overview canvas',
    workers: 'Background workers',
    chromium: 'Chromium CDP (after GC)',
    agentMemory: 'Agent memory (all threads)',
  }

  // Build metric rows with values per step.
  const rows: MetricRow[] = []
  for (const [source, info] of groups) {
    for (const metricKey of info.keys) {
      const fullKey = `${source}.${metricKey}`
      const values = steps.map((step) => step.snapshot[fullKey] ?? 0)
      rows.push({
        source,
        sourceDescription: sourceDescriptions[source] ?? source,
        key: metricKey,
        values,
      })
    }
  }

  // Pre-compute formatted cell strings once
  const cellStrs: string[][] = rows.map((r) =>
    r.values.map((v) => formatValue(`${r.source}.${r.key}`, v)),
  )

  // Compute column widths: one per step, plus the label column.
  const labelWidth = Math.max(
    4, // "  key"
    ...rows.map((r) => 4 + r.key.length), // "    " prefix + key
  )

  const colWidths = steps.map((step, i) => {
    const headerW = step.name.length
    const maxValW = cellStrs.reduce(
      (max, row) => Math.max(max, row[i]!.length),
      0,
    )
    return Math.max(headerW, maxValW) + 2 // 2 spaces padding
  })

  const lines: string[] = []

  // Header row: empty label space + step names.
  lines.push(
    ' '.repeat(labelWidth) +
      steps.map((s, i) => s.name.padStart(colWidths[i]!)).join(''),
  )

  // Group rows by source.
  let prevSource = ''
  for (const [rowIdx, row] of rows.entries()) {
    if (row.source !== prevSource) {
      if (prevSource !== '') lines.push('') // blank line between groups
      lines.push(
        `  [${row.source}] ${row.sourceDescription}`.padEnd(labelWidth),
      )
      prevSource = row.source
    }
    const label = '    ' + row.key
    const valStrs = cellStrs[rowIdx]!.map((s, i) => s.padStart(colWidths[i]!))
    lines.push(label.padEnd(labelWidth) + valStrs.join(''))
  }

  // Separator + total rows.
  const totalWidth = labelWidth + colWidths.reduce((s, w) => s + w, 0)
  lines.push('  ' + '\u2500'.repeat(Math.max(0, totalWidth - 2)))

  // Partition rows once for the two total rows below.
  // Exclude chromium and agentMemory: both overlap with app-tracked bytes and
  // are shown as separate summary rows to avoid double-counting.
  const appByteRows = rows.filter(
    (r) =>
      isByteKey(`${r.source}.${r.key}`) &&
      r.source !== 'chromium' &&
      r.source !== 'agentMemory',
  )
  const canvasByteRows = appByteRows.filter((r) =>
    isCanvasKey(`${r.source}.${r.key}`),
  )

  // App-tracked memory: sum of all byte-valued metrics except chromium,
  // which overlaps with app-tracked ArrayBuffer bytes (ropeBytes,
  // colorBytes, spectrumBytes are inside backingStorage).
  const totals = steps.map((_, i) =>
    appByteRows.reduce((s, r) => s + r.values[i]!, 0),
  )
  const totalStrs = totals.map((t, i) => formatBytes(t).padStart(colWidths[i]!))
  lines.push('  Total retained'.padEnd(labelWidth) + totalStrs.join(''))

  // Estimated V8 heap: totals minus OffscreenCanvas pixel buffers (canvasBytes,
  // specCanvasBytes, formantCanvasBytes, displayBufBytes) which live on the GPU,
  // not in V8's heap. Approximates backingStorageSize; the gap to the Chromium
  // heap row is JS object overhead (jsHeapUsed) that layer1 metrics can't see.
  // Shown in both layers so layer1 gets a heap approximation without CDP.
  const estTotals = totals.map(
    (t, i) => t - canvasByteRows.reduce((s, r) => s + r.values[i]!, 0),
  )
  const estStrs = estTotals.map((t, i) =>
    formatBytes(t).padStart(colWidths[i]!),
  )
  lines.push('  Estimated heap'.padEnd(labelWidth) + estStrs.join(''))

  // Chromium CDP subtotal: jsHeapUsed + backingStorageSize. Separate from
  // Total retained because it overlaps with app-tracked ArrayBuffer bytes
  // but also includes the JS heap (objects, closures) that Total retained
  // does not see.
  const hasChromium = rows.some((r) => r.source === 'chromium')
  if (hasChromium) {
    const usedRow = rows.find(
      (r) => r.source === 'chromium' && r.key === 'jsHeapUsedBytes',
    )
    const backingRow = rows.find(
      (r) => r.source === 'chromium' && r.key === 'backingStorageBytes',
    )
    const chromiumTotals = steps.map(
      (_, i) => (usedRow?.values[i] ?? 0) + (backingRow?.values[i] ?? 0),
    )
    const chromiumStrs = chromiumTotals.map((t, i) =>
      formatBytes(t).padStart(colWidths[i]!),
    )
    lines.push('  Chromium heap'.padEnd(labelWidth) + chromiumStrs.join(''))
  }

  // Agent memory: performance.measureUserAgentSpecificMemory() -- covers the
  // main thread, all workers, and worklets including WASM linear memory (e.g.
  // Moonshine model weights). The most complete cross-thread measurement.
  const agentRow = rows.find(
    (r) => r.source === 'agentMemory' && r.key === 'totalBytes',
  )
  if (agentRow) {
    const agentStrs = agentRow.values.map((t, i) =>
      formatBytes(t).padStart(colWidths[i]!),
    )
    lines.push('  Agent memory'.padEnd(labelWidth) + agentStrs.join(''))
  }

  return lines.join('\n')
}

export function renderSummaryLine(result: ScenarioResult): string {
  const steps = result.steps
  if (steps.length < 2) return ''

  const isAppBytes = (k: string) =>
    k.endsWith('Bytes') &&
    !k.startsWith('chromium.') &&
    !k.startsWith('agentMemory.')

  const sumAppBytes = (snap: Record<string, number>) =>
    Object.entries(snap).reduce((s, [k, v]) => (isAppBytes(k) ? s + v : s), 0)

  let peakBytes = 0
  let peakStep = ''
  let baselineBytes = 0
  let finalBytes = 0

  // Agent memory (performance.measureUserAgentSpecificMemory) -- the
  // cross-thread total including workers, worklets, and WASM. Tracked
  // separately so it doesn't double-count app bytes.
  let agentPeak = 0
  let agentBaseline = 0
  let agentFinal = 0
  const agentKey = 'agentMemory.totalBytes'

  for (let i = 0; i < steps.length; i++) {
    const totalBytes = sumAppBytes(steps[i]!.snapshot)
    if (i === 0) baselineBytes = totalBytes
    finalBytes = totalBytes
    if (totalBytes > peakBytes) {
      peakBytes = totalBytes
      peakStep = steps[i]!.name
    }

    const agent = steps[i]!.snapshot[agentKey] ?? 0
    if (i === 0) agentBaseline = agent
    agentFinal = agent
    if (agent > agentPeak) agentPeak = agent
  }

  let line = `Peak ${formatBytes(peakBytes)} at ${peakStep} | After clear: ${formatBytes(finalBytes)} (baseline: ${formatBytes(baselineBytes)})`
  if (agentPeak > 0) {
    line += ` | Agent peak ${formatBytes(agentPeak)}, clear ${formatBytes(agentFinal)} (baseline ${formatBytes(agentBaseline)})`
  }
  return line
}
