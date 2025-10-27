import { useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import './App.css';

// Types
interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragOffset {
  x: number;
  y: number;
}

interface ResizeStartPos extends Selection {
  startX: number;
  startY: number;
}

type ResizeType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

// Constants
const MIN_SELECTION_SIZE = 20;
const Z_INDEX_SELECTION = 9999;
const Z_INDEX_HANDLE = 10000;

const COLORS = {
  primary: '#2196F3',
  success: '#4CAF50',
  danger: '#f44336',
  background: 'green',
  text: 'blue',
  overlay: 'rgba(33, 150, 243, 0.1)',
  darkBackground: 'darkgreen',
  white: 'white',
} as const;

const CURSORS = {
  move: 'move',
  nwse: 'nwse-resize',
  nesw: 'nesw-resize',
  ns: 'ns-resize',
  ew: 'ew-resize',
} as const;

// Resize handle configuration
const RESIZE_HANDLES: Array<{ type: ResizeType; position: string; cursor: string }> = [
  { type: 'nw', position: 'top: -4px; left: -4px;', cursor: CURSORS.nwse },
  { type: 'n', position: 'top: -4px; left: 50%; transform: translateX(-50%);', cursor: CURSORS.ns },
  { type: 'ne', position: 'top: -4px; right: -4px;', cursor: CURSORS.nesw },
  { type: 'e', position: 'top: 50%; right: -4px; transform: translateY(-50%);', cursor: CURSORS.ew },
  { type: 'se', position: 'bottom: -4px; right: -4px;', cursor: CURSORS.nwse },
  { type: 's', position: 'bottom: -4px; left: 50%; transform: translateX(-50%);', cursor: CURSORS.ns },
  { type: 'sw', position: 'bottom: -4px; left: -4px;', cursor: CURSORS.nesw },
  { type: 'w', position: 'top: 50%; left: -4px; transform: translateY(-50%);', cursor: CURSORS.ew },
];

// Reusable styles
const commonTextStyle = { color: COLORS.text };

function App() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<DragOffset | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeType, setResizeType] = useState<ResizeType | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<ResizeStartPos | null>(null);

  // Helper function to create selection from two points
  const createSelection = (x1: number, y1: number, x2: number, y2: number): Selection => ({
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  });

  // Handle resize logic
  const calculateResize = useCallback(
    (
      resizeStartPos: ResizeStartPos,
      resizeType: ResizeType,
      currentX: number,
      currentY: number
    ): Selection => {
      const { width: startWidth, height: startHeight, x: startX, y: startY, startX: mouseStartX, startY: mouseStartY } = resizeStartPos;
      
      let newX = startX;
      let newY = startY;
      let newWidth = startWidth;
      let newHeight = startHeight;

      const deltaX = currentX - mouseStartX;
      const deltaY = currentY - mouseStartY;

      // Handle horizontal resize
      if (resizeType.includes('e')) {
        newWidth = Math.max(MIN_SELECTION_SIZE, startWidth + deltaX);
      }
      if (resizeType.includes('w')) {
        newWidth = Math.max(MIN_SELECTION_SIZE, startWidth - deltaX);
        newX = startX + deltaX;
      }

      // Handle vertical resize
      if (resizeType.includes('s')) {
        newHeight = Math.max(MIN_SELECTION_SIZE, startHeight + deltaY);
      }
      if (resizeType.includes('n')) {
        newHeight = Math.max(MIN_SELECTION_SIZE, startHeight - deltaY);
        newY = startY + deltaY;
      }

      return { x: newX, y: newY, width: newWidth, height: newHeight };
    },
    []
  );

  // Mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isSelecting && startPos) {
        // Creating new selection
        setSelection(createSelection(startPos.x, startPos.y, e.clientX, e.clientY));
      } else if (isDragging && selection && dragOffset) {
        // Moving existing selection
        setSelection({
          ...selection,
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      } else if (isResizing && resizeStartPos && resizeType) {
        // Resizing selection
        setSelection(calculateResize(resizeStartPos, resizeType, e.clientX, e.clientY));
      }
    };

    const handleMouseUp = () => {
      setIsSelecting(false);
      setIsDragging(false);
      setDragOffset(null);
      setIsResizing(false);
      setResizeType(null);
      setResizeStartPos(null);
    };

    if (isSelecting || isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSelecting, startPos, isDragging, selection, dragOffset, isResizing, resizeStartPos, resizeType, calculateResize]);

  // Event handlers
  const handleStartSelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setSelection(null);
  }, []);

  const handleStartDrag = useCallback((e: React.MouseEvent) => {
    if (!selection) return;
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - selection.x,
      y: e.clientY - selection.y,
    });
  }, [selection]);

  const handleStartResize = useCallback((e: React.MouseEvent, type: ResizeType) => {
    if (!selection) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeType(type);
    setResizeStartPos({
      ...selection,
      startX: e.clientX,
      startY: e.clientY,
    });
  }, [selection]);

  const takeScreenshot = useCallback(async () => {
    if (!selection) return;

    try {
      const canvas = await html2canvas(document.body);
      
      // Create a new canvas with the selected area
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = selection.width;
      croppedCanvas.height = selection.height;
      const croppedCtx = croppedCanvas.getContext('2d');
      
      if (!croppedCtx) return;

      // Calculate source coordinates accounting for page scroll
      const sourceX = selection.x + window.scrollX;
      const sourceY = selection.y + window.scrollY;

      // Draw the selected area
      croppedCtx.drawImage(
        canvas,
        sourceX, sourceY, selection.width, selection.height,
        0, 0, selection.width, selection.height
      );

      // Download the cropped image
      const link = document.createElement('a');
      link.href = croppedCanvas.toDataURL('image/png');
      link.download = 'screenshot-area.png';
      link.click();
      
      resetSelection();
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  }, [selection]);

  const resetSelection = useCallback(() => {
    setSelection(null);
    setStartPos(null);
  }, []);

  // Render resize handle
  const renderResizeHandle = (handle: typeof RESIZE_HANDLES[0]) => (
    <div
      key={handle.type}
      onMouseDown={(e) => handleStartResize(e, handle.type)}
      style={{
        position: 'absolute',
        ...handle.position.split(';').reduce((acc, prop) => {
          const [key, value] = prop.split(':').map(s => s.trim());
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, string>),
        width: 8,
        height: 8,
        backgroundColor: COLORS.primary,
        border: `2px solid ${COLORS.white}`,
        cursor: handle.cursor,
        zIndex: Z_INDEX_HANDLE,
      }}
    />
  );

  return (
    <div style={{ minHeight: '100vh', position: 'relative', backgroundColor: COLORS.background, color: COLORS.text }}>
      <div style={{ padding: '20px' }}>
        <h1 style={commonTextStyle}>Screenshot Tool</h1>
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleStartSelection} disabled={isSelecting}>
            Select Area
          </button>
          {selection && (
            <>
              <button onClick={takeScreenshot} style={{ backgroundColor: COLORS.success, color: COLORS.white }}>
                Capture Selected Area
              </button>
              <button onClick={resetSelection} style={{ backgroundColor: COLORS.danger, color: COLORS.white }}>
                Clear Selection
              </button>
            </>
          )}
        </div>
        <p style={commonTextStyle}>
          Click "Select Area" and drag to select the region you want to capture. You can drag the selection to move it.
        </p>
      </div>

      {/* Selection Overlay */}
      {selection && (
        <div
          style={{
            position: 'fixed',
            left: `${selection.x}px`,
            top: `${selection.y}px`,
            width: `${selection.width}px`,
            height: `${selection.height}px`,
            zIndex: Z_INDEX_SELECTION,
            pointerEvents: 'auto',
          }}
        >
          <div
            onMouseDown={handleStartDrag}
            style={{
              width: '100%',
              height: '100%',
              border: `2px dashed ${COLORS.primary}`,
              backgroundColor: COLORS.overlay,
              cursor: CURSORS.move,
              position: 'relative',
            }}
          />
          
          {/* Resize Handles */}
          {RESIZE_HANDLES.map(renderResizeHandle)}
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '40px', minHeight: '200vh', ...commonTextStyle }}>
        <h2 style={commonTextStyle}>Sample Content</h2>
        <p style={commonTextStyle}>This is some content to demonstrate the screenshot functionality.</p>
        <div style={{ 
          backgroundColor: COLORS.darkBackground, 
          padding: '20px', 
          borderRadius: '8px',
          margin: '20px 0' 
        }}>
          <h3 style={commonTextStyle}>Select Area Feature</h3>
          <p style={commonTextStyle}>
            Scroll down to see more content. The area selection will work across the entire page.
          </p>
        </div>
        <div style={{ marginTop: '500px' }}>
          <h3 style={commonTextStyle}>More Content Below</h3>
          <p style={commonTextStyle}>Keep scrolling to test the screenshot on different parts of the page.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
