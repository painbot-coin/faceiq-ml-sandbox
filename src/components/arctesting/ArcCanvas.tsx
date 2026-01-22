'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { NormalizedLandmarkMap } from '@/types/face';
import {
  ArcDefinition,
  ArcHandle,
  ArcMetrics,
  IntermediatePoint,
  formatCI,
  findClosestPointOnBezier,
} from '@/lib/arcs';
import { ArcTestingData } from '@/app/arcs/arc-testing-client';

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface ArcCanvasProps {
  imageUrl: string;
  landmarks: NormalizedLandmarkMap;
  arcDefinitions: ArcDefinition[];
  arcStates: Record<string, ArcTestingData>;
  selectedArcId: string | null;
  onSelectArc: (arcId: string | null) => void;
  onUpdateHandle: (arcId: string, handleIndex: number, x: number, y: number) => void;
  onUpdateIntermediate?: (arcId: string, intermediateId: string, x: number, y: number) => void;
  onAddIntermediate?: (arcId: string, segmentIndex: number, t: number, x: number, y: number) => void;
  onDeleteIntermediate?: (arcId: string, intermediateId: string) => void;
  onLandmarkUpdate?: (landmarkKey: string, x: number, y: number) => void;
  isLandmarkEditMode?: boolean;
  profileType: 'front' | 'side';
}

/** Generate SVG path for cubic Bezier curve */
function generateBezierPath(
  points: { x: number; y: number }[],
  handles: ArcHandle[],
  size: number
): string {
  if (points.length < 2) return '';
  
  const scaledPoints = points.map(p => ({ x: p.x * size, y: p.y * size }));
  const scaledHandles = handles.map(h => ({ ...h, x: h.x * size, y: h.y * size }));
  
  let path = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;
  
  for (let seg = 0; seg < scaledPoints.length - 1; seg++) {
    const p0 = scaledPoints[seg];
    const p3 = scaledPoints[seg + 1];
    
    const h0 = scaledHandles.find(h => h.pointIndex === seg && h.side === 'right');
    const h1 = scaledHandles.find(h => h.pointIndex === seg + 1 && h.side === 'left');
    
    const cp1 = h0 || p0;
    const cp2 = h1 || p3;
    
    path += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p3.x} ${p3.y}`;
  }
  
  return path;
}

/** Merge landmarks with intermediates */
function mergePointsWithIntermediates(
  landmarkPoints: { x: number; y: number }[],
  intermediates: IntermediatePoint[]
): { x: number; y: number }[] {
  if (landmarkPoints.length < 2) return landmarkPoints;
  
  const result: { x: number; y: number }[] = [];
  
  for (let i = 0; i < landmarkPoints.length; i++) {
    result.push(landmarkPoints[i]);
    
    if (i < landmarkPoints.length - 1) {
      const inter = intermediates.find(ip => ip.segmentIndex === i);
      if (inter) {
        result.push({ x: inter.x, y: inter.y });
      }
    }
  }
  
  return result;
}

export function ArcCanvas({
  imageUrl,
  landmarks,
  arcDefinitions,
  arcStates,
  selectedArcId,
  onSelectArc,
  onUpdateHandle,
  onUpdateIntermediate,
  onAddIntermediate,
  onDeleteIntermediate,
  onLandmarkUpdate,
  isLandmarkEditMode = false,
  profileType,
}: ArcCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [displaySize, setDisplaySize] = useState(600);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Zoom state
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, translateX: 0, translateY: 0 });
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedHandle, setDraggedHandle] = useState<{ arcId: string; handleIndex: number } | null>(null);
  const [draggedIntermediate, setDraggedIntermediate] = useState<{ arcId: string; intermediateId: string } | null>(null);
  const [draggedLandmark, setDraggedLandmark] = useState<string | null>(null);
  
  // Cursor position tracking with ref for sync updates
  const cursorPosRef = useRef<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  
  // Calculate zoom for selected arc
  const calculateZoomForArc = useCallback((arcId: string): ZoomState => {
    const arcDef = arcDefinitions.find(d => d.id === arcId);
    if (!arcDef) return { scale: 1, translateX: 0, translateY: 0 };
    
    const arcState = arcStates[arcId];
    if (!arcState) return { scale: 1, translateX: 0, translateY: 0 };
    
    // Get all points for the arc (landmarks + intermediates)
    const landmarkPoints = arcDef.throughPoints
      .map(key => landmarks[key])
      .filter((p): p is { x: number; y: number } => p !== undefined);
    
    const allPoints = mergePointsWithIntermediates(landmarkPoints, arcState.intermediates);
    const handles = arcState.handles;
    
    // Get bounding box of all points and handles
    const allXs = [...allPoints.map(p => p.x), ...handles.map(h => h.x)];
    const allYs = [...allPoints.map(p => p.y), ...handles.map(h => h.y)];
    
    const minX = Math.min(...allXs);
    const maxX = Math.max(...allXs);
    const minY = Math.min(...allYs);
    const maxY = Math.max(...allYs);
    
    // Add padding (20% of the arc size on each side)
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = Math.max(width, height) * 0.35;
    
    const paddedMinX = minX - padding;
    const paddedMaxX = maxX + padding;
    const paddedMinY = minY - padding;
    const paddedMaxY = maxY + padding;
    
    const paddedWidth = paddedMaxX - paddedMinX;
    const paddedHeight = paddedMaxY - paddedMinY;
    
    // Calculate scale to fit the arc area
    const scaleX = 1 / paddedWidth;
    const scaleY = 1 / paddedHeight;
    const scale = Math.min(scaleX, scaleY, 3); // Max zoom of 3x
    
    // Calculate center of the arc in normalized coords
    const centerX = (paddedMinX + paddedMaxX) / 2;
    const centerY = (paddedMinY + paddedMaxY) / 2;
    
    // Calculate translation to center the arc
    const translateX = (0.5 - centerX) * displaySize * scale;
    const translateY = (0.5 - centerY) * displaySize * scale;
    
    return { scale, translateX, translateY };
  }, [arcDefinitions, arcStates, landmarks, displaySize]);
  
  // Handle zoom toggle
  const toggleZoom = useCallback(() => {
    if (isZoomedIn) {
      setZoom({ scale: 1, translateX: 0, translateY: 0 });
      setIsZoomedIn(false);
    } else if (selectedArcId) {
      const newZoom = calculateZoomForArc(selectedArcId);
      setZoom(newZoom);
      setIsZoomedIn(true);
    }
  }, [isZoomedIn, selectedArcId, calculateZoomForArc]);
  
  // Auto-zoom when selecting an arc (optional - can be toggled)
  useEffect(() => {
    if (selectedArcId && !isDragging) {
      const newZoom = calculateZoomForArc(selectedArcId);
      setZoom(newZoom);
      setIsZoomedIn(true);
    } else if (!selectedArcId) {
      setZoom({ scale: 1, translateX: 0, translateY: 0 });
      setIsZoomedIn(false);
    }
  }, [selectedArcId, calculateZoomForArc, isDragging]);
  
  // Update display size based on container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const size = Math.min(rect.width - 32, rect.height - 32, 800);
        setDisplaySize(Math.max(400, size));
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // Convert screen to SVG coordinates (normalized 0-1)
  const screenToSvgCoords = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!svgRef.current) return null;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return null;
    
    const svgPt = pt.matrixTransform(screenCTM.inverse());
    
    return {
      x: svgPt.x / displaySize,
      y: svgPt.y / displaySize,
    };
  }, [displaySize]);
  
  // Document-level drag handlers for smooth tracking
  useEffect(() => {
    if (!isDragging) {
      cursorPosRef.current = null;
      setCursorPos(null);
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const pos = { x: e.clientX, y: e.clientY };
      cursorPosRef.current = pos;
      setCursorPos(pos);
      
      const coords = screenToSvgCoords(e.clientX, e.clientY);
      if (!coords) return;
      
      // Handle handle dragging
      if (draggedHandle) {
        onUpdateHandle(draggedHandle.arcId, draggedHandle.handleIndex, coords.x, coords.y);
      }
      // Handle intermediate point dragging
      else if (draggedIntermediate && onUpdateIntermediate) {
        onUpdateIntermediate(draggedIntermediate.arcId, draggedIntermediate.intermediateId, coords.x, coords.y);
      }
      // Handle landmark dragging
      else if (draggedLandmark && onLandmarkUpdate) {
        // Clamp to valid range (0-1)
        const clampedX = Math.max(0, Math.min(1, coords.x));
        const clampedY = Math.max(0, Math.min(1, coords.y));
        onLandmarkUpdate(draggedLandmark, clampedX, clampedY);
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging
        
        const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        cursorPosRef.current = pos;
        setCursorPos(pos);
        
        const coords = screenToSvgCoords(e.touches[0].clientX, e.touches[0].clientY);
        if (!coords) return;
        
        // Handle handle dragging
        if (draggedHandle) {
          onUpdateHandle(draggedHandle.arcId, draggedHandle.handleIndex, coords.x, coords.y);
        }
        // Handle intermediate point dragging
        else if (draggedIntermediate && onUpdateIntermediate) {
          onUpdateIntermediate(draggedIntermediate.arcId, draggedIntermediate.intermediateId, coords.x, coords.y);
        }
        // Handle landmark dragging
        else if (draggedLandmark && onLandmarkUpdate) {
          const clampedX = Math.max(0, Math.min(1, coords.x));
          const clampedY = Math.max(0, Math.min(1, coords.y));
          onLandmarkUpdate(draggedLandmark, clampedX, clampedY);
        }
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedHandle(null);
      setDraggedIntermediate(null);
      setDraggedLandmark(null);
      cursorPosRef.current = null;
      setCursorPos(null);
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
      setDraggedHandle(null);
      setDraggedIntermediate(null);
      setDraggedLandmark(null);
      cursorPosRef.current = null;
      setCursorPos(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, draggedHandle, draggedIntermediate, draggedLandmark, screenToSvgCoords, onUpdateHandle, onUpdateIntermediate, onLandmarkUpdate]);
  
  // Start dragging handle (mouse)
  const startHandleDrag = useCallback((e: React.MouseEvent, arcId: string, handleIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = { x: e.clientX, y: e.clientY };
    cursorPosRef.current = pos;
    setCursorPos(pos);
    setDraggedHandle({ arcId, handleIndex });
    setDraggedIntermediate(null);
    setIsDragging(true);
    onSelectArc(arcId);
  }, [onSelectArc]);
  
  // Start dragging handle (touch)
  const startHandleTouchDrag = useCallback((e: React.TouchEvent, arcId: string, handleIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      cursorPosRef.current = pos;
      setCursorPos(pos);
    }
    setDraggedHandle({ arcId, handleIndex });
    setDraggedIntermediate(null);
    setIsDragging(true);
    onSelectArc(arcId);
  }, [onSelectArc]);
  
  // Start dragging intermediate point (mouse)
  const startIntermediateDrag = useCallback((e: React.MouseEvent, arcId: string, intermediateId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = { x: e.clientX, y: e.clientY };
    cursorPosRef.current = pos;
    setCursorPos(pos);
    setDraggedIntermediate({ arcId, intermediateId });
    setDraggedHandle(null);
    setIsDragging(true);
    onSelectArc(arcId);
  }, [onSelectArc]);
  
  // Start dragging intermediate point (touch)
  const startIntermediateTouchDrag = useCallback((e: React.TouchEvent, arcId: string, intermediateId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      cursorPosRef.current = pos;
      setCursorPos(pos);
    }
    setDraggedIntermediate({ arcId, intermediateId });
    setDraggedHandle(null);
    setDraggedLandmark(null);
    setIsDragging(true);
    onSelectArc(arcId);
  }, [onSelectArc]);
  
  // Start dragging landmark (mouse)
  const startLandmarkDrag = useCallback((e: React.MouseEvent, landmarkKey: string) => {
    if (!isLandmarkEditMode || !onLandmarkUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = { x: e.clientX, y: e.clientY };
    cursorPosRef.current = pos;
    setCursorPos(pos);
    setDraggedLandmark(landmarkKey);
    setDraggedHandle(null);
    setDraggedIntermediate(null);
    setIsDragging(true);
  }, [isLandmarkEditMode, onLandmarkUpdate]);
  
  // Start dragging landmark (touch)
  const startLandmarkTouchDrag = useCallback((e: React.TouchEvent, landmarkKey: string) => {
    if (!isLandmarkEditMode || !onLandmarkUpdate) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      const pos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      cursorPosRef.current = pos;
      setCursorPos(pos);
    }
    setDraggedLandmark(landmarkKey);
    setDraggedHandle(null);
    setDraggedIntermediate(null);
    setIsDragging(true);
  }, [isLandmarkEditMode, onLandmarkUpdate]);
  
  // Get tooltip metrics
  const tooltipMetrics = useMemo(() => {
    if (!isDragging) return null;
    const arcId = draggedHandle?.arcId || draggedIntermediate?.arcId;
    if (!arcId) return null;
    const arcState = arcStates[arcId];
    return arcState?.metrics || null;
  }, [isDragging, draggedHandle, draggedIntermediate, arcStates]);
  
  // Handle click on background to deselect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking the background, not an arc or handle
    if (e.target === e.currentTarget) {
      onSelectArc(null);
    }
  }, [onSelectArc]);
  
  // Handle right-click on arc to add intermediate point
  const handleArcRightClick = useCallback((e: React.MouseEvent, arcDef: ArcDefinition) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!onAddIntermediate) return;
    
    const arcState = arcStates[arcDef.id];
    if (!arcState) return;
    
    // Get click coordinates in normalized space
    const coords = screenToSvgCoords(e.clientX, e.clientY);
    if (!coords) return;
    
    // Get landmark points
    const landmarkPoints = arcDef.throughPoints
      .map(key => landmarks[key])
      .filter((p): p is { x: number; y: number } => p !== undefined);
    
    if (landmarkPoints.length < 2) return;
    
    // Get all points and handles for the current arc
    const allPoints = mergePointsWithIntermediates(landmarkPoints, arcState.intermediates);
    const { handles } = arcState;
    
    // Find the closest point ON the actual Bezier curve to the click position
    const closestOnCurve = findClosestPointOnBezier(coords, allPoints, handles);
    
    if (!closestOnCurve) return;
    
    // Add intermediate at the projected position on the curve
    onAddIntermediate(arcDef.id, closestOnCurve.segmentIndex, closestOnCurve.t, closestOnCurve.x, closestOnCurve.y);
  }, [arcStates, landmarks, onAddIntermediate, screenToSvgCoords]);
  
  // Render a single arc
  const renderArc = useCallback((arcDef: ArcDefinition) => {
    const arcState = arcStates[arcDef.id];
    if (!arcState) return null;
    
    // Get landmark points
    const landmarkPoints = arcDef.throughPoints
      .map(key => landmarks[key])
      .filter((p): p is { x: number; y: number } => p !== undefined);
    
    if (landmarkPoints.length < arcDef.throughPoints.length) return null;
    
    const allPoints = mergePointsWithIntermediates(landmarkPoints, arcState.intermediates);
    if (allPoints.length < 2) return null;
    
    const { handles, intermediates, metrics } = arcState;
    const isSelected = selectedArcId === arcDef.id;
    // Always show handles for the selected arc
    const showHandles = isSelected;
    
    const scaledPoints = allPoints.map(p => ({ x: p.x * displaySize, y: p.y * displaySize }));
    const scaledHandles = handles.map(h => ({ ...h, x: h.x * displaySize, y: h.y * displaySize }));
    const scaledIntermediates = intermediates.map(ip => ({ ...ip, x: ip.x * displaySize, y: ip.y * displaySize }));
    
    const pathD = generateBezierPath(allPoints, handles, displaySize);
    if (!pathD) return null;
    
    // Scale handle sizes based on chord length - match landmarking sizes
    const firstPoint = scaledPoints[0];
    const lastPoint = scaledPoints[scaledPoints.length - 1];
    const chordLength = Math.sqrt(
      Math.pow(lastPoint.x - firstPoint.x, 2) +
      Math.pow(lastPoint.y - firstPoint.y, 2)
    );
    // Same scaling as ArcOverlay in landmarking: range 2.5-6px
    const baseHandleRadius = Math.max(2.5, Math.min(6, chordLength * 0.027));
    const draggedHandleRadius = baseHandleRadius * 1.25;
    const intermediateRadius = baseHandleRadius * 0.75;
    const draggedIntermediateRadius = intermediateRadius * 1.33;
    
    return (
      <g key={arcDef.id}>
        {/* Chord reference line - very thin */}
        <line
          x1={scaledPoints[0].x}
          y1={scaledPoints[0].y}
          x2={scaledPoints[scaledPoints.length - 1].x}
          y2={scaledPoints[scaledPoints.length - 1].y}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={0.25}
          strokeDasharray="2,2"
        />
        
        {/* Invisible thick hit area for easier clicking */}
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectArc(arcDef.id);
          }}
          onContextMenu={(e) => handleArcRightClick(e, arcDef)}
        />
        
        {/* Arc curve (visible) */}
        <path
          d={pathD}
          fill="none"
          stroke={isSelected ? '#fbbf24' : 'rgba(251, 191, 36, 0.7)'}
          strokeWidth={isSelected ? 2 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="3,3"
          style={{ pointerEvents: 'none' }}
        />
        
        {/* Handle connection lines - thin */}
        {showHandles && scaledHandles.map((handle, idx) => {
          const point = scaledPoints[handle.pointIndex];
          if (!point) return null;
          
          return (
            <line
              key={`line-${idx}`}
              x1={point.x}
              y1={point.y}
              x2={handle.x}
              y2={handle.y}
              stroke="rgba(168, 85, 247, 0.25)"
              strokeWidth={0.25}
              style={{ pointerEvents: 'none' }}
            />
          );
        })}
        
        {/* Intermediate points (blue dots - draggable, right-click to delete) */}
        {showHandles && scaledIntermediates.map((ip) => {
          const isThisDragged = draggedIntermediate?.arcId === arcDef.id && draggedIntermediate?.intermediateId === ip.id;
          
          return (
            <circle
              key={`intermediate-${ip.id}`}
              cx={ip.x}
              cy={ip.y}
              r={isThisDragged ? draggedIntermediateRadius : intermediateRadius}
              fill={isThisDragged ? '#60a5fa' : '#3b82f6'}
              stroke="white"
              strokeWidth={1}
              style={{ 
                cursor: isThisDragged ? 'grabbing' : 'grab', 
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
              onMouseDown={(e) => startIntermediateDrag(e, arcDef.id, ip.id)}
              onTouchStart={(e) => startIntermediateTouchDrag(e, arcDef.id, ip.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteIntermediate?.(arcDef.id, ip.id);
              }}
            />
          );
        })}
        
        {/* Draggable handle circles (purple) */}
        {showHandles && scaledHandles.map((handle, idx) => {
          const isThisDragged = draggedHandle?.arcId === arcDef.id && draggedHandle?.handleIndex === idx;
          
          return (
            <circle
              key={`handle-${idx}`}
              cx={handle.x}
              cy={handle.y}
              r={isThisDragged ? draggedHandleRadius : baseHandleRadius}
              fill={isThisDragged ? '#c084fc' : '#a78bfa'}
              stroke="white"
              strokeWidth={1}
              style={{ 
                cursor: isThisDragged ? 'grabbing' : 'grab', 
                pointerEvents: 'auto',
                touchAction: 'none',
              }}
              onMouseDown={(e) => startHandleDrag(e, arcDef.id, idx)}
              onTouchStart={(e) => startHandleTouchDrag(e, arcDef.id, idx)}
            />
          );
        })}
        
        {/* Arc label when selected */}
        {isSelected && metrics && (
          <g style={{ pointerEvents: 'none' }}>
            <text
              x={scaledPoints[0].x}
              y={scaledPoints[0].y - 12}
              fill="white"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              {arcDef.name}
            </text>
            <text
              x={(scaledPoints[0].x + scaledPoints[scaledPoints.length - 1].x) / 2}
              y={(scaledPoints[0].y + scaledPoints[scaledPoints.length - 1].y) / 2 - 18}
              fill="#fbbf24"
              fontSize="13"
              fontWeight="700"
              textAnchor="middle"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              CI: {formatCI(metrics.curvatureIndex)}
            </text>
          </g>
        )}
      </g>
    );
  }, [arcStates, landmarks, selectedArcId, displaySize, draggedHandle, draggedIntermediate, onSelectArc, startHandleDrag, startHandleTouchDrag, startIntermediateDrag, startIntermediateTouchDrag, handleArcRightClick]);
  
  // Render landmark dots
  const renderLandmarks = useMemo(() => {
    // Determine which landmarks are used by arcs for highlighting
    const usedLandmarkKeys = new Set<string>();
    arcDefinitions.forEach(arcDef => {
      arcDef.throughPoints.forEach(key => usedLandmarkKeys.add(key));
    });
    
    return Object.entries(landmarks).map(([key, coords]) => {
      const isUsedByArc = usedLandmarkKeys.has(key);
      const isDraggingThis = draggedLandmark === key;
      const isEditable = isLandmarkEditMode && onLandmarkUpdate;
      
      // Larger radius in edit mode for easier grabbing
      const baseRadius = isLandmarkEditMode ? 3.5 : 1.5;
      const radius = isDraggingThis ? baseRadius * 1.3 : baseRadius;
      
      // Different styling for edit mode
      let fill = 'rgba(255, 255, 255, 0.8)';
      let stroke = 'rgba(0, 0, 0, 0.3)';
      let strokeWidth = 0.25;
      
      if (isLandmarkEditMode) {
        if (isDraggingThis) {
          fill = '#34d399'; // Emerald for dragging
          stroke = 'white';
          strokeWidth = 1.5;
        } else if (isUsedByArc) {
          fill = '#10b981'; // Green for arc landmarks
          stroke = 'white';
          strokeWidth = 1;
        } else {
          fill = '#6b7280'; // Gray for unused landmarks
          stroke = 'white';
          strokeWidth = 0.75;
        }
      }
      
      return (
        <circle
          key={key}
          cx={coords.x * displaySize}
          cy={coords.y * displaySize}
          r={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={{ 
            pointerEvents: isEditable ? 'auto' : 'none',
            cursor: isEditable ? (isDraggingThis ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
            transition: isDraggingThis ? 'none' : 'r 0.1s, fill 0.1s',
          }}
          onMouseDown={(e) => startLandmarkDrag(e, key)}
          onTouchStart={(e) => startLandmarkTouchDrag(e, key)}
        >
          {isLandmarkEditMode && (
            <title>{key}</title>
          )}
        </circle>
      );
    });
  }, [landmarks, displaySize, isLandmarkEditMode, onLandmarkUpdate, draggedLandmark, arcDefinitions, startLandmarkDrag, startLandmarkTouchDrag]);
  
  // Reset image loaded state when URL changes
  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);
  
  // Transform style for zoom
  const zoomTransform = useMemo(() => ({
    transform: `scale(${zoom.scale}) translate(${zoom.translateX / zoom.scale}px, ${zoom.translateY / zoom.scale}px)`,
    transformOrigin: 'center center',
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  }), [zoom, isDragging]);
  
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
      onClick={handleBackgroundClick}
    >
      <div
        className="relative bg-black rounded-xl overflow-hidden shadow-2xl"
        style={{ width: displaySize, height: displaySize }}
      >
        {/* Zoomable container */}
        <div 
          className="absolute inset-0"
          style={zoomTransform}
        >
          {/* Face image */}
          <img
            src={imageUrl}
            alt="Face"
            className="absolute inset-0 w-full h-full object-cover"
            crossOrigin="anonymous"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)} // Still show canvas even if image fails
            style={{ display: imageLoaded ? 'block' : 'none' }}
          />
          
          {/* Loading placeholder */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          
          {/* SVG overlay for arcs and landmarks */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full"
            viewBox={`0 0 ${displaySize} ${displaySize}`}
            preserveAspectRatio="xMidYMid meet"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Render all arcs */}
            {arcDefinitions.map(renderArc)}
            
            {/* Render landmark dots */}
            {renderLandmarks}
          </svg>
        </div>
        
        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleZoom();
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              isZoomedIn 
                ? 'bg-amber-500/80 text-white' 
                : 'bg-black/60 text-white/80 hover:bg-black/80'
            }`}
            title={isZoomedIn ? 'Zoom out' : 'Zoom to arc'}
          >
            {isZoomedIn ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
          </button>
        </div>
        
        {/* Profile indicator */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="px-2 py-1 bg-black/60 rounded text-xs text-white/80 font-medium">
            {profileType === 'front' ? 'Front Profile' : 'Side Profile'}
          </div>
          {isLandmarkEditMode && (
            <div className="px-2 py-1 bg-emerald-500/80 rounded text-xs text-white font-medium animate-pulse">
              Edit Landmarks
            </div>
          )}
        </div>
        
        {/* Instructions hint */}
        {(selectedArcId || isLandmarkEditMode) && (
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-[10px] text-white/60">
            {isLandmarkEditMode 
              ? 'Drag landmarks to adjust • Green = used by arcs'
              : 'Drag handles • Right-click arc to add • Right-click point to delete'}
          </div>
        )}
      </div>
      
      {/* Drag tooltip - shows CI value while dragging handle/intermediate, or landmark key while dragging landmark */}
      {isDragging && cursorPos && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] px-2.5 py-1.5 bg-black/95 rounded-lg text-xs pointer-events-none whitespace-nowrap shadow-xl"
          style={{
            left: cursorPos.x + 16,
            top: cursorPos.y - 12,
          }}
        >
          {draggedLandmark ? (
            <>
              <span className="text-emerald-400 font-bold">{draggedLandmark}</span>
              <span className="text-white/50 ml-2">
                ({landmarks[draggedLandmark]?.x.toFixed(3)}, {landmarks[draggedLandmark]?.y.toFixed(3)})
              </span>
            </>
          ) : tooltipMetrics ? (
            <>
              <span className="text-amber-400 font-bold">{formatCI(tooltipMetrics.curvatureIndex)}</span>
              <span className="text-white/50 ml-2">{tooltipMetrics.label}</span>
            </>
          ) : null}
        </div>,
        document.body
      )}
    </div>
  );
}
