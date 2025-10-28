import React, { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';

interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const ScreenCaptureTool: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionArea, setSelectionArea] = useState<SelectionArea | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const startCapture = useCallback(() => {
    setIsCapturing(true);
    setIsSelecting(true);
    setSelectionArea(null);
  }, []);

  const cancelCapture = useCallback(() => {
    setIsCapturing(false);
    setIsSelecting(false);
    setSelectionArea(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return;
    
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectionArea({
      startX,
      startY,
      endX: startX,
      endY: startY,
    });
  }, [isSelecting]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionArea) return;

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setSelectionArea(prev => prev ? {
      ...prev,
      endX: currentX,
      endY: currentY,
    } : null);
  }, [isSelecting, selectionArea]);

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selectionArea) return;

    setIsSelecting(false);
    
    // Calculate the actual screen coordinates
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const actualStartX = selectionArea.startX + rect.left;
    const actualStartY = selectionArea.startY + rect.top;
    const actualEndX = selectionArea.endX + rect.left;
    const actualEndY = selectionArea.endY + rect.top;

    // Ensure we have a valid selection area
    const left = Math.min(actualStartX, actualEndX);
    const top = Math.min(actualStartY, actualEndY);
    const width = Math.abs(actualEndX - actualStartX);
    const height = Math.abs(actualEndY - actualStartY);

    if (width < 10 || height < 10) {
      cancelCapture();
      return;
    }

    try {
      // Capture the entire screen
      const canvas = await html2canvas(document.body, {
        allowTaint: true,
        useCORS: true,
        scale: 1,
        logging: false,
      });

      // Create a new canvas for the selected area
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = width;
      croppedCanvas.height = height;
      const ctx = croppedCanvas.getContext('2d');

      if (ctx) {
        // Draw the selected portion of the screen
        ctx.drawImage(
          canvas,
          left, top, width, height,
          0, 0, width, height
        );

        // Convert to blob and download
        croppedCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `screenshot-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    } catch (error) {
      console.error('Error capturing screen:', error);
    }

    cancelCapture();
  }, [isSelecting, selectionArea, cancelCapture]);

  const getSelectionStyle = () => {
    if (!selectionArea) return {};

    const left = Math.min(selectionArea.startX, selectionArea.endX);
    const top = Math.min(selectionArea.startY, selectionArea.endY);
    const width = Math.abs(selectionArea.endX - selectionArea.startX);
    const height = Math.abs(selectionArea.endY - selectionArea.startY);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  return (
    <div style={{ padding: '20px' }}>
      <button
        onClick={startCapture}
        disabled={isCapturing}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: isCapturing ? 'not-allowed' : 'pointer',
          opacity: isCapturing ? 0.6 : 1,
        }}
      >
        {isCapturing ? 'Capturing...' : 'Capture Screen'}
      </button>

      {isCapturing && (
        <div
          ref={overlayRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 9999,
            cursor: isSelecting ? 'crosshair' : 'default',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            {isSelecting ? 'Drag to select area' : 'Release to capture'}
          </div>

          {selectionArea && (
            <div
              style={{
                position: 'absolute',
                border: '2px solid #007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                ...getSelectionStyle(),
              }}
            />
          )}

          <button
            onClick={cancelCapture}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ScreenCaptureTool;
