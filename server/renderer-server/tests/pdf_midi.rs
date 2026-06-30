#![warn(clippy::all)]

extern crate renderer_lib;

mod util;

use self::util::run_test;
use renderer_lib::request::{Backend, Request, Version};

/// Decodes a base64-encoded string into bytes (matches render-impl.bash's
/// `cat | base64` encoding for non-SVG backends). Tolerates whitespace/newlines
/// that base64 wrapping may introduce.
fn decode_base64(s: &str) -> Vec<u8> {
    let stripped: String = s.chars().filter(|c| !c.is_whitespace()).collect();
    // Use a forgiving base64 decode rather than pulling a crate into the lib's
    // dependency tree — the tests already link serde_json and std. A minimal
    // RFC 4648 decoder suffices for our assertion (we only check magic bytes).
    fn val(c: u8) -> Option<u8> {
        match c {
            b'A'..=b'Z' => Some(c - b'A'),
            b'a'..=b'z' => Some(c - b'a' + 26),
            b'0'..=b'9' => Some(c - b'0' + 52),
            b'+' => Some(62),
            b'/' => Some(63),
            b'=' => Some(0),
            _ => None,
        }
    }
    let bytes = stripped.into_bytes();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    let mut buf: u32 = 0;
    let mut bits: u32 = 0;
    for &c in &bytes {
        let v = match val(c) {
            Some(v) => v,
            None => continue,
        };
        buf = (buf << 6) | (v as u32);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((buf >> bits) as u8);
        }
    }
    out
}

fn get_request(id: &str, backend: Backend, version: Version) -> Request {
    Request {
        id: id.to_owned(),
        backend,
        version,
        src: include_str!("ly/simple_midi.ly").to_owned(),
    }
}

#[test]
fn pdf_stable() {
    let res = run_test(vec![get_request("pdf-s", Backend::Pdf, Version::Stable)]);
    let r = res
        .get("pdf-s")
        .unwrap_or_else(|| panic!("no pdf-s response"));

    // The render server emits a {files:[...], logs, midi} response. A
    // successful PDF render yields exactly one PDF file (base64). The logs
    // must contain the canary line the harness already checks; we assert
    // it explicitly here so a regression surfaces as a clear test failure
    // rather than an opaque canary-died error.
    assert!(
        r.logs.contains("Processing `/tmp/lyp/wrappers/hacklily.ly'"),
        "stable PDF logs missing canary; logs were: {}",
        r.logs
    );
    assert!(
        !r.files.is_empty(),
        "stable PDF returned no files; logs: {}",
        r.logs
    );
    let pdf = &r.files[0];
    assert!(!pdf.is_empty(), "stable PDF file payload is empty");
    let bytes = decode_base64(pdf);
    assert!(
        bytes.starts_with(b"%PDF"),
        "stable PDF payload does not start with %%PDF magic; first bytes: {:?}",
        bytes.get(..8).unwrap_or(&[])
    );
}

#[test]
fn pdf_unstable() {
    let res = run_test(vec![get_request("pdf-u", Backend::Pdf, Version::Unstable)]);
    let r = res
        .get("pdf-u")
        .unwrap_or_else(|| panic!("no pdf-u response"));

    assert!(
        r.logs.contains("Processing `/tmp/lyp/wrappers/hacklily.ly'"),
        "unstable PDF logs missing canary; logs were: {}",
        r.logs
    );
    assert!(
        !r.files.is_empty(),
        "unstable PDF returned no files; logs: {}",
        r.logs
    );
    let bytes = decode_base64(&r.files[0]);
    assert!(
        bytes.starts_with(b"%PDF"),
        "unstable PDF payload does not start with %%PDF magic; first bytes: {:?}",
        bytes.get(..8).unwrap_or(&[])
    );
}

#[test]
fn midi_stable() {
    let res = run_test(vec![get_request("midi-s", Backend::Svg, Version::Stable)]);
    let r = res
        .get("midi-s")
        .unwrap_or_else(|| panic!("no midi-s response"));

    // simple_midi.ly includes a \midi block, so the backend should emit a
    // base64-encoded MIDI file. We assert on the MThd magic rather than a
    // byte-exact fixture so the test survives minor LilyPond output drift.
    assert!(
        r.logs.contains("Processing `/tmp/lyp/wrappers/hacklily.ly'"),
        "stable MIDI render logs missing canary; logs were: {}",
        r.logs
    );
    assert!(
        !r.midi.is_empty(),
        "stable render returned empty midi; logs: {}",
        r.logs
    );
    let bytes = decode_base64(&r.midi);
    assert!(
        bytes.starts_with(b"MThd"),
        "stable MIDI payload does not start with MThd magic; first bytes: {:?}",
        bytes.get(..8).unwrap_or(&[])
    );
}

#[test]
fn midi_unstable() {
    let res = run_test(vec![get_request("midi-u", Backend::Svg, Version::Unstable)]);
    let r = res
        .get("midi-u")
        .unwrap_or_else(|| panic!("no midi-u response"));

    assert!(
        r.logs.contains("Processing `/tmp/lyp/wrappers/hacklily.ly'"),
        "unstable MIDI render logs missing canary; logs were: {}",
        r.logs
    );
    assert!(
        !r.midi.is_empty(),
        "unstable render returned empty midi; logs: {}",
        r.logs
    );
    let bytes = decode_base64(&r.midi);
    assert!(
        bytes.starts_with(b"MThd"),
        "unstable MIDI payload does not start with MThd magic; first bytes: {:?}",
        bytes.get(..8).unwrap_or(&[])
    );
}