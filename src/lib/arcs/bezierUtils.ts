/**
 * Bezier Curve Utilities
 * 
 * Math functions for cubic Bezier curves used in arc rendering and analysis.
 */

import { Point2D, ArcHandle, IntermediatePoint } from './types';

/**
 * Evaluate a cubic Bezier curve at parameter t
 */
export function cubicBezier(t: number, p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): Point2D {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * First derivative of cubic Bezier curve at parameter t
 */
export function cubicBezierDerivative(t: number, p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): Point2D {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

/**
 * Second derivative of cubic Bezier curve at parameter t
 */
export function cubicBezierSecondDerivative(t: number, p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): Point2D {
  const u = 1 - t;
  return {
    x: 6 * u * (p2.x - 2 * p1.x + p0.x) + 6 * t * (p3.x - 2 * p2.x + p1.x),
    y: 6 * u * (p2.y - 2 * p1.y + p0.y) + 6 * t * (p3.y - 2 * p2.y + p1.y),
  };
}

/**
 * Third derivative of cubic Bezier curve (constant for cubic)
 * This is the "jerk" - rate of change of curvature
 * For a cubic Bezier, the third derivative is constant (independent of t)
 */
export function cubicBezierThirdDerivative(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): Point2D {
  // Third derivative of cubic Bezier is constant:
  // 6 * [(p3 - p0) - 3*(p2 - p1)]
  // = 6 * [p3 - 3*p2 + 3*p1 - p0]
  return {
    x: 6 * (p3.x - 3 * p2.x + 3 * p1.x - p0.x),
    y: 6 * (p3.y - 3 * p2.y + 3 * p1.y - p0.y),
  };
}

/**
 * Calculate signed curvature (κ) at parameter t
 * κ = (x'y'' - y'x'') / (x'² + y'²)^(3/2)
 * Positive = bending convex (outward), Negative = bending concave (inward)
 */
export function getCurvatureAt(t: number, p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D): number {
  const d1 = cubicBezierDerivative(t, p0, p1, p2, p3);
  const d2 = cubicBezierSecondDerivative(t, p0, p1, p2, p3);
  
  const cross = d1.x * d2.y - d1.y * d2.x;
  const denom = Math.pow(d1.x * d1.x + d1.y * d1.y, 1.5);
  
  return denom > 0.0001 ? cross / denom : 0;
}

/**
 * Calculate the derivative of curvature (jerk in curvature space) at parameter t
 * This measures how quickly the curvature is changing - detecting transitions and spikes
 * 
 * Formula: dκ/dt using the quotient rule on κ = (x'y'' - y'x'') / (x'² + y'²)^(3/2)
 * 
 * For simplicity and numerical stability, we use finite differences:
 * jerk ≈ (κ(t+Δt) - κ(t-Δt)) / (2Δt)
 */
export function getCurvatureJerkAt(
  t: number, 
  p0: Point2D, 
  p1: Point2D, 
  p2: Point2D, 
  p3: Point2D,
  delta: number = 0.01
): number {
  // Use central difference for better accuracy
  const tMinus = Math.max(0, t - delta);
  const tPlus = Math.min(1, t + delta);
  
  const kappaMinus = getCurvatureAt(tMinus, p0, p1, p2, p3);
  const kappaPlus = getCurvatureAt(tPlus, p0, p1, p2, p3);
  
  // Avoid division by zero at boundaries
  const actualDelta = tPlus - tMinus;
  if (actualDelta < 0.001) return 0;
  
  return (kappaPlus - kappaMinus) / actualDelta;
}

/**
 * Calculate distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Generate sample points along a Bezier curve
 */
export function sampleBezierCurve(
  points: Point2D[],
  handles: ArcHandle[],
  numSamples: number = 100
): Point2D[] {
  if (points.length < 2) return [];
  
  const result: Point2D[] = [];
  
  for (let seg = 0; seg < points.length - 1; seg++) {
    const p0 = points[seg];
    const p3 = points[seg + 1];
    
    // Find handles for this segment
    const h0 = handles.find(h => h.pointIndex === seg && h.side === 'right') || p0;
    const h1 = handles.find(h => h.pointIndex === seg + 1 && h.side === 'left') || p3;
    
    const segmentSamples = Math.floor(numSamples / (points.length - 1));
    
    for (let i = 0; i <= segmentSamples; i++) {
      const t = i / segmentSamples;
      result.push(cubicBezier(t, p0, h0, h1, p3));
    }
  }
  
  return result;
}

/**
 * Generate default handles for a set of through-points
 * Handles are positioned along the tangent direction with slight curvature offset
 */
export function generateDefaultHandles(points: Point2D[], curvatureHint: number = 0): ArcHandle[] {
  if (points.length < 2) return [];
  
  const handles: ArcHandle[] = [];
  const handleLength = 0.08; // 8% of normalized space - visible but not extreme
  
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const next = points[i + 1];
    
    // Calculate tangent direction
    let tx = 0, ty = 0;
    if (prev && next) {
      tx = next.x - prev.x;
      ty = next.y - prev.y;
    } else if (next) {
      tx = next.x - p.x;
      ty = next.y - p.y;
    } else if (prev) {
      tx = p.x - prev.x;
      ty = p.y - prev.y;
    }
    
    // Normalize tangent
    const len = Math.sqrt(tx * tx + ty * ty) || 1;
    tx /= len;
    ty /= len;
    
    // Perpendicular for curvature offset
    const perpX = -ty;
    const perpY = tx;
    const curveOffset = curvatureHint * 0.05;
    
    // Left handle (before this point)
    if (i > 0) {
      handles.push({
        pointIndex: i,
        side: 'left',
        x: p.x - tx * handleLength + perpX * curveOffset,
        y: p.y - ty * handleLength + perpY * curveOffset,
      });
    }
    
    // Right handle (after this point)
    if (i < points.length - 1) {
      handles.push({
        pointIndex: i,
        side: 'right',
        x: p.x + tx * handleLength + perpX * curveOffset,
        y: p.y + ty * handleLength + perpY * curveOffset,
      });
    }
  }
  
  return handles;
}

/**
 * Generate SVG path data for a Bezier curve through points with handles
 */
export function generateBezierSVGPath(
  points: Point2D[],
  handles: ArcHandle[],
  scale: number = 100 // For percentage-based SVG coordinates
): string {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x * scale} ${points[0].y * scale}`;
  
  for (let seg = 0; seg < points.length - 1; seg++) {
    const p0 = points[seg];
    const p3 = points[seg + 1];
    
    // Find handles
    const h0 = handles.find(h => h.pointIndex === seg && h.side === 'right');
    const h1 = handles.find(h => h.pointIndex === seg + 1 && h.side === 'left');
    
    // Use control points or fall back to through-points
    const cp1 = h0 || p0;
    const cp2 = h1 || p3;
    
    path += ` C ${cp1.x * scale} ${cp1.y * scale}, ${cp2.x * scale} ${cp2.y * scale}, ${p3.x * scale} ${p3.y * scale}`;
  }
  
  return path;
}

/**
 * Generate intermediate points between landmark points
 * These provide additional control for smoother curves
 * 
 * @param landmarkPoints - Array of landmark coordinates
 * @param enabled - Whether to generate intermediate points at all
 * @param countPerSegment - Number of intermediate points per segment (default: 1)
 */
export function generateIntermediatePoints(
  landmarkPoints: Point2D[],
  enabled: boolean = true,
  countPerSegment: number = 1
): IntermediatePoint[] {
  // If disabled or not enough points, return empty array
  if (!enabled || landmarkPoints.length < 2 || countPerSegment < 1) return [];
  
  const intermediates: IntermediatePoint[] = [];
  
  for (let seg = 0; seg < landmarkPoints.length - 1; seg++) {
    const p0 = landmarkPoints[seg];
    const p1 = landmarkPoints[seg + 1];
    
    // Create intermediate point(s) evenly spaced along segment
    for (let i = 0; i < countPerSegment; i++) {
      const t = (i + 1) / (countPerSegment + 1);
      const x = p0.x + (p1.x - p0.x) * t;
      const y = p0.y + (p1.y - p0.y) * t;
      
      intermediates.push({
        id: `mid-${seg}-${i}`,
        t,
        x,
        y,
        segmentIndex: seg,
      });
    }
  }
  
  return intermediates;
}

/**
 * Merge landmark points with intermediate points into a single ordered array
 * Returns the full path points in order: landmark, intermediate, landmark, intermediate, ...
 */
export function mergePointsWithIntermediates(
  landmarkPoints: Point2D[],
  intermediates: IntermediatePoint[]
): Point2D[] {
  if (landmarkPoints.length < 2) return landmarkPoints;
  
  const result: Point2D[] = [];
  
  for (let i = 0; i < landmarkPoints.length; i++) {
    result.push(landmarkPoints[i]);
    
    // Add intermediate after this landmark (if not last)
    if (i < landmarkPoints.length - 1) {
      const inter = intermediates.find(ip => ip.segmentIndex === i);
      if (inter) {
        result.push({ x: inter.x, y: inter.y });
      }
    }
  }
  
  return result;
}

/**
 * Generate handles for all points including intermediates
 * Intermediate points are marked with isIntermediate: true
 * 
 * Handle length is now proportional to the adjacent segment length,
 * so shorter arcs have handles that stay close to their control points.
 */
export function generateHandlesWithIntermediates(
  landmarkPoints: Point2D[],
  intermediates: IntermediatePoint[],
  baseHandleLength: number = 0.05
): ArcHandle[] {
  const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
  if (allPoints.length < 2) return [];
  
  const handles: ArcHandle[] = [];
  
  // Pre-calculate segment lengths for proportional handle sizing
  const segmentLengths: number[] = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    segmentLengths.push(Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)));
  }
  
  // Track which indices are intermediates (odd indices when merged)
  const intermediateIndices = new Set<number>();
  for (let i = 0; i < allPoints.length; i++) {
    // Intermediate points are at odd indices (1, 3, 5, ...)
    if (i % 2 === 1) {
      intermediateIndices.add(i);
    }
  }
  
  for (let i = 0; i < allPoints.length; i++) {
    const p = allPoints[i];
    const prev = allPoints[i - 1];
    const next = allPoints[i + 1];
    const isIntermediate = intermediateIndices.has(i);
    
    // Calculate tangent direction
    let tx = 0, ty = 0;
    if (prev && next) {
      tx = next.x - prev.x;
      ty = next.y - prev.y;
    } else if (next) {
      tx = next.x - p.x;
      ty = next.y - p.y;
    } else if (prev) {
      tx = p.x - prev.x;
      ty = p.y - prev.y;
    }
    
    const tangentLen = Math.sqrt(tx * tx + ty * ty) || 1;
    tx /= tangentLen;
    ty /= tangentLen;
    
    // Calculate handle length proportional to adjacent segment length
    // Use ~25% of the adjacent segment length, clamped between min and max
    const leftSegLen = i > 0 ? segmentLengths[i - 1] : 0;
    const rightSegLen = i < segmentLengths.length ? segmentLengths[i] : 0;
    
    // Base multiplier - shorter for intermediate points
    const multiplier = isIntermediate ? 0.2 : 0.25;
    const minLen = 0.008; // Minimum handle length
    const maxLen = baseHandleLength; // Maximum is the base length
    
    // Left handle - based on left segment length
    if (i > 0) {
      const hLen = Math.max(minLen, Math.min(maxLen, leftSegLen * multiplier));
      handles.push({
        pointIndex: i,
        side: 'left',
        x: p.x - tx * hLen,
        y: p.y - ty * hLen,
        isIntermediate,
      });
    }
    
    // Right handle - based on right segment length
    if (i < allPoints.length - 1) {
      const hLen = Math.max(minLen, Math.min(maxLen, rightSegLen * multiplier));
      handles.push({
        pointIndex: i,
        side: 'right',
        x: p.x + tx * hLen,
        y: p.y + ty * hLen,
        isIntermediate,
      });
    }
  }
  
  return handles;
}

/**
 * Add a new intermediate point at a specific position on the arc
 * Returns updated intermediates array
 */
export function addIntermediatePoint(
  existingIntermediates: IntermediatePoint[],
  segmentIndex: number,
  t: number,
  position: Point2D
): IntermediatePoint[] {
  const newPoint: IntermediatePoint = {
    id: `user-${Date.now()}`,
    t,
    x: position.x,
    y: position.y,
    segmentIndex,
  };
  
  return [...existingIntermediates, newPoint].sort((a, b) => {
    if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex;
    return a.t - b.t;
  });
}

/**
 * Find the closest point on a multi-segment Bezier curve to a given target point.
 * Returns the segment index, t parameter, and the projected (x, y) coordinates on the curve.
 * 
 * @param targetPoint - The point to project onto the curve (e.g., click position)
 * @param allPoints - All through-points of the curve (landmarks + intermediates merged)
 * @param handles - Bezier handles for the curve
 * @param numSamplesPerSegment - Number of samples per segment for accuracy (default: 50)
 */
export function findClosestPointOnBezier(
  targetPoint: Point2D,
  allPoints: Point2D[],
  handles: ArcHandle[],
  numSamplesPerSegment: number = 50
): { segmentIndex: number; t: number; x: number; y: number; distance: number } | null {
  if (allPoints.length < 2) return null;
  
  let closestResult: { segmentIndex: number; t: number; x: number; y: number; distance: number } | null = null;
  let closestDistance = Infinity;
  
  for (let seg = 0; seg < allPoints.length - 1; seg++) {
    const p0 = allPoints[seg];
    const p3 = allPoints[seg + 1];
    
    // Find handles for this segment
    const h0 = handles.find(h => h.pointIndex === seg && h.side === 'right');
    const h1 = handles.find(h => h.pointIndex === seg + 1 && h.side === 'left');
    
    // Control points (use through-points as fallback)
    const cp1: Point2D = h0 || p0;
    const cp2: Point2D = h1 || p3;
    
    // Sample the Bezier curve for this segment
    for (let i = 0; i <= numSamplesPerSegment; i++) {
      const t = i / numSamplesPerSegment;
      const curvePoint = cubicBezier(t, p0, cp1, cp2, p3);
      
      const dist = Math.sqrt(
        Math.pow(targetPoint.x - curvePoint.x, 2) +
        Math.pow(targetPoint.y - curvePoint.y, 2)
      );
      
      if (dist < closestDistance) {
        closestDistance = dist;
        closestResult = {
          segmentIndex: seg,
          t,
          x: curvePoint.x,
          y: curvePoint.y,
          distance: dist,
        };
      }
    }
  }
  
  return closestResult;
}

