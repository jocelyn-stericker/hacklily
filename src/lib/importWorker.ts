// Web worker to process an audio file import
onmessage = async ({
  data: { mono, fileSampleRate, wasmBytes },
}: MessageEvent<{
  mono: Float32Array
  fileSampleRate: number
  wasmBytes: ArrayBuffer
}>) => {
  try {
    const { analyzeBuffer } = await import('#/lib/analysis')
    console.time('import: analyzeBuffer')
    const messages = await analyzeBuffer(mono, fileSampleRate, wasmBytes)
    console.timeEnd('import: analyzeBuffer')
    postMessage({ ok: messages })
  } catch (err) {
    postMessage({
      error: String(`Error: ${err}`),
    })
  }
}
