import type { Compression } from "./types.js"

export interface TarEntry {
  name: string
  data: Uint8Array
}

/**
 * Decompress gzip via DecompressionStream (Node 18+, modern browsers).
 *
 * Source bytes are fed through `Blob.stream()` and the decompressed side is
 * collected with `Response.arrayBuffer()`. Both sides are pumped concurrently,
 * which avoids the backpressure deadlock you hit if you write+close the
 * writable end before reading the readable end of a TransformStream.
 */
async function gunzip(bytes: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const src = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  // Copy into a fresh ArrayBuffer so Blob accepts it regardless of whether the
  // input view is backed by a SharedArrayBuffer (which BlobPart excludes).
  const part = new ArrayBuffer(src.byteLength)
  new Uint8Array(part).set(src)
  const stream = new Blob([part]).stream().pipeThrough(new DecompressionStream("gzip"))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

async function decompress(
  bytes: ArrayBuffer | Uint8Array,
  compression: Compression,
): Promise<Uint8Array> {
  if (compression === "gzip") return gunzip(bytes)
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}

function parseTar(buf: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = []
  let offset = 0

  while (offset + 512 <= buf.length) {
    const block = buf.subarray(offset, offset + 512)
    offset += 512

    if (block.every((b) => b === 0)) break

    let nameEnd = 100
    for (let i = 0; i < 100; i++) {
      if (block[i] === 0) { nameEnd = i; break }
    }
    const name = new TextDecoder().decode(block.subarray(0, nameEnd))
    if (!name) break

    const sizeStr = new TextDecoder().decode(block.subarray(124, 136)).trim()
    const size = parseInt(sizeStr, 8)
    if (isNaN(size)) break

    const raw = buf.subarray(offset, offset + size)
    offset += Math.ceil(size / 512) * 512

    if (name.endsWith("/")) continue
    entries.push({ name, data: new Uint8Array(raw) })
  }

  return entries
}

function writeTarToMEMFS(wasm: any, entries: TarEntry[]): void {
  const prefix = "espeak-ng-data/"
  const dirs = new Set<string>()

  for (const e of entries) {
    const rel = e.name.startsWith(prefix) ? e.name.slice(prefix.length) : e.name
    const parts = rel.split("/")
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"))
    }
  }

  const fs = wasm.FS
  fs.mkdir("/data")
  fs.mkdir("/data/espeak-ng-data")

  for (const d of [...dirs].sort()) {
    const parts = d.split("/")
    const stripped = parts[0] === "espeak-ng-data" ? parts.slice(1).join("/") : d
    if (stripped) {
      try { fs.mkdir("/data/espeak-ng-data/" + stripped) } catch { }
    }
  }

  for (const e of entries) {
    const name = e.name.startsWith(prefix)
      ? e.name.slice(prefix.length)
      : e.name
    fs.writeFile("/data/espeak-ng-data/" + name, e.data)
  }
}

export async function loadTarToMEMFS(
  wasm: any,
  archive: ArrayBuffer | Uint8Array,
  compression: Compression,
): Promise<void> {
  const raw = await decompress(archive, compression)
  const entries = parseTar(raw)
  writeTarToMEMFS(wasm, entries)
}
