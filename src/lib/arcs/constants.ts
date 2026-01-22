/**
 * Arc ID Constants
 * 
 * Type-safe constants for arc identifiers, ensuring consistency
 * across the codebase when referencing arcs.
 */

// ============================================
// BASELINE ARCS (1-10) - Stored in Database
// ============================================

/** #1 - Hairline shape (front profile) */
export const ARC_HAIRLINE = 'hairline-arc' as const;

/** #2 - Left cheek contour (front profile) */
export const ARC_CHEEK_LEFT = 'cheek-left-arc' as const;

/** #3 - Right cheek contour (front profile) */
export const ARC_CHEEK_RIGHT = 'cheek-right-arc' as const;

/** #4 - Left gonion/ramus (front profile) */
export const ARC_GONION_LEFT = 'gonion-left-arc' as const;

/** #5 - Right gonion/ramus (front profile) */
export const ARC_GONION_RIGHT = 'gonion-right-arc' as const;

/** #6 - Left mandible body (front profile) */
export const ARC_MANDIBLE_LEFT = 'mandible-left-arc' as const;

/** #7 - Right mandible body (front profile) */
export const ARC_MANDIBLE_RIGHT = 'mandible-right-arc' as const;

/** #8 - Chin curvature (front profile) */
export const ARC_CHIN = 'chin-arc' as const;

/** #9 - Upper forehead (side profile) */
export const ARC_FOREHEAD = 'forehead-arc' as const;

/** #10 - Submental/neck-chin (side profile) */
export const ARC_SUBMENTAL = 'submental-arc' as const;

/** #11 - Nasal bridge/dorsum (side profile) */
export const ARC_NASAL_BRIDGE = 'nasal-bridge-arc' as const;

/** #12 - Nose tip roundness (side profile) */
export const ARC_NOSE_TIP = 'nose-tip-arc' as const;

/** #13 - Upper lip curvature (side profile) */
export const ARC_UPPER_LIP = 'upper-lip-arc' as const;

/** #14 - Lower lip curvature (side profile) */
export const ARC_LOWER_LIP = 'lower-lip-arc' as const;

// ============================================
// COMBINED ARCS (15-23) - Computed on Demand
// ============================================

/** #15 - Jaw Segment A1: Left gonion + left mandible */
export const ARC_JAW_SEGMENT_A1 = 'jaw-segment-a1' as const;

/** #16 - Jaw Segment A2: Right gonion + right mandible */
export const ARC_JAW_SEGMENT_A2 = 'jaw-segment-a2' as const;

/** #17 - Lower Face Contour: Full wrap around lower facial contour */
export const ARC_LOWER_FACE_CONTOUR = 'lower-face-contour' as const;

/** #18 - Jaw Segment B1: Left cheek + left gonion + left mandible */
export const ARC_JAW_SEGMENT_B1 = 'jaw-segment-b1' as const;

/** #19 - Jaw Segment B2: Right cheek + right gonion + right mandible */
export const ARC_JAW_SEGMENT_B2 = 'jaw-segment-b2' as const;

/** #20 - Full Jaw Contour: Full wrap from left cheek to right cheek */
export const ARC_FULL_JAW_CONTOUR = 'full-jaw-contour' as const;

/** #21 - Jaw Segment C1: Left cheek + left gonion */
export const ARC_JAW_SEGMENT_C1 = 'jaw-segment-c1' as const;

/** #22 - Jaw Segment C2: Right cheek + right gonion */
export const ARC_JAW_SEGMENT_C2 = 'jaw-segment-c2' as const;

/** #23 - Mandibular Contour: Both mandibles + chin */
export const ARC_MANDIBULAR_CONTOUR = 'mandibular-contour' as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

/** All baseline arc IDs (stored in database) */
export const BASELINE_ARC_IDS = [
  ARC_HAIRLINE,
  ARC_CHEEK_LEFT,
  ARC_CHEEK_RIGHT,
  ARC_GONION_LEFT,
  ARC_GONION_RIGHT,
  ARC_MANDIBLE_LEFT,
  ARC_MANDIBLE_RIGHT,
  ARC_CHIN,
  ARC_FOREHEAD,
  ARC_SUBMENTAL,
  ARC_NASAL_BRIDGE,
  ARC_NOSE_TIP,
  ARC_UPPER_LIP,
  ARC_LOWER_LIP,
] as const;

/** All combined arc IDs (computed on demand) */
export const COMBINED_ARC_IDS = [
  ARC_JAW_SEGMENT_A1,
  ARC_JAW_SEGMENT_A2,
  ARC_LOWER_FACE_CONTOUR,
  ARC_JAW_SEGMENT_B1,
  ARC_JAW_SEGMENT_B2,
  ARC_FULL_JAW_CONTOUR,
  ARC_JAW_SEGMENT_C1,
  ARC_JAW_SEGMENT_C2,
  ARC_MANDIBULAR_CONTOUR,
] as const;

/** All arc IDs */
export const ALL_ARC_IDS = [...BASELINE_ARC_IDS, ...COMBINED_ARC_IDS] as const;

/** Type for baseline arc IDs */
export type BaselineArcId = typeof BASELINE_ARC_IDS[number];

/** Type for combined arc IDs */
export type CombinedArcId = typeof COMBINED_ARC_IDS[number];

/** Type for any arc ID */
export type ArcId = typeof ALL_ARC_IDS[number];

/** Front profile baseline arcs */
export const FRONT_BASELINE_ARC_IDS = [
  ARC_HAIRLINE,
  ARC_CHEEK_LEFT,
  ARC_CHEEK_RIGHT,
  ARC_GONION_LEFT,
  ARC_GONION_RIGHT,
  ARC_MANDIBLE_LEFT,
  ARC_MANDIBLE_RIGHT,
  ARC_CHIN,
] as const;

/** Side profile baseline arcs */
export const SIDE_BASELINE_ARC_IDS = [
  ARC_FOREHEAD,
  ARC_SUBMENTAL,
  ARC_NASAL_BRIDGE,
  ARC_NOSE_TIP,
] as const;

// ============================================
// BILATERAL ARC PAIRS (for symmetry comparison)
// ============================================

export const BILATERAL_ARC_PAIRS: Array<{ left: BaselineArcId; right: BaselineArcId; name: string }> = [
  { left: ARC_CHEEK_LEFT, right: ARC_CHEEK_RIGHT, name: 'Cheek Contour' },
  { left: ARC_GONION_LEFT, right: ARC_GONION_RIGHT, name: 'Gonion' },
  { left: ARC_MANDIBLE_LEFT, right: ARC_MANDIBLE_RIGHT, name: 'Mandible' },
];

export const BILATERAL_COMBINED_PAIRS: Array<{ left: CombinedArcId; right: CombinedArcId; name: string }> = [
  { left: ARC_JAW_SEGMENT_A1, right: ARC_JAW_SEGMENT_A2, name: 'Jaw Segment A' },
  { left: ARC_JAW_SEGMENT_B1, right: ARC_JAW_SEGMENT_B2, name: 'Jaw Segment B' },
  { left: ARC_JAW_SEGMENT_C1, right: ARC_JAW_SEGMENT_C2, name: 'Jaw Segment C' },
];

// ============================================
// COMBINED ARC COMPOSITION MAP
// ============================================

/**
 * Defines which baseline arcs compose each combined arc
 * Order matters - arcs are traversed in this order
 */
export const COMBINED_ARC_COMPONENTS: Record<CombinedArcId, {
  components: BaselineArcId[];
  /** Sign inversion flags for each component to maintain consistent CI direction */
  invertSigns: boolean[];
}> = {
  [ARC_JAW_SEGMENT_A1]: {
    components: [ARC_GONION_LEFT, ARC_MANDIBLE_LEFT],
    invertSigns: [false, false],
  },
  [ARC_JAW_SEGMENT_A2]: {
    components: [ARC_GONION_RIGHT, ARC_MANDIBLE_RIGHT],
    invertSigns: [true, true], // Right-side: invert both
  },
  [ARC_LOWER_FACE_CONTOUR]: {
    components: [ARC_GONION_LEFT, ARC_MANDIBLE_LEFT, ARC_CHIN, ARC_MANDIBLE_RIGHT, ARC_GONION_RIGHT],
    invertSigns: [false, false, true, true, true],
  },
  [ARC_JAW_SEGMENT_B1]: {
    components: [ARC_CHEEK_LEFT, ARC_GONION_LEFT, ARC_MANDIBLE_LEFT],
    invertSigns: [true, false, false], // Cheek left is inverted
  },
  [ARC_JAW_SEGMENT_B2]: {
    components: [ARC_CHEEK_RIGHT, ARC_GONION_RIGHT, ARC_MANDIBLE_RIGHT],
    invertSigns: [false, true, true], // Cheek right not inverted, others are
  },
  [ARC_FULL_JAW_CONTOUR]: {
    components: [ARC_CHEEK_LEFT, ARC_GONION_LEFT, ARC_MANDIBLE_LEFT, ARC_CHIN, ARC_MANDIBLE_RIGHT, ARC_GONION_RIGHT, ARC_CHEEK_RIGHT],
    invertSigns: [true, false, false, true, true, true, false],
  },
  [ARC_JAW_SEGMENT_C1]: {
    components: [ARC_CHEEK_LEFT, ARC_GONION_LEFT],
    invertSigns: [true, false],
  },
  [ARC_JAW_SEGMENT_C2]: {
    components: [ARC_CHEEK_RIGHT, ARC_GONION_RIGHT],
    invertSigns: [false, true],
  },
  [ARC_MANDIBULAR_CONTOUR]: {
    components: [ARC_MANDIBLE_LEFT, ARC_CHIN, ARC_MANDIBLE_RIGHT],
    invertSigns: [false, true, true],
  },
};
