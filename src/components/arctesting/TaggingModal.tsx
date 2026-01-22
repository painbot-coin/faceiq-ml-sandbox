'use client';

import { useState, useMemo } from 'react';
import { X, Tag, ChevronDown, ChevronRight, Combine } from 'lucide-react';
import { ArcTestingData } from '@/app/(authenticated)/(app)/arctesting/arc-testing-client';
import { ALL_ARC_DEFINITIONS, formatCI, CombinedArcId, CombinedArcResult } from '@/lib/analysis/arcs';
import { COMBINED_ARC_NAMES } from '@/lib/analysis/arcs/combinedArcs';

interface TaggingModalProps {
  frontArcs: Record<string, ArcTestingData>;
  sideArcs: Record<string, ArcTestingData>;
  combinedArcs?: Map<CombinedArcId, CombinedArcResult>;
  combinedArcTags?: Record<CombinedArcId, string>;
  onUpdateTag: (arcId: string, tag: string, isCombined?: boolean) => void;
  onClose: () => void;
}

// Predefined tag suggestions with categories
const TAG_CATEGORIES = {
  angularity: {
    label: 'Angularity',
    tags: ['Very Angular', 'Angular', 'Moderately Angular', 'Balanced', 'Moderately Rounded', 'Rounded', 'Very Rounded'],
  },
  quality: {
    label: 'Quality',
    tags: ['Ideal', 'Good', 'Average', 'Below Average', 'Poor', 'Needs Improvement'],
  },
  characteristics: {
    label: 'Characteristics',
    tags: ['Sharp', 'Soft', 'Defined', 'Undefined', 'Prominent', 'Subtle', 'Smooth', 'Rugged'],
  },
};

export function TaggingModal({
  frontArcs,
  sideArcs,
  combinedArcs,
  combinedArcTags,
  onUpdateTag,
  onClose,
}: TaggingModalProps) {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [customTag, setCustomTag] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('angularity');
  
  // All arcs combined
  const allArcs = useMemo(() => {
    const arcs: Array<{
      id: string;
      name: string;
      profile: 'front' | 'side' | 'combined';
      ci: number;
      tag: string;
      isCombined: boolean;
    }> = [];
    
    for (const [arcId, arcData] of Object.entries(frontArcs)) {
      const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
      arcs.push({
        id: arcId,
        name: arcDef?.name || arcId,
        profile: 'front',
        ci: arcData.metrics?.curvatureIndex ?? 0,
        tag: arcData.tag,
        isCombined: false,
      });
    }
    
    for (const [arcId, arcData] of Object.entries(sideArcs)) {
      const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
      arcs.push({
        id: arcId,
        name: arcDef?.name || arcId,
        profile: 'side',
        ci: arcData.metrics?.curvatureIndex ?? 0,
        tag: arcData.tag,
        isCombined: false,
      });
    }
    
    // Add combined arcs
    if (combinedArcs) {
      for (const [arcId, arcResult] of combinedArcs.entries()) {
        arcs.push({
          id: arcId,
          name: COMBINED_ARC_NAMES[arcId] || arcId,
          profile: 'combined',
          ci: arcResult.curvatureIndex,
          tag: combinedArcTags?.[arcId] || '',
          isCombined: true,
        });
      }
    }
    
    return arcs;
  }, [frontArcs, sideArcs, combinedArcs, combinedArcTags]);
  
  // Apply selected tag to all arcs
  const applyTagToAll = () => {
    const tag = selectedTag || customTag;
    if (!tag) return;
    
    for (const arc of allArcs) {
      onUpdateTag(arc.id, tag, arc.isCombined);
    }
    onClose();
  };
  
  // Apply tag to untagged arcs only
  const applyTagToUntagged = () => {
    const tag = selectedTag || customTag;
    if (!tag) return;
    
    for (const arc of allArcs) {
      if (!arc.tag) {
        onUpdateTag(arc.id, tag, arc.isCombined);
      }
    }
    onClose();
  };
  
  // Clear all tags
  const clearAllTags = () => {
    for (const arc of allArcs) {
      onUpdateTag(arc.id, '', arc.isCombined);
    }
    onClose();
  };
  
  const taggedCount = allArcs.filter(a => a.tag).length;
  const currentTag = selectedTag || customTag;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Tagging</h2>
            <p className="text-sm text-gray-500">
              {taggedCount} of {allArcs.length} arcs tagged
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Tag selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a tag or enter custom
            </label>
            
            {/* Tag categories */}
            {Object.entries(TAG_CATEGORIES).map(([key, category]) => (
              <div key={key} className="mb-2">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                  className="w-full flex items-center justify-between py-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  <span className="font-medium">{category.label}</span>
                  {expandedCategory === key ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                
                {expandedCategory === key && (
                  <div className="flex flex-wrap gap-1.5 pb-2">
                    {category.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setSelectedTag(tag);
                          setCustomTag('');
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                          selectedTag === tag
                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                            : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Custom tag input */}
            <div className="mt-3">
              <input
                type="text"
                value={customTag}
                onChange={(e) => {
                  setCustomTag(e.target.value);
                  setSelectedTag('');
                }}
                placeholder="Or enter custom tag..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
          
          {/* Arc list preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-medium text-gray-600">Arcs to tag</span>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {allArcs.map((arc) => (
                <div
                  key={arc.id}
                  className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 last:border-b-0 ${
                    arc.isCombined ? 'bg-purple-50/30' : ''
                  }`}
                >
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      arc.profile === 'front'
                        ? 'bg-blue-50 text-blue-600'
                        : arc.profile === 'combined'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {arc.isCombined && <Combine size={8} />}
                    {arc.profile}
                  </span>
                  <span className="text-xs text-gray-700 flex-1 truncate">
                    {arc.name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {formatCI(arc.ci)}
                  </span>
                  {arc.tag ? (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      arc.isCombined 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {arc.tag}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">-</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={clearAllTags}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All Tags
            </button>
            <div className="flex-1" />
            <button
              onClick={applyTagToUntagged}
              disabled={!currentTag}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply to Untagged ({allArcs.length - taggedCount})
            </button>
            <button
              onClick={applyTagToAll}
              disabled={!currentTag}
              className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Tag size={14} />
              Apply to All ({allArcs.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

