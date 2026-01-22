'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const FEATURES = [
  { id: 'jaw_definition', name: 'Jaw Definition', description: 'Sharpness of jawline' },
  { id: 'cheek_leanness', name: 'Cheek Leanness', description: 'Hollow vs full cheeks' },
  { id: 'cheek_prominence', name: 'Cheekbone Prominence', description: 'Flat vs prominent cheekbones' },
  { id: 'chin_definition', name: 'Chin Definition', description: 'Rounded vs defined chin' },
  { id: 'submental_definition', name: 'Submental Definition', description: 'Neck-chin angle definition' },
];

export default function MorphsPage() {
  const [selectedFeature, setSelectedFeature] = useState(FEATURES[0]);
  const [frame, setFrame] = useState(20);
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const score = Math.round((frame / 39) * 10);

  return (
    <main className="container mx-auto px-4 py-8">
      <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <h1 className="text-3xl font-bold mb-4">Angularity Morphs</h1>
      
      <p className="text-gray-400 mb-8 max-w-2xl">
        Each feature has 40 morph frames (0-39) showing the progression from 
        Very Low (0) to Very High (10) angularity.
      </p>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        {/* Sidebar */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Gender</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGender('male')}
                className={`px-4 py-2 rounded ${gender === 'male' ? 'bg-blue-600' : 'bg-gray-800'}`}
              >
                Male
              </button>
              <button
                onClick={() => setGender('female')}
                className={`px-4 py-2 rounded ${gender === 'female' ? 'bg-pink-600' : 'bg-gray-800'}`}
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
                  onClick={() => setSelectedFeature(feature)}
                  className={`w-full text-left px-4 py-3 rounded ${
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
          <div className="aspect-square max-w-md mx-auto bg-gray-800 rounded-lg flex items-center justify-center mb-6">
            <div className="text-center text-gray-500">
              <p className="mb-2">Morph frames not loaded</p>
              <p className="text-sm">Copy morphs to public/morphs/</p>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Frame: {frame}</span>
              <span>Score: {score}/10</span>
            </div>
            
            <input
              type="range"
              min={0}
              max={39}
              value={frame}
              onChange={(e) => setFrame(Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Very Low</span>
              <span>Average</span>
              <span>Very High</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
