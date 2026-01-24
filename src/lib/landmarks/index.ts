/**
 * Landmark Detection Module
 * 
 * This module provides the complete facial landmarking pipeline used in FaceIQ:
 * 
 * 1. Front Profile Detection (MediaPipe)
 *    - Client-side detection using Google's MediaPipe Face Landmarker
 *    - Detects 468/478 facial landmarks
 *    - Maps to our custom ~50 landmark schema
 * 
 * 2. Side Profile Detection (AWS Lambda)
 *    - Server-side detection using our custom "oasis-model" Lambda
 *    - Detects 106 side profile landmarks
 *    - Auto-places ~30 semantic landmarks from raw points
 * 
 * Usage:
 * ```typescript
 * // Front detection (client-side)
 * import { detectFrontLandmarks, preloadMediaPipe } from '@/lib/landmarks';
 * 
 * // Side detection (server-side API route)
 * import { detectSideLandmarks, computeStandardizationParams } from '@/lib/landmarks';
 * 
 * // Auto-placement for side landmarks
 * import { applyAutoPlacement, mirrorLandmarksHorizontally } from '@/lib/landmarks';
 * 
 * // Landmark definitions
 * import { frontProfileLandmarks, sideProfileLandmarks } from '@/lib/landmarks';
 * ```
 */

// Landmark definitions and metadata
export {
  type Landmark,
  type LandmarkCollection,
  type ProfileType,
  type Gender,
  type Race,
  frontProfileLandmarks,
  sideProfileLandmarks,
  getAllLandmarks,
  getFrontLandmarkKeys,
  getSideLandmarkKeys,
} from './landmarks';

// MediaPipe front profile detection (client-side)
export {
  preloadMediaPipe,
  standardizeFaceImage,
  detectFace,
  detectRawMediaPipeLandmarks,
  detectFrontLandmarks,
  MEDIAPIPE_LANDMARK_MAP,
  MEDIAPIPE_OFFSET_MAP,
} from './mediapipe';

// Side profile Lambda detection (server-side)
export {
  type Landmark as SideLandmark,
  type BoundingBox,
  type LandmarkDetectionResult,
  type StandardizationParams,
  detectFacingDirection,
  detectSideLandmarks,
  computeStandardizationParams,
} from './side-landmarks';

// Side landmark auto-placement
export {
  type LambdaLandmarkData,
  type AutoPlacementValue,
  type SideLandmarkMapping,
  sideLandmarkMapping,
  pt,
  midpoint,
  dist,
  move,
  applyAutoPlacement,
  applyAutoPlacementWithOverrides,
  mirrorLandmarksHorizontally,
} from './side-auto-placement';
