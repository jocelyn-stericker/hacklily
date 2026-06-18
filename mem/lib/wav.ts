// Generate in-memory WAV files with realistic audio for memory testing.
// We want audio that exercises the full analysis pipeline (VAD, formants,
// spectrogram) — a mix of voiced-like content (harmonics) and silence.

export function generateWav(durationSec: number, sampleRate = 44100): Buffer {
  const numSamples = Math.floor(durationSec * sampleRate)
  const bytesPerSample = 2
  const blockAlign = 1 * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numSamples * bytesPerSample
  const bufferSize = 44 + dataSize

  const buf = Buffer.alloc(bufferSize)
  let offset = 0

  const writeStr = (s: string) => {
    buf.write(s, offset, 'ascii')
    offset += s.length
  }
  const writeU32 = (n: number) => {
    buf.writeUInt32LE(n, offset)
    offset += 4
  }
  const writeU16 = (n: number) => {
    buf.writeUInt16LE(n, offset)
    offset += 2
  }

  writeStr('RIFF')
  writeU32(bufferSize - 8)
  writeStr('WAVE')
  writeStr('fmt ')
  writeU32(16)
  writeU16(1) // PCM
  writeU16(1) // mono
  writeU32(sampleRate)
  writeU32(byteRate)
  writeU16(blockAlign)
  writeU16(16) // bits per sample
  writeStr('data')
  writeU32(dataSize)

  // Generate audio: alternating voiced-ish segments and silence.
  // A fundamental around 180 Hz with harmonics, modulated, with gaps.
  // This gives VAD something to detect and formants to track.
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const segPhase = (t % 1.6) / 1.6 // 1.6s cycle
    let sample = 0
    if (segPhase < 0.7) {
      // Voiced-ish: fundamental + harmonics, with vibrato
      const f0 = 180 + 10 * Math.sin(2 * Math.PI * 5 * t)
      const envelope = 0.5 * (1 - Math.cos((2 * Math.PI * segPhase) / 0.7))
      sample =
        envelope *
        (0.6 * Math.sin(2 * Math.PI * f0 * t) +
          0.3 * Math.sin(2 * Math.PI * 2 * f0 * t) +
          0.15 * Math.sin(2 * Math.PI * 3 * f0 * t) +
          0.08 * Math.sin(2 * Math.PI * 4 * f0 * t))
      // A little noise
      sample += envelope * 0.05 * (Math.random() * 2 - 1)
    }
    // else: silence

    // Soft clip
    sample = Math.tanh(sample)

    // 16-bit PCM
    const intSample = Math.max(
      -32768,
      Math.min(32767, Math.round(sample * 32767 * 0.8)),
    )
    buf.writeInt16LE(intSample, offset)
    offset += 2
  }

  return buf
}
