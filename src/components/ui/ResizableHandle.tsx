// ResizableHandle.tsx — Drag handle for resizable panels
import { useEffect, useRef, useCallback } from 'react';

interface ResizableHandleProps {
  onResize: (deltaX: number) => void;
  side?: 'left' | 'right';
}

export default function ResizableHandle({ onResize, side = 'left' }: ResizableHandleProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(side === 'right' ? -delta : delta);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onResize, side]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
      className="shrink-0 group relative"
      style={{
        width: 6,
        cursor: 'col-resize',
        background: 'transparent',
        zIndex: 20,
      }}
    >
      <div
        className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 rounded-full transition-all group-hover:w-1"
        style={{ background: 'var(--border-bright)' }}
      />
    </div>
  );
}
