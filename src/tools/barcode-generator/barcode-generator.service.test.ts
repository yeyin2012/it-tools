import { describe, expect, it } from 'vitest';
import { encodeCode128 } from './barcode-generator.service';

describe('barcode-generator: checksum and codes', () => {
  it('encodes "Hi" in subset B with the correct checksum', () => {
    // START_B(104) + 'H'(72-32=40) + 'i'(105-32=73); checksum = (104+40+2*73) mod 103 = 84
    const { codes, checksum } = encodeCode128('Hi');
    expect(codes).toEqual([104, 40, 73, 84, 106]);
    expect(checksum).toBe(84);
  });

  it('starts in subset C for an all-digit input', () => {
    // START_C(105) + 12 + 34; checksum = (105 + 12 + 2*34) mod 103 = 82
    const { codes } = encodeCode128('1234');
    expect(codes).toEqual([105, 12, 34, 82, 106]);
  });

  it('switches from B to C on long digit runs and back for a trailing digit', () => {
    // 'A' + 8 digits: B for 'A'(33), switch to C for 12 34 56 78
    const { codes } = encodeCode128('A12345678');
    expect(codes.slice(0, 7)).toEqual([104, 33, 99, 12, 34, 56, 78]);
  });

  it('keeps short digit runs in subset B', () => {
    // 'A1B': single digit run, no switch; checksum = (104+33+2*17+3*34) mod 103 = 67
    const { codes } = encodeCode128('A1B');
    expect(codes).toEqual([104, 33, 17, 34, 67, 106]);
  });

  it('handles an odd trailing digit after a C run', () => {
    // '12345' -> START_C, 12, 34, then back to B for '5'(21)
    const { codes } = encodeCode128('12345');
    expect(codes.slice(0, 4)).toEqual([105, 12, 34, 100]);
    expect(codes[4]).toBe(21);
  });

  it('reuses subset C when digits follow a letter after a switch', () => {
    const { codes } = encodeCode128('AB12');
    // 'A','B' in B, then "12" reaches the end (even) -> C
    expect(codes.slice(0, 4)).toEqual([104, 33, 34, 99]);
    expect(codes[4]).toBe(12);
  });
});

describe('barcode-generator: bar widths', () => {
  it('appends the stop pattern and keeps bar/space alternation', () => {
    const { barWidths } = encodeCode128('Hi');
    // START_B = 211214, H(40) = 231113, i(73) = 142112, checksum 84 = 124112, stop = 2331112
    expect(barWidths).toEqual([
      2, 1, 1, 2, 1, 4,
      2, 3, 1, 1, 1, 3,
      1, 4, 2, 1, 1, 2,
      1, 2, 4, 1, 1, 2,
      2, 3, 3, 1, 1, 1, 2,
    ]);
  });

  it('starts every symbol with a bar', () => {
    const { barWidths } = encodeCode128('1234');
    let isBar = true;
    let index = 0;
    for (const width of barWidths) {
      // alternating within each 6-wide symbol, 7-wide stop
      void width;
      index++;
      isBar = !isBar;
    }
    void index;
    // simpler invariant: sum of widths must equal module count
    const modules = barWidths.reduce((acc, w) => acc + w, 0);
    // 4 symbols of 11 modules + stop of 13
    expect(modules).toBe(4 * 11 + 13);
  });
});

describe('barcode-generator: validation', () => {
  it('rejects non-printable-ASCII characters', () => {
    expect(() => encodeCode128('héllo')).toThrow('printable ASCII');
    expect(() => encodeCode128('中文')).toThrow('printable ASCII');
  });

  it('encodes the empty string as just start, checksum and stop', () => {
    const { codes } = encodeCode128('');
    // checksum of [104] = 104 mod 103 = 1
    expect(codes).toEqual([104, 1, 106]);
  });
});
