/*
Copyright (c) 2011, Daniel Guerrero
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL DANIEL GUERRERO BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Uses the new array typed in javascript to binary base64 encode/decode
 * at the moment just decodes a binary base64 encoded
 * into either an ArrayBuffer (decodeArrayBuffer)
 * or into an Uint8Array (decode)
 *
 * References:
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/ArrayBuffer
 * https://developer.mozilla.org/en/JavaScript_typed_arrays/Uint8Array
 */

const keyStr: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

/* will return a  Uint8Array type */
export function decodeArrayBuffer(input: string): ArrayBuffer {
  const bytes: number = (input.length / 4) * 3;
  const ab: ArrayBuffer = new ArrayBuffer(bytes);
  decode(input, ab);

  return ab;
}

export function removePaddingChars(input: string): string {
  const lkey: number = keyStr.indexOf(input.charAt(input.length - 1));
  if (lkey === 64) {
    return input.substring(0, input.length - 1);
  }

  return input;
}

export function decode(inputStr: string, arrayBuffer: ArrayBuffer): Uint8Array {

  // get last chars to see if are valid
  let input: string = inputStr;
  input = removePaddingChars(input);
  input = removePaddingChars(input);
  input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

  const bytes: number = parseInt(String((input.length / 4) * 3), 10);

  const uarray: Uint8Array = arrayBuffer ? new Uint8Array(arrayBuffer) : new Uint8Array(bytes);
  let chr1: number;
  let chr2: number;
  let chr3: number;
  let enc1: number;
  let enc2: number;
  let enc3: number;
  let enc4: number;
  let j: number = 0;

  for (let i: number = 0; i < bytes; i += 3) {
    // get the 3 octects in 4 ascii chars
    enc1 = keyStr.indexOf(input.charAt(j));
    j += 1;
    enc2 = keyStr.indexOf(input.charAt(j));
    j += 1;
    enc3 = keyStr.indexOf(input.charAt(j));
    j += 1;
    enc4 = keyStr.indexOf(input.charAt(j));
    j += 1;

    /* tslint:disable */
    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;
    /* tslint:enable */

    uarray[i] = chr1;
    if (enc3 !== 64) {
      uarray[i + 1] = chr2;
    }
    if (enc4 !== 64) {
      uarray[i + 2] = chr3;
    }
  }

  return uarray;
}
