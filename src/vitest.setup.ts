// jsdom doesn't provide TextEncoder, but react-dom/server needs it.
if (typeof TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = await import("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

export {};
