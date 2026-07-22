import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { textToIPA } from "../dist/esm/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

function stripStress(ipa) {
  return ipa.replace(/[ˈˌ]/g, "")
}

function normalize(ipa) {
  return ipa.replace(/\n/g, " ")
}

async function main() {
  const corpusPath = resolve(__dirname, "golden-corpus.ndjson")
  const raw = readFileSync(corpusPath, "utf8").trim().split("\n")
  const entries = raw.map((l) => JSON.parse(l))

  const enEntries = entries.filter((e) => e.lang === "en")

  console.log(`English entries: ${enEntries.length}`)

  let exact = 0
  let stressDiff = 0
  let sepDiff = 0
  let realFail = 0

  for (let i = 0; i < enEntries.length; i++) {
    const { text, ipa: expected } = enEntries[i]
    const result = await textToIPA(text, { voice: "en" })

    if (result === expected) {
      exact++
    } else if (stripStress(result) === stripStress(expected)) {
      stressDiff++
    } else if (normalize(result) === normalize(expected)) {
      sepDiff++
    } else if (stripStress(normalize(result)) === stripStress(normalize(expected))) {
      stressDiff++
    } else {
      realFail++
      if (realFail <= 15) {
        console.log(`  FAIL #${i}: ${JSON.stringify(text)} → ${JSON.stringify(result)} (exp ${JSON.stringify(expected)})`)
      }
    }
  }

  console.log(`  Exact:         ${exact}`)
  console.log(`  Stress diff:   ${stressDiff}`)
  console.log(`  Separator diff: ${sepDiff}`)
  console.log(`  Real fail:     ${realFail}`)

  if (realFail > 0) {
    console.log(`\n${realFail} real phoneme mismatches (expected WASM caveats)`)
  } else {
    console.log("\nAll golden corpus entries matched!")
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
