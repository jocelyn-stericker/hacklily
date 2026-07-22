import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createESpeak, textToIPA } from "../dist/esm/index.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(__dirname, "..")

async function main() {
  // --- API 1: Low-level, caller provides assets (browser-compatible) ---
  const initWasm = (await import(resolve(pkgRoot, "espeak-phonemes.js"))).default
  const archive = readFileSync(resolve(pkgRoot, "espeak-ng-data.tar"))

  const engine = await createESpeak({
    moduleFactory: initWasm,
    data: { archive },
  })

  console.log("createESpeak → hello:", JSON.stringify(engine.textToIPA("hello")))
  console.log("createESpeak → world:", JSON.stringify(engine.textToIPA("world")))

  // --- API 2: Convenience wrapper (Node.js auto-resolve) ---
  const r1 = await textToIPA("hello")
  console.log("textToIPA → hello:", JSON.stringify(r1))

  const r2 = await textToIPA("hello", { voice: "en-us" })
  console.log("textToIPA → hello (en-us):", JSON.stringify(r2))

  const r3 = await textToIPA("hello", { keepStress: false })
  console.log("textToIPA → hello (no stress):", JSON.stringify(r3))

  const r4 = await textToIPA("Hello world, this is a test.")
  console.log("textToIPA → multi-clause:", JSON.stringify(r4))

  const r5 = await textToIPA("world")
  console.log("textToIPA → reuse:", JSON.stringify(r5))

  const r6 = await textToIPA("judge me", {sep: "|", keepStress: false})
  console.log("textToIPA → options:", JSON.stringify(r6))

  console.log("\nAll smoke tests passed!")
}

main().catch((err) => { console.error("FAILED:", err); process.exit(1) })
