// jsdom doesn't provide XSLTProcessor or TextEncoder, but
// musicxml-interfaces and react-dom/server need them.
if (typeof XSLTProcessor === "undefined") {
  global.XSLTProcessor = class XSLTProcessor {
    importStylesheet(_style) {}
    transformToFragment(_source, _doc) { return _doc.createDocumentFragment(); }
    transformToDocument(_source) { return document.implementation.createDocument(null, "", null); }
    reset() {}
    setParameter(_ns, _name, _value) {}
    getParameter(_ns, _name) { return null; }
    removeParameter(_ns, _name) {}
    clearParameters() {}
  };
}
if (typeof TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
