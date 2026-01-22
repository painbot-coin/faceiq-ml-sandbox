/**
 * Curvature Calculation Utilities
 * 
 * Calculate Curvature Index (CI) and Jerk metrics (f‴) for facial arcs.
 * 
 * The derivative ladder:
 * - f′(x)  = direction & steepness
 * - f″(x)  = curvature (round vs. sharp) → CI
 * - f‴(x)  = curvature volatility (smooth vs. rugged) → Jerk
 * 
 * CI is the primary metric for arc shape classification.
 * Jerk is a diagnostic metric for smoothness/roughness.
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
 * 
 * @param jerkSamples - Array of jerk (dκ/dt) values along the arc
 * @param tValues - Corresponding t parameter values for spike location tracking
 * @param spikeThreshold - Threshold for counting spikes (default: 2.0)
 */
export function calculateJerkBreakdown(
  jerkSamples: number[],
  tValues: number[],
  spikeThreshold: number = 2.0
): JerkBreakdown {
  if (jerkSamples.length === 0) {
    return { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] };
  }
  
  // Use absolute values for mean jerk (we care about magnitude, not direction)
  const absJerk = jerkSamples.map(j => Math.abs(j));
  const mean = absJerk.reduce((sum, j) => sum + j, 0) / absJerk.length;
  const max = Math.max(...absJerk);
  
  // Variance uses actual values (signed) to capture direction changes
  const signedMean = jerkSamples.reduce((sum, j) => sum + j, 0) / jerkSamples.length;
  const squaredDiffs = jerkSamples.map(j => Math.pow(j - signedMean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / jerkSamples.length;
  const stdDev = Math.sqrt(variance);
  
  // Count spikes and track locations
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
 * These are useful for advanced analysis to detect sharp bends and irregularity.
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
  
  // Max absolute curvature (κ max) - detect sharp bends
  const absValues = curvatureSamples.map(k => Math.abs(k));
  const maxCurvatureAbs = Math.max(...absValues);
  
  // Mean curvature for variance calculation
  const mean = curvatureSamples.reduce((sum, k) => sum + k, 0) / curvatureSamples.length;
  
  // Variance = average of squared differences from mean
  const squaredDiffs = curvatureSamples.map(k => Math.pow(k - mean, 2));
  const curvatureVariance = squaredDiffs.reduce((sum, d) => sum + d, 0) / curvatureSamples.length;
  
  // Standard deviation
  const curvatureStdDev = Math.sqrt(curvatureVariance);
  
  return {
    maxCurvatureAbs,
    curvatureVariance,
    curvatureStdDev,
  };
}

/**
 * Calculate all arc metrics (CI, jerk, etc.)
 * 
 * @param points - Array of through-points for the arc
 * @param handles - Bezier control handles
 * @param invertSign - Invert the curvature sign (for right-side bilateral arcs)
 * @param jerkConfig - Configuration for jerk metrics (optional)
 * @param arcId - Optional arc ID for arc-specific calibrated label thresholds
 */
export function calculateArcMetrics(
  points: Point2D[],
  handles: ArcHandle[],
  invertSign: boolean = false,
  jerkConfig: Partial<JerkConfig> = {},
  arcId?: string
): ArcMetrics {
  const config = { ...DEFAULT_JERK_CONFIG, ...jerkConfig };
  
  // Empty/invalid arc defaults
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
  
  // Integrate curvature and jerk along the arc
  let arcLength = 0;
  let totalSignedCurvature = 0;
  let maxCurvature = 0;
  
  const curvatureSamples: number[] = [];
  const jerkSamples: number[] = [];
  const tValues: number[] = []; // For tracking spike locations
  
  const numSegments = points.length - 1;
  const samplesPerSegment = 50;
  
  for (let seg = 0; seg < numSegments; seg++) {
    const p0 = points[seg];
    const p3 = points[seg + 1];
    
    // Find handles for this segment
    const h0 = handles.find(h => h.pointIndex === seg && h.side === 'right') || p0;
    const h1 = handles.find(h => h.pointIndex === seg + 1 && h.side === 'left') || p3;
    
    for (let i = 0; i < samplesPerSegment; i++) {
      const t1 = i / samplesPerSegment;
      const t2 = (i + 1) / samplesPerSegment;
      
      // Global t value (0-1 across entire arc)
      const globalT = (seg + t1) / numSegments;
      
      const pt1 = cubicBezier(t1, p0, h0, h1, p3);
      const pt2 = cubicBezier(t2, p0, h0, h1, p3);
      
      const segLen = distance(pt1, pt2);
      arcLength += segLen;
      
      // Calculate curvature (f″)
      const kappa = getCurvatureAtSegment(t1, p0, h0, h1, p3);
      totalSignedCurvature += kappa * segLen;
      curvatureSamples.push(kappa);
      
      if (Math.abs(kappa) > Math.abs(maxCurvature)) {
        maxCurvature = kappa;
      }
      
      // Calculate jerk (f‴) - rate of change of curvature
      if (config.enabled) {
        const jerk = getCurvatureJerkAt(t1, p0, h0, h1, p3);
        jerkSamples.push(jerk);
        tValues.push(globalT);
      }
    }
  }
  
  // Mean curvature
  const meanCurvature = arcLength > 0 ? totalSignedCurvature / arcLength : 0;
  
  // Curvature Index: pure shape metric, independent of size
  // Scaled to intuitive range (no chord length - we measure shape, not size)
  // Apply sign inversion for right-side bilateral arcs so they match left-side direction
  const rawCurvatureIndex = meanCurvature * 10;
  const curvatureIndex = invertSign ? -rawCurvatureIndex : rawCurvatureIndex;
  
  // Apply sign inversion to max curvature for consistency
  const finalMaxCurvature = invertSign ? -maxCurvature : maxCurvature;
  const arcChordRatio = arcLength / chordLength;
  
  // Calculate curvature breakdown (f″ metrics)
  const curvature = calculateCurvatureBreakdown(
    invertSign ? curvatureSamples.map(k => -k) : curvatureSamples
  );
  
  // Calculate jerk breakdown (f‴ metrics)
  const jerk = config.enabled 
    ? calculateJerkBreakdown(jerkSamples, tValues, config.spikeThreshold)
    : { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] };
  
  // Generate labels (use arc-specific thresholds if arcId provided)
  const labelResult = arcId 
    ? _getCurvatureLabelForArc(arcId, curvatureIndex)
    : { label: getCurvatureLabel(curvatureIndex), secondary: undefined };
  const label = labelResult.label;
  const labelSecondary = labelResult.secondary;
  const smoothnessLabel = getSmoothnessLabel(jerk);
  
  // Legacy diagnostic metrics for backwards compatibility
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
 * 
 * For arc-specific labeling with calibrated thresholds, use:
 * - getCurvatureLabelForArc(arcId, ci) from './arcThresholds'
 * 
 * @deprecated Prefer getCurvatureLabelForArc for arc-specific labeling
 */
export function getCurvatureLabel(ci: number): string {
  // 7-level scale (generic thresholds for uncalibrated arcs)
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
  // Tier constants and helpers
  PRODUCTION_ARCS,
  SILENT_COLLECTION_ARCS,
  TESTING_COMBINED_ARCS,
  isProductionArc,
  isSilentCollectionArc,
  isTestingCombinedArc,
  // Threshold configs
  CURVATURE_LABELS,
  ARC_THRESHOLDS,
  COMBINED_ARC_THRESHOLDS,
} from './arcThresholds';
export type { CurvatureLabel, CurvatureLabelResult, ArcThresholdConfig } from './arcThresholds';

/**
 * Get a human-readable label for smoothness based on jerk metrics
 */
export function getSmoothnessLabel(jerk: JerkBreakdown): string {
  // Based on mean jerk and spike count
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
  
  // Combine into descriptive phrase
  if (smoothnessLabel === 'Smooth' || smoothnessLabel === 'Normal') {
    return curvatureLabel; // No need to mention smoothness if it's good
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

