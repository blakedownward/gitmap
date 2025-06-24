/**
 * FontDevTool.tsx
 *
 * Purpose:
 *   - Provides a development tool for visualizing and editing pixel font mappings.
 *   - Displays a grid for a single character, a text input for the character, a width selector, and the matrix as an array of strings.
 *   - Allows toggling pixels and saving the mapping for the character.
 *   - Always shows a fixed column of padding (blank squares) at the start and end of the grid.
 *
 * Logic Overview:
 *   1. User enters a single character in the input.
 *   2. User sets the width (number of columns).
 *   3. The component looks up the matrix in FONT and displays the grid and matrix.
 *   4. User can click pixels to toggle them, and save the new mapping.
 *   5. The grid always shows one blank column at the start and end.
 */

import React, { useState, useEffect } from 'react';
import FONT from '../utils/fontMap';

const PIXEL_SIZE = 32;
const ACCENT = '#1aff7a';
const BG = '#181C24';
const FRAME = '#444B5A';
const HEIGHT = 7;
const MIN_WIDTH = 1;
const MAX_WIDTH = 7;
const BLANK_SQUARE = '#222';

function padOrTruncateRow(row: string, width: number): string {
  if (row.length > width) return row.slice(0, width);
  if (row.length < width) return row + '0'.repeat(width - row.length);
  return row;
}

function padOrTruncateMatrix(matrix: string[], width: number): string[] {
  return matrix.map(row => padOrTruncateRow(row, width));
}

const emptyMatrix = (width: number) => Array(HEIGHT).fill('0'.repeat(width));

function strMatrixToBool(matrix: string[]): boolean[][] {
  return matrix.map(row => row.split('').map(bit => bit === '1'));
}
function boolMatrixToStr(matrix: boolean[][]): string[] {
  return matrix.map(row => row.map(cell => (cell ? '1' : '0')).join(''));
}

const FontDevTool: React.FC = () => {
  const [char, setChar] = useState('A');
  const [width, setWidth] = useState(5);
  const [matrix, setMatrix] = useState<string[]>(padOrTruncateMatrix(FONT[char] || emptyMatrix(width), width));
  const [saved, setSaved] = useState(false);

  // When char or width changes, load and adjust its matrix
  useEffect(() => {
    setMatrix(padOrTruncateMatrix(FONT[char] || emptyMatrix(width), width));
    setSaved(false);
  }, [char, width]);

  // Handle pixel click (ignore padding columns)
  const handlePixelClick = (x: number, y: number) => {
    // Only allow toggling in the editable area (not the padding columns)
    if (x === 0 || x === width + 1) return;
    setMatrix(prev => {
      const boolMat = strMatrixToBool(prev);
      boolMat[y][x - 1] = !boolMat[y][x - 1];
      return boolMatrixToStr(boolMat);
    });
    setSaved(false);
  };

  // Save to FONT in memory and show code snippet
  const handleSave = () => {
    FONT[char] = [...matrix];
    setSaved(true);
  };

  return (
    <section className="w-full max-w-[85%] mx-auto mt-12 p-6 bg-gray-900 rounded-lg shadow-lg flex flex-col items-center gap-6">
      <div className="flex items-center gap-4">
        <label htmlFor="font-char" className="text-gray-200">Character:</label>
        <input
          id="font-char"
          type="text"
          maxLength={1}
          value={char}
          onChange={e => setChar(e.target.value.slice(0, 1))}
          className="w-12 text-center px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <label htmlFor="font-width" className="text-gray-200 ml-4">Width:</label>
        <input
          id="font-width"
          type="number"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          value={width}
          onChange={e => setWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(e.target.value))))}
          className="w-16 text-center px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {/* Pixel grid for the character, with 1 column of padding on each side */}
      <svg
        width={PIXEL_SIZE * (width + 2) + 16}
        height={PIXEL_SIZE * HEIGHT + 16}
        viewBox={`0 0 ${PIXEL_SIZE * (width + 2) + 16} ${PIXEL_SIZE * HEIGHT + 16}`}
        className="mb-2 cursor-pointer"
      >
        {/* Frame */}
        <rect
          x={0}
          y={0}
          width={PIXEL_SIZE * (width + 2) + 16}
          height={PIXEL_SIZE * HEIGHT + 16}
          rx={10}
          fill={FRAME}
        />
        {/* Background */}
        <rect
          x={8}
          y={8}
          width={PIXEL_SIZE * (width + 2)}
          height={PIXEL_SIZE * HEIGHT}
          rx={4}
          fill={BG}
        />
        {/* Pixels: always render width+2 columns, first and last are padding */}
        {Array.from({ length: HEIGHT }).map((_, y) =>
          Array.from({ length: width + 2 }).map((_, x) => {
            const isPadding = x === 0 || x === width + 1;
            const on = !isPadding && strMatrixToBool(matrix)[y][x - 1];
            return (
              <rect
                key={`p-${x}-${y}`}
                x={8 + x * PIXEL_SIZE}
                y={8 + y * PIXEL_SIZE}
                width={PIXEL_SIZE - 4}
                height={PIXEL_SIZE - 4}
                rx={PIXEL_SIZE / 3}
                fill={on ? ACCENT : BLANK_SQUARE}
                style={on ? { filter: 'drop-shadow(0 0 4px #1aff7a88)' } : {}}
                onClick={() => handlePixelClick(x, y)}
                className={isPadding ? '' : 'cursor-pointer transition-colors duration-100'}
              />
            );
          })
        )}
      </svg>
      {/* Matrix display */}
      <div className="bg-gray-800 rounded p-4 w-full text-green-400 font-mono text-sm text-center">
        [
        {matrix.map((row, i) => (
          <span key={i}>
            '{row}'{i < matrix.length - 1 ? ', ' : ''}
          </span>
        ))}
        ]
      </div>
      <button
        onClick={handleSave}
        className="mt-2 px-4 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
      >
        Save to fontMap
      </button>
      {saved && (
        <div className="bg-gray-700 rounded p-3 w-full text-xs text-blue-200 mt-2 text-left">
          <div className="mb-1 font-bold text-green-300">Saved! Paste this in fontMap:</div>
          <code>{`${char}: [${matrix.map(r => `'${r}'`).join(', ')}],`}</code>
        </div>
      )}
    </section>
  );
};

export default FontDevTool; 