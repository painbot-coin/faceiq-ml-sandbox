/**
 * Side Profile Landmark Detection via AWS Lambda
 * 
 * This module handles side profile facial landmark detection using our custom
 * "oasis-model" Lambda function. Unlike MediaPipe (which only works well for
 * frontal faces), side profiles require a specialized model.
 * 
 * The Lambda function returns:
 * - 106+ landmark points specific to side profile anatomy
 * - Bounding box for the detected face
 * - Coordinates in pixel space relative to input image
 * 
 * This module also includes utilities for:
 * - Detecting facing direction (left vs right profile)
 * - Computing rotation angles for image standardization
 * - Calculating crop parameters for consistent output
 */

import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const OUTPUT_SIZE = 1024;
const HEAD_FILL = 0.65;

let lambdaClient: LambdaClient | null = null;

function getLambdaClient(): LambdaClient {
    if (!lambdaClient) {
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            throw new Error("AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required");
        }

        lambdaClient = new LambdaClient({
            region: process.env.AWS_REGION || "us-west-2",
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    return lambdaClient;
}

export interface Landmark {
    x: number;
    y: number;
}

export type BoundingBox = [number, number, number, number];

export interface LandmarkDetectionResult {
    bbox: BoundingBox;
    landmarks: Landmark[];
    dimensions: { width: number; height: number };
}

export interface StandardizationParams {
    rotationAngle: number;
    direction: 'left' | 'right';
    center: { x: number; y: number };
    crop: {
        x: number;
        y: number;
        width: number;
        height: number;
        scale: number;
    };
    landmarks: Landmark[];
    bbox: BoundingBox;
}

/**
 * Detect which direction the face is facing based on landmark positions.
 * 
 * Uses geometric distances between key landmarks:
 * - P86: Nose tip (pronasale)
 * - P14: Ear region (left side reference)
 * - P27: Ear region (right side reference)
 * 
 * If nose tip is closer to left ear reference, face is facing left.
 * If nose tip is closer to right ear reference, face is facing right.
 */
export function detectFacingDirection(landmarks: Landmark[]): 'left' | 'right' {
    if (!landmarks || landmarks.length === 0) {
        return 'right';
    }

    const P86 = landmarks[86];
    const P14 = landmarks[14];
    const P27 = landmarks[27];

    if (!P86 || !P14 || !P27) {
        return 'right';
    }

    const distP86toP14 = Math.sqrt(
        Math.pow(P86.x - P14.x, 2) + Math.pow(P86.y - P14.y, 2)
    );
    const distP86toP27 = Math.sqrt(
        Math.pow(P86.x - P27.x, 2) + Math.pow(P86.y - P27.y, 2)
    );

    return distP86toP14 < distP86toP27 ? 'left' : 'right';
}

/**
 * Compute rotation angle needed to level the face and find center point.
 * Uses eye-to-ear line to determine the tilt of the head.
 */
function computeRotationAndCenter(
    landmarks: Landmark[],
    direction: 'left' | 'right'
): { angle: number; center: { x: number; y: number } } {
    let eyeLandmark: Landmark;
    let earLandmark: Landmark;

    if (direction === 'left') {
        eyeLandmark = landmarks[75];
        earLandmark = landmarks[26];
    } else {
        eyeLandmark = landmarks[10];
        earLandmark = landmarks[26];
    }

    if (!eyeLandmark || !earLandmark) {
        return { angle: 0, center: { x: 0, y: 0 } };
    }

    const angle = Math.atan2(earLandmark.y - eyeLandmark.y, earLandmark.x - eyeLandmark.x);
    const center = {
        x: (eyeLandmark.x + earLandmark.x) / 2,
        y: (eyeLandmark.y + earLandmark.y) / 2,
    };

    return { angle, center };
}

/**
 * Compute crop parameters to extract a standardized head region.
 * Ensures consistent framing across different image sizes.
 */
function computeCropParams(
    bbox: BoundingBox,
    imageWidth: number,
    imageHeight: number
): { x: number; y: number; width: number; height: number; scale: number } {
    const [x1, y1, x2, y2] = bbox;
    const bboxWidth = x2 - x1;
    const bboxHeight = y2 - y1;
    const headHeight = bboxHeight;
    const targetHeadHeight = OUTPUT_SIZE * HEAD_FILL;
    const scale = targetHeadHeight / headHeight;

    const cropSize = OUTPUT_SIZE / scale;

    const centerX = x1 + bboxWidth / 2;
    const centerY = y1 + bboxHeight / 2;

    let cropX = centerX - cropSize / 2;
    let cropY = centerY - cropSize / 2;

    cropX = Math.max(0, Math.min(cropX, imageWidth - cropSize));
    cropY = Math.max(0, Math.min(cropY, imageHeight - cropSize));

    return {
        x: Math.round(cropX),
        y: Math.round(cropY),
        width: Math.round(cropSize),
        height: Math.round(cropSize),
        scale,
    };
}

/**
 * Call AWS Lambda to detect side profile landmarks.
 * 
 * @param imageBase64 - Base64-encoded image data
 * @param dimensions - Original image dimensions
 * @returns Detection result with landmarks and bounding box
 */
export async function detectSideLandmarks(
    imageBase64: string,
    dimensions: { width: number; height: number }
): Promise<LandmarkDetectionResult> {
    const command = new InvokeCommand({
        FunctionName: "oasis-model",
        InvocationType: "RequestResponse",
        Payload: JSON.stringify({
            body: imageBase64,
            isBase64Encoded: true,
        }),
    });

    const response = await getLambdaClient().send(command);
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    const parsedBody = JSON.parse(result.body);

    if (!parsedBody.faces || parsedBody.faces.length === 0) {
        throw new Error("No face detected in side profile image");
    }

    return {
        bbox: parsedBody.faces[0].bbox,
        landmarks: parsedBody.faces[0].landmarks,
        dimensions,
    };
}

/**
 * Compute all standardization parameters from detection result.
 * Returns everything needed to standardize the image for consistent analysis.
 */
export function computeStandardizationParams(
    detection: LandmarkDetectionResult
): StandardizationParams {
    const { bbox, landmarks, dimensions } = detection;

    const direction = detectFacingDirection(landmarks);
    const { angle, center } = computeRotationAndCenter(landmarks, direction);
    const crop = computeCropParams(bbox, dimensions.width, dimensions.height);

    return {
        rotationAngle: angle,
        direction,
        center,
        crop,
        landmarks,
        bbox,
    };
}

/**
 * Lambda Landmark Index Reference
 * 
 * The oasis-model Lambda returns 106 landmark points.
 * Key indices used in auto-placement:
 * 
 * Face contour: 0-32 (chin to ear)
 * Eyebrows: 33-42 (left), 43-51 (right)
 * Nose bridge: 52-55
 * Eye: Various indices for different eye points
 * Lips: 67-71 (outer), various for inner
 * 
 * Note: These indices are specific to our Lambda model and differ from
 * MediaPipe or dlib's 68-point model.
 */
