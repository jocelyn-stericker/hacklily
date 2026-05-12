// Web worker to process an audio file import
onmessage = async ({
  data: { mono, fileSampleRate },
}: MessageEvent<{ mono: Float32Array; fileSampleRate: number }>) => {
  try {
    const { analyzeBuffer } = await import('#/lib/analysis')
    console.time('import: analyzeBuffer')
    const messages = analyzeBuffer(mono, fileSampleRate)
    console.timeEnd('import: analyzeBuffer')
    postMessage({ ok: messages })
  } catch (err) {
    postMessage({
      error: String(`Error: ${err}`),
    })
  }
}
