/**
 * Arc Definitions
 * 
 * Defines which landmarks form each arc for both front and side profiles.
 * Arcs appear during landmarking AFTER all required points are placed.
 * The arc adjustment becomes its own "step" before moving to next landmarks.
 * 
 * Each arc includes jerkConfig for feature-specific tuning of smoothness metrics:
 * - Jawline/Mandible: HIGH jerk weight (detects gonial notch, bone step-offs)
 * - Chin: MEDIUM jerk weight (balance between shape and smoothness)
 * - Cheek: MEDIUM-HIGH jerk weight (detects hollow-to-bulge transitions)
 * - Hairline: MEDIUM jerk weight (detects widow's peak spikes, M-shape harshness)
 * - Forehead: LOW jerk weight (generally should be smooth, less diagnostic value)
 * - Submental: MEDIUM jerk weight (detects fat deposit irregularities)
 */

import { ArcDefinition } from './types';
import {
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
} from './constants';

/**
 * Front Profile Arc Definitions
 * 
 * Order of appearance during landmarking:
 * 1. Hairline arc: after rightTemple (point 11)
 * 2. Left Gonion arc: after leftBottomGonion (point 45)
 * 3. Right Gonion arc: after rightBottomGonion (point 46)
 * 4. Chin + Mandible arcs: after chinRight (point 48) - shown together as lower jaw contour
 * 5. Left Cheek arc: after leftCheek (point 51)
 * 6. Right Cheek arc: after rightCheek (point 52)
 */
export const FRONT_ARC_DEFINITIONS: ArcDefinition[] = [
  // === HAIRLINE (appears first, after rightTemple) ===
  {
    id: ARC_HAIRLINE,
    name: 'Hairline Arc',
    profile: 'front',
    throughPoints: ['leftTemple', 'hairline', 'rightTemple'],
    pointNames: ['Left Temple', 'Hairline Center', 'Right Temple'],
    category: 'hairline',
    description: 'Hairline shape (rounded, M-shaped, etc.)',
    triggerLandmark: 'rightTemple',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your hairline shape. Drag handles to fine-tune the curve.',
    // MEDIUM jerk weight: detects widow's peak spikes, M-shape harshness
    // f‴ = "how spiky/broken" not "how recessed"
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
  
  // === LEFT GONION (appears after leftBottomGonion) ===
  {
    id: ARC_GONION_LEFT,
    name: 'Left Gonion Arc',
    profile: 'front',
    throughPoints: ['leftBottomGonion', 'leftTopGonion'],
    pointNames: ['Left Lower Gonion', 'Left Upper Gonion'],
    category: 'jaw',
    description: 'Left ramus/gonion curvature',
    triggerLandmark: 'leftBottomGonion',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match the angle of your left jaw.',
    // HIGH jerk weight: textbook f‴ feature - detects gonial notch harshness, bone step-offs
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.4 },
  },
  
  // === RIGHT GONION (appears after rightBottomGonion) ===
  {
    id: ARC_GONION_RIGHT,
    name: 'Right Gonion Arc',
    profile: 'front',
    throughPoints: ['rightBottomGonion', 'rightTopGonion'],
    pointNames: ['Right Lower Gonion', 'Right Upper Gonion'],
    category: 'jaw',
    description: 'Right ramus/gonion curvature',
    triggerLandmark: 'rightBottomGonion',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match the angle of your right jaw.',
    invertCurvatureSign: true, // Right-side bilateral: invert to match left-side direction
    // HIGH jerk weight: textbook f‴ feature - detects gonial notch harshness, bone step-offs
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.4 },
  },
  
  // === LOWER JAW CONTOUR (chin + both mandibles, appears together after chinRight) ===
  {
    id: ARC_CHIN,
    name: 'Chin Arc',
    profile: 'front',
    throughPoints: ['chinLeft', 'chinBottom', 'chinRight'],
    pointNames: ['Chin Left', 'Chin Bottom', 'Chin Right'],
    category: 'chin',
    description: 'Measures chin roundness/angularity',
    triggerLandmark: 'chinRight',
    hasIntermediatePoints: false,
    showWithArcs: [ARC_MANDIBLE_LEFT, ARC_MANDIBLE_RIGHT],
    adjustmentInstruction: 'Adjust the lower jaw contour to match your chin and jaw shape.',
    invertCurvatureSign: true, // Horizontal arc: raw "outward" (down) is negative, flip for convention
    // MEDIUM jerk weight: balance between shape importance and smoothness
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.25 },
  },
  {
    id: ARC_MANDIBLE_LEFT,
    name: 'Left Mandible Arc',
    profile: 'front',
    throughPoints: ['chinLeft', 'leftBottomGonion'],
    pointNames: ['Chin Left', 'Left Lower Gonion'],
    category: 'jaw',
    description: 'Left jaw body curvature',
    triggerLandmark: 'chinRight', // Same trigger as chin - shown together
    hasIntermediatePoints: false,
    showWithArcs: [ARC_CHIN, ARC_MANDIBLE_RIGHT],
    // HIGH jerk weight: detects irregular mandibular contour, over-aggressive bone structure
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.35 },
  },
  {
    id: ARC_MANDIBLE_RIGHT,
    name: 'Right Mandible Arc',
    profile: 'front',
    throughPoints: ['chinRight', 'rightBottomGonion'],
    pointNames: ['Chin Right', 'Right Lower Gonion'],
    category: 'jaw',
    description: 'Right jaw body curvature',
    triggerLandmark: 'chinRight', // Same trigger as chin - shown together
    hasIntermediatePoints: false,
    showWithArcs: [ARC_CHIN, ARC_MANDIBLE_LEFT],
    invertCurvatureSign: true, // Right-side bilateral: invert to match left-side direction
    // HIGH jerk weight: detects irregular mandibular contour, over-aggressive bone structure
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.35 },
  },
  
  // === LEFT CHEEK (appears after leftCheek) ===
  {
    id: ARC_CHEEK_LEFT,
    name: 'Left Cheek Contour',
    profile: 'front',
    throughPoints: ['leftCheek', 'leftTopGonion'],
    pointNames: ['Left Cheekbone', 'Left Upper Gonion'],
    category: 'cheek',
    description: 'Left cheek hollowing/contour',
    triggerLandmark: 'leftCheek',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your left cheek contour.',
    invertCurvatureSign: true, // Vertical arc: raw "outward" is negative, flip for convention
    // MEDIUM-HIGH jerk weight: detects hollow-to-bulge transitions, uneven cheek support
    jerkConfig: { enabled: true, spikeThreshold: 1.8, qualityWeight: 0.35 },
  },
  
  // === RIGHT CHEEK (appears after rightCheek) ===
  {
    id: ARC_CHEEK_RIGHT,
    name: 'Right Cheek Contour',
    profile: 'front',
    throughPoints: ['rightCheek', 'rightTopGonion'],
    pointNames: ['Right Cheekbone', 'Right Upper Gonion'],
    category: 'cheek',
    description: 'Right cheek hollowing/contour',
    triggerLandmark: 'rightCheek',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your right cheek contour.',
    // No inversion: raw right-side is opposite of left, left is inverted, so right needs no inversion
    // Result: both sides show outward = positive
    // MEDIUM-HIGH jerk weight: detects hollow-to-bulge transitions, uneven cheek support
    jerkConfig: { enabled: true, spikeThreshold: 1.8, qualityWeight: 0.35 },
  },
];

/**
 * Side Profile Arc Definitions
 * 
 * Order of appearance during landmarking:
 * 1. Upper forehead arc: after forehead (point 15) - uses trichion, forehead, glabella
 * 2. Submental arc: after cervicalPoint (point 29)
 */
export const SIDE_ARC_DEFINITIONS: ArcDefinition[] = [
  // === FOREHEAD (appears after forehead point) ===
  {
    id: ARC_FOREHEAD,
    name: 'Upper Forehead Arc',
    profile: 'side',
    // Fixed: now includes forehead (frontalis) point between trichion and glabella
    throughPoints: ['trichion', 'forehead', 'glabella'],
    pointNames: ['Trichion (Hairline)', 'Forehead (Frontalis)', 'Glabella'],
    category: 'forehead',
    description: 'Forehead curvature/slope',
    triggerLandmark: 'forehead',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your forehead curvature from hairline to brow.',
    // LOW jerk weight: forehead should generally be smooth, less diagnostic value from jerk
    // f‴ can still detect brow bossing sharpness, frontal sinus prominence
    jerkConfig: { enabled: true, spikeThreshold: 2.5, qualityWeight: 0.2 },
  },
  
  // === SUBMENTAL (appears after cervicalPoint) ===
  {
    id: ARC_SUBMENTAL,
    name: 'Submental Arc',
    profile: 'side',
    throughPoints: ['menton', 'cervicalPoint', 'neckPoint'],
    pointNames: ['Menton (Chin)', 'Cervical Point', 'Neck Point'],
    category: 'neck',
    description: 'Neck-chin definition/submental area',
    triggerLandmark: 'cervicalPoint',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your neck-chin contour.',
    // MEDIUM jerk weight: detects sharp cervicomental transition, fat deposit irregularities
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
  
  // === NASAL BRIDGE (appears after supratip) ===
  {
    id: ARC_NASAL_BRIDGE,
    name: 'Nasal Bridge Arc',
    profile: 'side',
    throughPoints: ['nasion', 'rhinion', 'supratip'],
    pointNames: ['Nasion', 'Rhinion', 'Supratip Break'],
    category: 'nose',
    description: 'Nasal dorsum/bridge curvature (humps, ski-slope, straight)',
    triggerLandmark: 'supratip',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your nasal bridge profile from nasion to supratip.',
    // HIGH jerk weight: one of highest ROI uses of f‴ - detects dorsal humps, surgical irregularities
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.4 },
  },
  
  // === NOSE TIP (appears after columella) ===
  {
    id: ARC_NOSE_TIP,
    name: 'Nose Tip Arc',
    profile: 'side',
    throughPoints: ['supratip', 'pronasale', 'infratip', 'columella'],
    pointNames: ['Supratip', 'Pronasale (Tip)', 'Infratip', 'Columella'],
    category: 'nose',
    description: 'Nose tip roundness/definition',
    triggerLandmark: 'columella',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your nose tip shape from supratip around to columella.',
    // MEDIUM-HIGH jerk weight: detects tip irregularities, bulbous vs refined tip shape
    jerkConfig: { enabled: true, spikeThreshold: 1.8, qualityWeight: 0.35 },
  },
  
  // === UPPER LIP (appears after cheilion) ===
  {
    id: ARC_UPPER_LIP,
    name: 'Upper Lip Arc',
    profile: 'side',
    throughPoints: ['labraleSuperius', 'cheilion'],
    pointNames: ['Upper Lip (Labrale Superius)', 'Mouth Corner (Cheilion)'],
    category: 'lips',
    description: 'Upper lip curvature/fullness in profile',
    triggerLandmark: 'cheilion',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your upper lip curve from the most forward point to the mouth corner.',
    // MEDIUM jerk weight: detects lip irregularities, filler bumps
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
  
  // === LOWER LIP (appears after cheilion - same trigger as upper lip) ===
  {
    id: ARC_LOWER_LIP,
    name: 'Lower Lip Arc',
    profile: 'side',
    throughPoints: ['labraleInferius', 'cheilion'],
    pointNames: ['Lower Lip (Labrale Inferius)', 'Mouth Corner (Cheilion)'],
    category: 'lips',
    description: 'Lower lip curvature/fullness in profile',
    triggerLandmark: 'cheilion',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your lower lip curve from the most forward point to the mouth corner.',
    // MEDIUM jerk weight: detects lip irregularities, filler bumps
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
];

export const ALL_ARC_DEFINITIONS = [...FRONT_ARC_DEFINITIONS, ...SIDE_ARC_DEFINITIONS];

/**
 * Get arc definitions for a specific profile
 */
export function getArcDefinitionsForProfile(profile: 'front' | 'side'): ArcDefinition[] {
  return profile === 'front' ? FRONT_ARC_DEFINITIONS : SIDE_ARC_DEFINITIONS;
}

/**
 * Get an arc definition by ID
 */
export function getArcDefinitionById(arcId: string): ArcDefinition | undefined {
  return ALL_ARC_DEFINITIONS.find(arc => arc.id === arcId);
}

/**
 * Check if all landmarks for an arc are present
 */
export function hasAllLandmarksForArc(
  arcDef: ArcDefinition,
  landmarks: Record<string, { x: number; y: number }>
): boolean {
  return arcDef.throughPoints.every(pointKey => landmarks[pointKey] !== undefined);
}

/**
 * Get arcs that should be triggered by a specific landmark being placed
 * Returns the primary arc and any arcs that should be shown with it
 */
export function getArcsTriggeredByLandmark(
  profile: 'front' | 'side',
  landmarkKey: string,
  landmarks: Record<string, { x: number; y: number }>
): ArcDefinition[] {
  const definitions = getArcDefinitionsForProfile(profile);
  
  // Find arcs triggered by this landmark that have all their points
  const primaryArcs = definitions.filter(
    arc => arc.triggerLandmark === landmarkKey && hasAllLandmarksForArc(arc, landmarks)
  );
  
  if (primaryArcs.length === 0) return [];
  
  // Collect all related arcs (showWithArcs)
  const allArcIds = new Set<string>();
  primaryArcs.forEach(arc => {
    allArcIds.add(arc.id);
    arc.showWithArcs?.forEach(id => allArcIds.add(id));
  });
  
  // Return all arcs that should be shown, filtering to those that have all landmarks
  return definitions.filter(
    arc => allArcIds.has(arc.id) && hasAllLandmarksForArc(arc, landmarks)
  );
}

/**
 * Get all arcs that can be shown given current landmarks
 * (Legacy function - use getArcsTriggeredByLandmark for sequential flow)
 */
export function getAvailableArcs(
  profile: 'front' | 'side',
  landmarks: Record<string, { x: number; y: number }>
): ArcDefinition[] {
  const definitions = getArcDefinitionsForProfile(profile);
  return definitions.filter(arcDef => hasAllLandmarksForArc(arcDef, landmarks));
}

/**
 * Get the adjustment instruction for an arc or group of arcs
 */
export function getArcAdjustmentInstruction(arcs: ArcDefinition[]): string {
  // Find the primary arc (one with showWithArcs or first one)
  const primaryArc = arcs.find(arc => arc.showWithArcs) || arcs[0];
  return primaryArc?.adjustmentInstruction || 'Adjust the arc to match your feature shape.';
}

/**
 * Get the region name for a group of arcs (for snapping/zooming)
 */
export function getArcRegionName(arcs: ArcDefinition[]): string {
  if (arcs.length === 0) return '';
  
  const categories = new Set(arcs.map(a => a.category));
  
  if (categories.has('chin') || categories.has('jaw')) {
    if (arcs.some(a => a.id.includes('chin') || a.id.includes('mandible'))) {
      return 'lower-jaw';
    }
    if (arcs.some(a => a.id.includes('gonion-left'))) return 'left-jaw';
    if (arcs.some(a => a.id.includes('gonion-right'))) return 'right-jaw';
  }
  if (categories.has('hairline')) return 'hairline';
  if (categories.has('cheek')) {
    if (arcs.some(a => a.id.includes('left'))) return 'left-cheek';
    if (arcs.some(a => a.id.includes('right'))) return 'right-cheek';
  }
  if (categories.has('forehead')) return 'forehead';
  if (categories.has('neck')) return 'neck';
  if (categories.has('nose')) return 'nose';
  
  return arcs[0].category;
}
