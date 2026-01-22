'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useMorphFrameCacheOptional } from './MorphFrameCache';

interface UseMorphVideoOptions {
  gender: 'male' | 'female';
  morphFolder: string;
  femaleMorphFolder?: string;
  totalFrames?: number;
}

interface UseMorphVideoReturn {
  frames: string[];
  loadedCount: number;
  totalFrames: number;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  getFrameUrl: (frameIndex: number) => string;
}

/**
 * Helper to get the video URL for a morph
 */
export const getMorphVideoUrl = (
  gender: 'male' | 'female',
  morphFolder: string,
  femaleMorphFolder?: string
): string => {
  const folder = gender === 'female' && femaleMorphFolder ? femaleMorphFolder : morphFolder;
  const baseName = folder.replace(/_morph_\d+px_\d+f_\d+q_webp$/, '');
  return `/morphs/angularity/${gender}/${gender}_${folder}/${gender}_${baseName}.mp4`;
};

/**
 * Simple component to show a thumbnail from a morph video.
 * Uses cache if available, otherwise extracts a single frame.
 */
export const MorphThumbnail = ({
  gender,
  morphFolder,
  femaleMorphFolder,
  frameIndex = 20,
  className = '',
  alt = '',
}: {
  gender: 'male' | 'female';
  morphFolder: string;
  femaleMorphFolder?: string;
  frameIndex?: number;
  className?: string;
  alt?: string;
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const cache = useMorphFrameCacheOptional();
  const videoUrl = getMorphVideoUrl(gender, morphFolder, femaleMorphFolder);

  useEffect(() => {
    // Check cache first
    if (cache) {
      const cachedUrl = cache.getFrameUrl(videoUrl, frameIndex);
      if (cachedUrl) {
        setThumbnailUrl(cachedUrl);
        return;
      }
    }

    // Extract thumbnail if not cached
    let mounted = true;
    let blobUrl: string | null = null;

    const extractThumbnail = async () => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'auto';

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject();
          video.src = videoUrl;
          video.load();
        });

        if (!mounted) return;

        await new Promise<void>((resolve) => {
          if (video.readyState >= 3) resolve();
          else video.oncanplay = () => resolve();
        });

        if (!mounted) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const time = (frameIndex / 39) * video.duration;
        video.currentTime = time;

        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve();
        });

        if (!mounted) return;

        ctx.drawImage(video, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/webp', 0.8);
        });

        if (blob && mounted) {
          blobUrl = URL.createObjectURL(blob);
          setThumbnailUrl(blobUrl);
        }
      } catch {
        // Silently fail for thumbnails
      } finally {
        video.src = '';
      }
    };

    extractThumbnail();

    return () => {
      mounted = false;
      // Only revoke if we created it (not from cache)
      if (blobUrl && !cache?.getFrameUrl(videoUrl, frameIndex)) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [videoUrl, frameIndex, cache]);

  if (!thumbnailUrl) {
    return <div className={`bg-gray-200 ${className}`} />;
  }

  return <img src={thumbnailUrl} alt={alt} className={className} />;
};

/**
 * Hook that loads a morph video and extracts frames for smooth scrubbing.
 * Uses global cache when available for persistence across mounts.
 */
export const useMorphVideo = ({
  gender,
  morphFolder,
  femaleMorphFolder,
  totalFrames = 40,
}: UseMorphVideoOptions): UseMorphVideoReturn => {
  const cache = useMorphFrameCacheOptional();
  const videoUrl = getMorphVideoUrl(gender, morphFolder, femaleMorphFolder);

  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For local extraction (when no cache)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const isUsingCacheRef = useRef(false);

  const getFrameUrl = useCallback(
    (frameIndex: number): string => {
      // Try cache first
      if (cache) {
        const cachedUrl = cache.getFrameUrl(videoUrl, frameIndex);
        if (cachedUrl) return cachedUrl;
      }
      // Fall back to local frames
      const clampedIndex = Math.max(0, Math.min(frameIndex, frameUrls.length - 1));
      return frameUrls[clampedIndex] || '';
    },
    [cache, videoUrl, frameUrls]
  );

  useEffect(() => {
    let mounted = true;

    // Check if already cached
    if (cache) {
      const cached = cache.getCachedFrames(videoUrl);

      if (cached?.status === 'ready' && cached.frames.length > 0) {
        console.log('[useMorphVideo] Using cached frames:', videoUrl);
        isUsingCacheRef.current = true;
        setFrameUrls(cached.frames);
        setLoadedCount(cached.frames.length);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (cached?.status === 'loading') {
        // Cache is loading, wait for it
        console.log('[useMorphVideo] Waiting for cache to load:', videoUrl);
        isUsingCacheRef.current = true;

        const checkCache = setInterval(() => {
          const updated = cache.getCachedFrames(videoUrl);
          if (updated?.status === 'ready' && updated.frames.length > 0) {
            clearInterval(checkCache);
            if (mounted) {
              setFrameUrls(updated.frames);
              setLoadedCount(updated.frames.length);
              setIsLoading(false);
            }
          } else if (updated?.status === 'error') {
            clearInterval(checkCache);
            if (mounted) {
              setError(updated.error || 'Cache loading failed');
              setIsLoading(false);
            }
          }
        }, 100);

        return () => {
          mounted = false;
          clearInterval(checkCache);
        };
      }

      // Not in cache, trigger preload and wait
      console.log('[useMorphVideo] Starting cache preload:', videoUrl);
      cache.preloadFrames(gender, morphFolder, femaleMorphFolder);
      isUsingCacheRef.current = true;

      const checkCache = setInterval(() => {
        const updated = cache.getCachedFrames(videoUrl);
        if (updated?.status === 'ready' && updated.frames.length > 0) {
          clearInterval(checkCache);
          if (mounted) {
            setFrameUrls(updated.frames);
            setLoadedCount(updated.frames.length);
            setIsLoading(false);
          }
        } else if (updated?.status === 'error') {
          clearInterval(checkCache);
          if (mounted) {
            setError(updated.error || 'Preload failed');
            setIsLoading(false);
          }
        } else if (updated?.status === 'loading') {
          // Update progress indicator
          if (mounted) {
            setLoadedCount(updated.frames.length);
          }
        }
      }, 100);

      return () => {
        mounted = false;
        clearInterval(checkCache);
      };
    }

    // No cache available - extract locally (original behavior)
    isUsingCacheRef.current = false;
    const extractedUrls: string[] = [];

    setIsLoading(true);
    setLoadedCount(0);
    setError(null);
    setFrameUrls([]);

    // Clean up previous blob URLs
    blobUrlsRef.current.forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    blobUrlsRef.current = [];

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    videoRef.current = video;

    const canvas = document.createElement('canvas');

    const extractFrames = async () => {
      try {
        console.log('[useMorphVideo] Loading video (no cache):', videoUrl);

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = (e) => {
            const mediaError = video.error;
            const errorMsg = mediaError
              ? `MediaError code ${mediaError.code}: ${mediaError.message}`
              : 'Unknown video error';
            console.error('[useMorphVideo] Video load error:', errorMsg, e);
            reject(new Error(`Failed to load video: ${videoUrl} - ${errorMsg}`));
          };
          video.src = videoUrl;
          video.load();
        });

        if (!mounted) return;

        await new Promise<void>((resolve) => {
          if (video.readyState >= 3) resolve();
          else video.oncanplay = () => resolve();
        });

        if (!mounted) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Failed to get canvas context');

        const duration = video.duration;

        for (let i = 0; i < totalFrames; i++) {
          if (!mounted) return;

          const time = (i / (totalFrames - 1)) * duration;
          video.currentTime = time;

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
          });

          if (!mounted) return;

          ctx.drawImage(video, 0, 0);

          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
              'image/webp',
              0.92
            );
          });

          const blobUrl = URL.createObjectURL(blob);
          extractedUrls[i] = blobUrl;
          blobUrlsRef.current[i] = blobUrl;

          if (mounted) {
            setLoadedCount(i + 1);
          }
        }

        if (mounted) {
          console.log('[useMorphVideo] Extracted', extractedUrls.length, 'frames (no cache)');
          setFrameUrls(extractedUrls);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[useMorphVideo] Error extracting frames:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to extract frames');
          setIsLoading(false);
        }
      }
    };

    extractFrames();

    return () => {
      mounted = false;
      if (videoRef.current) {
        videoRef.current.src = '';
        videoRef.current = null;
      }
      // Only clean up if we're NOT using cache
      if (!isUsingCacheRef.current) {
        blobUrlsRef.current.forEach(url => {
          if (url) URL.revokeObjectURL(url);
        });
        blobUrlsRef.current = [];
      }
    };
  }, [cache, videoUrl, totalFrames, gender, morphFolder, femaleMorphFolder]);

  return {
    frames: frameUrls,
    loadedCount,
    totalFrames,
    isReady: !isLoading && frameUrls.length === totalFrames,
    isLoading,
    error,
    getFrameUrl,
  };
};
