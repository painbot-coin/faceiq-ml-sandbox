export interface Coordinates {
    x: number;
    y: number;
}

export interface NormalizedCoordinates {
    x: number;
    y: number;
}

export interface Landmark {
    key: string;
    name: string;
    description: string;
    howToFind?: string;
    referenceImage: string;
    category?: string;
}

export interface LandmarkMap {
    [key: string]: Coordinates;
}

export interface NormalizedLandmarkMap {
    [key: string]: NormalizedCoordinates;
}

export interface PhotoData {
    original: string | null;
    processed?: string;
}

export interface StandardizedData {
    imageDataUrl: string;
    landmarks: NormalizedLandmarkMap;
    width: number;
    height: number;
}

export interface AnalysisContextData {
    currentStep: string;
    frontPhoto: PhotoData | null;
    sidePhoto: PhotoData | null;
    frontLandmarks: NormalizedLandmarkMap | null;
    sideLandmarks: NormalizedLandmarkMap | null;
    sideStandardized: StandardizedData | null;
    sideDirection: 'left' | 'right' | null;
    gender: string | null;
    race: string | null;
}

export interface Face {
    id: string;
    userId: string;
    frontPhotoUrl?: string;
    sidePhotoUrl?: string;
    frontLandmarks?: NormalizedLandmarkMap;
    sideLandmarks?: NormalizedLandmarkMap;
    faceData?: any;
    gender?: string;
    race?: string;
    harmonyAnalysis?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateFaceRequest {
    frontPhotoUrl: string;
    sidePhotoUrl: string;
    frontLandmarks: NormalizedLandmarkMap;
    sideLandmarks: NormalizedLandmarkMap;
    gender?: string;
    race?: string | string[]; // Allow both string and array for multi-race support
    faceData?: any;
}

export interface CreateFaceResponse {
    success: boolean;
    face: {
        id: string;
        createdAt: Date;
        images: {
            frontUrl: string;
            sideUrl: string;
        };
    };
}

export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type Race =
    | 'east_asian'
    | 'south_asian'
    | 'black'
    | 'hispanic'
    | 'middle_eastern'
    | 'native_american'
    | 'pacific_islander'
    | 'white'
    | 'mixed'
    | 'other'
    | 'prefer_not_to_say';

