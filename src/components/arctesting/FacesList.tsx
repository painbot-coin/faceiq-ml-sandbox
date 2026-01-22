'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, User, Star, X } from 'lucide-react';
import { FaceData, FaceTestingState } from '@/app/(authenticated)/(app)/arctesting/arc-testing-client';

interface FacesListProps {
  faces: FaceData[];
  currentFaceIndex: number;
  onSelectFace: (index: number) => void;
  onDeleteFace?: (faceId: string) => void;
  faceStates: Map<string, FaceTestingState>;
}

export function FacesList({
  faces,
  currentFaceIndex,
  onSelectFace,
  onDeleteFace,
  faceStates,
}: FacesListProps) {
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);
  // Calculate tagging progress for each face
  const faceProgress = useMemo(() => {
    return faces.map((face) => {
      const state = faceStates.get(face.id);
      if (!state) return { tagged: 0, total: 0 };
      
      let tagged = 0;
      let total = 0;
      
      for (const arcData of Object.values(state.frontArcs)) {
        total++;
        if (arcData.tag) tagged++;
      }
      
      for (const arcData of Object.values(state.sideArcs)) {
        total++;
        if (arcData.tag) tagged++;
      }
      
      return { tagged, total };
    });
  }, [faces, faceStates]);
  
  return (
    <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 h-12 px-4 border-b border-gray-200 flex items-center">
        <h2 className="text-sm font-semibold text-gray-900">Faces</h2>
        <span className="ml-auto text-xs text-gray-500">{faces.length}</span>
      </div>
      
      {/* Face list */}
      <div className="flex-1 overflow-y-auto">
        {faces.map((face, index) => {
          const progress = faceProgress[index];
          const isSelected = index === currentFaceIndex;
          const isComplete = progress.tagged > 0 && progress.tagged === progress.total;
          const hasAnyTag = progress.tagged > 0;
          
          const isHovered = hoveredFace === face.id;
          
          return (
            <div
              key={face.id}
              className={`relative w-full flex items-center gap-3 px-3 py-2 border-b border-gray-100 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-amber-50 border-l-2 border-l-amber-400'
                  : 'hover:bg-gray-50 border-l-2 border-l-transparent'
              }`}
              onClick={() => onSelectFace(index)}
              onMouseEnter={() => setHoveredFace(face.id)}
              onMouseLeave={() => setHoveredFace(null)}
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {face.frontImageUrl ? (
                  <img
                    src={face.frontImageUrl}
                    alt={face.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={16} className="text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-gray-900 truncate">
                  {face.name}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  {face.harmonyScore && (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <Star size={9} fill="currentColor" />
                      {face.harmonyScore.toFixed(1)}
                    </span>
                  )}
                  {isComplete ? (
                    <>
                      <CheckCircle2 size={10} className="text-green-500" />
                      <span className="text-green-600">Done</span>
                    </>
                  ) : hasAnyTag ? (
                    <span>{progress.tagged}/{progress.total}</span>
                  ) : (
                    <span>{progress.total} arcs</span>
                  )}
                </div>
              </div>
              
              {/* Status indicator / Delete button */}
              <div className="flex-shrink-0">
                {isHovered && onDeleteFace ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove "${face.name}" from the dataset?`)) {
                        onDeleteFace(face.id);
                      }
                    }}
                    className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove from dataset"
                  >
                    <X size={14} />
                  </button>
                ) : isComplete ? (
                  <CheckCircle2 size={14} className="text-green-500" />
                ) : hasAnyTag ? (
                  <Circle size={14} className="text-amber-400" fill="currentColor" />
                ) : (
                  <Circle size={14} className="text-gray-300" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-[10px] text-gray-500 mb-1">Progress</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${faces.length > 0
                  ? (faceProgress.filter(p => p.tagged === p.total && p.total > 0).length / faces.length) * 100
                  : 0
                }%`,
              }}
            />
          </div>
          <span className="text-[10px] text-gray-600 font-medium">
            {faceProgress.filter(p => p.tagged === p.total && p.total > 0).length}/{faces.length}
          </span>
        </div>
      </div>
    </div>
  );
}

