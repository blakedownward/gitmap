/**
 * HeatmapGrid.tsx
 *
 * Purpose:
 *   - Renders a 2D boolean matrix as a pixel grid using SVG.
 *   - Each true value is a filled rectangle ("pixel").
 *   - Supports accent color, background color, pixel size, and board/frame styling.
 *   - Always shows a fixed column of padding (blank squares) at the start and end of the grid.
 *   - The first (left) padding column: top 4 squares are transparent, bottom 3 are blank.
 *   - The last (right) padding column: top 4 are blank, bottom 3 are transparent.
 *
 * Props:
 *   - matrix: boolean[][]
 *   - accentColor: string
 *   - backgroundColor?: string (default: '#181C24')
 *   - pixelSize?: number (default: 20)
 *   - theme?: 'light' | 'dark'
 *   - showLabels?: boolean
 *   - fixedColumns?: boolean
 *   - isSmallScreen: boolean
 *
 * Logic Overview:
 *   1. Render an SVG with a background and outer frame.
 *   2. For each true cell in the matrix, render a filled rect.
 *   3. Center the grid in the SVG.
 *   4. Always render one blank column at the start and end, with special transparency logic.
 *   5. The grid is always 7 rows tall (no extra padding rows).
 */

import React, { forwardRef } from 'react';

interface HeatmapGridProps {
  matrix: boolean[][];
  accentColor: string;
  backgroundColor?: string;
  pixelSize?: number;
  theme?: 'light' | 'dark';
  showLabels?: boolean;
  fixedColumns?: boolean;
  isSmallScreen: boolean;
}

const DEFAULT_BG = '#181C24';
const DEFAULT_PIXEL = 20;
const FRAME_PADDING = 16;
const BLANK_SQUARE_DARK = '#232834'; // Slightly lighter than background (dark mode)
const BLANK_SQUARE_LIGHT = '#eceef0'; // Tailwind gray-100
const BORDER_LIGHT = '#e5e7eb'; // Tailwind gray-200
const GRID_ROWS = 7;
const GRID_BG_LIGHT = '#f9fafb'; // Tailwind gray-100
const GAP = 3;

const MONTH_LABELS = ['Jul', 'Aug', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun'];
const DAY_LABELS = ['Mon', 'Wed', 'Fri'];

const LEFT_LABEL_WIDTH = 28;

function varyColor(hex: string, amount: number) {
  // Clamp amount between -48 and 48 for higher contrast
  amount = Math.max(-48, Math.min(48, amount));
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
  const num = parseInt(c, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${(r<<16 | g<<8 | b).toString(16).padStart(6, '0')}`;
}

function HeatmapLegend({ accentColor, theme, blankSquare, isSmallScreen }: { accentColor: string; theme: 'light' | 'dark'; blankSquare: string, isSmallScreen: boolean }) {
  // Legend: blank, then 4 shades from lightest to darkest
  const accentShades = [-24, 0, 24, 48].map(s => varyColor(accentColor, s)).reverse();
  const shades = [blankSquare, ...accentShades];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, marginRight: 12, fontSize: isSmallScreen ? 9 : 12, fontWeight: 500, color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
      <span style={{ marginRight: 4 }}>Less</span>
      {shades.map((color, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 12,
            height: 12,
            borderRadius: 3,
            background: color,
            border: theme === 'light' ? '1px solid #d1d5db' : '1px solid #222',
          }}
        />
      ))}
      <span style={{ marginLeft: 4 }}>More</span>
    </div>
  );
}

const HeatmapGrid = forwardRef<SVGSVGElement, HeatmapGridProps>(({
  matrix,
  accentColor,
  backgroundColor = DEFAULT_BG,
  pixelSize = DEFAULT_PIXEL,
  theme = 'dark',
  showLabels = false,
  fixedColumns = false,
  isSmallScreen,
}, svgRef) => {
  // Always use 7 rows
  const rows = GRID_ROWS;
  const cols = matrix[0]?.length || 0;
  const paddedCols = fixedColumns ? cols : cols + 2; // In fixed mode, no extra padding columns
  const height = rows * pixelSize + FRAME_PADDING * 2;
  const blankSquare = theme === 'dark' ? BLANK_SQUARE_DARK : BLANK_SQUARE_LIGHT;
  const borderColor = theme === 'light' ? BORDER_LIGHT : 'none';
  const borderWidth = theme === 'light' ? 1 : 0;
  const gridBg = theme === 'light' ? GRID_BG_LIGHT : backgroundColor;

  // Pad/truncate matrix to 7 rows for safety
  const safeMatrix = Array.from({ length: rows }).map((_, y) => matrix[y] || Array(cols).fill(false));

  // Calculate label positions (evenly spaced)
  const labelCount = MONTH_LABELS.length;
  const labelPositions = Array.from({ length: labelCount }).map((_, i) => {
    // Spread labels across the grid columns (excluding the 2 padding columns in responsive)
    // In fixed mode, ensure last label is centered over last column
    if (fixedColumns) {
      return Math.round(((cols - 1) / (labelCount - 1)) * i);
    } else {
      return Math.round((cols / (labelCount - 1)) * i) + 1; // +1 to skip left padding in responsive
    }
  });

  const gridTop = FRAME_PADDING + (showLabels ? 24 : 0);

  const svgWidth = LEFT_LABEL_WIDTH + FRAME_PADDING * 2 + paddedCols * pixelSize;

  return (
    <div style={{ width: svgWidth }}>
      <svg
        ref={svgRef as React.Ref<SVGSVGElement>}
        width={svgWidth}
        height={height + (showLabels ? 24 : 0)}
        viewBox={`0 0 ${svgWidth} ${height + (showLabels ? 24 : 0)}`}
        style={{ display: 'block', background: 'none' }}
      >
        {/* Month labels */}
        {showLabels && (
          <g
            className="month-labels"
            fill={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
            fontSize={isSmallScreen ? 9 : 12}
            fontFamily="sans-serif"
          >
            {MONTH_LABELS.map((label, i) => (
              <text
                key={label}
                x={LEFT_LABEL_WIDTH + FRAME_PADDING + labelPositions[i] * pixelSize + pixelSize / 2}
                y={gridTop - 8}
                textAnchor="middle"
                fontSize={isSmallScreen ? 9 : 12}
                fill={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
                fontFamily="sans-serif"
                style={{ userSelect: 'none', fontWeight: 500 }}
              >
                {label}
              </text>
            ))}
          </g>
        )}
        {/* Day labels */}
        {showLabels && (
          <g
            className="day-labels"
            fill={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
            fontSize={isSmallScreen ? 9 : 12}
            fontFamily="sans-serif"
          >
            {DAY_LABELS.map((label, i) => (
              <text
                key={label}
                x={LEFT_LABEL_WIDTH + FRAME_PADDING - 12}
                y={gridTop + (i * 2 + 1) * pixelSize + pixelSize / 2}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize={isSmallScreen ? 9 : 12}
                fill={theme === 'dark' ? '#9CA3AF' : '#4B5563'}
                fontFamily="sans-serif"
                style={{ userSelect: 'none', fontWeight: 500 }}
              >
                {label}
              </text>
            ))}
          </g>
        )}
        {/* Inner grid background */}
        <rect
          x={LEFT_LABEL_WIDTH + FRAME_PADDING}
          y={gridTop}
          width={paddedCols * pixelSize}
          height={rows * pixelSize}
          rx={6}
          fill={gridBg}
        />
        {/* Grid pixels with padding columns and special transparency logic */}
        {Array.from({ length: rows }).map((_, y) =>
          Array.from({ length: paddedCols }).map((_, x) => {
            if (fixedColumns) {
              // In fixed mode, use all columns as data columns, but mask for partial weeks
              // First column: only bottom 3 days
              if (x === 0 && y < 4) return null;
              // Last column: only top 4 days
              if (x === paddedCols - 1 && y >= 4) return null;
              const cell = safeMatrix[y][x];
              if (cell) {
                const shadeSteps = [-48, -16, 16, 48];
                const shade = shadeSteps[(x + y) % shadeSteps.length];
                const color = varyColor(accentColor, shade);
                return (
                  <rect
                    key={`p-${x}-${y}`}
                    x={LEFT_LABEL_WIDTH + FRAME_PADDING + x * pixelSize}
                    y={FRAME_PADDING + y * pixelSize + (showLabels ? 24 : 0)}
                    width={pixelSize - GAP}
                    height={pixelSize - GAP}
                    rx={pixelSize / 6}
                    fill={color}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                  />
                );
              } else {
                return (
                  <rect
                    key={`p-${x}-${y}`}
                    x={LEFT_LABEL_WIDTH + FRAME_PADDING + x * pixelSize}
                    y={FRAME_PADDING + y * pixelSize + (showLabels ? 24 : 0)}
                    width={pixelSize - GAP}
                    height={pixelSize - GAP}
                    rx={pixelSize / 6}
                    fill={blankSquare}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                  />
                );
              }
            } else {
              // Responsive mode: keep current padding logic
              const isLeftPad = x === 0;
              const isRightPad = x === paddedCols - 1;
              const cell = !isLeftPad && !isRightPad && safeMatrix[y][x - 1];

              // Left padding: top 4 transparent, bottom 3 blank
              if (isLeftPad) {
                if (y < 4) {
                  return null; // transparent (not rendered)
                } else {
                  return (
                    <rect
                      key={`p-${x}-${y}`}
                      x={LEFT_LABEL_WIDTH + FRAME_PADDING + x * pixelSize}
                      y={FRAME_PADDING + y * pixelSize + (showLabels ? 24 : 0)}
                      width={pixelSize - GAP}
                      height={pixelSize - GAP}
                      rx={pixelSize / 6}
                      fill={blankSquare}
                      stroke={borderColor}
                      strokeWidth={borderWidth}
                    />
                  );
                }
              }
              // Right padding: top 4 blank, bottom 3 transparent
              if (isRightPad) {
                if (y < 4) {
                  return (
                    <rect
                      key={`p-${x}-${y}`}
                      x={LEFT_LABEL_WIDTH + FRAME_PADDING + x * pixelSize}
                      y={FRAME_PADDING + y * pixelSize + (showLabels ? 24 : 0)}
                      width={pixelSize - GAP}
                      height={pixelSize - GAP}
                      rx={pixelSize / 6}
                      fill={blankSquare}
                      stroke={borderColor}
                      strokeWidth={borderWidth}
                    />
                  );
                } else {
                  return null; // transparent (not rendered)
                }
              }
              // Main grid
              if (cell) {
                // Use a more pronounced heatmap effect: -48, 0, +48, -24, +24, etc.
                const shadeSteps = [-48, -16, 16, 48];
                const shade = shadeSteps[(x + y) % shadeSteps.length];
                const color = varyColor(accentColor, shade);
                return (
                  <rect
                    key={`p-${x}-${y}`}
                    x={LEFT_LABEL_WIDTH + FRAME_PADDING + x * pixelSize}
                    y={FRAME_PADDING + y * pixelSize + (showLabels ? 24 : 0)}
                    width={pixelSize - GAP}
                    height={pixelSize - GAP}
                    rx={pixelSize / 6}
                    fill={color}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                  />
                );
              } else {
                // Blank square, light gray in light mode, dark in dark mode
                return (
                  <rect
                    key={`p-${x}-${y}`}
                    x={LEFT_LABEL_WIDTH + FRAME_PADDING + x * pixelSize}
                    y={FRAME_PADDING + y * pixelSize + (showLabels ? 24 : 0)}
                    width={pixelSize - GAP}
                    height={pixelSize - GAP}
                    rx={pixelSize / 6}
                    fill={blankSquare}
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                  />
                );
              }
            }
          })
        )}
        {/* Optional: grid lines or effects can be added here */}
      </svg>
      {showLabels && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginRight: fixedColumns ? 0 : 12 }}>
          <HeatmapLegend accentColor={accentColor} theme={theme} blankSquare={blankSquare} isSmallScreen={isSmallScreen} />
        </div>
      )}
    </div>
  );
});

export default HeatmapGrid; 