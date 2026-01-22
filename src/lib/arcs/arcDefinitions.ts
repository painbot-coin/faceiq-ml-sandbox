/**
 * Arc Definitions
 * 
 * Defines which landmarks form each arc for both front and side profiles.
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
 */
export const FRONT_ARC_DEFINITIONS: ArcDefinition[] = [
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
    adjustmentInstruction: 'Adjust the arc to match your hairline shape.',
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
  
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
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.4 },
  },
  
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
    invertCurvatureSign: true,
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.4 },
  },
  
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
    invertCurvatureSign: true,
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
    triggerLandmark: 'chinRight',
    hasIntermediatePoints: false,
    showWithArcs: [ARC_CHIN, ARC_MANDIBLE_RIGHT],
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
    triggerLandmark: 'chinRight',
    hasIntermediatePoints: false,
    showWithArcs: [ARC_CHIN, ARC_MANDIBLE_LEFT],
    invertCurvatureSign: true,
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.35 },
  },
  
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
    invertCurvatureSign: true,
    jerkConfig: { enabled: true, spikeThreshold: 1.8, qualityWeight: 0.35 },
  },
  
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
    jerkConfig: { enabled: true, spikeThreshold: 1.8, qualityWeight: 0.35 },
  },
];

/**
 * Side Profile Arc Definitions
 */
export const SIDE_ARC_DEFINITIONS: ArcDefinition[] = [
  {
    id: ARC_FOREHEAD,
    name: 'Upper Forehead Arc',
    profile: 'side',
    throughPoints: ['trichion', 'forehead', 'glabella'],
    pointNames: ['Trichion (Hairline)', 'Forehead (Frontalis)', 'Glabella'],
    category: 'forehead',
    description: 'Forehead curvature/slope',
    triggerLandmark: 'forehead',
    hasIntermediatePoints: false,
    adjustmentInstruction: 'Adjust the arc to match your forehead curvature from hairline to brow.',
    jerkConfig: { enabled: true, spikeThreshold: 2.5, qualityWeight: 0.2 },
  },
  
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
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
  
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
    jerkConfig: { enabled: true, spikeThreshold: 1.5, qualityWeight: 0.4 },
  },
  
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
    jerkConfig: { enabled: true, spikeThreshold: 1.8, qualityWeight: 0.35 },
  },
  
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
    jerkConfig: { enabled: true, spikeThreshold: 2.0, qualityWeight: 0.3 },
  },
  
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
 * Get all arcs that can be shown given current landmarks
 */
export function getAvailableArcs(
  profile: 'front' | 'side',
  landmarks: Record<string, { x: number; y: number }>
): ArcDefinition[] {
  const definitions = getArcDefinitionsForProfile(profile);
  return definitions.filter(arcDef => hasAllLandmarksForArc(arcDef, landmarks));
}
