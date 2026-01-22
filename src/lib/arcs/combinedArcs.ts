/**
 * Combined Arc Calculations
 * 
 * Computes metrics for combined arcs from baseline arc data.
 */

import { ArcMetrics, CombinedArcResult, CurvatureBreakdown, JerkBreakdown } from './types';
import { getSmoothnessLabel, getCurvatureLabelForArc } from './curvatureUtils';
import { COMBINED_ARC_COMPONENTS, CombinedArcId, BaselineArcId } from './constants';
import { ALL_ARC_DEFINITIONS } from './arcDefinitions';

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
 * Calculate a combined arc's metrics from component baseline arcs
 */
export function calculateCombinedArcMetrics(
  combinedArcId: CombinedArcId,
  baselineMetrics: Map<BaselineArcId, ArcMetrics>
): CombinedArcResult | null {
  const config = COMBINED_ARC_COMPONENTS[combinedArcId];
  if (!config) {
    console.warn(`Unknown combined arc ID: ${combinedArcId}`);
    return null;
  }

  const { components, invertSigns } = config;
  
  const componentMetrics: Array<{ arcId: string; curvatureIndex: number }> = [];
  const fullComponentMetrics: ArcMetrics[] = [];
  let totalCI = 0;
  
  for (let i = 0; i < components.length; i++) {
    const componentId = components[i];
    const shouldInvert = invertSigns[i];
    const metrics = baselineMetrics.get(componentId);
    
    if (!metrics) {
      return null;
    }
    
    const adjustedCI = shouldInvert ? -metrics.curvatureIndex : metrics.curvatureIndex;
    
    componentMetrics.push({
      arcId: componentId,
      curvatureIndex: adjustedCI,
    });
    
    fullComponentMetrics.push(metrics);
    totalCI += adjustedCI;
  }

  const validCount = componentMetrics.length;
  if (validCount === 0) return null;
  
  const avgCI = totalCI / validCount;
  
  const aggregateCurvature = aggregateCurvatureBreakdown(fullComponentMetrics);
  const aggregateJerk = aggregateJerkBreakdown(fullComponentMetrics);

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
 * Aggregate curvature breakdown from multiple component metrics
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
 * Aggregate jerk breakdown from multiple component metrics
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
 */
export function calculateAllCombinedArcs(
  baselineMetrics: Map<BaselineArcId, ArcMetrics>
): Map<CombinedArcId, CombinedArcResult> {
  const results = new Map<CombinedArcId, CombinedArcResult>();
  
  for (const combinedArcId of Object.keys(COMBINED_ARC_COMPONENTS) as CombinedArcId[]) {
    const result = calculateCombinedArcMetrics(combinedArcId, baselineMetrics);
    if (result) {
      results.set(combinedArcId, result);
    }
  }
  
  return results;
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
  displayOrder: number;
}

/**
 * Get all 23 arcs organized for display (14 baseline + 9 combined)
 */
export function getAllArcsForDisplay(): ArcDisplayData[] {
  const arcs: ArcDisplayData[] = [];
  
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
      profile: 'front',
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
