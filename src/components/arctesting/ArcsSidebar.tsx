'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Tag, Info, Combine, Eye, EyeOff } from 'lucide-react';
import { ArcTestingData } from '@/app/arcs/arc-testing-client';
import { 
  CombinedArcResult, 
  CombinedArcId, 
  ArcMetrics,
  formatCI,
  BASELINE_ARC_IDS,
  COMBINED_ARC_IDS,
} from '@/lib/arcs';
import { ArcDisplayData, ARC_CATEGORIES } from '@/lib/arcs/combinedArcs';

interface ArcsSidebarProps {
  allArcs: ArcDisplayData[];
  frontArcStates: Record<string, ArcTestingData>;
  sideArcStates: Record<string, ArcTestingData>;
  combinedArcResults: Map<CombinedArcId, CombinedArcResult>;
  combinedArcTags: Record<CombinedArcId, string>;
  selectedArcId: string | null;
  onSelectArc: (arcId: string | null) => void;
  onUpdateTag: (arcId: string, tag: string, isCombined?: boolean) => void;
  showFront: boolean;
}

// Predefined tag suggestions
const TAG_SUGGESTIONS = [
  'Very Angular',
  'Angular',
  'Moderately Angular',
  'Balanced',
  'Moderately Rounded',
  'Rounded',
  'Very Rounded',
  'Sharp',
  'Soft',
  'Defined',
  'Undefined',
  'Ideal',
  'Needs Improvement',
];

// Color scale for CI values
function getCIColor(ci: number): string {
  const normalized = Math.max(-6, Math.min(6, ci)) / 6;
  if (normalized < 0) {
    const factor = 1 + normalized;
    return `rgb(${Math.round(200 + 55 * factor)}, ${Math.round(100 + 155 * factor)}, ${Math.round(100)})`;
  } else {
    const factor = normalized;
    return `rgb(${Math.round(255 - 105 * factor)}, ${Math.round(200 + 30 * factor)}, ${Math.round(100 + 70 * factor)})`;
  }
}

interface ArcRowProps {
  arcId: string;
  name: string;
  displayOrder: number;
  metrics: ArcMetrics | CombinedArcResult | null;
  tag: string;
  isSelected: boolean;
  isCombined: boolean;
  isVisible: boolean;
  onSelect: () => void;
  onUpdateTag: (tag: string) => void;
}

function ArcRow({
  arcId,
  name,
  displayOrder,
  metrics,
  tag,
  isSelected,
  isCombined,
  isVisible,
  onSelect,
  onUpdateTag,
}: ArcRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  
  const ci = metrics?.curvatureIndex ?? 0;
  const label = metrics?.label ?? 'N/A';
  const smoothnessLabel = metrics && 'smoothnessLabel' in metrics ? metrics.smoothnessLabel : 'N/A';
  
  return (
    <div
      className={`border-b border-gray-100 last:border-b-0 ${
        isSelected ? 'bg-amber-50' : ''
      } ${!isVisible ? 'opacity-40' : ''}`}
    >
      {/* Main row */}
      <div
        className={`flex items-center gap-2 px-3 py-2 transition-colors ${
          isCombined ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'
        } ${isSelected ? 'hover:bg-amber-100' : ''}`}
        onClick={onSelect}
        title={isCombined ? 'Combined arcs show aggregated metrics from baseline arcs' : `Click to view ${name} on canvas`}
      >
        {/* Order number */}
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-semibold"
          style={{
            background: isCombined ? 'rgba(139, 92, 246, 0.1)' : 'rgba(114, 131, 140, 0.1)',
            color: isCombined ? '#8b5cf6' : '#72838c',
          }}
        >
          {displayOrder}
        </div>
        
        {/* Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-900 truncate">{name}</span>
            {isCombined && <Combine size={10} className="text-purple-500 flex-shrink-0" />}
          </div>
        </div>
        
        {/* CI value */}
        <div className="flex-shrink-0 w-14 text-right">
          {metrics ? (
            <span
              className="text-xs font-semibold"
              style={{ color: getCIColor(ci) }}
            >
              {formatCI(ci)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">-</span>
          )}
        </div>
        
        {/* Tag indicator */}
        {tag && (
          <Tag size={12} className="text-amber-500 flex-shrink-0" />
        )}
        
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-0.5 hover:bg-gray-200 rounded transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>
      
      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 bg-gray-50/50 space-y-2">
          {/* Metrics grid */}
          {metrics && (
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <div className="text-gray-500">Curvature Index</div>
                <div className="font-semibold" style={{ color: getCIColor(ci) }}>
                  {formatCI(ci)}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Shape</div>
                <div className="font-medium text-gray-700">{label}</div>
              </div>
              <div>
                <div className="text-gray-500">Smoothness</div>
                <div className="font-medium text-gray-700">{smoothnessLabel}</div>
              </div>
              {metrics.jerk && (
                <div>
                  <div className="text-gray-500">Jerk Mean</div>
                  <div className="font-medium text-gray-700">
                    {(metrics.jerk as ArcMetrics['jerk']).mean.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Curvature breakdown */}
          {metrics?.curvature && (
            <div className="pt-2 border-t border-gray-200">
              <div className="text-[9px] text-gray-500 mb-1 font-medium">Curvature Breakdown</div>
              <div className="grid grid-cols-3 gap-1 text-[9px]">
                <div>
                  <span className="text-gray-500">Mean:</span>{' '}
                  <span className="font-medium">{(metrics.curvature as ArcMetrics['curvature']).mean.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Max:</span>{' '}
                  <span className="font-medium">{(metrics.curvature as ArcMetrics['curvature']).max.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-gray-500">StdDev:</span>{' '}
                  <span className="font-medium">{(metrics.curvature as ArcMetrics['curvature']).stdDev.toFixed(4)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Tag input */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Tag size={12} className={`flex-shrink-0 ${isCombined ? 'text-purple-400' : 'text-gray-400'}`} />
              {showTagInput ? (
                <div className="flex-1 flex gap-1">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => onUpdateTag(e.target.value)}
                    placeholder={isCombined ? "Tag combined arc..." : "Enter tag..."}
                    className={`flex-1 px-2 py-1 text-[10px] border rounded focus:outline-none ${
                      isCombined 
                        ? 'border-purple-200 focus:border-purple-400' 
                        : 'border-gray-200 focus:border-amber-400'
                    }`}
                    autoFocus
                    onBlur={() => setShowTagInput(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setShowTagInput(false);
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTagInput(true);
                  }}
                  className={`text-[10px] hover:text-gray-700 ${isCombined ? 'text-purple-500' : 'text-gray-500'}`}
                >
                  {tag || 'Add tag...'}
                </button>
              )}
            </div>
            
            {/* Quick tag suggestions */}
            {showTagInput && (
              <div className="flex flex-wrap gap-1 mt-2">
                {TAG_SUGGESTIONS.slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateTag(suggestion);
                      setShowTagInput(false);
                    }}
                    className={`px-1.5 py-0.5 text-[9px] rounded transition-colors ${
                      isCombined 
                        ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ArcsSidebar({
  allArcs,
  frontArcStates,
  sideArcStates,
  combinedArcResults,
  combinedArcTags,
  selectedArcId,
  onSelectArc,
  onUpdateTag,
  showFront,
}: ArcsSidebarProps) {
  const [showAllArcs, setShowAllArcs] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['jaw', 'chin', 'cheek', 'hairline', 'forehead', 'neck', 'nose', 'lips', 'combined'])
  );
  
  // Filter and organize arcs by category
  const arcsByCategory = useMemo(() => {
    const categories: Record<string, Array<{
      arc: ArcDisplayData;
      metrics: ArcMetrics | CombinedArcResult | null;
      tag: string;
      isVisible: boolean;
    }>> = {
      hairline: [],
      cheek: [],
      jaw: [],
      chin: [],
      forehead: [],
      neck: [],
      nose: [],
      lips: [],
      combined: [],
    };
    
    for (const arc of allArcs) {
      let metrics: ArcMetrics | CombinedArcResult | null = null;
      let tag = '';
      let isVisible = true;
      
      if (arc.isCombined) {
        metrics = combinedArcResults.get(arc.id as CombinedArcId) || null;
        tag = combinedArcTags[arc.id as CombinedArcId] || '';
        isVisible = !!metrics;
      } else if (arc.profile === 'front') {
        const arcState = frontArcStates[arc.id];
        metrics = arcState?.metrics || null;
        tag = arcState?.tag || '';
        isVisible = showFront && !!arcState;
      } else {
        const arcState = sideArcStates[arc.id];
        metrics = arcState?.metrics || null;
        tag = arcState?.tag || '';
        isVisible = !showFront && !!arcState;
      }
      
      const category = arc.isCombined ? 'combined' : arc.category;
      if (categories[category]) {
        categories[category].push({ arc, metrics, tag, isVisible });
      }
    }
    
    return categories;
  }, [allArcs, frontArcStates, sideArcStates, combinedArcResults, combinedArcTags, showFront]);
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  const categoryLabels: Record<string, string> = {
    hairline: 'Hairline',
    cheek: 'Cheek',
    jaw: 'Jaw',
    chin: 'Chin',
    forehead: 'Forehead',
    neck: 'Neck/Submental',
    nose: 'Nose',
    lips: 'Lips',
    combined: 'Combined Arcs',
  };
  
  return (
    <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 h-12 px-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">All 23 Arcs</h2>
        <button
          onClick={() => setShowAllArcs(!showAllArcs)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-500"
          title={showAllArcs ? 'Show relevant only' : 'Show all arcs'}
        >
          {showAllArcs ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      
      {/* Arc list */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(arcsByCategory).map(([category, arcs]) => {
          if (arcs.length === 0) return null;
          
          const isExpanded = expandedCategories.has(category);
          const visibleCount = arcs.filter(a => a.isVisible).length;
          
          // Skip empty categories if not showing all
          if (!showAllArcs && visibleCount === 0) return null;
          
          return (
            <div key={category} className="border-b border-gray-100">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {categoryLabels[category]}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    ({visibleCount}/{arcs.length})
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-gray-400" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400" />
                )}
              </button>
              
              {/* Arc rows */}
              {isExpanded && (
                <div>
                  {arcs.map(({ arc, metrics, tag, isVisible }) => {
                    if (!showAllArcs && !isVisible) return null;
                    
                    return (
                      <ArcRow
                        key={arc.id}
                        arcId={arc.id}
                        name={arc.name}
                        displayOrder={arc.displayOrder}
                        metrics={metrics}
                        tag={tag}
                        isSelected={selectedArcId === arc.id}
                        isCombined={arc.isCombined}
                        isVisible={isVisible}
                        onSelect={() => {
                          // Combined arcs can't be selected for canvas display
                          // They are computed from baseline arcs
                          if (!arc.isCombined) {
                            onSelectArc(arc.id);
                          }
                        }}
                        onUpdateTag={(newTag) => onUpdateTag(arc.id, newTag, arc.isCombined)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-[9px] text-gray-500 mb-2">Curvature Index Scale</div>
        <div
          className="h-2 rounded-full"
          style={{
            background: 'linear-gradient(90deg, rgb(200, 100, 100) 0%, rgb(255, 200, 100) 50%, rgb(150, 230, 170) 100%)',
          }}
        />
        <div className="flex justify-between mt-1 text-[8px] text-gray-400">
          <span>Angular (-6)</span>
          <span>Balanced (0)</span>
          <span>Rounded (+6)</span>
        </div>
      </div>
    </div>
  );
}

