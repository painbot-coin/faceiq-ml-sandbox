/**
 * Arc-Specific Curvature Thresholds (Calibrated Jan 2026)
 * 
 * 7-level symmetric labeling system from Very Angular to Very Rounded.
 * Each arc has calibrated thresholds based on its natural baseline shape.
 * 
 * "Straight" is not a separate label - it's secondary descriptive text
 * for arcs where the baseline is straight (cheek, mandible).
 */

// =============================================================================
// TYPES
// =============================================================================

export const CURVATURE_LABELS = [
  'Very Angular',
  'Moderately Angular',
  'Slightly Angular',
  'Balanced',
  'Slightly Rounded',
  'Moderately Rounded',
  'Very Rounded',
] as const;

export type CurvatureLabel = (typeof CURVATURE_LABELS)[number];

/** Result from labeling function */
export interface CurvatureLabelResult {
  /** Primary label (Very Angular to Very Rounded) */
  label: CurvatureLabel;
  /** Optional secondary descriptor (e.g., "Straight contour") */
  secondary?: string;
  /** Numeric level 1-7 for sorting/comparison */
  level: number;
}

/** Configuration for an arc's thresholds */
export interface ArcThresholdConfig {
  /**
   * 6 thresholds defining 7 ranges (like fence posts creating gaps):
   * - [CI < t1]      → Very Angular (level 1)
   * - [t1 ≤ CI < t2] → Moderately Angular (level 2)
   * - [t2 ≤ CI < t3] → Slightly Angular (level 3)
   * - [t3 ≤ CI < t4] → Balanced (level 4)
   * - [t4 ≤ CI < t5] → Slightly Rounded (level 5)
   * - [t5 ≤ CI < t6] → Moderately Rounded (level 6)
   * - [CI ≥ t6]      → Very Rounded (level 7)
   */
  thresholds: [number, number, number, number, number, number];
  /** Natural baseline shape expectation */
  baseline: 'rounded' | 'straight';
  /** CI range where "straight" descriptor applies (for straight-baseline arcs) */
  straightRange?: [number, number];
  /** Description for tooltips/documentation */
  description?: string;
  /** 
   * If true, this arc should be hidden as an individual assessment.
   * Useful for arcs that are too variable/sensitive on their own but 
   * contribute meaningfully to combined arcs.
   */
  hideAsIndividualAssessment?: boolean;
}

// =============================================================================
// ARC DEPLOYMENT TIERS
// =============================================================================

/**
 * Tier 1: Production arcs - shown to users, well-calibrated
 * These are the only arcs displayed in the Angularity tab and Results.
 */
export const PRODUCTION_ARCS = [
  'chin-arc',
  'mandible-left-arc',
  'mandible-right-arc',
  'cheek-left-arc',
  'cheek-right-arc',
] as const;

/**
 * Tier 2: Silent collection arcs - calculated but hidden from users
 * Data is collected to build calibration dataset.
 * Uses default/auto-calculated handles (no user adjustment).
 */
export const SILENT_COLLECTION_ARCS = [
  'gonion-left-arc',     // Too variable alone, useful in combined arcs
  'gonion-right-arc',
  'hairline-arc',        // Needs M-shape vs rounded calibration
  'submental-arc',       // Possible sign issues, needs review
  'forehead-arc',        // Insufficient data
  'nasal-bridge-arc',    // New - testing nasal dorsum curvature
  'nose-tip-arc',        // New - testing nose tip roundness
  'upper-lip-arc',       // New - testing upper lip curvature
  'lower-lip-arc',       // New - testing lower lip curvature
] as const;

/**
 * Tier 3: Testing-only combined arcs - visible only in Arc Testing tool
 * Computed from baseline arcs, not stored separately.
 */
export const TESTING_COMBINED_ARCS = [
  'jaw-segment-a1',      // Gonion + Mandible (left)
  'jaw-segment-a2',      // Gonion + Mandible (right)
  'lower-face-contour',  // Full lower face wrap
  'jaw-segment-b1',      // Cheek → Chin (left)
  'jaw-segment-b2',      // Cheek → Chin (right)
  'full-jaw-contour',    // Cheek to cheek full wrap
  'jaw-segment-c1',      // Cheek → Gonion (left)
  'jaw-segment-c2',      // Cheek → Gonion (right)
  'mandibular-contour',  // Mandible + Chin area
] as const;

/**
 * Check if an arc is a production arc (Tier 1)
 */
export function isProductionArc(arcId: string): boolean {
  return (PRODUCTION_ARCS as readonly string[]).includes(arcId);
}

/**
 * Check if an arc is a silent collection arc (Tier 2)
 */
export function isSilentCollectionArc(arcId: string): boolean {
  return (SILENT_COLLECTION_ARCS as readonly string[]).includes(arcId);
}

/**
 * Check if an arc is a testing-only combined arc (Tier 3)
 */
export function isTestingCombinedArc(arcId: string): boolean {
  return (TESTING_COMBINED_ARCS as readonly string[]).includes(arcId);
}

// =============================================================================
// BASELINE ARC THRESHOLDS
// =============================================================================

/**
 * Calibrated thresholds for baseline arcs (arcs 1-10)
 * 
 * Each arc has 6 thresholds that define 7 ranges mapping to the 7 labels:
 * - [CI < t1]      → Very Angular
 * - [t1 ≤ CI < t2] → Moderately Angular
 * - [t2 ≤ CI < t3] → Slightly Angular
 * - [t3 ≤ CI < t4] → Balanced
 * - [t4 ≤ CI < t5] → Slightly Rounded
 * - [t5 ≤ CI < t6] → Moderately Rounded
 * - [CI ≥ t6]      → Very Rounded
 */
export const ARC_THRESHOLDS: Record<string, ArcThresholdConfig> = {
  // ==========================================================================
  // ROUNDED-BASELINE ARCS (naturally positive CI)
  // ==========================================================================
  
  /**
   * CHIN ARC
   * Baseline: ~72 (all values positive, 43-95 observed range)
   * "Angular chin" means lower positive CI, not negative
   */
  'chin-arc': {
    thresholds: [40, 50, 60, 70, 77, 85],
    baseline: 'rounded',
    description: 'Chin is naturally rounded. Lower CI = more angular chin appearance.',
  },
  
  /**
   * LEFT GONION ARC
   * Baseline: ~18 (gonions naturally curve from upper to lower jaw)
   * CI near 0 = very angular gonion
   * 
   * NOTE: Gonion arcs are highly variable and sensitive to landmarking placement.
   * They should NOT be used as standalone angularity assessments - only useful
   * as components of combined arcs (jaw segments, full jaw contour, etc.)
   */
  'gonion-left-arc': {
    thresholds: [0, 8, 15, 22, 32, 42],
    baseline: 'rounded',
    description: 'Gonion curvature (hidden - only used in combined arcs).',
    hideAsIndividualAssessment: true, // Too variable on its own, only meaningful in combined arcs
  },
  
  /**
   * RIGHT GONION ARC
   * Same thresholds as left (sign already normalized via invertCurvatureSign)
   */
  'gonion-right-arc': {
    thresholds: [0, 8, 15, 22, 32, 42],
    baseline: 'rounded',
    description: 'Gonion curvature (hidden - only used in combined arcs).',
    hideAsIndividualAssessment: true, // Too variable on its own, only meaningful in combined arcs
  },
  
  // ==========================================================================
  // STRAIGHT-BASELINE ARCS (baseline near 0)
  // ==========================================================================
  
  /**
   * LEFT CHEEK CONTOUR ARC
   * Baseline: ~0 (straight cheek = angular appearance)
   * Negative CI = hollow/concave, Positive CI = full/convex
   */
  'cheek-left-arc': {
    thresholds: [-5, 0, 5, 10, 15, 20],
    baseline: 'straight',
    straightRange: [0, 3], // "Straight" falls within Slightly Angular
    description: 'Cheeks are naturally straight. CI 0-3 = straight contour (angular appearance).',
  },
  
  /**
   * RIGHT CHEEK CONTOUR ARC
   * Same thresholds as left
   */
  'cheek-right-arc': {
    thresholds: [-5, 0, 5, 10, 15, 20],
    baseline: 'straight',
    straightRange: [0, 3],
    description: 'Cheeks are naturally straight. CI 0-3 = straight contour (angular appearance).',
  },
  
  /**
   * LEFT MANDIBLE ARC
   * Baseline: ~0 (straight mandible = angular jaw)
   */
  'mandible-left-arc': {
    thresholds: [-4, 1, 6, 13, 22, 38],
    baseline: 'straight',
    straightRange: [0, 5], // "Straight" falls within Slightly Angular
    description: 'Mandible line is naturally straight. CI 3-8 = straight line (angular jaw).',
  },
  
  /**
   * RIGHT MANDIBLE ARC
   * Same thresholds as left (sign already normalized)
   */
  'mandible-right-arc': {
    thresholds: [-4, 1, 6, 13, 22, 38],
    baseline: 'straight',
    straightRange: [0, 5],
    description: 'Mandible line is naturally straight. CI 3-8 = straight line (angular jaw).',
  },
  
  // ==========================================================================
  // PENDING CALIBRATION (need more data)
  // Using conservative defaults based on expected shape
  // ==========================================================================
  
  /**
   * HAIRLINE ARC
   * Baseline: rounded (covers temple to temple)
   * TODO: May need M-shape vs rounded distinction, not just CI
   */
  'hairline-arc': {
    thresholds: [10, 25, 40, 55, 70, 85],
    baseline: 'rounded',
    description: 'Hairline shape. Pending more calibration data.',
  },
  
  /**
   * FOREHEAD ARC (Side Profile)
   * Baseline: straight to slightly rounded
   */
  'forehead-arc': {
    thresholds: [-5, 0, 5, 10, 20, 35],
    baseline: 'straight',
    straightRange: [0, 5],
    description: 'Forehead curvature. Flat forehead vs protruding.',
  },
  
  /**
   * SUBMENTAL ARC (Side Profile)
   * Baseline: rounded (covers chin-neck angle)
   * Note: Sign may be inverted - need investigation
   */
  'submental-arc': {
    thresholds: [-50, -30, -10, 5, 20, 40],
    baseline: 'rounded',
    description: 'Submental/neck-chin angle. Pending sign verification.',
  },
  
  // ==========================================================================
  // NOSE ARCS (Side Profile) - Testing Phase
  // ==========================================================================
  
  /**
   * NASAL BRIDGE ARC (Side Profile)
   * Baseline: slightly concave to straight (typical dorsum profile)
   * Negative CI = concave/ski-slope (often desirable)
   * Positive CI = convex/dorsal hump
   * Near zero = straight dorsum
   */
  'nasal-bridge-arc': {
    thresholds: [-25, -15, -8, 0, 8, 18],
    baseline: 'straight',
    straightRange: [-5, 5], // Straight dorsum falls within Balanced range
    description: 'Nasal dorsum/bridge curvature. Negative = ski-slope, 0 = straight, Positive = hump.',
    hideAsIndividualAssessment: true, // Testing phase
  },
  
  /**
   * NOSE TIP ARC (Side Profile)
   * Baseline: rounded (nose tips are inherently curved)
   * Higher CI = more rounded/bulbous tip
   * Lower CI = more defined/refined tip
   */
  'nose-tip-arc': {
    thresholds: [15, 25, 35, 45, 55, 70],
    baseline: 'rounded',
    description: 'Nose tip roundness. Higher CI = more rounded/bulbous, lower = more defined.',
    hideAsIndividualAssessment: true, // Testing phase
  },
  
  // ==========================================================================
  // LIP ARCS (naturally positive CI - rounded baseline)
  // ==========================================================================
  
  /**
   * UPPER LIP ARC
   * 2-point arc: labraleSuperius → cheilion
   * Measures upper lip fullness/curvature in profile
   */
  'upper-lip-arc': {
    thresholds: [5, 15, 25, 35, 45, 60],
    baseline: 'rounded',
    description: 'Upper lip curvature. Higher CI = fuller/more projected lip, lower = flatter.',
    hideAsIndividualAssessment: true, // Testing phase - silent collection
  },
  
  /**
   * LOWER LIP ARC
   * 2-point arc: labraleInferius → cheilion
   * Measures lower lip fullness/curvature in profile
   */
  'lower-lip-arc': {
    thresholds: [5, 15, 25, 35, 45, 60],
    baseline: 'rounded',
    description: 'Lower lip curvature. Higher CI = fuller/more projected lip, lower = flatter.',
    hideAsIndividualAssessment: true, // Testing phase - silent collection
  },
};

// =============================================================================
// COMBINED ARC THRESHOLDS
// =============================================================================

/**
 * Thresholds for combined arcs (arcs 11-19)
 * 
 * Combined arcs that pass through gonion/chin are naturally rounded.
 * Their thresholds are shifted to account for this.
 */
export const COMBINED_ARC_THRESHOLDS: Record<string, ArcThresholdConfig> = {
  /**
   * JAW SEGMENT A (gonion + mandible)
   * Naturally slightly rounded due to gonion component
   */
  'jaw-segment-a1': {
    thresholds: [-5, 5, 15, 25, 35, 50],
    baseline: 'rounded',
    description: 'Left gonion to chin corner. Mix of angular mandible and rounded gonion.',
  },
  'jaw-segment-a2': {
    thresholds: [-5, 5, 15, 25, 35, 50],
    baseline: 'rounded',
    description: 'Right gonion to chin corner.',
  },
  
  /**
   * LOWER FACE CONTOUR (full wrap: gonion L → chin → gonion R)
   * Naturally rounded - includes chin arc
   */
  'lower-face-contour': {
    thresholds: [10, 25, 40, 55, 70, 85],
    baseline: 'rounded',
    description: 'Full lower face wrap from left to right gonion through chin.',
  },
  
  /**
   * JAW SEGMENT B (cheek + gonion + mandible)
   * Mix of straight (cheek) and rounded (gonion) components
   */
  'jaw-segment-b1': {
    thresholds: [-5, 5, 15, 25, 35, 50],
    baseline: 'rounded',
    description: 'Left cheekbone to chin corner.',
  },
  'jaw-segment-b2': {
    thresholds: [-5, 5, 15, 25, 35, 50],
    baseline: 'rounded',
    description: 'Right cheekbone to chin corner.',
  },
  
  /**
   * FULL JAW CONTOUR (everything from cheek to cheek)
   * Most comprehensive - naturally rounded
   */
  'full-jaw-contour': {
    thresholds: [15, 30, 45, 60, 75, 90],
    baseline: 'rounded',
    description: 'Complete wrap from left cheek to right cheek.',
  },
  
  /**
   * JAW SEGMENT C (cheek + gonion)
   * Shorter segment - mix of straight and rounded
   */
  'jaw-segment-c1': {
    thresholds: [-3, 5, 12, 20, 30, 45],
    baseline: 'rounded',
    description: 'Left cheek to gonion area.',
  },
  'jaw-segment-c2': {
    thresholds: [-3, 5, 12, 20, 30, 45],
    baseline: 'rounded',
    description: 'Right cheek to gonion area.',
  },
  
  /**
   * MANDIBULAR CONTOUR (mandibles + chin)
   * Includes chin so naturally rounded
   */
  'mandibular-contour': {
    thresholds: [20, 35, 50, 65, 80, 95],
    baseline: 'rounded',
    description: 'Both mandibles including chin arc.',
  },
};

// =============================================================================
// LABELING FUNCTIONS
// =============================================================================

/**
 * Get the curvature label for a specific arc
 * 
 * @param arcId - The arc ID (e.g., 'chin-arc', 'cheek-left-arc')
 * @param ci - Curvature Index value
 * @returns Label result with primary label, optional secondary text, and numeric level
 */
export function getCurvatureLabelForArc(arcId: string, ci: number): CurvatureLabelResult {
  // Look up config in baseline or combined thresholds
  const config = ARC_THRESHOLDS[arcId] || COMBINED_ARC_THRESHOLDS[arcId];
  
  if (!config) {
    // Fallback to generic labeling for unknown arcs
    return getGenericCurvatureLabel(ci);
  }
  
  const [t1, t2, t3, t4, t5, t6] = config.thresholds;
  
  let label: CurvatureLabel;
  let level: number;
  
  if (ci < t1) {
    label = 'Very Angular';
    level = 1;
  } else if (ci < t2) {
    label = 'Moderately Angular';
    level = 2;
  } else if (ci < t3) {
    label = 'Slightly Angular';
    level = 3;
  } else if (ci < t4) {
    label = 'Balanced';
    level = 4;
  } else if (ci < t5) {
    label = 'Slightly Rounded';
    level = 5;
  } else if (ci < t6) {
    label = 'Moderately Rounded';
    level = 6;
  } else {
    label = 'Very Rounded';
    level = 7;
  }
  
  // Add "straight" secondary descriptor for straight-baseline arcs
  let secondary: string | undefined;
  if (config.baseline === 'straight' && config.straightRange) {
    const [sMin, sMax] = config.straightRange;
    if (ci >= sMin && ci < sMax) {
      secondary = 'Straight contour';
    }
  }
  
  return { label, secondary, level };
}

/**
 * Generic fallback labeling for arcs without calibrated thresholds
 * Uses the original simple thresholds
 */
export function getGenericCurvatureLabel(ci: number): CurvatureLabelResult {
  if (ci < -4) return { label: 'Very Angular', level: 1 };
  if (ci < -2) return { label: 'Moderately Angular', level: 2 };
  if (ci < -0.5) return { label: 'Slightly Angular', level: 3 };
  if (ci < 0.5) return { label: 'Balanced', level: 4 };
  if (ci < 2) return { label: 'Slightly Rounded', level: 5 };
  if (ci < 4) return { label: 'Moderately Rounded', level: 6 };
  return { label: 'Very Rounded', level: 7 };
}

/**
 * Get just the label string (for backward compatibility)
 */
export function getCurvatureLabelString(arcId: string, ci: number): string {
  return getCurvatureLabelForArc(arcId, ci).label;
}

/**
 * Check if an arc has calibrated thresholds
 */
export function hasCalibratedThresholds(arcId: string): boolean {
  return arcId in ARC_THRESHOLDS || arcId in COMBINED_ARC_THRESHOLDS;
}

/**
 * Check if an arc should be hidden as an individual assessment.
 * Some arcs (like gonion) are too variable on their own but useful in combined arcs.
 */
export function shouldHideAsIndividualAssessment(arcId: string): boolean {
  const config = ARC_THRESHOLDS[arcId];
  return config?.hideAsIndividualAssessment === true;
}

/**
 * Get the threshold config for an arc (for display/debugging)
 */
export function getArcThresholdConfig(arcId: string): ArcThresholdConfig | undefined {
  return ARC_THRESHOLDS[arcId] || COMBINED_ARC_THRESHOLDS[arcId];
}

/**
 * Get all threshold boundaries for an arc (for visualization)
 */
export function getArcThresholdBoundaries(arcId: string): number[] | undefined {
  const config = ARC_THRESHOLDS[arcId] || COMBINED_ARC_THRESHOLDS[arcId];
  return config?.thresholds ? [...config.thresholds] : undefined;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get color class for a curvature label (for UI)
 * Colors match the reversed gradient: Angular = teal/cyan, Rounded = red
 */
export function getLabelColorClass(label: CurvatureLabel): string {
  switch (label) {
    case 'Very Angular':
      return 'text-teal-600';
    case 'Moderately Angular':
      return 'text-teal-500';
    case 'Slightly Angular':
      return 'text-emerald-500';
    case 'Balanced':
      return 'text-gray-400';
    case 'Slightly Rounded':
      return 'text-amber-500';
    case 'Moderately Rounded':
      return 'text-red-400';
    case 'Very Rounded':
      return 'text-red-500';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get the numeric level (1-7) from a label string
 */
export function getLabelLevel(label: string): number {
  const index = CURVATURE_LABELS.indexOf(label as CurvatureLabel);
  return index >= 0 ? index + 1 : 4; // Default to Balanced (4)
}

/**
 * Compare two labels: returns negative if a < b, 0 if equal, positive if a > b
 */
export function compareLabels(labelA: CurvatureLabel, labelB: CurvatureLabel): number {
  return getLabelLevel(labelA) - getLabelLevel(labelB);
}

