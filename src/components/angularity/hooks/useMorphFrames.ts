/**
 * useMorphFrames - Hook for loading morph animation frames
 *
 * This hook now uses video compression for much better performance:
 * - Single HTTP request instead of 40 individual image requests
 * - ~60-90% smaller transfer size due to video compression
 * - Frames are extracted client-side and cached as blob URLs
 *
 * The interface remains the same for backward compatibility.
 */
export { useMorphVideo as useMorphFrames, MorphThumbnail, getMorphVideoUrl } from './useMorphVideo';
export { MorphFrameCacheProvider, useMorphFrameCache } from './MorphFrameCache';
