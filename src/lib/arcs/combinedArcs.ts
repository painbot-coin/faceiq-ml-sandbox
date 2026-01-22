/**
 * Combined Arc Calculations
 * 
 * Computes metrics for combined arcs from baseline arc data.
 * Combined arcs (#11-19) are computed on-demand from stored baseline arcs.
 * 
 * NEW: Proper curve stitching - component arcs are joined into one continuous
 * curve and metrics are computed on the full combined path, not averaged.
 */

import { ArcMetrics, CombinedArcResult, Point2D, ArcHandle, StoredArcData, CurvatureBreakdown, JerkBreakdown, IntermediatePoint } from './types';
import { calculateArcMetrics, getCurvatureLabel, getSmoothnessLabel, getCurvatureLabelForArc } from './curvatureUtils';
import { mergePointsWithIntermediates } from './bezierUtils';
import { COMBINED_ARC_COMPONENTS, CombinedArcId, BaselineArcId } from './constants';
import { ALL_ARC_DEFINITIONS, getArcDefinitionById } from './arcDefinitions';

/**
 * Combined arc display names
 */
export const COMBINED_ARC_NAMES: Record<CombinedArcId, string> = {
  'jaw-segment-a1': 'Jaw Segment A (Left)',
  'jaw-segment-a2': 'Jaw Segment A (Right)',
  'lower-face-contour': 'Lower Face Contour',
  'jaw-segment-b1': 'Jaw Segment B (Left)',
  'jaw-segment-b2': 'Jaw Segment B (Right)',
  'full-jaw-contour': 'Full Jaw Contour',
  'jaw-segment-c1': 'Jaw Segment C (Left)',
  'jaw-segment-c2': 'Jaw Segment C (Right)',
  'mandibular-contour': 'Mandibular Contour',
};

/**
 * Combined arc descriptions for UI display
 */
export const COMBINED_ARC_DESCRIPTIONS: Record<CombinedArcId, string> = {
  'jaw-segment-a1': 'Left upper jaw angle to chin corner (gonion + mandible)',
  'jaw-segment-a2': 'Right upper jaw angle to chin corner (gonion + mandible)',
  'lower-face-contour': 'Full wrap around lower facial contour from left to right gonion',
  'jaw-segment-b1': 'Left cheekbone to chin corner (cheek + gonion + mandible)',
  'jaw-segment-b2': 'Right cheekbone to chin corner (cheek + gonion + mandible)',
  'full-jaw-contour': 'Complete wrap from left cheek to right cheek',
  'jaw-segment-c1': 'Left cheek to gonion area (cheek + gonion)',
  'jaw-segment-c2': 'Right cheek to gonion area (cheek + gonion)',
  'mandibular-contour': 'Both mandibles including chin arc',
};

/**
 * Data needed to stitch and calculate combined arc metrics
 */
export interface CombinedArcInputData {
  /** Stored arc data (handles + intermediates) keyed by arc ID */
  storedArcs: Record<string, StoredArcData>;
  /** Normalized landmarks (0-1 coordinates) */
  landmarks: Record<string, { x: number; y: number }>;
}

/**
 * Calculate a combined arc's metrics by stitching component arcs into one curve
 * 
 * This is the mathematically correct approach - we join all component arcs
 * into a single continuous Bezier spline and compute metrics on the full curve.
 * 
 * @param combinedArcId - The combined arc ID
 * @param baselineMetrics - Map of baseline arc IDs to their calculated metrics (for component display)
 * @param inputData - Optional: stored arcs + landmarks for true curve stitching
 * @returns Combined arc result, or null if required data is missing
 */
export function calculateCombinedArcMetrics(
  combinedArcId: CombinedArcId,
  baselineMetrics: Map<BaselineArcId, ArcMetrics>,
  inputData?: CombinedArcInputData
): CombinedArcResult | null {
  const config = COMBINED_ARC_COMPONENTS[combinedArcId];
  if (!config) {
    console.warn(`Unknown combined arc ID: ${combinedArcId}`);
    return null;
  }

  const { components, invertSigns } = config;
  
  // Collect component metrics for display
  const componentMetrics: Array<{ arcId: string; curvatureIndex: number }> = [];
  
  for (let i = 0; i < components.length; i++) {
    const componentId = components[i];
    const shouldInvert = invertSigns[i];
    const metrics = baselineMetrics.get(componentId);
    
    if (!metrics) {
      // Missing component - can't compute combined arc
      return null;
    }
    
    const adjustedCI = shouldInvert ? -metrics.curvatureIndex : metrics.curvatureIndex;
    
    componentMetrics.push({
      arcId: componentId,
      curvatureIndex: adjustedCI,
    });
  }

  // If we have input data, compute TRUE combined metrics by stitching curves
  if (inputData) {
    const stitchedResult = stitchAndCalculateCombinedArc(
      combinedArcId,
      components,
      inputData.storedArcs,
      inputData.landmarks
    );
    
    if (stitchedResult) {
      // Use arc-specific thresholds for combined arcs
      const labelResult = getCurvatureLabelForArc(combinedArcId, stitchedResult.curvatureIndex);
      
      return {
        arcId: combinedArcId,
        name: COMBINED_ARC_NAMES[combinedArcId],
        components: components,
        curvatureIndex: stitchedResult.curvatureIndex,
        componentMetrics,
        label: labelResult.label,
        labelSecondary: labelResult.secondary,
        smoothnessLabel: stitchedResult.smoothnessLabel,
        curvature: stitchedResult.curvature,
        jerk: stitchedResult.jerk,
      };
    }
  }
  
  // Fallback: aggregate metrics from components (less accurate but works without full data)
  return calculateCombinedArcMetricsFallback(combinedArcId, baselineMetrics, componentMetrics);
}

/**
 * Stitch component arcs into one continuous curve and calculate metrics
 * 
 * This function:
 * 1. Gets points and handles for each component arc
 * 2. Determines the correct traversal order (find shared endpoints)
 * 3. Joins them into a single continuous spline
 * 4. Calculates metrics on the full combined curve
 */
function stitchAndCalculateCombinedArc(
  combinedArcId: CombinedArcId,
  componentIds: BaselineArcId[],
  storedArcs: Record<string, StoredArcData>,
  landmarks: Record<string, { x: number; y: number }>
): ArcMetrics | null {
  // Collect data for each component
  const componentData: Array<{
    arcId: string;
    points: Point2D[];
    handles: ArcHandle[];
    intermediates: IntermediatePoint[];
    startLandmark: string;
    endLandmark: string;
    throughPoints: string[];
  }> = [];
  
  for (const arcId of componentIds) {
    const arcDef = getArcDefinitionById(arcId);
    const arcData = storedArcs[arcId];
    
    if (!arcDef || !arcData) {
      return null;
    }
    
    // Get landmark points
    const landmarkPoints: Point2D[] = [];
    for (const key of arcDef.throughPoints) {
      const lm = landmarks[key];
      if (!lm) return null;
      // Normalize coordinates (handle 0-1024 range)
      const x = lm.x > 1 ? lm.x / 1024 : lm.x;
      const y = lm.y > 1 ? lm.y / 1024 : lm.y;
      landmarkPoints.push({ x, y });
    }
    
    // Convert intermediates
    const intermediates: IntermediatePoint[] = (arcData.intermediates || []).map(ip => ({
      id: ip.id,
      t: ip.t,
      x: ip.x,
      y: ip.y,
      segmentIndex: ip.segmentIndex,
    }));
    
    // Merge landmark points with intermediates
    const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
    
    componentData.push({
      arcId,
      points: allPoints,
      handles: arcData.handles || [],
      intermediates,
      startLandmark: arcDef.throughPoints[0],
      endLandmark: arcDef.throughPoints[arcDef.throughPoints.length - 1],
      throughPoints: arcDef.throughPoints,
    });
  }
  
  if (componentData.length === 0) {
    return null;
  }
  
  // Stitch components together
  // We need to find the correct order and direction for each component
  const stitchedPoints: Point2D[] = [];
  const stitchedHandles: ArcHandle[] = [];
  let currentPointIndex = 0;
  
  for (let i = 0; i < componentData.length; i++) {
    const comp = componentData[i];
    const isFirst = i === 0;
    
    // Determine if we need to reverse this component
    let needsReverse = false;
    
    if (!isFirst) {
      const prevComp = componentData[i - 1];
      const prevEnd = prevComp.endLandmark;
      
      // Check if this component's start connects to previous end
      if (comp.startLandmark !== prevEnd && comp.endLandmark === prevEnd) {
        needsReverse = true;
      }
      // Also check by comparing last point position
      else if (stitchedPoints.length > 0) {
        const lastPoint = stitchedPoints[stitchedPoints.length - 1];
        const compStart = comp.points[0];
        const compEnd = comp.points[comp.points.length - 1];
        
        const distToStart = Math.hypot(lastPoint.x - compStart.x, lastPoint.y - compStart.y);
        const distToEnd = Math.hypot(lastPoint.x - compEnd.x, lastPoint.y - compEnd.y);
        
        if (distToEnd < distToStart) {
          needsReverse = true;
        }
      }
    }
    
    // Get points and handles (possibly reversed)
    let points = [...comp.points];
    let handles = comp.handles.map(h => ({ ...h }));
    
    if (needsReverse) {
      points = points.reverse();
      
      // Reverse handle assignments
      const maxIdx = points.length - 1;
      handles = handles.map(h => ({
        ...h,
        pointIndex: maxIdx - h.pointIndex,
        side: h.side === 'left' ? 'right' : 'left' as 'left' | 'right',
      }));
    }
    
    // Skip first point if it overlaps with previous component's last point
    const skipFirst = !isFirst && stitchedPoints.length > 0;
    const startIdx = skipFirst ? 1 : 0;
    
    // Add points
    for (let j = startIdx; j < points.length; j++) {
      stitchedPoints.push(points[j]);
    }
    
    // Add handles with adjusted pointIndex
    for (const h of handles) {
      const adjustedIdx = h.pointIndex - (skipFirst ? 1 : 0) + currentPointIndex;
      if (adjustedIdx >= 0) {
        stitchedHandles.push({
          ...h,
          pointIndex: adjustedIdx,
        });
      }
    }
    
    currentPointIndex = stitchedPoints.length;
  }
  
  if (stitchedPoints.length < 2) {
    return null;
  }
  
  // Calculate metrics on the full stitched curve
  // Use average jerk config from components
  const metrics = calculateArcMetrics(
    stitchedPoints,
    stitchedHandles,
    false, // Don't invert - combined arcs handle this separately
    { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
    combinedArcId
  );
  
  return metrics;
}

/**
 * Fallback: aggregate metrics from components (used when full arc data isn't available)
 */
function calculateCombinedArcMetricsFallback(
  combinedArcId: CombinedArcId,
  baselineMetrics: Map<BaselineArcId, ArcMetrics>,
  componentMetrics: Array<{ arcId: string; curvatureIndex: number }>
): CombinedArcResult | null {
  const config = COMBINED_ARC_COMPONENTS[combinedArcId];
  const { components } = config;
  
  const fullComponentMetrics: ArcMetrics[] = [];
  let totalCI = 0;
  
  for (const compMetric of componentMetrics) {
    const metrics = baselineMetrics.get(compMetric.arcId as BaselineArcId);
    if (metrics) {
      fullComponentMetrics.push(metrics);
    }
    totalCI += compMetric.curvatureIndex;
  }
  
  const validCount = componentMetrics.length;
  if (validCount === 0) return null;
  
  const avgCI = totalCI / validCount;
  
  // Aggregate detailed metrics
  const aggregateCurvature = aggregateCurvatureBreakdown(fullComponentMetrics);
  const aggregateJerk = aggregateJerkBreakdown(fullComponentMetrics);

  // Use arc-specific thresholds for combined arcs
  const labelResult = getCurvatureLabelForArc(combinedArcId, avgCI);

  return {
    arcId: combinedArcId,
    name: COMBINED_ARC_NAMES[combinedArcId],
    components: components,
    curvatureIndex: avgCI,
    componentMetrics,
    label: labelResult.label,
    labelSecondary: labelResult.secondary,
    smoothnessLabel: aggregateJerk ? getSmoothnessLabel(aggregateJerk) : undefined,
    curvature: aggregateCurvature,
    jerk: aggregateJerk,
  };
}

/**
 * Aggregate curvature breakdown from multiple component metrics (fallback)
 */
function aggregateCurvatureBreakdown(components: ArcMetrics[]): CurvatureBreakdown | undefined {
  const curvatures = components.filter(m => m.curvature).map(m => m.curvature!);
  if (curvatures.length === 0) return undefined;
  
  const n = curvatures.length;
  return {
    mean: curvatures.reduce((sum, c) => sum + c.mean, 0) / n,
    max: Math.max(...curvatures.map(c => c.max)),
    min: Math.min(...curvatures.map(c => c.min)),
    maxAbs: Math.max(...curvatures.map(c => c.maxAbs)),
    variance: curvatures.reduce((sum, c) => sum + c.variance, 0) / n,
    stdDev: Math.sqrt(curvatures.reduce((sum, c) => sum + c.variance, 0) / n),
  };
}

/**
 * Aggregate jerk breakdown from multiple component metrics (fallback)
 */
function aggregateJerkBreakdown(components: ArcMetrics[]): JerkBreakdown | undefined {
  const jerks = components.filter(m => m.jerk).map(m => m.jerk!);
  if (jerks.length === 0) return undefined;
  
  const n = jerks.length;
  return {
    mean: jerks.reduce((sum, j) => sum + j.mean, 0) / n,
    max: Math.max(...jerks.map(j => j.max)),
    variance: jerks.reduce((sum, j) => sum + j.variance, 0) / n,
    stdDev: Math.sqrt(jerks.reduce((sum, j) => sum + j.variance, 0) / n),
    spikeCount: jerks.reduce((sum, j) => sum + j.spikeCount, 0),
    spikeLocations: [],
  };
}

/**
 * Calculate all combined arcs from baseline metrics
 * 
 * @param baselineMetrics - Map of baseline arc metrics
 * @param inputData - Optional: stored arcs + landmarks for true curve stitching
 */
export function calculateAllCombinedArcs(
  baselineMetrics: Map<BaselineArcId, ArcMetrics>,
  inputData?: CombinedArcInputData
): Map<CombinedArcId, CombinedArcResult> {
  const results = new Map<CombinedArcId, CombinedArcResult>();
  
  for (const combinedArcId of Object.keys(COMBINED_ARC_COMPONENTS) as CombinedArcId[]) {
    const result = calculateCombinedArcMetrics(combinedArcId, baselineMetrics, inputData);
    if (result) {
      results.set(combinedArcId, result);
    }
  }
  
  return results;
}

/**
 * Calculate symmetry difference between bilateral arc pairs
 * Lower values = more symmetric
 */
export function calculateSymmetryDifference(
  leftMetrics: ArcMetrics,
  rightMetrics: ArcMetrics
): number {
  return Math.abs(leftMetrics.curvatureIndex - rightMetrics.curvatureIndex);
}

/**
 * All 23 arcs organized for display (14 baseline + 9 combined)
 */
export interface ArcDisplayData {
  id: string;
  name: string;
  description: string;
  profile: 'front' | 'side';
  category: string;
  isBaseline: boolean;
  isCombined: boolean;
  /** Ordered number (1-23) */
  displayOrder: number;
}

/**
 * Get all 23 arcs organized for display (14 baseline + 9 combined)
 */
export function getAllArcsForDisplay(): ArcDisplayData[] {
  const arcs: ArcDisplayData[] = [];
  
  // Baseline arcs (1-14)
  const baselineOrder: Record<string, number> = {
    'hairline-arc': 1,
    'cheek-left-arc': 2,
    'cheek-right-arc': 3,
    'gonion-left-arc': 4,
    'gonion-right-arc': 5,
    'mandible-left-arc': 6,
    'mandible-right-arc': 7,
    'chin-arc': 8,
    'forehead-arc': 9,
    'submental-arc': 10,
    'nasal-bridge-arc': 11,
    'nose-tip-arc': 12,
    'upper-lip-arc': 13,
    'lower-lip-arc': 14,
  };
  
  for (const def of ALL_ARC_DEFINITIONS) {
    arcs.push({
      id: def.id,
      name: def.name,
      description: def.description,
      profile: def.profile,
      category: def.category,
      isBaseline: true,
      isCombined: false,
      displayOrder: baselineOrder[def.id] || 0,
    });
  }
  
  // Combined arcs (15-23)
  const combinedOrder: Record<CombinedArcId, number> = {
    'jaw-segment-a1': 15,
    'jaw-segment-a2': 16,
    'lower-face-contour': 17,
    'jaw-segment-b1': 18,
    'jaw-segment-b2': 19,
    'full-jaw-contour': 20,
    'jaw-segment-c1': 21,
    'jaw-segment-c2': 22,
    'mandibular-contour': 23,
  };
  
  for (const [id, order] of Object.entries(combinedOrder)) {
    const combinedId = id as CombinedArcId;
    arcs.push({
      id: combinedId,
      name: COMBINED_ARC_NAMES[combinedId],
      description: COMBINED_ARC_DESCRIPTIONS[combinedId],
      profile: 'front', // All combined arcs are front profile
      category: 'combined',
      isBaseline: false,
      isCombined: true,
      displayOrder: order,
    });
  }
  
  return arcs.sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Arc category groupings for UI sections
 */
export const ARC_CATEGORIES = {
  hairline: {
    label: 'Hairline',
    baselineArcs: ['hairline-arc'],
    combinedArcs: [],
  },
  cheek: {
    label: 'Cheek Contour',
    baselineArcs: ['cheek-left-arc', 'cheek-right-arc'],
    combinedArcs: [],
  },
  jaw: {
    label: 'Jaw',
    baselineArcs: ['gonion-left-arc', 'gonion-right-arc', 'mandible-left-arc', 'mandible-right-arc'],
    combinedArcs: [
      'jaw-segment-a1', 'jaw-segment-a2',
      'jaw-segment-b1', 'jaw-segment-b2', 
      'jaw-segment-c1', 'jaw-segment-c2',
    ],
  },
  chin: {
    label: 'Chin',
    baselineArcs: ['chin-arc'],
    combinedArcs: ['mandibular-contour'],
  },
  fullContour: {
    label: 'Full Contour',
    baselineArcs: [],
    combinedArcs: ['lower-face-contour', 'full-jaw-contour'],
  },
  forehead: {
    label: 'Forehead',
    baselineArcs: ['forehead-arc'],
    combinedArcs: [],
  },
  neck: {
    label: 'Neck/Submental',
    baselineArcs: ['submental-arc'],
    combinedArcs: [],
  },
  nose: {
    label: 'Nose',
    baselineArcs: ['nasal-bridge-arc', 'nose-tip-arc'],
    combinedArcs: [],
  },
  lips: {
    label: 'Lips',
    baselineArcs: ['upper-lip-arc', 'lower-lip-arc'],
    combinedArcs: [],
  },
} as const;

