/** Code 128 symbol widths, one entry per value 0..106: six alternating
 *  bar/space module counts (bar first); the stop symbol has seven. */
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_CODE_A = 103;
const START_CODE_B = 104;
const START_CODE_C = 105;
const CODE_TO_C = 99;
const CODE_TO_B = 100;
const STOP_VALUE = 106;

export interface EncodedCode128 {
  /** Symbol values including start, data, checksum and stop. */
  codes: number[]
  /** Alternating bar/space widths in modules, bar first (incl. stop). */
  barWidths: number[]
  checksum: number
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** Number of consecutive digits starting at index. */
function digitRunLength(text: string, index: number): number {
  let run = 0;
  while (index + run < text.length && isDigit(text[index + run]!)) {
    run++;
  }
  return run;
}

function checksumOf(codes: number[]): number {
  // called before the checksum/stop are appended: codes = [start, ...data]
  let sum = codes[0]!;
  for (let index = 1; index < codes.length; index++) {
    sum += index * codes[index]!;
  }
  return sum % 103;
}

/** Encode text into Code 128 using subset B for text and C for digit runs
 *  (a run is worth switching when it is at least 4 digits, or 2 that reach
 *  the end of the input). */
export function encodeCode128(text: string): EncodedCode128 {
  if (!/^[\x20-\x7E]*$/.test(text)) {
    throw new Error('Code 128 (B/C) supports printable ASCII characters only');
  }

  const codes: number[] = [];
  let inSubsetC = false;

  // Leading digit run long enough to start in subset C.
  if (text.length >= 2) {
    const run = digitRunLength(text, 0);
    if (run >= 4 || (run >= 2 && run === text.length)) {
      inSubsetC = true;
      codes.push(START_CODE_C);
    }
  }
  if (codes.length === 0) {
    codes.push(START_CODE_B);
  }

  let index = 0;
  while (index < text.length) {
    if (inSubsetC) {
      const remaining = text.length - index;
      const run = digitRunLength(text, index);
      if (!isDigit(text[index]!) || remaining === 1) {
        // Odd trailing digit or non-digit: back to subset B.
        codes.push(CODE_TO_B);
        inSubsetC = false;
        continue;
      }
      const pairs = Math.min(Math.floor(run / 2), Math.floor(remaining / 2));
      for (let pair = 0; pair < pairs; pair++) {
        codes.push(Number(text.slice(index + pair * 2, index + pair * 2 + 2)));
      }
      index += pairs * 2;
      if (pairs === 0) {
        codes.push(CODE_TO_B);
        inSubsetC = false;
      }
    }
    else {
      const run = digitRunLength(text, index);
      const reachesEnd = index + run === text.length;
      if (run >= 4 || (run >= 2 && reachesEnd && run % 2 === 0)) {
        codes.push(CODE_TO_C);
        inSubsetC = true;
        continue;
      }
      codes.push(text.charCodeAt(index) - 32);
      index++;
    }
  }

  codes.push(checksumOf(codes));
  codes.push(STOP_VALUE);

  const barWidths: number[] = [];
  for (const code of codes) {
    for (const width of CODE128_PATTERNS[code]!) {
      barWidths.push(Number(width));
    }
  }

  return { codes, barWidths, checksum: codes[codes.length - 2]! };
}
