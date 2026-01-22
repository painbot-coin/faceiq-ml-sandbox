/**
 * Arc Types for Facial Contour Analysis
 * 
 * Arcs are Bezier curves connecting multiple landmark points that capture
 * the continuous shape of facial features like jawline, chin, hairline, etc.
 * 
 * Used for testing/calibrating curvature values - not yet hooked into analysis.
 */

export interface ArcDefinition {
  id: string;
  name: string;
  profile: 'front' | 'side';
  /** Landmark keys in order (curve passes through these) */
  throughPoints: string[];
  /** Human-readable names for landmarks */
  pointNames: string[];
  /** Category for grouping in UI */
  category: 'chin' | 'jaw' | 'cheek' | 'hairline' | 'neck' | 'forehead' | 'nose' | 'lips';
  /** Description shown to user */
  description: string;
  /** Landmark key that triggers this arc to appear (after this landmark is placed) */
  triggerLandmark: string;
  /** Whether to generate intermediate points automatically (default: false) */
  hasIntermediatePoints?: boolean;
  /** Number of intermediate points per segment (default: 1 if hasIntermediatePoints is true) */
  intermediatePointCount?: number;
  /** Other arc IDs to show together with this one */
  showWithArcs?: string[];
  /** User-facing instruction for adjusting this arc */
  adjustmentInstruction?: string;
  /** 
   * Invert the curvature sign for this arc.
   * Used for right-side bilateral arcs so they produce the same CI sign as their 
   * left-side counterparts for the same visual curvature direction.
   * The math: curvature sign depends on traversal direction, and mirrored arcs
   * traverse in opposite directions relative to the face, so one side needs inversion.
   */
  invertCurvatureSign?: boolean;
  /**
   * Configuration for jerk (f‴) metrics calculation
   * Feature-specific tuning for how much jerk affects quality score
   */
  jerkConfig?: Partial<JerkConfig>;
}

export interface ArcHandle {
  /** Index of the point this handle belongs to (0-based) */
  pointIndex: number;
  /** Which side: 'left' = before point, 'right' = after point */
  side: 'left' | 'right';
  /** Normalized position (0-1) relative to canvas */
  x: number;
  y: number;
  /** Whether this handle belongs to an intermediate point (vs landmark) */
  isIntermediate?: boolean;
}

/**
 * Intermediate point - auto-generated anchor between landmarks
 * Allows for smoother curve control without needing extreme handle positions
 */
export interface IntermediatePoint {
  /** Unique ID for this intermediate point */
  id: string;
  /** Position along the segment (0-1) where this point sits */
  t: number;
  /** Normalized position (can be user-adjusted) */
  x: number;
  y: number;
  /** Index of the segment this point belongs to (between point[i] and point[i+1]) */
  segmentIndex: number;
}

export interface ArcState {
  arcId: string;
  /** Whether this arc is currently being edited */
  isEditing: boolean;
  /** User-adjusted handle positions (if not set, use defaults) */
  handles: ArcHandle[];
}

/**
 * Curvature metrics (f″ based) - measures shape
 */
export interface CurvatureBreakdown {
  /** ⟨κ⟩ - average curvature along arc */
  mean: number;
  /** max(κ) - peak curvature (sharpest point, signed) */
  max: number;
  /** min(κ) - minimum curvature (signed) */
  min: number;
  /** max(|κ|) - maximum absolute curvature */
  maxAbs: number;
  /** var(κ) - shape consistency */
  variance: number;
  /** σ(κ) - standard deviation */
  stdDev: number;
}

/**
 * Jerk metrics (f‴ based) - measures smoothness/roughness
 * Third derivative captures curvature volatility
 */
export interface JerkBreakdown {
  /** ⟨|f‴|⟩ - average jerk magnitude (lower = smoother) */
  mean: number;
  /** max(|f‴|) - harshest single transition */
  max: number;
  /** var(f‴) - ruggedness measure */
  variance: number;
  /** σ(f‴) - jerk standard deviation */
  stdDev: number;
  /** count(|f‴| > threshold) - number of structural irregularities */
  spikeCount: number;
  /** t-values (0-1) where spikes occur along the arc */
  spikeLocations: number[];
}

export interface ArcMetrics {
  /** Curvature Index - primary metric based on second derivative, scaled */
  curvatureIndex: number;
  /** Maximum curvature value along the curve (signed) - legacy field */
  maxCurvature: number;
  /** Arc length divided by chord length */
  arcChordRatio: number;
  /** Human-readable label for curvature (e.g., "Angular", "Rounded") */
  label: string;
  /** Secondary label/descriptor (e.g., "Straight contour") */
  labelSecondary?: string;
  /** Human-readable label for smoothness (e.g., "Smooth", "Rough") */
  smoothnessLabel: string;
  /** Detailed curvature breakdown (f″ metrics) */
  curvature: CurvatureBreakdown;
  /** Detailed jerk breakdown (f‴ metrics) */
  jerk: JerkBreakdown;
  /** Legacy diagnostic metrics for backwards compatibility */
  diagnostics?: ArcDiagnosticMetrics;
}

/**
 * Legacy diagnostic metrics for backwards compatibility
 * @deprecated Use curvature and jerk breakdowns instead
 */
export interface ArcDiagnosticMetrics {
  /** Maximum absolute curvature (κ max) - detects sharp bends */
  maxCurvatureAbs: number;
  /** Variance of curvature samples - detects irregularity */
  curvatureVariance: number;
  /** Standard deviation of curvature */
  curvatureStdDev: number;
}

/**
 * Configuration for jerk metrics calculation per arc type
 */
export interface JerkConfig {
  /** Whether to calculate jerk metrics for this arc (default: true) */
  enabled: boolean;
  /** Threshold for counting spikes (default: 2.0) */
  spikeThreshold: number;
  /** Weight for jerk in quality assessment (0-1) - feature-specific tuning */
  qualityWeight?: number;
}

/**
 * Default jerk configuration
 */
export const DEFAULT_JERK_CONFIG: JerkConfig = {
  enabled: true,
  spikeThreshold: 2.0,
};

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Stored arc data structure for database persistence
 * Keyed by arc ID, stores handles and intermediates for reconstruction
 */
export interface StoredArcData {
  handles: Array<{
    pointIndex: number;
    side: 'left' | 'right';
    x: number;  // normalized 0-1
    y: number;  // normalized 0-1
    isIntermediate?: boolean;
  }>;
  intermediates: Array<{
    id: string;
    t: number;  // position along segment 0-1
    x: number;
    y: number;
    segmentIndex: number;
  }>;
}

/**
 * Type for stored arcs JSON object in database
 */
export type StoredArcsMap = Record<string, StoredArcData>;

/**
 * Combined arc result - computed from multiple baseline arcs
 */
export interface CombinedArcResult {
  /** Combined arc ID */
  arcId: string;
  /** Display name */
  name: string;
  /** Component baseline arc IDs */
  components: string[];
  /** Combined Curvature Index (weighted average accounting for sign inversions) */
  curvatureIndex: number;
  /** Individual component metrics */
  componentMetrics: Array<{
    arcId: string;
    curvatureIndex: number;
  }>;
  /** Human-readable label (primary) */
  label: string;
  /** Secondary label/descriptor (e.g., "Straight contour") */
  labelSecondary?: string;
  
  // Aggregated metrics from component arcs (optional for backwards compatibility)
  
  /** Aggregated smoothness label based on average jerk */
  smoothnessLabel?: string;
  /** Aggregated curvature breakdown (averaged from components) */
  curvature?: CurvatureBreakdown;
  /** Aggregated jerk breakdown (averaged from components) */
  jerk?: JerkBreakdown;
}
