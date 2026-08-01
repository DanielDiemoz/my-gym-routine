export const EASTER_EGG_USER_ID = "228d29e5-9b57-46ab-a654-c7c95416b2c1";

// Pixel font 3x5 — each char is 5 rows of 3 chars ("x" = on, "." = off)
const FONT: Record<string, string[]> = {
  D: ["xx.", "x.x", "x.x", "x.x", "xx."],
  O: ["xxx", "x.x", "x.x", "x.x", "xxx"],
  N: ["x.x", "xxx", "xxx", "xxx", "x.x"],
  "'": ["x..", "x..", "...", "...", "..."],
  T: ["xxx", ".x.", ".x.", ".x.", ".x."],
  S: ["xxx", "x..", "xxx", "..x", "xxx"],
  K: ["x.x", "xx.", "xx.", "x.x", "x.x"],
  I: ["xxx", ".x.", ".x.", ".x.", "xxx"],
  P: ["xxx", "x.x", "xxx", "x..", "x.."],
  L: ["x..", "x..", "x..", "x..", "xxx"],
  E: ["xxx", "x..", "xxx", "x..", "xxx"],
  G: ["xxx", "x..", "x.x", "x.x", "xxx"],
  A: ["xxx", "x.x", "xxx", "x.x", "x.x"],
  Y: ["x.x", "x.x", ".x.", ".x.", ".x."],
  " ": ["...", "...", "...", "...", "..."],
};

const COLS = 53;
const ROWS = 7;

/**
 * Convert text to a set of "col-row" keys for cells that should be lit.
 * Text is centered on the 53x7 grid.
 */
function textToCells(text: string): Set<string> {
  const cells = new Set<string>();
  const chars = text.toUpperCase().split("");

  // Measure total width
  let totalW = 0;
  for (const ch of chars) {
    const glyph = FONT[ch];
    totalW += glyph ? glyph[0].length : 3;
    totalW += 1; // gap
  }
  totalW -= 1; // no gap after last char

  const startCol = Math.floor((COLS - totalW) / 2);
  const startRow = 1; // rows 1-5 (leave row 0 and 6 empty)

  let col = startCol;
  for (const ch of chars) {
    const glyph = FONT[ch];
    if (!glyph) {
      col += 4;
      continue;
    }
    const w = glyph[0].length;
    for (let row = 0; row < 5; row++) {
      for (let px = 0; px < w; px++) {
        if (glyph[row][px] === "x") {
          cells.add(`${col + px}-${startRow + row}`);
        }
      }
    }
    col += w + 1;
  }

  return cells;
}

/**
 * Get the text to display for a given year.
 * 2026 → DON'T, 2025 → SKIP, 2024 → LEG DAY
 */
export function getEasterEggText(year: number): string {
  if (year === 2026) return "DON'T";
  if (year === 2025) return "SKIP";
  if (year === 2024) return "LEG DAY";
  return "";
}

/**
 * Get the set of lit cells for a given year's easter egg text.
 */
export function getEasterEggCells(year: number): Set<string> {
  const text = getEasterEggText(year);
  return text ? textToCells(text) : new Set();
}
