import { NormalizedLandmarkMap } from '@/types/face';

export interface Stamp {
  score: number;
  frame: number;
  label: string;
  description?: string;
}

// Crop region using normalized 0-1024 coordinate system (same as harmony illustrations)
export interface CropRegion {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Function type that calculates crop region from landmarks
export type CropCalculator = (landmarks: NormalizedLandmarkMap) => CropRegion;

export interface Assessment {
  id: string;
  title: string;
  description: string;
  morphFolder: string;
  femaleMorphFolder?: string;
  stamps: Stamp[];
  getCropRegion?: CropCalculator;
}

// Generate stamps for a given scale
const generateStamps = (minScore: number, maxScore: number): Stamp[] => {
  const numStamps = maxScore - minScore + 1;
  const stamps: Stamp[] = [];

  for (let i = 0; i < numStamps; i++) {
    const score = minScore + i;
    const frame = Math.round((i / (numStamps - 1)) * 39);

    stamps.push({
      score,
      frame,
      label: getScoreLabel(score, minScore, maxScore),
    });
  }

  return stamps;
};

const getScoreLabel = (score: number, min: number, max: number): string => {
  const range = max - min;
  const position = (score - min) / range;

  if (position <= 0.1) return 'Very Low';
  if (position <= 0.3) return 'Low';
  if (position <= 0.5) return 'Average';
  if (position <= 0.7) return 'Above Average';
  if (position <= 0.9) return 'High';
  return 'Very High';
};

// Default stamps for 0-10 scale (11 stamps)
const DEFAULT_STAMPS: Stamp[] = [
  { score: 0, frame: 0, label: 'Very Low' },
  { score: 1, frame: 4, label: 'Very Low' },
  { score: 2, frame: 8, label: 'Low' },
  { score: 3, frame: 12, label: 'Low' },
  { score: 4, frame: 16, label: 'Average' },
  { score: 5, frame: 20, label: 'Average' },
  { score: 6, frame: 24, label: 'Above Average' },
  { score: 7, frame: 28, label: 'Above Average' },
  { score: 8, frame: 32, label: 'High' },
  { score: 9, frame: 35, label: 'High' },
  { score: 10, frame: 39, label: 'Very High' },
];

export const ANGULARITY_ASSESSMENTS: Assessment[] = [
  {
    id: 'cheek_prominence',
    title: 'Cheekbone Prominence',
    description: 'The prominence and visibility of your cheekbones',
    morphFolder: 'cheek_prominence_morph_1024px_40f_92q_webp',
    femaleMorphFolder: 'cheek_prominence_morph_1024px_40f_90q_webp',
    stamps: DEFAULT_STAMPS,
  },
  {
    id: 'jaw_definition',
    title: 'Jaw Definition',
    description: 'The sharpness and definition of your jawline',
    morphFolder: 'jaw_definition_morph_1024px_40f_85q_webp',
    stamps: DEFAULT_STAMPS,
  },
  {
    id: 'cheek_leanness',
    title: 'Cheek Leanness',
    description: 'How lean and defined your cheek area appears',
    morphFolder: 'cheek_leanness_morph_1024px_40f_80q_webp',
    stamps: DEFAULT_STAMPS,
  },
  {
    id: 'chin_definition',
    title: 'Chin Definition',
    description: 'The definition and shape of your chin',
    morphFolder: 'chin_definition_morph_1024px_40f_90q_webp',
    stamps: DEFAULT_STAMPS,
  },
  {
    id: 'submental_definition',
    title: 'Submental Definition',
    description: 'The definition under your chin where it meets your neck',
    morphFolder: 'submental_definition_morph_1024px_40f_90q_webp',
    femaleMorphFolder: 'submental_definition_morph_1024px_40f_92q_webp',
    stamps: DEFAULT_STAMPS,
  },
];

// Helper to get morph frame URL
// Note: Frame files are 1-indexed (frame_0001.webp to frame_0040.webp)
export const getMorphFrameUrl = (
  gender: 'male' | 'female',
  morphFolder: string,
  frameIndex: number,
  femaleMorphFolder?: string
): string => {
  // Convert 0-39 index to 1-40 file number
  const fileNumber = frameIndex + 1;
  const paddedIndex = fileNumber.toString().padStart(4, '0');
  const folder = gender === 'female' && femaleMorphFolder ? femaleMorphFolder : morphFolder;
  return `/morphs/angularity/${gender}/${gender}_${folder}/${gender}_${folder}/frames/frame_${paddedIndex}.webp`;
};

// Helper to calculate score from frame
export const frameToScore = (frame: number, min: number, max: number): number => {
  return min + (frame / 39) * (max - min);
};

// Helper to calculate frame from score
export const scoreToFrame = (score: number, min: number, max: number): number => {
  const normalized = (score - min) / (max - min);
  return Math.round(normalized * 39);
};

// Generate stamps dynamically based on min/max
export const generateDynamicStamps = (minScore: number, maxScore: number): Stamp[] => {
  const stamps: Stamp[] = [];
  const numStamps = maxScore - minScore + 1;

  for (let score = minScore; score <= maxScore; score++) {
    const frame = scoreToFrame(score, minScore, maxScore);
    stamps.push({
      score,
      frame,
      label: getScoreLabel(score, minScore, maxScore),
    });
  }

  return stamps;
};
