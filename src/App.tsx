import { useState, useRef, useEffect } from 'react';
import './index.css'
import Controls from './components/Controls';
import HeatmapGrid from './components/HeatmapGrid';
import FontDevTool from './components/FontDevTool';
import { textToPixelMatrix } from './utils/pixelFont';
import html2canvas from 'html2canvas';
// @ts-expect-error: gifshot has no types
import gifshot from 'gifshot';
import { createRoot } from 'react-dom/client';

const DEFAULT_TEXT = 'GitMap   ';
const DEFAULT_ACCENT = '#1aff7a';
const DEFAULT_THEME = 'dark';
const FRAME_PADDING = 16;
const LEFT_LABEL_WIDTH = 28;
const MAX_COLUMNS = 53;
const FINAL_WEEK_DAYS = 4;
const FIRST_WEEK_DAYS = 3;
const MAX_HEIGHT = 500;

function padOrTruncateMatrixCols(matrix: boolean[][], cols: number): boolean[][] {
  // Right-align the text, pad left
  return matrix.map(row => {
    if (row.length > cols) return row.slice(row.length - cols);
    if (row.length < cols) return [
      ...Array(cols - row.length).fill(false),
      ...row
    ];
    return row;
  });
}

function applyPartialWeeks(matrix: boolean[][], cols: number): boolean[][] {
  // First column: only bottom FIRST_WEEK_DAYS can be active
  // Last column: only top FINAL_WEEK_DAYS can be active
  return matrix.map((row, y) => {
    return row.map((cell, x) => {
      if (x === 0 && y < (7 - FIRST_WEEK_DAYS)) return false; // first col, only bottom 3 days
      if (x === cols - 1 && y >= FINAL_WEEK_DAYS) return false; // last col, only top 4 days
      return cell;
    });
  });
}

function App() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [theme, setTheme] = useState<'light' | 'dark'>(DEFAULT_THEME);
  const [showLabels, setShowLabels] = useState(true);
  const [fixedColumns, setFixedColumns] = useState(true);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [scrollFrame, setScrollFrame] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 800, height: MAX_HEIGHT }); // default fallback
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);

  // Apply dark/light class to body
  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
  }, [theme]);

  // Update background gradient color from accentColor
  useEffect(() => {
    // Convert hex to R, G, B string
    const hex = accentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    document.body.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  }, [accentColor]);

  // State for lazy GIF logo loading
  const [gifLoaded, setGifLoaded] = useState(false);
  const [gifError, setGifError] = useState(false);
  const gifSrc = theme === 'dark' ? 'gitmap-scroll-logo.gif' : 'gitmap-scroll-logo-light.gif';
  const svgSrc = 'gitmap-logo.svg';

  useEffect(() => {
    setGifLoaded(false);
    setGifError(false);
  }, [theme]);

  // Check for small screen size to adjust UI
  useEffect(() => {
    function checkScreenSize() {
      setIsSmallScreen(window.innerWidth < 425);
    }
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Compute the pixel matrix for the current text
  const baseMatrix = textToPixelMatrix(text);
  let matrix = baseMatrix;
  const rows = 7;
  let cols = matrix[0]?.length || 0;
  let paddedCols = cols + 2;

  // If fixedColumns is enabled, pad/truncate to MAX_COLUMNS - 1 and apply partial weeks
  if (fixedColumns) {
    // Always start from the original, unscrolled matrix
    matrix = padOrTruncateMatrixCols(baseMatrix, MAX_COLUMNS - 1);
    matrix = applyPartialWeeks(matrix, MAX_COLUMNS);
    cols = MAX_COLUMNS - 1;
    paddedCols = cols; // Always 52 columns in fixed mode

    // Scroll logic
    if (scrollEnabled) {
      // For each frame, shift the matrix left by scrollFrame columns
      matrix = matrix.map(row => {
        // Pad with cols blanks on both sides for smooth entry/exit
        const padded = [
          ...Array(cols).fill(false),
          ...row,
          ...Array(cols).fill(false)
        ];
        // The visible window is always cols columns wide
        const start = scrollFrame;
        const end = start + cols;
        let window = padded.slice(start, end);
        // Ensure window is always exactly cols columns
        if (window.length < cols) {
          window = [...window, ...Array(cols - window.length).fill(false)];
        }
        return window;
      });
    }
  }

  // Animation effect for scrolling
  useEffect(() => {
    if (!fixedColumns || !scrollEnabled) return;
    const totalFrames = (MAX_COLUMNS - 1) + 2 + (matrix[0]?.length || 0); // enough to scroll all the way out
    let frame = 0;
    let cancelled = false;
    function nextFrame() {
      if (cancelled) return;
      setScrollFrame(f => {
        const next = (f + 1) % totalFrames;
        frame = next;
        return next;
      });
      if (frame < totalFrames - 1) {
        setTimeout(nextFrame, 100);
      } else {
        // At end of loop, turn off scroll
        setScrollEnabled(false);
      }
    }
    const timeout = setTimeout(nextFrame, 100);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [fixedColumns, scrollEnabled, text]);

  // Reset scrollFrame when toggling scroll or text
  useEffect(() => {
    setScrollFrame(0);
  }, [scrollEnabled, text, fixedColumns]);

  // Responsive: measure container width and height
  useEffect(() => {
    function updateSize() {
      if (gridContainerRef.current) {
        setContainerSize({
          width: gridContainerRef.current.offsetWidth,
          height: gridContainerRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate available width and height for grid (subtract left label and frame padding)
  const availableGridWidth = containerSize.width - LEFT_LABEL_WIDTH - FRAME_PADDING * 2;
  const availableGridHeight = containerSize.height - FRAME_PADDING * 2 - (showLabels ? 24 : 0);
  // Minimum pixel size for usability
  const MIN_PIXEL_SIZE = 5;
  // Calculate pixel size to fit both width and height
  const pixelSizeWidth = Math.floor(availableGridWidth / paddedCols);
  const pixelSizeHeight = Math.floor(availableGridHeight / rows);
  const pixelSize = Math.max(MIN_PIXEL_SIZE, Math.min(pixelSizeWidth, pixelSizeHeight));


  // Download PNG handler using html2canvas
  async function handleDownloadPNG() {
    const node = parentRef.current;
    if (!node) return;
    const canvas = await html2canvas(node, { backgroundColor: null });
    canvas.toBlob(blob => {
      if (blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'textmap.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }, 'image/png');
  }

  // Download GIF handler using gifshot and SVG-to-canvas (SVG only, no labels/legend)
  async function handleDownloadGIF() {
    const cols = MAX_COLUMNS - 1;
    const textCols = baseMatrix[0]?.length || 0;
    const totalFrames = cols + 2 + textCols;
    const frames: string[] = [];
    // Create a hidden container for off-screen rendering
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.position = 'fixed';
    hiddenDiv.style.left = '-99999px';
    hiddenDiv.style.top = '0';
    document.body.appendChild(hiddenDiv);
    for (let frame = 0; frame < totalFrames; frame++) {
      // Render HeatmapGrid for this frame (SVG only, no labels/legend)
      const gridRoot = createRoot(hiddenDiv);
      gridRoot.render(
        <HeatmapGrid
          ref={svgRef}
          matrix={(() => {
            // Pad with cols blanks on both sides for smooth entry/exit
            const padded = baseMatrix.map(row => [
              ...Array(cols).fill(false),
              ...row,
              ...Array(cols).fill(false)
            ]);
            // The visible window is always cols columns wide
            const start = frame;
            const end = start + cols;
            let window = padded.map(row => row.slice(start, end));
            // Ensure window is always exactly cols columns
            if (window[0].length < cols) {
              window = window.map(row => [...row, ...Array(cols - row.length).fill(false)]);
            }
            // Apply partial weeks logic
            return applyPartialWeeks(window, MAX_COLUMNS);
          })()}
          accentColor={accentColor}
          backgroundColor={theme === 'dark' ? '#0f172a' : '#f9fafb'}
          theme={theme}
          showLabels={false}
          pixelSize={pixelSize}
          fixedColumns={true}
          isSmallScreen={false}
        />
      );
      // Wait for DOM to update
      await new Promise(r => setTimeout(r, 0));
      const svg = hiddenDiv.querySelector('svg');
      if (svg) {
        // Serialize SVG
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        // Create image from SVG
        const img = new window.Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        await new Promise(res => {
          img.onload = () => {
            // Draw SVG image to canvas
            const canvas = document.createElement('canvas');
            canvas.width = svg.width.baseVal.value;
            canvas.height = svg.height.baseVal.value;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              if (theme === 'light') {
                ctx.fillStyle = '#f9fafb'; // Tailwind gray-50
              } else {
                ctx.fillStyle = '#0f172a'; // App dark mode background
              }
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
            }
            frames.push(canvas.toDataURL('image/png'));
            URL.revokeObjectURL(url);
            res(null);
          };
          img.src = url;
        });
      }
      gridRoot.unmount();
    }
    document.body.removeChild(hiddenDiv);
    // Create GIF
    gifshot.createGIF({
      images: frames,
      gifWidth: svgRef.current?.width.baseVal.value || 400,
      gifHeight: svgRef.current?.height.baseVal.value || 100,
      interval: 0.1,
      numFrames: frames.length,
      frameDuration: 1,
      sampleInterval: 10,
      background: '#181C24',
    }, function(obj: any) {
      if (!obj.error && obj.image) {
        const a = document.createElement('a');
        a.href = obj.image;
        a.download = 'textmap.gif';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  }

  return (
    <div className="min-h-screen w-full bg-transparent transition-colors duration-300">
      <header className="w-full flex items-start p-6 relative">
        {/* Logo: SVG fallback, GIF lazy loaded */}
        <span className="h-8 w-auto block relative">
          <img
            src={svgSrc}
            alt="GitMap"
            className={`h-8 w-auto block transition-opacity duration-300 ${gifLoaded && !gifError ? 'opacity-0' : 'opacity-100'}`}
            draggable="false"
          />
          <img
            src={gifSrc}
            alt="GitMap Animated"
            className={`h-8 w-auto transition-opacity duration-300 ${gifLoaded && !gifError ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setGifLoaded(true)}
            onError={() => setGifError(true)}
            draggable="false"
            style={{ pointerEvents: 'none', position: 'absolute', left: 0, top: 0 }}
          />
        </span>
        {/* Theme toggle in top right */}
        <div className="absolute right-6 top-6 flex items-center gap-2 z-10">
          {/* Sun icon (dynamic color) */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
            <circle cx="10" cy="10" r="4" fill={theme === 'dark' ? '#d1d5db' : '#374151'} />
            <g stroke={theme === 'dark' ? '#d1d5db' : '#374151'} strokeWidth="1.5">
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="10" y1="16" x2="10" y2="19" />
              <line x1="1" y1="10" x2="4" y2="10" />
              <line x1="16" y1="10" x2="19" y2="10" />
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
              <line x1="15.78" y1="4.22" x2="13.66" y2="6.34" />
              <line x1="4.22" y1="15.78" x2="6.34" y2="13.66" />
              <line x1="15.78" y1="15.78" x2="13.66" y2="13.66" />
            </g>
          </svg>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`${theme === 'dark' ? 'bg-slate-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span className={`${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
          </button>
          {/* Moon icon (dynamic color) */}
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="ml-1">
            <path d="M20.5 17.5C19.1 18.9 17.09 19.91 14.75 19.91C10.46 19.91 7 16.45 7 12.16C7 9.91 8.13 7.91 9.91 6.5C9.83 6.77 9.79 7.06 9.79 7.36C9.79 11.65 13.25 15.11 17.54 15.11C17.84 15.11 18.13 15.07 18.4 14.99C18.4 15.01 18.4 15.03 18.4 15.05C18.4 16.01 18.56 16.93 18.87 17.77C19.36 17.67 19.85 17.55 20.5 17.5Z" fill={theme === 'dark' ? '#cbd5e1' : '#374151'} />
          </svg>
        </div>
      </header>
      <main className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-4xl flex flex-col items-center gap-8">
          <div ref={parentRef} className="bg-gray-50 dark:bg-[#0f172a] rounded shadow-lg p-8 w-full flex flex-col items-center justify-center min-h-[300px] max-h-[500px] border border-gray-300 dark:border-gray-700">
            <div ref={gridContainerRef} className="w-full h-full flex items-center justify-center">
              <HeatmapGrid
                ref={svgRef}
                matrix={matrix}
                accentColor={accentColor}
                backgroundColor={theme === 'dark' ? '#0f172a' : '#f9fafb'}
                theme={theme}
                showLabels={showLabels}
                pixelSize={pixelSize}
                fixedColumns={fixedColumns}
                isSmallScreen={isSmallScreen}
              />
              {/* Legend and labels are included in the parent container for export */}
            </div>
          </div>
          <div className="w-full flex flex-col items-center gap-4">
            <Controls
              value={text}
              onValueChange={setText}
              accentColor={accentColor}
              onAccentColorChange={setAccentColor}
              theme={theme}
              onThemeToggle={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              showLabels={showLabels}
              onShowLabelsToggle={() => setShowLabels(v => !v)}
              fixedColumns={fixedColumns}
              onFixedColumnsToggle={() => setFixedColumns(v => !v)}
              scrollEnabled={scrollEnabled}
              onScrollToggle={() => setScrollEnabled(prev => !prev)}
              isSmallScreen={isSmallScreen}
            />
            <div className="w-full flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
              <button
                onClick={handleDownloadPNG}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
              >
                Download PNG
              </button>
              <button
                onClick={handleDownloadGIF}
                disabled={!fixedColumns}
                className={`px-4 py-2 text-white rounded transition ${!fixedColumns ? 'bg-orange-800 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                Download GIF
              </button>
            </div>
          </div>
        </div>
      </main>
      <a
        href="https://buymeacoffee.com/blakeyvibes"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400 hover:underline z-20"
      >
        support the project
      </a>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setShowFontModal(true);
        }}
        className="fixed bottom-4 left-4 text-xs text-red-500 dark:text-red-400 hover:underline z-20 cursor-pointer"
      >
        customise font
      </a>
      
      {/* Font Customisation Modal */}
      {showFontModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2"
          onClick={() => setShowFontModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 mt-2 rounded-lg shadow-xl max-w-sm w-full max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              <FontDevTool />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
