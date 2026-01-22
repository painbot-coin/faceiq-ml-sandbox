/**
 * Curvature Calculation Utilities
 * 
 * Calculate Curvature Index (CI) and Jerk metrics (f‴) for facial arcs.
 */

import { 
  Point2D, 
  ArcHandle, 
  ArcMetrics, 
  ArcDiagnosticMetrics, 
  CurvatureBreakdown, 
  JerkBreakdown,
  JerkConfig,
  DEFAULT_JERK_CONFIG 
} from './types';
import { 
  cubicBezier, 
  cubicBezierDerivative, 
  cubicBezierSecondDerivative, 
  distance,
  getCurvatureJerkAt 
} from './bezierUtils';
import { getCurvatureLabelForArc as _getCurvatureLabelForArc } from './arcThresholds';

/**
 * Calculate curvature (κ) at parameter t for a segment
 */
function getCurvatureAtSegment(
  t: number,
  p0: Point2D,
  h0: Point2D,
  h1: Point2D,
  p3: Point2D
): number {
  const d1 = cubicBezierDerivative(t, p0, h0, h1, p3);
  const d2 = cubicBezierSecondDerivative(t, p0, h0, h1, p3);
  
  const cross = d1.x * d2.y - d1.y * d2.x;
  const denom = Math.pow(d1.x * d1.x + d1.y * d1.y, 1.5);
  
  return denom > 0.0001 ? cross / denom : 0;
}

/**
 * Calculate curvature breakdown (f″ metrics)
 */
export function calculateCurvatureBreakdown(curvatureSamples: number[]): CurvatureBreakdown {
  if (curvatureSamples.length === 0) {
    return { mean: 0, max: 0, min: 0, maxAbs: 0, variance: 0, stdDev: 0 };
  }
  
  const mean = curvatureSamples.reduce((sum, k) => sum + k, 0) / curvatureSamples.length;
  const max = Math.max(...curvatureSamples);
  const min = Math.min(...curvatureSamples);
  const maxAbs = Math.max(...curvatureSamples.map(k => Math.abs(k)));
  
  const squaredDiffs = curvatureSamples.map(k => Math.pow(k - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / curvatureSamples.length;
  const stdDev = Math.sqrt(variance);
  
  return { mean, max, min, maxAbs, variance, stdDev };
}

/**
 * Calculate jerk breakdown (f‴ metrics) - measures smoothness/roughness
 */
export function calculateJerkBreakdown(
  jerkSamples: number[],
  tValues: number[],
  spikeThreshold: number = 2.0
): JerkBreakdown {
  if (jerkSamples.length === 0) {
    return { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] };
  }
  
  const absJerk = jerkSamples.map(j => Math.abs(j));
  const mean = absJerk.reduce((sum, j) => sum + j, 0) / absJerk.length;
  const max = Math.max(...absJerk);
  
  const signedMean = jerkSamples.reduce((sum, j) => sum + j, 0) / jerkSamples.length;
  const squaredDiffs = jerkSamples.map(j => Math.pow(j - signedMean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / jerkSamples.length;
  const stdDev = Math.sqrt(variance);
  
  const spikeLocations: number[] = [];
  for (let i = 0; i < absJerk.length; i++) {
    if (absJerk[i] > spikeThreshold) {
      spikeLocations.push(tValues[i]);
    }
  }
  
  return {
    mean,
    max,
    variance,
    stdDev,
    spikeCount: spikeLocations.length,
    spikeLocations,
  };
}

/**
 * Calculate diagnostic metrics (Max Curvature, Curvature Variance)
 * @deprecated Use calculateCurvatureBreakdown and calculateJerkBreakdown instead
 */
export function calculateDiagnosticMetrics(
  curvatureSamples: number[]
): ArcDiagnosticMetrics {
  if (curvatureSamples.length === 0) {
    return {
      maxCurvatureAbs: 0,
      curvatureVariance: 0,
      curvatureStdDev: 0,
    };
  }
  
  const absValues = curvatureSamples.map(k => Math.abs(k));
  const maxCurvatureAbs = Math.max(...absValues);
  
  const mean = curvatureSamples.reduce((sum, k) => sum + k, 0) / curvatureSamples.length;
  const squaredDiffs = curvatureSamples.map(k => Math.pow(k - mean, 2));
  const curvatureVariance = squaredDiffs.reduce((sum, d) => sum + d, 0) / curvatureSamples.length;
  const curvatureStdDev = Math.sqrt(curvatureVariance);
  
  return {
    maxCurvatureAbs,
    curvatureVariance,
    curvatureStdDev,
  };
}

/**
 * Calculate all arc metrics (CI, jerk, etc.)
 */
export function calculateArcMetrics(
  points: Point2D[],
  handles: ArcHandle[],
  invertSign: boolean = false,
  jerkConfig: Partial<JerkConfig> = {},
  arcId?: string
): ArcMetrics {
  const config = { ...DEFAULT_JERK_CONFIG, ...jerkConfig };
  
  const emptyMetrics: ArcMetrics = {
    curvatureIndex: 0,
    maxCurvature: 0,
    arcChordRatio: 1,
    label: 'N/A',
    smoothnessLabel: 'N/A',
    curvature: { mean: 0, max: 0, min: 0, maxAbs: 0, variance: 0, stdDev: 0 },
    jerk: { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] },
    diagnostics: { maxCurvatureAbs: 0, curvatureVariance: 0, curvatureStdDev: 0 },
  };
  
  if (points.length < 2) {
    return emptyMetrics;
  }
  
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const chordLength = distance(startPoint, endPoint);
  
  if (chordLength < 0.0001) {
    return emptyMetrics;
  }
  
  let arcLength = 0;
  let totalSignedCurvature = 0;
  let maxCurvature = 0;
  
  const curvatureSamples: number[] = [];
  const jerkSamples: number[] = [];
  const tValues: number[] = [];
  
  const numSegments = points.length - 1;
  const samplesPerSegment = 50;
  
  for (let seg = 0; seg < numSegments; seg++) {
    const p0 = points[seg];
    const p3 = points[seg + 1];
    
    const h0 = handles.find(h => h.pointIndex === seg && h.side === 'right') || p0;
    const h1 = handles.find(h => h.pointIndex === seg + 1 && h.side === 'left') || p3;
    
    for (let i = 0; i < samplesPerSegment; i++) {
      const t1 = i / samplesPerSegment;
      const t2 = (i + 1) / samplesPerSegment;
      
      const globalT = (seg + t1) / numSegments;
      
      const pt1 = cubicBezier(t1, p0, h0, h1, p3);
      const pt2 = cubicBezier(t2, p0, h0, h1, p3);
      
      const segLen = distance(pt1, pt2);
      arcLength += segLen;
      
      const kappa = getCurvatureAtSegment(t1, p0, h0, h1, p3);
      totalSignedCurvature += kappa * segLen;
      curvatureSamples.push(kappa);
      
      if (Math.abs(kappa) > Math.abs(maxCurvature)) {
        maxCurvature = kappa;
      }
      
      if (config.enabled) {
        const jerk = getCurvatureJerkAt(t1, p0, h0, h1, p3);
        jerkSamples.push(jerk);
        tValues.push(globalT);
      }
    }
  }
  
  const meanCurvature = arcLength > 0 ? totalSignedCurvature / arcLength : 0;
  
  const rawCurvatureIndex = meanCurvature * 10;
  const curvatureIndex = invertSign ? -rawCurvatureIndex : rawCurvatureIndex;
  
  const finalMaxCurvature = invertSign ? -maxCurvature : maxCurvature;
  const arcChordRatio = arcLength / chordLength;
  
  const curvature = calculateCurvatureBreakdown(
    invertSign ? curvatureSamples.map(k => -k) : curvatureSamples
  );
  
  const jerk = config.enabled 
    ? calculateJerkBreakdown(jerkSamples, tValues, config.spikeThreshold)
    : { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] };
  
  const labelResult = arcId 
    ? _getCurvatureLabelForArc(arcId, curvatureIndex)
    : { label: getCurvatureLabel(curvatureIndex), secondary: undefined };
  const label = labelResult.label;
  const labelSecondary = labelResult.secondary;
  const smoothnessLabel = getSmoothnessLabel(jerk);
  
  const diagnostics = calculateDiagnosticMetrics(curvatureSamples);
  
  return {
    curvatureIndex,
    maxCurvature: finalMaxCurvature,
    arcChordRatio,
    label,
    labelSecondary,
    smoothnessLabel,
    curvature,
    jerk,
    diagnostics,
  };
}

/**
 * Get a human-readable label for a curvature index value (generic)
 * @deprecated Prefer getCurvatureLabelForArc for arc-specific labeling
 */
export function getCurvatureLabel(ci: number): string {
  if (ci < -4) return 'Very Angular';
  if (ci < -2) return 'Moderately Angular';
  if (ci < -0.5) return 'Slightly Angular';
  if (ci < 0.5) return 'Balanced';
  if (ci < 2) return 'Slightly Rounded';
  if (ci < 4) return 'Moderately Rounded';
  return 'Very Rounded';
}

// Re-export arc-specific labeling functions for convenience
export { 
  getCurvatureLabelForArc,
  getCurvatureLabelString,
  getGenericCurvatureLabel,
  hasCalibratedThresholds,
  shouldHideAsIndividualAssessment,
  getArcThresholdConfig,
  getArcThresholdBoundaries,
  getLabelColorClass,
  getLabelLevel,
  compareLabels,
  PRODUCTION_ARCS,
  SILENT_COLLECTION_ARCS,
  TESTING_COMBINED_ARCS,
  isProductionArc,
  isSilentCollectionArc,
  isTestingCombinedArc,
  CURVATURE_LABELS,
  ARC_THRESHOLDS,
  COMBINED_ARC_THRESHOLDS,
} from './arcThresholds';
export type { CurvatureLabel, CurvatureLabelResult, ArcThresholdConfig } from './arcThresholds';

/**
 * Get a human-readable label for smoothness based on jerk metrics
 */
export function getSmoothnessLabel(jerk: JerkBreakdown): string {
  const { mean, spikeCount } = jerk;
  
  if (spikeCount > 3) return 'Very Rugged';
  if (spikeCount > 1 || mean > 3) return 'Rugged';
  if (mean > 1.5) return 'Textured';
  if (mean > 0.5) return 'Normal';
  return 'Smooth';
}

/**
 * Get a combined label for curvature and smoothness
 */
export function getCombinedLabel(ci: number, jerk: JerkBreakdown): string {
  const curvatureLabel = getCurvatureLabel(ci);
  const smoothnessLabel = getSmoothnessLabel(jerk);
  
  if (smoothnessLabel === 'Smooth' || smoothnessLabel === 'Normal') {
    return curvatureLabel;
  }
  
  return `${curvatureLabel} (${smoothnessLabel})`;
}

/**
 * Format curvature index for display (with sign)
 */
export function formatCI(ci: number): string {
  return (ci >= 0 ? '+' : '') + ci.toFixed(2);
}

/**
 * Format jerk metrics for display
 */
export function formatJerkSummary(jerk: JerkBreakdown): string {
  const parts: string[] = [];
  parts.push(`Mean: ${jerk.mean.toFixed(2)}`);
  if (jerk.spikeCount > 0) {
    parts.push(`Spikes: ${jerk.spikeCount}`);
  }
  return parts.join(' | ');
}
