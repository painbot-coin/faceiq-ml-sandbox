'use client';

/**
 * MediaPipe Face Landmarker - Client-side Detection
 * 
 * This module provides facial landmark detection using Google's MediaPipe Face Landmarker.
 * It detects 468/478 facial landmarks from frontal face images.
 * 
 * Key features:
 * - Automatic face detection and standardization
 * - Maps MediaPipe indices to our custom landmark schema
 * - Returns normalized coordinates (0-1) for consistent processing
 * 
 * MediaPipe landmark documentation:
 * https://developers.google.com/mediapipe/solutions/vision/face_landmarker
 */

const OUTPUT_SIZE = 1024;
const HEAD_FILL = 0.65;
const EYE_HEIGHT = 0.5;
const HAIR_ALLOW = 0.12;

// MediaPipe landmark indices for key facial points
const L = {
    LEFT_EYE_OUTER: 33,
    RIGHT_EYE_OUTER: 263,
    FOREHEAD: 10,
    CHIN: 152,
    NOSE_TIP: 1,
    NOSE_BRIDGE: 6,
    NOSE_BOTTOM: 2,
    LEFT_EYE_INNER: 133,
    RIGHT_EYE_INNER: 362,
    LEFT_MOUTH_CORNER: 61,
    RIGHT_MOUTH_CORNER: 291,
    UPPER_LIP_CENTER: 13,
    LOWER_LIP_CENTER: 14,
};

const toPx = (pt: { x: number; y: number }, w: number, h: number) => ({ x: pt.x * w, y: pt.y * h });
const eyeAngle = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x);

const biggestFace = (faces: Array<Array<{ x: number; y: number; z: number }>>) => {
    let best = null,
        area = -1;
    for (const lm of faces) {
        let minX = 1e9,
            minY = 1e9,
            maxX = -1e9,
            maxY = -1e9;
        for (const p of lm) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
        const a = (maxX - minX) * (maxY - minY);
        if (a > area) {
            area = a;
            best = lm;
        }
    }
    return best;
};

const rotateAndCrop = (
    sourceCanvas: HTMLCanvasElement,
    cx: number,
    cy: number,
    theta: number,
    sx: number,
    sy: number,
    S: number
) => {
    const off = document.createElement('canvas');
    off.width = sourceCanvas.width;
    off.height = sourceCanvas.height;
    const ox = off.getContext('2d')!;
    ox.fillStyle = 'white';
    ox.fillRect(0, 0, off.width, off.height);
    ox.save();
    ox.translate(cx, cy);
    ox.rotate(-theta);
    ox.translate(-cx, -cy);
    ox.drawImage(sourceCanvas, 0, 0);
    ox.restore();

    const temp = document.createElement('canvas');
    temp.width = Math.max(1, Math.round(S));
    temp.height = Math.max(1, Math.round(S));
    const tx = temp.getContext('2d')!;
    tx.fillStyle = 'white';
    tx.fillRect(0, 0, temp.width, temp.height);
    tx.drawImage(off, Math.round(sx), Math.round(sy), Math.round(S), Math.round(S), 0, 0, temp.width, temp.height);

    return temp;
};

const makeHeadshot = (imgCanvas: HTMLCanvasElement, lm: Array<{ x: number; y: number; z: number }>) => {
    const iw = imgCanvas.width,
        ih = imgCanvas.height;
    const pts = lm.map((p) => toPx(p, iw, ih));
    const le = pts[L.LEFT_EYE_OUTER],
        re = pts[L.RIGHT_EYE_OUTER];
    const eyeMid = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 };

    const theta = eyeAngle(le, re);

    const cx = eyeMid.x;
    const cy = eyeMid.y;

    const rot = (p: { x: number; y: number }) => {
        const s = Math.sin(-theta),
            c = Math.cos(-theta);
        const dx = p.x - cx,
            dy = p.y - cy;
        return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
    };

    const chinR = rot(pts[L.CHIN] || eyeMid);
    const foreR = rot(pts[L.FOREHEAD] || eyeMid);
    const eyeMidR = rot(eyeMid);

    let headH = Math.max(8, chinR.y - foreR.y);
    if (!(headH > 0 && isFinite(headH))) {
        const chin = pts[L.CHIN] || eyeMid;
        const d = Math.hypot(chin.x - eyeMid.x, chin.y - eyeMid.y);
        headH = d / 0.55;
    }

    headH *= 1 + HAIR_ALLOW;
    const S = Math.min(Math.max(32, headH / HEAD_FILL), Math.max(iw, ih) * 2);

    const sx = cx - S / 2;
    const sy = eyeMidR.y - EYE_HEIGHT * S;

    const cropped = rotateAndCrop(imgCanvas, cx, cy, theta, sx, sy, S);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = OUTPUT_SIZE;
    finalCanvas.height = OUTPUT_SIZE;
    const ctx = finalCanvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(cropped, 0, 0, cropped.width, cropped.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    return finalCanvas;
};

let faceLandmarkerInstance: any = null;
let initializationPromise: Promise<any> | null = null;

const initializeMediaPipe = async () => {
    if (faceLandmarkerInstance) {
        return faceLandmarkerInstance;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        try {
            const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

            const MODEL_URL =
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

            const paths = [
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm/',
            ];

            let lastError;
            for (const basePath of paths) {
                try {
                    const vision = await FilesetResolver.forVisionTasks(basePath);
                    const landmarker = await FaceLandmarker.createFromOptions(vision, {
                        baseOptions: {
                            modelAssetPath: MODEL_URL,
                            delegate: 'CPU',
                        },
                        runningMode: 'IMAGE',
                        numFaces: 3,
                        outputFaceBlendshapes: false,
                        outputFacialTransformationMatrixes: false,
                    });

                    faceLandmarkerInstance = landmarker;
                    console.log('MediaPipe Face Landmarker initialized successfully');
                    return landmarker;
                } catch (e) {
                    lastError = e;
                    console.error('MediaPipe init failed for', basePath, e);
                }
            }

            throw lastError || new Error('MediaPipe initialization failed');
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
            initializationPromise = null;
            throw error;
        }
    })();

    return initializationPromise;
};

/**
 * Mapping from our custom landmark names to MediaPipe indices.
 * MediaPipe provides 468 base landmarks + 10 iris landmarks = 478 total
 */
const MEDIAPIPE_LANDMARK_MAP: Record<string, number> = {
    'hairline': 10,
    'leftEyePupil': 468,
    'rightEyePupil': 473,
    'noseLeft': 48,
    'noseRight': 278,
    'lowerLip': 17,
    'chinBottom': 152,
    'leftEyeMedialCanthus': 133,
    'leftEyeLateralCanthus': 33,
    'leftEyeUpperEyelid': 470,
    'leftEyeLowerEyelid': 472,
    'leftEyelidHoodEnd': 247,
    'leftBrowHead': 107,
    'leftBrowInnerCorner': 55,
    'leftBrowArch': 52,
    'leftBrowPeak': 105,
    'leftBrowTail': 70,
    'leftUpperEyelidCrease': 470, // Same as leftEyeUpperEyelid, with offset
    'rightEyeMedialCanthus': 362,
    'rightEyeLateralCanthus': 263,
    'rightEyeUpperEyelid': 475,
    'rightEyeLowerEyelid': 374,
    'rightEyelidHoodEnd': 467,
    'rightBrowHead': 336,
    'rightBrowInnerCorner': 285,
    'rightBrowArch': 282,
    'rightBrowPeak': 334,
    'rightBrowTail': 276,
    'rightUpperEyelidCrease': 475, // Same as rightEyeUpperEyelid, with offset
    'nasalBase': 290,
    'noseBottom': 2,
    'leftNoseBridge': 174,
    'rightNoseBridge': 399,
    'cupidsBow': 267,
    'innerCupidsBow': 0,
    'mouthMiddle': 14,
    'mouthLeft': 61,
    'mouthRight': 306,
    'chinLeft': 176,
    'chinRight': 400,
    'leftCheek': 234,
    'rightCheek': 454,
    'leftTemple': 54,
    'rightTemple': 284,
    'leftOuterEar': 127,
    'rightOuterEar': 356,
    'leftTopGonion': 58,
    'leftBottomGonion': 172,
    'rightTopGonion': 288,
    'rightBottomGonion': 397,
    'neckLeft': 172,
    'neckRight': 397,
};

/**
 * Offset adjustments for specific landmarks to improve accuracy.
 * Values are in normalized coordinates (0-1 range relative to image dimensions).
 */
const MEDIAPIPE_OFFSET_MAP: Record<string, { xOffset?: number; yOffset?: number }> = {
    'hairline': { yOffset: -0.06 },
    'leftEyePupil': { xOffset: 0.0015, yOffset: -0.005 },
    'rightEyePupil': { xOffset: -0.0015, yOffset: -0.005 },
    'noseLeft': { xOffset: 0.0025 },
    'noseRight': { xOffset: -0.0025 },
    'leftTemple': { yOffset: -0.01 },
    'rightTemple': { yOffset: -0.01 },
    'leftOuterEar': { xOffset: -0.04 },
    'rightOuterEar': { xOffset: 0.04 },
    'neckLeft': { xOffset: 0, yOffset: 0.05 },
    'neckRight': { xOffset: 0, yOffset: 0.05 },
    'leftUpperEyelidCrease': { yOffset: -0.015 }, // Few pixels above upper eyelid
    'rightUpperEyelidCrease': { yOffset: -0.015 }, // Few pixels above upper eyelid
};

/**
 * Preload MediaPipe FaceLandmarker model and WASM files.
 * Call this early to avoid loading delay when the user uploads a photo.
 */
export async function preloadMediaPipe(): Promise<void> {
    try {
        await initializeMediaPipe();
    } catch (error) {
        // Silently fail - the actual usage will retry and show proper errors
        console.warn('MediaPipe preload failed:', error);
    }
}

/**
 * Standardize a face image by rotating and cropping to center the face.
 * Uses MediaPipe to detect facial landmarks for alignment.
 */
export async function standardizeFaceImage(imageInput: HTMLImageElement): Promise<{
    standardizedImage: HTMLCanvasElement;
}> {
    try {
        const faceLandmarker = await initializeMediaPipe();

        let imgCanvas: HTMLCanvasElement;

        if (imageInput instanceof HTMLImageElement) {
            imgCanvas = document.createElement('canvas');
            imgCanvas.width = imageInput.naturalWidth || imageInput.width;
            imgCanvas.height = imageInput.naturalHeight || imageInput.height;
            const ctx = imgCanvas.getContext('2d')!;
            ctx.drawImage(imageInput, 0, 0);
        } else {
            throw new Error('Invalid image input. Must be an HTMLImageElement');
        }

        let detection, faces;

        try {
            detection = faceLandmarker.detect(imgCanvas);
            faces = detection?.faceLandmarks || [];
        } catch (detectError: any) {
            console.warn('MediaPipe detection had a minor issue, but continuing:', detectError.message);

            try {
                await new Promise((resolve) => setTimeout(resolve, 100));
                detection = faceLandmarker.detect(imgCanvas);
                faces = detection?.faceLandmarks || [];
            } catch (retryError: any) {
                console.warn('Face detection failed after retry:', retryError.message);
                faces = [];
            }
        }

        if (!faces.length) {
            throw new Error('No face detected in the image');
        }

        const landmarks = biggestFace(faces);
        if (!landmarks) {
            throw new Error('No face detected in the image');
        }

        const standardizedCanvas = makeHeadshot(imgCanvas, landmarks);

        return {
            standardizedImage: standardizedCanvas,
        };
    } catch (error) {
        console.error('Face standardization failed:', error);
        throw error;
    }
}

/**
 * Simple face detection - returns true if at least one face is detected.
 */
export async function detectFace(image: HTMLImageElement): Promise<boolean> {
    try {
        const faceLandmarker = await initializeMediaPipe();

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);

        const detection = faceLandmarker.detect(canvas);
        const faces = detection?.faceLandmarks || [];

        return faces.length > 0;
    } catch (error) {
        console.error('Face detection error:', error);
        return false;
    }
}

/**
 * Detect raw MediaPipe 468 landmarks.
 * Returns normalized coordinates (0-1) for all 468 facial landmarks.
 * Useful for custom processing or debugging.
 */
export async function detectRawMediaPipeLandmarks(
    image: HTMLImageElement
): Promise<Array<{ x: number; y: number; z: number }> | null> {
    try {
        const faceLandmarker = await initializeMediaPipe();

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);

        const detection = faceLandmarker.detect(canvas);
        const faces = detection?.faceLandmarks || [];

        if (!faces.length) {
            return null;
        }

        const landmarks = biggestFace(faces);
        return landmarks;
    } catch (error) {
        console.error('Raw MediaPipe landmark detection error:', error);
        return null;
    }
}

/**
 * Detect front profile landmarks and map them to our custom schema.
 * Returns pixel coordinates scaled to the provided canvas dimensions.
 * 
 * @param image - The source image element
 * @param canvasWidth - Width of the canvas where landmarks will be displayed
 * @param canvasHeight - Height of the canvas where landmarks will be displayed
 * @returns Record of landmark names to pixel coordinates, or null if detection fails
 */
export async function detectFrontLandmarks(
    image: HTMLImageElement,
    canvasWidth: number,
    canvasHeight: number
): Promise<Record<string, { x: number; y: number }> | null> {
    try {
        const faceLandmarker = await initializeMediaPipe();

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(image, 0, 0);

        const detection = faceLandmarker.detect(canvas);
        const faces = detection?.faceLandmarks || [];

        if (!faces.length) {
            return null;
        }

        const landmarks = biggestFace(faces);
        if (!landmarks) {
            return null;
        }

        const imageWidth = canvas.width;
        const imageHeight = canvas.height;
        const imageAspect = imageWidth / imageHeight;
        const canvasAspect = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, offsetX, offsetY;
        if (imageAspect > canvasAspect) {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imageAspect;
            offsetX = 0;
            offsetY = (canvasHeight - drawHeight) / 2;
        } else {
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imageAspect;
            offsetX = (canvasWidth - drawWidth) / 2;
            offsetY = 0;
        }

        const result: Record<string, { x: number; y: number }> = {};

        for (const [key, index] of Object.entries(MEDIAPIPE_LANDMARK_MAP)) {
            if (landmarks[index]) {
                const point = landmarks[index];
                let x = point.x * drawWidth + offsetX;
                let y = point.y * drawHeight + offsetY;

                const offset = MEDIAPIPE_OFFSET_MAP[key];
                if (offset) {
                    if (offset.xOffset) {
                        x += drawWidth * offset.xOffset;
                    }
                    if (offset.yOffset) {
                        y += drawHeight * offset.yOffset;
                    }
                }

                result[key] = { x, y };
            }
        }

        return result;
    } catch (error) {
        console.error('Face landmark detection error:', error);
        return null;
    }
}

// Export the landmark maps for reference
export { MEDIAPIPE_LANDMARK_MAP, MEDIAPIPE_OFFSET_MAP };
