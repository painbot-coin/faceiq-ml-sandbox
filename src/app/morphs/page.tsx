'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const FEATURES = [
  { id: 'jaw_definition', name: 'Jaw Definition', description: 'Sharpness of jawline' },
  { id: 'cheek_leanness', name: 'Cheek Leanness', description: 'Hollow vs full cheeks' },
  { id: 'cheek_prominence', name: 'Cheekbone Prominence', description: 'Flat vs prominent cheekbones' },
  { id: 'chin_definition', name: 'Chin Definition', description: 'Rounded vs defined chin' },
  { id: 'submental_definition', name: 'Submental Definition', description: 'Neck-chin angle definition' },
  { id: 'overall_angularity', name: 'Overall Angularity', description: 'Full face angularity morph' },
];

// Map feature IDs to actual folder names
const MORPH_FOLDER_MAP: Record<string, { male: string; female: string }> = {
  jaw_definition: {
    male: 'male_jaw_definition_morph_1024px_40f_85q_webp',
    female: 'female_jaw_definition_morph_1024px_40f_85q_webp',
  },
  cheek_leanness: {
    male: 'male_cheek_leanness_morph_1024px_40f_80q_webp',
    female: 'female_cheek_leanness_morph_1024px_40f_80q_webp',
  },
  cheek_prominence: {
    male: 'male_cheek_prominence_morph_1024px_40f_92q_webp',
    female: 'female_cheek_prominence_morph_1024px_40f_90q_webp',
  },
  chin_definition: {
    male: 'male_chin_definition_morph_1024px_40f_90q_webp',
    female: 'female_chin_definition_morph_1024px_40f_90q_webp',
  },
  submental_definition: {
    male: 'male_submental_definition_morph_1024px_40f_90q_webp',
    female: 'female_submental_definition_morph_1024px_40f_92q_webp',
  },
  overall_angularity: {
    male: 'male_Overall_angularity_full_frame_morph_1024px_40f_85q_webp',
    female: 'female_Overall_angularity_morph_1024px_40f_85q_webp',
  },
};

const TOTAL_FRAMES = 40;

function getMorphFramePath(featureId: string, gender: 'male' | 'female', frameNumber: number): string {
  const folderMap = MORPH_FOLDER_MAP[featureId];
  if (!folderMap) return '';
  
  const folderName = folderMap[gender];
  // Frame numbers are 1-indexed and padded to 4 digits (frame_0001.webp to frame_0040.webp)
  const frameStr = String(frameNumber + 1).padStart(4, '0');
  
  return `/morphs/angularity/${gender}/${folderName}/${folderName}/frames/frame_${frameStr}.webp`;
}

/**
 * Hook to preload and cache morph frames for smooth scrubbing
 */
function useMorphFrameCache(featureId: string, gender: 'male' | 'female') {
  const [loadedFrames, setLoadedFrames] = useState<Map<number, HTMLImageElement>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    setLoadedFrames(new Map());
    setIsLoading(true);
    setLoadProgress(0);

    const newCache = new Map<number, HTMLImageElement>();
    let loadedCount = 0;

    // Load all frames in parallel
    const loadPromises = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        const path = getMorphFramePath(featureId, gender, i);
        
        img.onload = () => {
          if (!abortRef.current) {
            newCache.set(i, img);
            loadedCount++;
            setLoadProgress(Math.round((loadedCount / TOTAL_FRAMES) * 100));
          }
          resolve();
        };
        
        img.onerror = () => {
          resolve(); // Continue even if one frame fails
        };
        
        img.src = path;
      });
    });

    Promise.all(loadPromises).then(() => {
      if (!abortRef.current) {
        setLoadedFrames(newCache);
        setIsLoading(false);
      }
    });

    return () => {
      abortRef.current = true;
    };
  }, [featureId, gender]);

  return { loadedFrames, isLoading, loadProgress };
}

export default function MorphsPage() {
  const [selectedFeature, setSelectedFeature] = useState(FEATURES[0]);
  const [frame, setFrame] = useState(20);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { loadedFrames, isLoading, loadProgress } = useMorphFrameCache(selectedFeature.id, gender);

  const score = Math.round((frame / 39) * 10);

  // Draw frame to canvas for smooth rendering
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const img = loadedFrames.get(frameIndex);
    
    if (!canvas || !img) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match image (only on first draw or resize)
    if (canvas.width !== img.width || canvas.height !== img.height) {
      canvas.width = img.width;
      canvas.height = img.height;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }, [loadedFrames]);

  // Update canvas when frame changes
  useEffect(() => {
    drawFrame(frame);
  }, [frame, drawFrame]);

  // Handle slider input with smooth updates
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrame = Number(e.target.value);
    setFrame(newFrame);
  }, []);

  // Handle feature/gender change - reset to middle frame
  const handleFeatureChange = useCallback((feature: typeof FEATURES[0]) => {
    setSelectedFeature(feature);
    setFrame(20);
  }, []);

  const handleGenderChange = useCallback((newGender: 'male' | 'female') => {
    setGender(newGender);
    setFrame(20);
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-4">Angularity Morphs</h1>
      
      <p className="text-gray-400 mb-8 max-w-2xl">
        Each feature has 40 morph frames (0-39) showing the progression from 
        Very Low (0) to Very High (10) angularity. Drag the slider for smooth scrubbing.
      </p>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Gender</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleGenderChange('male')}
                className={`px-4 py-2 rounded transition-colors ${
                  gender === 'male' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                Male
              </button>
              <button
                onClick={() => handleGenderChange('female')}
                className={`px-4 py-2 rounded transition-colors ${
                  gender === 'female' ? 'bg-pink-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Feature</label>
            <div className="space-y-2">
              {FEATURES.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleFeatureChange(feature)}
                  className={`w-full text-left px-4 py-3 rounded transition-colors ${
                    selectedFeature.id === feature.id 
                      ? 'bg-blue-600' 
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{feature.name}</div>
                  <div className="text-sm text-gray-400">{feature.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="bg-gray-900 rounded-lg p-6">
          <div 
            ref={containerRef}
            className="aspect-square max-w-md mx-auto bg-gray-800 rounded-lg flex items-center justify-center mb-6 overflow-hidden relative"
          >
            {isLoading ? (
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading frames... {loadProgress}%</p>
              </div>
            ) : loadedFrames.size === 0 ? (
              <div className="text-center text-gray-500">
                <p className="mb-2">No frames available</p>
                <p className="text-sm text-gray-600">Check morph folder path</p>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Frame: {frame}</span>
              <span className="font-semibold text-white">Score: {score}/10</span>
            </div>
            
            <input
              type="range"
              min={0}
              max={39}
              value={frame}
              onChange={handleSliderChange}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none 
                         [&::-webkit-slider-thumb]:w-4 
                         [&::-webkit-slider-thumb]:h-4 
                         [&::-webkit-slider-thumb]:bg-blue-500 
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:cursor-grab
                         [&::-webkit-slider-thumb]:active:cursor-grabbing
                         [&::-moz-range-thumb]:w-4 
                         [&::-moz-range-thumb]:h-4 
                         [&::-moz-range-thumb]:bg-blue-500 
                         [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:border-0
                         [&::-moz-range-thumb]:cursor-grab
                         [&::-moz-range-thumb]:active:cursor-grabbing"
              disabled={isLoading}
            />

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Very Low</span>
              <span>Average</span>
              <span>Very High</span>
            </div>
            
            {/* Frame indicator dots */}
            <div className="flex justify-between mt-4 px-1">
              {[0, 10, 20, 30, 39].map((f) => (
                <button
                  key={f}
                  onClick={() => setFrame(f)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    frame === f ? 'bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  title={`Frame ${f}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
