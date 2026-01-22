'use client';

import { createContext, useContext, useRef, useCallback, ReactNode } from 'react';
import { getMorphVideoUrl } from './useMorphVideo';

interface CachedFrames {
  frames: string[];
  status: 'loading' | 'ready' | 'error';
  error?: string;
}

interface MorphFrameCacheContextValue {
  // Get cached frames if available
  getCachedFrames: (videoUrl: string) => CachedFrames | null;

  // Start preloading frames for a morph (returns immediately, extraction happens in background)
  preloadFrames: (
    gender: 'male' | 'female',
    morphFolder: string,
    femaleMorphFolder?: string
  ) => void;

  // Check if frames are ready
  isReady: (videoUrl: string) => boolean;

  // Get a specific frame URL from cache
  getFrameUrl: (videoUrl: string, frameIndex: number) => string;
}

const MorphFrameCacheContext = createContext<MorphFrameCacheContextValue | null>(null);

export function useMorphFrameCache() {
  const context = useContext(MorphFrameCacheContext);
  if (!context) {
    throw new Error('useMorphFrameCache must be used within MorphFrameCacheProvider');
  }
  return context;
}

// Optional hook that returns null if not in provider (for optional usage)
export function useMorphFrameCacheOptional() {
  return useContext(MorphFrameCacheContext);
}

interface MorphFrameCacheProviderProps {
  children: ReactNode;
}

export function MorphFrameCacheProvider({ children }: MorphFrameCacheProviderProps) {
  // Use ref to persist across renders without causing re-renders
  const cacheRef = useRef<Map<string, CachedFrames>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());

  const extractFramesFromVideo = useCallback(async (
    videoUrl: string,
    totalFrames: number = 40
  ): Promise<string[]> => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const canvas = document.createElement('canvas');
    const extractedUrls: string[] = [];

    try {
      // Load video
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error(`Failed to load video: ${videoUrl}`));
        video.src = videoUrl;
        video.load();
      });

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        if (video.readyState >= 3) resolve();
        else video.oncanplay = () => resolve();
      });

      // Set canvas dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Failed to get canvas context');

      const duration = video.duration;

      // Extract frames sequentially
      for (let i = 0; i < totalFrames; i++) {
        const time = (i / (totalFrames - 1)) * duration;
        video.currentTime = time;

        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
        });

        ctx.drawImage(video, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
            'image/webp',
            0.92
          );
        });

        extractedUrls[i] = URL.createObjectURL(blob);
      }

      return extractedUrls;
    } finally {
      video.src = '';
    }
  }, []);

  const getCachedFrames = useCallback((videoUrl: string): CachedFrames | null => {
    return cacheRef.current.get(videoUrl) || null;
  }, []);

  const preloadFrames = useCallback((
    gender: 'male' | 'female',
    morphFolder: string,
    femaleMorphFolder?: string
  ) => {
    const videoUrl = getMorphVideoUrl(gender, morphFolder, femaleMorphFolder);

    // Already cached or loading
    if (cacheRef.current.has(videoUrl) || loadingRef.current.has(videoUrl)) {
      return;
    }

    // Mark as loading
    loadingRef.current.add(videoUrl);
    cacheRef.current.set(videoUrl, { frames: [], status: 'loading' });

    console.log('[MorphFrameCache] Starting preload:', videoUrl);

    // Extract in background
    extractFramesFromVideo(videoUrl)
      .then((frames) => {
        console.log('[MorphFrameCache] Preload complete:', videoUrl, frames.length, 'frames');
        cacheRef.current.set(videoUrl, { frames, status: 'ready' });
        loadingRef.current.delete(videoUrl);
      })
      .catch((error) => {
        console.error('[MorphFrameCache] Preload failed:', videoUrl, error);
        cacheRef.current.set(videoUrl, {
          frames: [],
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        loadingRef.current.delete(videoUrl);
      });
  }, [extractFramesFromVideo]);

  const isReady = useCallback((videoUrl: string): boolean => {
    const cached = cacheRef.current.get(videoUrl);
    return cached?.status === 'ready' && cached.frames.length > 0;
  }, []);

  const getFrameUrl = useCallback((videoUrl: string, frameIndex: number): string => {
    const cached = cacheRef.current.get(videoUrl);
    if (!cached || cached.status !== 'ready') return '';
    const clampedIndex = Math.max(0, Math.min(frameIndex, cached.frames.length - 1));
    return cached.frames[clampedIndex] || '';
  }, []);

  const value: MorphFrameCacheContextValue = {
    getCachedFrames,
    preloadFrames,
    isReady,
    getFrameUrl,
  };

  return (
    <MorphFrameCacheContext.Provider value={value}>
      {children}
    </MorphFrameCacheContext.Provider>
  );
}
