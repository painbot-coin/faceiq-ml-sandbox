/**
 * Side Landmark Auto-Placement
 * 
 * This module maps Lambda detection landmarks to our custom side profile landmark schema.
 * The Lambda model returns ~106 raw landmark points that need to be converted to our
 * semantic landmark names (e.g., "pronasale", "pogonion", "nasion").
 * 
 * Key concepts:
 * - Direct mapping: Some landmarks map directly to a Lambda index (e.g., pronasale = P83)
 * - Computed landmarks: Some are derived geometrically from multiple Lambda points
 * - Dependencies: Some landmarks depend on others being computed first
 * 
 * All output coordinates are normalized (0-1 range) relative to image dimensions.
 */

import { NormalizedLandmarkMap } from "@/types/face";

export interface LambdaLandmarkData {
  landmarks: Array<{ x: number; y: number }>;
  bbox: [number, number, number, number];
  direction: "left" | "right";
  imageWidth: number;
  imageHeight: number;
}

export type AutoPlacementValue =
  | number  // Direct Lambda index mapping
  | ((
      lambda: LambdaLandmarkData,
      placed: NormalizedLandmarkMap
    ) => { x: number; y: number } | null)  // Computed function
  | null;  // Not auto-placed

export type SideLandmarkMapping = {
  [landmarkKey: string]: AutoPlacementValue;
};

// ============================================================================
// Helper Functions for Geometric Computations
// ============================================================================

/**
 * Get a Lambda landmark point by index
 */
export const pt = (
  lambda: LambdaLandmarkData,
  index: number
): { x: number; y: number } => {
  return lambda.landmarks[index];
};

/**
 * Calculate midpoint between two points
 */
export const midpoint = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

/**
 * Calculate Euclidean distance between two points
 */
export const dist = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number => {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};

/**
 * Move a point along or perpendicular to a direction vector.
 * 
 * @param point - Starting point
 * @param options.along - Direction defined by two points (from → to)
 * @param options.perpendicular - Perpendicular direction
 * @param options.by - Distance to move (number or {x,y} for 2D movement)
 * @param options.unit - 'px' | 'percent' | 'distance'
 */
export const move = (
  point: { x: number; y: number },
  options: {
    along?: { from: { x: number; y: number }; to: { x: number; y: number } };
    perpendicular?: {
      from: { x: number; y: number };
      to: { x: number; y: number };
    };
    by: number | { x: number; y: number };
    unit?: "px" | "percent" | "distance";
    lambda?: LambdaLandmarkData;
  }
): { x: number; y: number } => {
  const { along, perpendicular, by, unit = "px", lambda } = options;

  let dirX = 0;
  let dirY = 0;

  if (along) {
    const dx = along.to.x - along.from.x;
    const dy = along.to.y - along.from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dirX = dx / len;
      dirY = dy / len;
    }
  } else if (perpendicular) {
    const dx = perpendicular.to.x - perpendicular.from.x;
    const dy = perpendicular.to.y - perpendicular.from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dirX = -dy / len;
      dirY = dx / len;
    }
  }

  let moveX = 0;
  let moveY = 0;

  if (typeof by === "number") {
    let amount = by;
    if (unit === "percent" && lambda) {
      amount = (lambda.imageWidth * by) / 100;
    } else if (unit === "distance" && along) {
      amount = dist(along.from, along.to) * by;
    } else if (unit === "distance" && perpendicular) {
      amount = dist(perpendicular.from, perpendicular.to) * by;
    }
    moveX = dirX * amount;
    moveY = dirY * amount;
  } else {
    if (along || perpendicular) {
      const ref = along || perpendicular!;
      const dx = ref.to.x - ref.from.x;
      const dy = ref.to.y - ref.from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const alongDir = { x: dx / len, y: dy / len };
        const perpDir = { x: -dy / len, y: dx / len };

        let amountAlong = by.x;
        let amountPerp = by.y;

        if (unit === "percent" && lambda) {
          amountAlong = (lambda.imageWidth * by.x) / 100;
          amountPerp = (lambda.imageHeight * by.y) / 100;
        } else if (unit === "distance") {
          const d = dist(ref.from, ref.to);
          amountAlong = d * by.x;
          amountPerp = d * by.y;
        }

        moveX = alongDir.x * amountAlong + perpDir.x * amountPerp;
        moveY = alongDir.y * amountAlong + perpDir.y * amountPerp;
      }
    }
  }

  return {
    x: point.x + moveX,
    y: point.y + moveY,
  };
};

// ============================================================================
// Side Landmark Mapping Configuration
// ============================================================================

/**
 * Mapping from our semantic landmark names to Lambda indices or computation functions.
 * 
 * Number values: Direct index into Lambda landmarks array
 * Function values: Compute from other landmarks (may have dependencies)
 * null: Not auto-placed, requires manual placement
 * 
 * Note: Functions return pixel coordinates which are then normalized.
 * Dependencies are resolved by checking the `placed` parameter.
 */
export const sideLandmarkMapping: SideLandmarkMapping = {
  // Top of head - computed from forehead landmarks
  vertex: (lambda) => {
    const p10 = pt(lambda, 10);
    const p8 = pt(lambda, 8);
    const p1 = pt(lambda, 1);
    const p12 = pt(lambda, 12);
    const distance = dist(p10, p8);

    return move(p10, {
      along: { from: p1, to: p12 },
      by: -distance,
    });
  },
  
  // Back of head prominence
  occiput: (lambda) => {
    const p9 = pt(lambda, 9);
    const p83 = pt(lambda, 83);
    const distance = dist(p9, p83);

    return move(p9, {
      along: { from: p83, to: p9 },
      by: distance,
    });
  },
  
  // Nose tip - direct mapping
  pronasale: 83,
  
  // Lower neck point
  neckPoint: (lambda) => {
    const p4 = pt(lambda, 4);
    const p0 = pt(lambda, 0);
    const p67 = pt(lambda, 67);
    const distance = dist(p0, p67);

    return move(p4, {
      along: { from: p67, to: p0 },
      by: distance,
    });
  },
  
  // Ear canal opening (Frankfort plane reference)
  porion: (lambda) => {
    const p10 = pt(lambda, 10);
    return {
      x: p10.x - lambda.imageWidth * 0.05,
      y: p10.y,
    };
  },
  
  // Lowest point of orbital rim
  orbitale: (lambda) => {
    const p37 = pt(lambda, 37);
    const p50 = pt(lambda, 50);
    const p17 = pt(lambda, 17);
    const distance = dist(p50, p17);

    return move(p37, {
      along: { from: p50, to: p17 },
      by: distance,
    });
  },
  
  // Ear cartilage - depends on porion
  tragus: (lambda, placed) => {
    if (!placed.porion) return null;

    const porion = {
      x: placed.porion.x * lambda.imageWidth,
      y: placed.porion.y * lambda.imageHeight,
    };

    const p13 = pt(lambda, 13);
    const p14 = pt(lambda, 14);
    const distance = dist(p13, p14) / 2;

    return move(porion, {
      along: { from: p13, to: p14 },
      by: distance,
    });
  },
  
  // Notch between tragus and antitragus - depends on tragus
  intertragicNotch: (lambda, placed) => {
    if (!placed.tragus) return null;

    const tragus = {
      x: placed.tragus.x * lambda.imageWidth,
      y: placed.tragus.y * lambda.imageHeight,
    };

    const p41 = pt(lambda, 41);
    const p33 = pt(lambda, 33);
    const distance = dist(p41, p33);

    return move(tragus, {
      along: { from: p41, to: p33 },
      by: distance,
    });
  },
  
  // Cornea apex - direct mapping
  cornealApex: 40,
  
  // Cheekbone - depends on orbitale
  cheekbone: (lambda, placed) => {
    if (!placed.orbitale) return null;

    const orbitale = {
      x: placed.orbitale.x * lambda.imageWidth,
      y: placed.orbitale.y * lambda.imageHeight,
    };

    const p84 = pt(lambda, 84);
    const p80 = pt(lambda, 80);
    const distance = dist(p84, p80);

    return move(orbitale, {
      along: { from: p84, to: p80 },
      by: distance,
    });
  },
  
  // Eyelid end - depends on cornealApex and cheekbone
  eyelidEnd: (lambda, placed) => {
    if (!placed.cornealApex || !placed.cheekbone) return null;

    const cheekbone = {
      x: placed.cheekbone.x * lambda.imageWidth,
      y: placed.cheekbone.y * lambda.imageHeight,
    };
    const cornealApex = {
      x: placed.cornealApex.x * lambda.imageWidth,
      y: placed.cornealApex.y * lambda.imageHeight,
    };

    return {
      x: cheekbone.x,
      y: cornealApex.y,
    };
  },
  
  // Lower eyelid - depends on cornealApex and orbitale
  lowerEyelid: (lambda, placed) => {
    if (!placed.cornealApex || !placed.orbitale) return null;

    const cornealApex = {
      x: placed.cornealApex.x * lambda.imageWidth,
      y: placed.cornealApex.y * lambda.imageHeight,
    };
    const orbitale = {
      x: placed.orbitale.x * lambda.imageWidth,
      y: placed.orbitale.y * lambda.imageHeight,
    };

    return {
      x: orbitale.x,
      y: (cornealApex.y + orbitale.y) / 2,
    };
  },
  
  // Hairline - computed from forehead points
  trichion: (lambda) => {
    const p104 = pt(lambda, 104);
    const p45 = pt(lambda, 45);
    const p80 = pt(lambda, 80);
    const distance = dist(p45, p80);

    return move(p104, {
      along: { from: p80, to: p45 },
      by: distance,
    });
  },
  
  // Brow ridge - direct mapping
  glabella: 104,
  
  // Forehead - midpoint between trichion and glabella
  forehead: (lambda, placed) => {
    if (!placed.trichion || !placed.glabella) return null;

    const trichion = {
      x: placed.trichion.x * lambda.imageWidth,
      y: placed.trichion.y * lambda.imageHeight,
    };
    const glabella = {
      x: placed.glabella.x * lambda.imageWidth,
      y: placed.glabella.y * lambda.imageHeight,
    };

    return midpoint(trichion, glabella);
  },
  
  // Nasal root - direct mapping
  nasion: 72,
  
  // Nose bridge - depends on pronasale and nasion
  rhinion: (lambda, placed) => {
    if (!placed.pronasale || !placed.nasion) return null;

    const pronasale = {
      x: placed.pronasale.x * lambda.imageWidth,
      y: placed.pronasale.y * lambda.imageHeight,
    };
    const nasion = {
      x: placed.nasion.x * lambda.imageWidth,
      y: placed.nasion.y * lambda.imageHeight,
    };

    const p74 = pt(lambda, 74);
    const p72 = pt(lambda, 72);
    const distance = dist(p74, p72);

    return move(pronasale, {
      along: { from: pronasale, to: nasion },
      by: distance,
    });
  },
  
  // Supratip break - depends on pronasale and rhinion
  supratip: (lambda, placed) => {
    if (!placed.pronasale || !placed.rhinion) return null;

    const pronasale = {
      x: placed.pronasale.x * lambda.imageWidth,
      y: placed.pronasale.y * lambda.imageHeight,
    };
    const rhinion = {
      x: placed.rhinion.x * lambda.imageWidth,
      y: placed.rhinion.y * lambda.imageHeight,
    };

    const distance = dist(pronasale, rhinion) / 3;

    return move(pronasale, {
      along: { from: pronasale, to: rhinion },
      by: distance,
    });
  },
  
  // Infratip - depends on pronasale
  infratip: (lambda, placed) => {
    if (!placed.pronasale) return null;

    const pronasale = {
      x: placed.pronasale.x * lambda.imageWidth,
      y: placed.pronasale.y * lambda.imageHeight,
    };

    const p83 = pt(lambda, 83);
    const p84 = pt(lambda, 84);
    const distance = dist(p83, p84);

    return move(pronasale, {
      along: { from: p83, to: p84 },
      by: distance,
    });
  },
  
  // Columella - depends on infratip
  columella: (lambda, placed) => {
    if (!placed.infratip) return null;

    const infratip = {
      x: placed.infratip.x * lambda.imageWidth,
      y: placed.infratip.y * lambda.imageHeight,
    };

    const p84 = pt(lambda, 84);
    const p85 = pt(lambda, 85);
    const distance = dist(p84, p85);

    return move(infratip, {
      along: { from: p84, to: p85 },
      by: distance,
    });
  },
  
  // Subnasale - depends on columella
  subnasale: (lambda, placed) => {
    if (!placed.columella) return null;

    const columella = {
      x: placed.columella.x * lambda.imageWidth,
      y: placed.columella.y * lambda.imageHeight,
    };

    const p85 = pt(lambda, 85);
    const p80 = pt(lambda, 80);
    const p32 = pt(lambda, 32);
    const distance = dist(p85, p32);

    return move(columella, {
      along: { from: p85, to: p80 },
      by: distance,
    });
  },
  
  // Nostril wing - direct mapping
  subalare: 77,
  
  // Upper lip - direct mapping
  labraleSuperius: 67,
  
  // Mouth corner - direct mapping
  cheilion: 52,
  
  // Lower lip - direct mapping
  labraleInferius: 59,
  
  // Labiomental fold
  sublabiale: (lambda) => {
    const p22 = pt(lambda, 22);
    const p53 = pt(lambda, 53);
    const p55 = pt(lambda, 55);
    const p56 = pt(lambda, 56);
    const distance = dist(p53, p56);

    return move(p22, {
      along: { from: p53, to: p55 },
      by: distance,
    });
  },
  
  // Chin point - direct mapping
  pogonion: 24,
  
  // Chin bottom - midpoint
  menton: (lambda) => {
    const p0 = pt(lambda, 0);
    const p8 = pt(lambda, 8);
    return midpoint(p0, p8);
  },
  
  // Cervical point - depends on neckPoint
  cervicalPoint: (lambda, placed) => {
    if (!placed.neckPoint) return null;

    const p4 = pt(lambda, 4);
    const neckPoint = {
      x: placed.neckPoint.x * lambda.imageWidth,
      y: placed.neckPoint.y * lambda.imageHeight,
    };

    const distance = lambda.imageHeight * 0.04;

    return move(p4, {
      along: { from: p4, to: neckPoint },
      by: distance,
    });
  },
  
  // Upper jaw angle - depends on intertragicNotch and tragus
  gonionTop: (lambda, placed) => {
    if (!placed.intertragicNotch || !placed.tragus) return null;

    const p15 = pt(lambda, 15);
    const p11 = pt(lambda, 11);
    const p12 = pt(lambda, 12);

    const intertragicNotch = {
      x: placed.intertragicNotch.x * lambda.imageWidth,
      y: placed.intertragicNotch.y * lambda.imageHeight,
    };
    const tragus = {
      x: placed.tragus.x * lambda.imageWidth,
      y: placed.tragus.y * lambda.imageHeight,
    };

    const distance = dist(intertragicNotch, p12);

    return move(p15, {
      along: { from: p11, to: tragus },
      by: distance,
    });
  },
  
  // Lower jaw angle - direct mapping
  gonionBottom: 2,
};

// ============================================================================
// Auto-Placement Functions
// ============================================================================

/**
 * Apply auto-placement to convert Lambda landmarks to our schema.
 * 
 * @param lambdaData - Raw Lambda detection data
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @returns Normalized landmark map (0-1 coordinates)
 */
export function applyAutoPlacement(
  lambdaData: LambdaLandmarkData,
  imageWidth: number,
  imageHeight: number
): NormalizedLandmarkMap {
  return applyAutoPlacementWithOverrides(
    lambdaData,
    imageWidth,
    imageHeight,
    {}
  );
}

/**
 * Apply auto-placement with manual overrides.
 * Useful when user has manually adjusted some landmarks.
 * 
 * @param lambdaData - Raw Lambda detection data
 * @param imageWidth - Original image width  
 * @param imageHeight - Original image height
 * @param overrides - Manual landmark positions to preserve
 * @returns Normalized landmark map with overrides applied
 */
export function applyAutoPlacementWithOverrides(
  lambdaData: LambdaLandmarkData,
  imageWidth: number,
  imageHeight: number,
  overrides: NormalizedLandmarkMap
): NormalizedLandmarkMap {
  const result: NormalizedLandmarkMap = {};
  const placed: NormalizedLandmarkMap = {};

  for (const [key, mapping] of Object.entries(sideLandmarkMapping)) {
    // If there's an override for this landmark, use it
    if (overrides[key]) {
      const normalizedCoords = overrides[key];
      result[key] = normalizedCoords;
      placed[key] = normalizedCoords;
      continue;
    }

    if (mapping === null) {
      continue;
    }

    let coords: { x: number; y: number } | null = null;

    if (typeof mapping === "number") {
      // Direct Lambda index mapping
      const lambdaPoint = lambdaData.landmarks[mapping];
      if (lambdaPoint) {
        coords = {
          x: lambdaPoint.x / imageWidth,
          y: lambdaPoint.y / imageHeight,
        };
      }
    } else if (typeof mapping === "function") {
      // Computed from other landmarks
      const rawCoords = mapping(lambdaData, placed);
      if (rawCoords) {
        coords = {
          x: rawCoords.x / imageWidth,
          y: rawCoords.y / imageHeight,
        };
      }
    }

    if (coords && isFinite(coords.x) && isFinite(coords.y)) {
      const normalizedCoords = {
        x: Math.max(0, Math.min(1, coords.x)),
        y: Math.max(0, Math.min(1, coords.y)),
      };
      result[key] = normalizedCoords;
      placed[key] = normalizedCoords;
    }
  }

  return result;
}

/**
 * Mirror landmarks horizontally for right-facing profiles.
 * Our analysis assumes left-facing profile, so right-facing images
 * need their landmarks mirrored.
 */
export function mirrorLandmarksHorizontally(
  landmarks: NormalizedLandmarkMap
): NormalizedLandmarkMap {
  const mirrored: NormalizedLandmarkMap = {};
  for (const [key, coords] of Object.entries(landmarks)) {
    mirrored[key] = {
      x: 1 - coords.x,
      y: coords.y,
    };
  }
  return mirrored;
}
