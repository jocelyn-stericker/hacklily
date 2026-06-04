import { readFileSync, statSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

const __dirname = dirname(fileURLToPath(import.meta.url))

const BUDGETS = {
  "wasm-js-gzip":   150, // KB — wasm + JS glue gzip'd
  "data-gzip":      150, // KB — compressed data asset (tar.gz)
  "total-gzip":     300, // KB — total shipped gzip'd
}

function gzipSize(path) {
  const raw = readFileSync(path)
  return gzipSync(raw).length
}

function kib(bytes) {
  return Math.round(bytes / 1024)
}

function main() {
  const pkgRoot = resolve(__dirname, "..")
  const wasmPath = resolve(pkgRoot, "espeak-phonemes.wasm")
  const jsPath   = resolve(pkgRoot, "espeak-phonemes.js")
  const dataPath = resolve(pkgRoot, "espeak-ng-data.tar.gz")

  // Check asset files exist
  for (const p of [wasmPath, jsPath, dataPath]) {
    try { statSync(p) } catch {
      console.error(`FAIL: asset not found: ${p}`)
      process.exit(1)
    }
  }

  const wasmGzip = gzipSize(wasmPath)
  const jsGzip   = gzipSize(jsPath)
  const dataRaw  = statSync(dataPath).size
  const codeGzip = wasmGzip + jsGzip
  const totalGzip = codeGzip + dataRaw // data is already gzip-compressed

  console.log("=== Size budget check ===")
  console.log(`  wasm (raw):         ${kib(statSync(wasmPath).size)} KB`)
  console.log(`  js glue (raw):      ${kib(statSync(jsPath).size)} KB`)
  console.log(`  wasm+js (gzip'd):   ${kib(codeGzip)} KB (budget: ${BUDGETS["wasm-js-gzip"]} KB)`)
  console.log(`  data (gzip):        ${kib(dataRaw)} KB (budget: ${BUDGETS["data-gzip"]} KB)`)
  console.log(`  total (gzip'd):     ${kib(totalGzip)} KB (budget: ${BUDGETS["total-gzip"]} KB)`)

  let failed = false

  if (codeGzip > BUDGETS["wasm-js-gzip"] * 1024) {
    console.error(`FAIL: wasm+js gzip ${kib(codeGzip)} KB exceeds budget ${BUDGETS["wasm-js-gzip"]} KB`)
    failed = true
  } else {
    console.log(`  ✓ wasm+js gzip within budget`)
  }

  if (dataRaw > BUDGETS["data-gzip"] * 1024) {
    console.error(`FAIL: data gzip ${kib(dataRaw)} KB exceeds budget ${BUDGETS["data-gzip"]} KB`)
    failed = true
  } else {
    console.log(`  ✓ data gzip within budget`)
  }

  if (totalGzip > BUDGETS["total-gzip"] * 1024) {
    console.error(`FAIL: total gzip ${kib(totalGzip)} KB exceeds budget ${BUDGETS["total-gzip"]} KB`)
    failed = true
  } else {
    console.log(`  ✓ total gzip within budget`)
  }

  if (failed) {
    process.exit(1)
  }

  console.log("\n✓ All size budgets met.")
}

main()
