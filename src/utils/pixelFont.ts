/**
 * pixelFont.ts
 *
 * Purpose:
 *   - Uses a pixel font for A-Z, a-z, 0-9 as 5x7 boolean matrices (imported from fontMap.ts).
 *   - Exports a function to convert a string into a 2D boolean matrix suitable for rendering as a pixel grid.
 *   - Adds 1 column of horizontal padding to the right of each character except the last.
 *
 * Logic Overview:
 *   1. Look up each character in the FONT map (fallback to blank if not found).
 *   2. Concatenate character matrices with right-side padding (except after the last character).
 */

import FONT from './fontMap';

// Helper to get the matrix for a single character
function getCharMatrix(char: string): boolean[][] {
  const pattern = FONT[char] || FONT[' '];
  return pattern.map(row => row.split('').map(bit => bit === '1'));
}

// Main function: text to pixel matrix
export function textToPixelMatrix(text: string): boolean[][] {
  const chars = text.split('');
  const charMatrices = chars.map(getCharMatrix);
  const hPad = [false]; // 1 column of horizontal padding

  // Concatenate horizontally with 1 column of padding after each char except the last
  const rows = 7;
  const matrix: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    let row: boolean[] = [];
    charMatrices.forEach((mat, i) => {
      row = row.concat(mat[r]);
      if (i < charMatrices.length - 1) row = row.concat(hPad);
    });
    matrix.push(row);
  }
  return matrix;
} 