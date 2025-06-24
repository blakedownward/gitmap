/**
 * Controls.tsx
 *
 * Purpose:
 *   - Renders UI controls for the TextMap app: text input, color picker, and theme toggle.
 *   - Accepts props for value, color, and theme, and emits changes to parent.
 *   - Styles controls to match the Figma design.
 *
 * Props:
 *   - value: string (current text)
 *   - onValueChange: (text: string) => void
 *   - accentColor: string
 *   - onAccentColorChange: (color: string) => void
 *   - theme: 'light' | 'dark'
 *   - onThemeToggle: () => void
 *   - showLabels: boolean
 *   - onShowLabelsToggle: () => void
 *   - fixedColumns: boolean
 *   - onFixedColumnsToggle: () => void
 *   - scrollEnabled: boolean
 *   - onScrollToggle: () => void
 *   - isSmallScreen: boolean
 */

import React, { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ControlsProps {
  value: string;
  onValueChange: (text: string) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  showLabels: boolean;
  onShowLabelsToggle: () => void;
  fixedColumns: boolean;
  onFixedColumnsToggle: () => void;
  scrollEnabled: boolean;
  onScrollToggle: () => void;
  isSmallScreen: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  value,
  onValueChange,
  accentColor,
  onAccentColorChange,
  showLabels,
  onShowLabelsToggle,
  fixedColumns,
  onFixedColumnsToggle,
  scrollEnabled,
  onScrollToggle,
  isSmallScreen,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close color picker on outside click
  useEffect(() => {
    if (!showColorPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColorPicker]);

  // Toggle switch placeholder component
  const ToggleSwitch = ({ checked, onClick }: { checked: boolean; onClick?: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="focus:outline-none"
      aria-pressed={checked}
      tabIndex={0}
    >
      <span
        className={`relative inline-block w-10 align-middle select-none transition duration-200 ease-in`}
      >
        <span
          className={`block w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-800' : 'bg-gray-400'}`}
        ></span>
        <span
          className={`absolute left-0 top-0 w-6 h-6 bg-white border border-gray-300 rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`}
          style={{ top: 0 }}
        ></span>
      </span>
    </button>
  );

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Text Input */}
      <div className="w-full flex justify-center mb-2">
        <div className="flex flex-row items-center gap-2">
          <label htmlFor="text-input" className="text-gray-700 dark:text-gray-200 text-lg whitespace-nowrap text-right">Input Text:</label>
          <input
            id="text-input"
            type="text"
            value={value}
            onChange={e => onValueChange(e.target.value)}
            className="min-w-md max-w-md px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 dark:text-gray-200 text-xl text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Enter your text..."
            maxLength={18}
            aria-label="Text input"
          />
        </div>
      </div>
      {/* Inline form controls */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full mt-2">
        {/* Accent Colour */}
        <div className="flex items-center gap-2 relative">
          <span className="text-gray-700 dark:text-gray-200 text-lg">Accent Colour</span>
          <button
            className="w-6 h-6 rounded-full border-2 border-gray-400"
            style={{ background: accentColor }}
            onClick={() => setShowColorPicker(v => !v)}
            aria-label="Pick accent color"
            type="button"
          />
          {showColorPicker && (
            <div ref={pickerRef} className="absolute z-10 mb-12 bottom-full left-0">
              <HexColorPicker color={accentColor} onChange={onAccentColorChange} />
            </div>
          )}
        </div>
        {/* Show Labels */}
        {!isSmallScreen && (
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-200 text-lg">Labels</span>
            <ToggleSwitch checked={showLabels} onClick={onShowLabelsToggle} />
          </div>
        )}
        {/* Fixed Columns */}
        <div className="flex items-center gap-2">
          <span className="text-gray-700 dark:text-gray-200 text-lg">Fixed Grid</span>
          <ToggleSwitch checked={fixedColumns} onClick={onFixedColumnsToggle} />
        </div>
        {/* Scroll (only show if fixedColumns) */}
        {fixedColumns && (
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-200 text-lg">Scroll Preview</span>
            <button
              type="button"
              onClick={onScrollToggle}
              className={`w-8 h-8 flex items-center justify-center rounded bg-indigo-800 hover:bg-indigo-600 transition text-white shadow focus:outline-none relative`}
              aria-label="Start Scroll Preview"
            >
              {scrollEnabled ? (
                // Spinning loader (SVG wheel)
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="3" opacity="0.25" />
                  <path d="M16 9A7 7 0 0 1 9 16" stroke="white" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                // Play icon
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="5,3 15,9 5,15" fill="currentColor" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
      {/* (Keep the old color picker for accessibility, but hide it) */}
      <div className="hidden">
        <HexColorPicker color={accentColor} onChange={onAccentColorChange} />
      </div>
    </div>
  );
};

export default Controls; 