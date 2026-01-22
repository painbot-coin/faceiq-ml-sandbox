export interface MorphCropConfig {
    topPercent: number;
    bottomPercent: number;
    orientationOverride?: 'horizontal' | 'vertical';
}

export interface MorphCrop {
    topPercent: number;
    bottomPercent: number;
    orientation: 'horizontal' | 'vertical';
    aspectRatio: number;
}

export interface MorphConfig {
    male: MorphCropConfig;
    female: MorphCropConfig;
}

export const MORPH_CROPS: Record<string, MorphConfig> = {
    overall_angularity: {
        male: { topPercent: 0, bottomPercent: 0 },
        female: { topPercent: 0, bottomPercent: 0 },
    },
    jaw_definition: {
        male: { topPercent: 35, bottomPercent: 20 },
        female: { topPercent: 35, bottomPercent: 20 },
    },
    cheek_leanness: {
        male: { topPercent: 55, bottomPercent: 2 },
        female: { topPercent: 50, bottomPercent: 0 },
    },
    cheek_prominence: {
        male: {
            topPercent: 32,
            bottomPercent: 32,
        },
        female: { topPercent: 29, bottomPercent: 30 },
    },
    chin_definition: {
        male: { topPercent: 20, bottomPercent: 15 },
        female: { topPercent: 20, bottomPercent: 12 },
    },
    submental_definition: {
        male: { topPercent: 30, bottomPercent: 30 },
        female: { topPercent: 26, bottomPercent: 30 },
    },
};

export function getMorphCrop(assessmentId: string, gender: 'male' | 'female'): MorphCrop | null {
    const config = MORPH_CROPS[assessmentId];
    if (!config) return null;

    const cropConfig = config[gender];
    const remainingHeight = 100 - cropConfig.topPercent - cropConfig.bottomPercent;
    const aspectRatio = 100 / remainingHeight;

    const orientation = cropConfig.orientationOverride ?? (aspectRatio > 1 ? 'vertical' : 'horizontal');

    return {
        topPercent: cropConfig.topPercent,
        bottomPercent: cropConfig.bottomPercent,
        orientation,
        aspectRatio,
    };
}

export function calculateAspectRatio(crop: MorphCrop): number {
    return crop.aspectRatio;
}
