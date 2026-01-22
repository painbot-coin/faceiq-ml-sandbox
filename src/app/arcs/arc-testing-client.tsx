'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Upload, Download, ChevronLeft, ChevronRight, Tags, RotateCcw, FileJson, Trash2, Crosshair, Save } from 'lucide-react';
import { ArcCanvas } from '@/components/arctesting/ArcCanvas';
import { ArcsSidebar } from '@/components/arctesting/ArcsSidebar';
import { FacesList } from '@/components/arctesting/FacesList';
import { TaggingModal } from '@/components/arctesting/TaggingModal';
import { NormalizedLandmarkMap } from '@/types/face';
import {
  ALL_ARC_DEFINITIONS,
  ArcDefinition,
  ArcMetrics,
  StoredArcData,
  ArcHandle,
  IntermediatePoint,
  generateHandlesWithIntermediates,
  generateIntermediatePoints,
  mergePointsWithIntermediates,
  CombinedArcResult,
  FRONT_ARC_DEFINITIONS,
  SIDE_ARC_DEFINITIONS,
  BaselineArcId,
  CombinedArcId,
} from '@/lib/arcs';
import { calculateArcMetrics, getCurvatureLabelForArc, getLabelColorClass } from '@/lib/arcs/curvatureUtils';
import { calculateAllCombinedArcs, getAllArcsForDisplay } from '@/lib/arcs/combinedArcs';
import JSZip from 'jszip';

/** Default image size for normalizing pixel coordinates */
const DEFAULT_IMAGE_SIZE = 1024;

/** LocalStorage key for persisting session data */
const STORAGE_KEY = 'arctesting-session';

/** Serializable version of FaceTestingState (Map -> object) */
interface SerializableFaceTestingState {
  faceId: string;
  frontArcs: Record<string, ArcTestingData>;
  sideArcs: Record<string, ArcTestingData>;
  combinedArcs: Array<[CombinedArcId, CombinedArcResult]>;
  combinedArcTags: Record<CombinedArcId, string>;
  notes: string;
}

/** Session data structure for localStorage */
interface SessionData {
  faces: FaceData[];
  faceStates: SerializableFaceTestingState[];
  currentFaceIndex: number;
  savedAt: string;
}

/** Face data loaded from zip or JSON */
export interface FaceData {
  id: string;
  name: string;
  frontImageUrl: string;
  sideImageUrl?: string;
  frontLandmarks: NormalizedLandmarkMap;
  sideLandmarks?: NormalizedLandmarkMap;
  // Additional metadata from JSON exports
  email?: string;
  harmonyScore?: number;
  frontHarmonyScore?: number;
  sideHarmonyScore?: number;
}

/** JSON face format from approved-faces export */
interface JsonFaceEntry {
  id: string;
  faceId?: string;
  frontPhotoUrl: string;
  sidePhotoUrl?: string;
  frontLandmarks: Record<string, { x: number; y: number }>;
  sideLandmarks?: Record<string, { x: number; y: number }>;
  email?: string;
  harmonyScore?: number;
  frontHarmonyScore?: number;
  sideHarmonyScore?: number;
}

/** Normalize pixel landmarks to 0-1 range */
function normalizeLandmarks(
  landmarks: Record<string, { x: number; y: number }>,
  imageSize: number = DEFAULT_IMAGE_SIZE
): NormalizedLandmarkMap {
  const normalized: NormalizedLandmarkMap = {};
  for (const [key, coords] of Object.entries(landmarks)) {
    // If values are already normalized (0-1), keep them
    // Otherwise divide by image size
    const isNormalized = coords.x <= 1 && coords.y <= 1;
    normalized[key] = {
      x: isNormalized ? coords.x : coords.x / imageSize,
      y: isNormalized ? coords.y : coords.y / imageSize,
    };
  }
  return normalized;
}

/** Arc data with handles and tags */
export interface ArcTestingData {
  arcId: string;
  handles: ArcHandle[];
  intermediates: IntermediatePoint[];
  metrics: ArcMetrics | null;
  tag: string;
}

/** Complete face testing state with arcs */
export interface FaceTestingState {
  faceId: string;
  frontArcs: Record<string, ArcTestingData>;
  sideArcs: Record<string, ArcTestingData>;
  combinedArcs: Map<CombinedArcId, CombinedArcResult>;
  combinedArcTags: Record<CombinedArcId, string>;
  notes: string;
}

export default function ArcTestingClient() {
  // Loaded faces from zip
  const [faces, setFaces] = useState<FaceData[]>([]);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Face testing states (per-face arc data)
  const [faceStates, setFaceStates] = useState<Map<string, FaceTestingState>>(new Map());
  
  // UI state
  const [selectedArcId, setSelectedArcId] = useState<string | null>(null);
  const [showFront, setShowFront] = useState(true);
  const [showTaggingModal, setShowTaggingModal] = useState(false);
  const [isLandmarkEditMode, setIsLandmarkEditMode] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Load session from localStorage on mount
  useEffect(() => {
    if (hasLoadedFromStorage) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const session: SessionData = JSON.parse(stored);
        
        // Restore faces
        if (session.faces && session.faces.length > 0) {
          setFaces(session.faces);
          setCurrentFaceIndex(session.currentFaceIndex || 0);
          
          // Restore face states (convert array back to Map)
          if (session.faceStates) {
            const statesMap = new Map<string, FaceTestingState>();
            for (const state of session.faceStates) {
              statesMap.set(state.faceId, {
                ...state,
                combinedArcs: new Map(state.combinedArcs),
              });
            }
            setFaceStates(statesMap);
          }
          
          setLastSaved(session.savedAt ? new Date(session.savedAt) : null);
        }
      }
    } catch (error) {
      console.error('Failed to load session from localStorage:', error);
    }
    
    setHasLoadedFromStorage(true);
  }, [hasLoadedFromStorage]);
  
  // Save session to localStorage when data changes
  useEffect(() => {
    if (!hasLoadedFromStorage || faces.length === 0) return;
    
    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(() => {
      try {
        // Convert Map to array for serialization
        const serializableFaceStates: SerializableFaceTestingState[] = [];
        for (const [faceId, state] of faceStates) {
          serializableFaceStates.push({
            faceId,
            frontArcs: state.frontArcs,
            sideArcs: state.sideArcs,
            combinedArcs: Array.from(state.combinedArcs.entries()),
            combinedArcTags: state.combinedArcTags,
            notes: state.notes,
          });
        }
        
        const session: SessionData = {
          faces,
          faceStates: serializableFaceStates,
          currentFaceIndex,
          savedAt: new Date().toISOString(),
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save session to localStorage:', error);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [faces, faceStates, currentFaceIndex, hasLoadedFromStorage]);
  
  // Clear session from localStorage
  const clearSession = useCallback(() => {
    if (confirm('Clear all saved progress? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      setFaces([]);
      setFaceStates(new Map());
      setCurrentFaceIndex(0);
      setSelectedArcId(null);
      setLastSaved(null);
    }
  }, []);
  
  // Current face
  const currentFace = useMemo(() => faces[currentFaceIndex], [faces, currentFaceIndex]);
  
  // Current face state
  const currentFaceState = useMemo(() => {
    if (!currentFace) return null;
    return faceStates.get(currentFace.id) || null;
  }, [currentFace, faceStates]);
  
  // Initialize arc data for a face
  const initializeArcData = useCallback((face: FaceData): FaceTestingState => {
    const frontArcs: Record<string, ArcTestingData> = {};
    const sideArcs: Record<string, ArcTestingData> = {};
    
    // Initialize front arcs
    for (const arcDef of FRONT_ARC_DEFINITIONS) {
      const landmarkPoints = arcDef.throughPoints
        .map(key => face.frontLandmarks[key])
        .filter((p): p is { x: number; y: number } => p !== undefined);
      
      if (landmarkPoints.length === arcDef.throughPoints.length) {
        const intermediates = generateIntermediatePoints(landmarkPoints, arcDef.hasIntermediatePoints ?? false);
        const handles = generateHandlesWithIntermediates(landmarkPoints, intermediates);
        const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
        const metrics = calculateArcMetrics(allPoints, handles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
        
        frontArcs[arcDef.id] = {
          arcId: arcDef.id,
          handles,
          intermediates,
          metrics,
          tag: '',
        };
      }
    }
    
    // Initialize side arcs if side data exists
    if (face.sideLandmarks) {
      for (const arcDef of SIDE_ARC_DEFINITIONS) {
        const landmarkPoints = arcDef.throughPoints
          .map(key => face.sideLandmarks![key])
          .filter((p): p is { x: number; y: number } => p !== undefined);
        
        if (landmarkPoints.length === arcDef.throughPoints.length) {
          const intermediates = generateIntermediatePoints(landmarkPoints, arcDef.hasIntermediatePoints ?? false);
          const handles = generateHandlesWithIntermediates(landmarkPoints, intermediates);
          const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
          const metrics = calculateArcMetrics(allPoints, handles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
          
          sideArcs[arcDef.id] = {
            arcId: arcDef.id,
            handles,
            intermediates,
            metrics,
            tag: '',
          };
        }
      }
    }
    
    // Calculate combined arcs
    const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
    for (const [arcId, arcData] of Object.entries(frontArcs)) {
      if (arcData.metrics) {
        baselineMetrics.set(arcId as BaselineArcId, arcData.metrics);
      }
    }
    for (const [arcId, arcData] of Object.entries(sideArcs)) {
      if (arcData.metrics) {
        baselineMetrics.set(arcId as BaselineArcId, arcData.metrics);
      }
    }
    
    // Convert for combined arc calculation
    const storedArcs: Record<string, StoredArcData> = {};
    for (const [arcId, arcData] of Object.entries({ ...frontArcs, ...sideArcs })) {
      storedArcs[arcId] = {
        handles: arcData.handles,
        intermediates: arcData.intermediates,
      };
    }
    
    const combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
      storedArcs,
      landmarks: { ...face.frontLandmarks, ...(face.sideLandmarks || {}) },
    });
    
    // Initialize empty tags for combined arcs
    const combinedArcTags: Record<CombinedArcId, string> = {} as Record<CombinedArcId, string>;
    for (const combinedArcId of combinedArcs.keys()) {
      combinedArcTags[combinedArcId] = '';
    }
    
    return {
      faceId: face.id,
      frontArcs,
      sideArcs,
      combinedArcs,
      combinedArcTags,
      notes: '',
    };
  }, []);
  
  // Handle zip file upload
  const handleZipUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      const zip = await JSZip.loadAsync(file);
      const loadedFaces: FaceData[] = [];
      
      // Group files by face folder
      const faceFiles: Record<string, { front?: string; side?: string; frontLandmarks?: NormalizedLandmarkMap; sideLandmarks?: NormalizedLandmarkMap }> = {};
      
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        
        // Get face folder name (first part of path)
        const parts = path.split('/');
        const faceName = parts.length > 1 ? parts[0] : 'default';
        const fileName = parts[parts.length - 1].toLowerCase();
        
        if (!faceFiles[faceName]) {
          faceFiles[faceName] = {};
        }
        
        // Identify file type
        if (fileName.includes('front') && (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png'))) {
          const blob = await zipEntry.async('blob');
          faceFiles[faceName].front = URL.createObjectURL(blob);
        } else if (fileName.includes('side') && (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png'))) {
          const blob = await zipEntry.async('blob');
          faceFiles[faceName].side = URL.createObjectURL(blob);
        } else if (fileName.includes('frontlandmarks') && fileName.endsWith('.json')) {
          const text = await zipEntry.async('text');
          faceFiles[faceName].frontLandmarks = JSON.parse(text);
        } else if (fileName.includes('sidelandmarks') && fileName.endsWith('.json')) {
          const text = await zipEntry.async('text');
          faceFiles[faceName].sideLandmarks = JSON.parse(text);
        } else if (fileName === 'landmarks.json' && !faceFiles[faceName].frontLandmarks) {
          // Generic landmarks file - assume front
          const text = await zipEntry.async('text');
          const data = JSON.parse(text);
          // Check if it has front/side structure or is just landmarks
          if (data.front) {
            faceFiles[faceName].frontLandmarks = data.front;
            if (data.side) faceFiles[faceName].sideLandmarks = data.side;
          } else {
            faceFiles[faceName].frontLandmarks = data;
          }
        } else if (fileName.endsWith('.json')) {
          // Any JSON file - try to parse as landmarks
          const text = await zipEntry.async('text');
          const data = JSON.parse(text);
          if (data.front || data.hairline || data.chinBottom) {
            if (data.front) {
              faceFiles[faceName].frontLandmarks = data.front;
              if (data.side) faceFiles[faceName].sideLandmarks = data.side;
            } else if (!faceFiles[faceName].frontLandmarks) {
              faceFiles[faceName].frontLandmarks = data;
            }
          }
        } else if (!faceFiles[faceName].front && (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png'))) {
          // Any image - use as front if not set
          const blob = await zipEntry.async('blob');
          faceFiles[faceName].front = URL.createObjectURL(blob);
        }
      }
      
      // Convert to FaceData
      for (const [faceName, files] of Object.entries(faceFiles)) {
        if (files.front && files.frontLandmarks) {
          loadedFaces.push({
            id: `face-${loadedFaces.length}`,
            name: faceName,
            frontImageUrl: files.front,
            sideImageUrl: files.side,
            frontLandmarks: files.frontLandmarks,
            sideLandmarks: files.sideLandmarks,
          });
        }
      }
      
      // Sort by name
      loadedFaces.sort((a, b) => a.name.localeCompare(b.name));
      
      setFaces(loadedFaces);
      setCurrentFaceIndex(0);
      
      // Initialize all face states
      const newFaceStates = new Map<string, FaceTestingState>();
      for (const face of loadedFaces) {
        newFaceStates.set(face.id, initializeArcData(face));
      }
      setFaceStates(newFaceStates);
      
      // Reset selected arc
      setSelectedArcId(null);
      
    } catch (error) {
      console.error('Failed to load zip:', error);
      alert('Failed to load zip file. Make sure it contains face images and landmark JSON files.');
    } finally {
      setIsLoading(false);
    }
  }, [initializeArcData]);
  
  // Handle JSON file upload (approved-faces format)
  const handleJsonUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    
    try {
      const text = await file.text();
      const jsonData: JsonFaceEntry[] = JSON.parse(text);
      
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON must be an array of face objects');
      }
      
      const loadedFaces: FaceData[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const entry = jsonData[i];
        
        if (!entry.frontPhotoUrl || !entry.frontLandmarks) {
          console.warn(`Skipping face ${i}: missing frontPhotoUrl or frontLandmarks`);
          continue;
        }
        
        // Normalize landmarks from pixel coordinates to 0-1
        const frontLandmarks = normalizeLandmarks(entry.frontLandmarks);
        const sideLandmarks = entry.sideLandmarks 
          ? normalizeLandmarks(entry.sideLandmarks) 
          : undefined;
        
        loadedFaces.push({
          id: entry.id || entry.faceId || `face-${i}`,
          name: entry.email ? entry.email.split('@')[0] : `Face ${i + 1}`,
          frontImageUrl: entry.frontPhotoUrl,
          sideImageUrl: entry.sidePhotoUrl,
          frontLandmarks,
          sideLandmarks,
          email: entry.email,
          harmonyScore: entry.harmonyScore,
          frontHarmonyScore: entry.frontHarmonyScore,
          sideHarmonyScore: entry.sideHarmonyScore,
        });
      }
      
      if (loadedFaces.length === 0) {
        throw new Error('No valid faces found in JSON');
      }
      
      setFaces(loadedFaces);
      setCurrentFaceIndex(0);
      
      // Initialize all face states
      const newFaceStates = new Map<string, FaceTestingState>();
      for (const face of loadedFaces) {
        newFaceStates.set(face.id, initializeArcData(face));
      }
      setFaceStates(newFaceStates);
      
      // Reset selected arc
      setSelectedArcId(null);
      
    } catch (error) {
      console.error('Failed to load JSON:', error);
      alert(`Failed to load JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [initializeArcData]);
  
  // Update arc handle - uses functional update to avoid stale closure
  const updateArcHandle = useCallback((arcId: string, handleIndex: number, x: number, y: number) => {
    const face = faces[currentFaceIndex];
    if (!face) return;
    
    const isFront = FRONT_ARC_DEFINITIONS.some(d => d.id === arcId);
    const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
    if (!arcDef) return;
    
    setFaceStates(prev => {
      const faceState = prev.get(face.id);
      if (!faceState) return prev;
      
      const arcCollection = isFront ? faceState.frontArcs : faceState.sideArcs;
      const arcData = arcCollection[arcId];
      if (!arcData) return prev;
      
      const newHandles = [...arcData.handles];
      if (handleIndex >= 0 && handleIndex < newHandles.length) {
        newHandles[handleIndex] = { ...newHandles[handleIndex], x, y };
      }
      
      // Recalculate metrics
      const landmarks = isFront ? face.frontLandmarks : face.sideLandmarks;
      if (!landmarks) return prev;
      
      const landmarkPoints = arcDef.throughPoints
        .map(key => landmarks[key])
        .filter((p): p is { x: number; y: number } => p !== undefined);
      const allPoints = mergePointsWithIntermediates(landmarkPoints, arcData.intermediates);
      const metrics = calculateArcMetrics(allPoints, newHandles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
      
      // Create new state
      const newStates = new Map(prev);
      const newFaceState = { ...faceState };
      
      const updatedArcData = { ...arcData, handles: newHandles, metrics };
      
      if (isFront) {
        newFaceState.frontArcs = { ...faceState.frontArcs, [arcId]: updatedArcData };
      } else {
        newFaceState.sideArcs = { ...faceState.sideArcs, [arcId]: updatedArcData };
      }
      
      // Recalculate combined arcs
      const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
      for (const [id, data] of Object.entries(newFaceState.frontArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      for (const [id, data] of Object.entries(newFaceState.sideArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      
      const storedArcs: Record<string, StoredArcData> = {};
      for (const [id, data] of Object.entries({ ...newFaceState.frontArcs, ...newFaceState.sideArcs })) {
        storedArcs[id] = { handles: data.handles, intermediates: data.intermediates };
      }
      
      newFaceState.combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
        storedArcs,
        landmarks: { ...face.frontLandmarks, ...(face.sideLandmarks || {}) },
      });
      
      newStates.set(face.id, newFaceState);
      return newStates;
    });
  }, [faces, currentFaceIndex]);
  
  // Add intermediate point to arc
  const addArcIntermediate = useCallback((arcId: string, segmentIndex: number, t: number, x: number, y: number) => {
    const face = faces[currentFaceIndex];
    if (!face) return;
    
    const isFront = FRONT_ARC_DEFINITIONS.some(d => d.id === arcId);
    const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
    if (!arcDef) return;
    
    setFaceStates(prev => {
      const faceState = prev.get(face.id);
      if (!faceState) return prev;
      
      const arcCollection = isFront ? faceState.frontArcs : faceState.sideArcs;
      const arcData = arcCollection[arcId];
      if (!arcData) return prev;
      
      // Add new intermediate point
      const newIntermediate: IntermediatePoint = {
        id: `user-${Date.now()}`,
        t,
        x,
        y,
        segmentIndex,
      };
      
      const newIntermediates = [...arcData.intermediates, newIntermediate].sort((a, b) => {
        if (a.segmentIndex !== b.segmentIndex) return a.segmentIndex - b.segmentIndex;
        return a.t - b.t;
      });
      
      // Regenerate handles for new configuration
      const landmarks = isFront ? face.frontLandmarks : face.sideLandmarks;
      if (!landmarks) return prev;
      
      const landmarkPoints = arcDef.throughPoints
        .map(key => landmarks[key])
        .filter((p): p is { x: number; y: number } => p !== undefined);
      
      const allPoints = mergePointsWithIntermediates(landmarkPoints, newIntermediates);
      const newHandles = generateHandlesWithIntermediates(landmarkPoints, newIntermediates);
      const metrics = calculateArcMetrics(allPoints, newHandles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
      
      // Create new state
      const newStates = new Map(prev);
      const newFaceState = { ...faceState };
      
      const updatedArcData = { ...arcData, handles: newHandles, intermediates: newIntermediates, metrics };
      
      if (isFront) {
        newFaceState.frontArcs = { ...faceState.frontArcs, [arcId]: updatedArcData };
      } else {
        newFaceState.sideArcs = { ...faceState.sideArcs, [arcId]: updatedArcData };
      }
      
      // Recalculate combined arcs
      const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
      for (const [id, data] of Object.entries(newFaceState.frontArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      for (const [id, data] of Object.entries(newFaceState.sideArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      
      const storedArcs: Record<string, StoredArcData> = {};
      for (const [id, data] of Object.entries({ ...newFaceState.frontArcs, ...newFaceState.sideArcs })) {
        storedArcs[id] = { handles: data.handles, intermediates: data.intermediates };
      }
      
      newFaceState.combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
        storedArcs,
        landmarks: { ...face.frontLandmarks, ...(face.sideLandmarks || {}) },
      });
      
      newStates.set(face.id, newFaceState);
      return newStates;
    });
  }, [faces, currentFaceIndex]);
  
  // Update intermediate point position
  const updateArcIntermediate = useCallback((arcId: string, intermediateId: string, x: number, y: number) => {
    const face = faces[currentFaceIndex];
    if (!face) return;
    
    const isFront = FRONT_ARC_DEFINITIONS.some(d => d.id === arcId);
    const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
    if (!arcDef) return;
    
    setFaceStates(prev => {
      const faceState = prev.get(face.id);
      if (!faceState) return prev;
      
      const arcCollection = isFront ? faceState.frontArcs : faceState.sideArcs;
      const arcData = arcCollection[arcId];
      if (!arcData) return prev;
      
      // Update the intermediate point position
      const newIntermediates = arcData.intermediates.map(ip => 
        ip.id === intermediateId ? { ...ip, x, y } : ip
      );
      
      // Recalculate metrics with new intermediate position
      const landmarks = isFront ? face.frontLandmarks : face.sideLandmarks;
      if (!landmarks) return prev;
      
      const landmarkPoints = arcDef.throughPoints
        .map(key => landmarks[key])
        .filter((p): p is { x: number; y: number } => p !== undefined);
      
      const allPoints = mergePointsWithIntermediates(landmarkPoints, newIntermediates);
      
      // Regenerate handles for new intermediate positions
      const newHandles = generateHandlesWithIntermediates(landmarkPoints, newIntermediates);
      const metrics = calculateArcMetrics(allPoints, newHandles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
      
      // Create new state
      const newStates = new Map(prev);
      const newFaceState = { ...faceState };
      
      const updatedArcData = { ...arcData, handles: newHandles, intermediates: newIntermediates, metrics };
      
      if (isFront) {
        newFaceState.frontArcs = { ...faceState.frontArcs, [arcId]: updatedArcData };
      } else {
        newFaceState.sideArcs = { ...faceState.sideArcs, [arcId]: updatedArcData };
      }
      
      // Recalculate combined arcs
      const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
      for (const [id, data] of Object.entries(newFaceState.frontArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      for (const [id, data] of Object.entries(newFaceState.sideArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      
      const storedArcs: Record<string, StoredArcData> = {};
      for (const [id, data] of Object.entries({ ...newFaceState.frontArcs, ...newFaceState.sideArcs })) {
        storedArcs[id] = { handles: data.handles, intermediates: data.intermediates };
      }
      
      newFaceState.combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
        storedArcs,
        landmarks: { ...face.frontLandmarks, ...(face.sideLandmarks || {}) },
      });
      
      newStates.set(face.id, newFaceState);
      return newStates;
    });
  }, [faces, currentFaceIndex]);
  
  // Delete intermediate point from arc
  const deleteArcIntermediate = useCallback((arcId: string, intermediateId: string) => {
    const face = faces[currentFaceIndex];
    if (!face) return;
    
    const isFront = FRONT_ARC_DEFINITIONS.some(d => d.id === arcId);
    const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
    if (!arcDef) return;
    
    setFaceStates(prev => {
      const faceState = prev.get(face.id);
      if (!faceState) return prev;
      
      const arcCollection = isFront ? faceState.frontArcs : faceState.sideArcs;
      const arcData = arcCollection[arcId];
      if (!arcData) return prev;
      
      // Remove the intermediate point
      const newIntermediates = arcData.intermediates.filter(ip => ip.id !== intermediateId);
      
      // Recalculate metrics without the deleted point
      const landmarks = isFront ? face.frontLandmarks : face.sideLandmarks;
      if (!landmarks) return prev;
      
      const landmarkPoints = arcDef.throughPoints
        .map(key => landmarks[key])
        .filter((p): p is { x: number; y: number } => p !== undefined);
      
      const allPoints = mergePointsWithIntermediates(landmarkPoints, newIntermediates);
      
      // Regenerate handles for new configuration
      const newHandles = generateHandlesWithIntermediates(landmarkPoints, newIntermediates);
      const metrics = calculateArcMetrics(allPoints, newHandles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
      
      // Create new state
      const newStates = new Map(prev);
      const newFaceState = { ...faceState };
      
      const updatedArcData = { ...arcData, handles: newHandles, intermediates: newIntermediates, metrics };
      
      if (isFront) {
        newFaceState.frontArcs = { ...faceState.frontArcs, [arcId]: updatedArcData };
      } else {
        newFaceState.sideArcs = { ...faceState.sideArcs, [arcId]: updatedArcData };
      }
      
      // Recalculate combined arcs
      const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
      for (const [id, data] of Object.entries(newFaceState.frontArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      for (const [id, data] of Object.entries(newFaceState.sideArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      
      const storedArcs: Record<string, StoredArcData> = {};
      for (const [id, data] of Object.entries({ ...newFaceState.frontArcs, ...newFaceState.sideArcs })) {
        storedArcs[id] = { handles: data.handles, intermediates: data.intermediates };
      }
      
      newFaceState.combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
        storedArcs,
        landmarks: { ...face.frontLandmarks, ...(face.sideLandmarks || {}) },
      });
      
      newStates.set(face.id, newFaceState);
      return newStates;
    });
  }, [faces, currentFaceIndex]);
  
  // Update arc tag
  const updateArcTag = useCallback((arcId: string, tag: string, isCombined: boolean = false) => {
    if (!currentFace || !currentFaceState) return;
    
    // Handle combined arc tags
    if (isCombined) {
      setFaceStates(prev => {
        const newStates = new Map(prev);
        const faceState = newStates.get(currentFace.id);
        if (!faceState) return prev;
        
        faceState.combinedArcTags = { 
          ...faceState.combinedArcTags, 
          [arcId as CombinedArcId]: tag 
        };
        
        return newStates;
      });
      return;
    }
    
    // Handle baseline arc tags
    const isFront = FRONT_ARC_DEFINITIONS.some(d => d.id === arcId);
    const arcCollection = isFront ? currentFaceState.frontArcs : currentFaceState.sideArcs;
    const arcData = arcCollection[arcId];
    if (!arcData) return;
    
    setFaceStates(prev => {
      const newStates = new Map(prev);
      const faceState = newStates.get(currentFace.id);
      if (!faceState) return prev;
      
      const updatedArcData = { ...arcData, tag };
      
      if (isFront) {
        faceState.frontArcs = { ...faceState.frontArcs, [arcId]: updatedArcData };
      } else {
        faceState.sideArcs = { ...faceState.sideArcs, [arcId]: updatedArcData };
      }
      
      return newStates;
    });
  }, [currentFace, currentFaceState]);
  
  // Reset arc to default
  const resetArc = useCallback((arcId: string) => {
    if (!currentFace || !currentFaceState) return;
    
    const isFront = FRONT_ARC_DEFINITIONS.some(d => d.id === arcId);
    const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
    if (!arcDef) return;
    
    const landmarks = isFront ? currentFace.frontLandmarks : currentFace.sideLandmarks;
    if (!landmarks) return;
    
    const landmarkPoints = arcDef.throughPoints
      .map(key => landmarks[key])
      .filter((p): p is { x: number; y: number } => p !== undefined);
    
    if (landmarkPoints.length !== arcDef.throughPoints.length) return;
    
    const intermediates = generateIntermediatePoints(landmarkPoints, arcDef.hasIntermediatePoints ?? false);
    const handles = generateHandlesWithIntermediates(landmarkPoints, intermediates);
    const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
    const metrics = calculateArcMetrics(allPoints, handles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
    
    const arcCollection = isFront ? currentFaceState.frontArcs : currentFaceState.sideArcs;
    const existingTag = arcCollection[arcId]?.tag || '';
    
    setFaceStates(prev => {
      const newStates = new Map(prev);
      const faceState = newStates.get(currentFace.id);
      if (!faceState) return prev;
      
      const updatedArcData: ArcTestingData = {
        arcId,
        handles,
        intermediates,
        metrics,
        tag: existingTag,
      };
      
      if (isFront) {
        faceState.frontArcs = { ...faceState.frontArcs, [arcId]: updatedArcData };
      } else {
        faceState.sideArcs = { ...faceState.sideArcs, [arcId]: updatedArcData };
      }
      
      // Recalculate combined arcs
      const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
      for (const [id, data] of Object.entries(faceState.frontArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      for (const [id, data] of Object.entries(faceState.sideArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      
      const storedArcs: Record<string, StoredArcData> = {};
      for (const [id, data] of Object.entries({ ...faceState.frontArcs, ...faceState.sideArcs })) {
        storedArcs[id] = { handles: data.handles, intermediates: data.intermediates };
      }
      
      faceState.combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
        storedArcs,
        landmarks: { ...currentFace.frontLandmarks, ...(currentFace.sideLandmarks || {}) },
      });
      
      return newStates;
    });
  }, [currentFace, currentFaceState]);
  
  // Delete face from dataset
  const deleteFace = useCallback((faceId: string) => {
    const faceIndex = faces.findIndex(f => f.id === faceId);
    if (faceIndex === -1) return;
    
    // Remove face from list
    setFaces(prev => prev.filter(f => f.id !== faceId));
    
    // Remove face state
    setFaceStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(faceId);
      return newStates;
    });
    
    // Adjust current face index if needed
    if (faceIndex <= currentFaceIndex && currentFaceIndex > 0) {
      setCurrentFaceIndex(prev => prev - 1);
    } else if (faces.length === 1) {
      setCurrentFaceIndex(0);
    }
  }, [faces, currentFaceIndex]);
  
  // Delete current face with confirmation
  const deleteCurrentFace = useCallback(() => {
    if (!currentFace) return;
    
    if (confirm(`Are you sure you want to remove "${currentFace.name}" from the dataset?`)) {
      deleteFace(currentFace.id);
    }
  }, [currentFace, deleteFace]);
  
  // Update landmark position and recalculate arcs
  const updateLandmark = useCallback((landmarkKey: string, x: number, y: number) => {
    if (!currentFace) return;
    
    // Update the face's landmarks
    setFaces(prev => prev.map(face => {
      if (face.id !== currentFace.id) return face;
      
      if (showFront) {
        return {
          ...face,
          frontLandmarks: {
            ...face.frontLandmarks,
            [landmarkKey]: { x, y },
          },
        };
      } else if (face.sideLandmarks) {
        return {
          ...face,
          sideLandmarks: {
            ...face.sideLandmarks,
            [landmarkKey]: { x, y },
          },
        };
      }
      return face;
    }));
    
    // Recalculate arcs that use this landmark
    setFaceStates(prev => {
      const faceState = prev.get(currentFace.id);
      if (!faceState) return prev;
      
      const newStates = new Map(prev);
      const newFaceState = { ...faceState };
      
      // Get updated landmarks
      const updatedFrontLandmarks = showFront 
        ? { ...currentFace.frontLandmarks, [landmarkKey]: { x, y } }
        : currentFace.frontLandmarks;
      const updatedSideLandmarks = !showFront && currentFace.sideLandmarks
        ? { ...currentFace.sideLandmarks, [landmarkKey]: { x, y } }
        : currentFace.sideLandmarks;
      
      // Recalculate front arcs if we're editing front landmarks
      if (showFront) {
        const newFrontArcs: Record<string, ArcTestingData> = {};
        for (const arcDef of FRONT_ARC_DEFINITIONS) {
          const existingArcData = faceState.frontArcs[arcDef.id];
          if (!existingArcData) continue;
          
          // Check if this arc uses the modified landmark
          if (!arcDef.throughPoints.includes(landmarkKey)) {
            newFrontArcs[arcDef.id] = existingArcData;
            continue;
          }
          
          // Recalculate arc with new landmark position
          const landmarkPoints = arcDef.throughPoints
            .map(key => updatedFrontLandmarks[key])
            .filter((p): p is { x: number; y: number } => p !== undefined);
          
          if (landmarkPoints.length === arcDef.throughPoints.length) {
            const intermediates = generateIntermediatePoints(landmarkPoints, arcDef.hasIntermediatePoints ?? false);
            const handles = generateHandlesWithIntermediates(landmarkPoints, intermediates);
            const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
            const metrics = calculateArcMetrics(allPoints, handles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
            
            newFrontArcs[arcDef.id] = {
              arcId: arcDef.id,
              handles,
              intermediates,
              metrics,
              tag: existingArcData.tag,
            };
          } else {
            newFrontArcs[arcDef.id] = existingArcData;
          }
        }
        newFaceState.frontArcs = newFrontArcs;
      }
      
      // Recalculate side arcs if we're editing side landmarks
      if (!showFront && updatedSideLandmarks) {
        const newSideArcs: Record<string, ArcTestingData> = {};
        for (const arcDef of SIDE_ARC_DEFINITIONS) {
          const existingArcData = faceState.sideArcs[arcDef.id];
          if (!existingArcData) continue;
          
          // Check if this arc uses the modified landmark
          if (!arcDef.throughPoints.includes(landmarkKey)) {
            newSideArcs[arcDef.id] = existingArcData;
            continue;
          }
          
          // Recalculate arc with new landmark position
          const landmarkPoints = arcDef.throughPoints
            .map(key => updatedSideLandmarks[key])
            .filter((p): p is { x: number; y: number } => p !== undefined);
          
          if (landmarkPoints.length === arcDef.throughPoints.length) {
            const intermediates = generateIntermediatePoints(landmarkPoints, arcDef.hasIntermediatePoints ?? false);
            const handles = generateHandlesWithIntermediates(landmarkPoints, intermediates);
            const allPoints = mergePointsWithIntermediates(landmarkPoints, intermediates);
            const metrics = calculateArcMetrics(allPoints, handles, arcDef.invertCurvatureSign ?? false, arcDef.jerkConfig, arcDef.id);
            
            newSideArcs[arcDef.id] = {
              arcId: arcDef.id,
              handles,
              intermediates,
              metrics,
              tag: existingArcData.tag,
            };
          } else {
            newSideArcs[arcDef.id] = existingArcData;
          }
        }
        newFaceState.sideArcs = newSideArcs;
      }
      
      // Recalculate combined arcs
      const baselineMetrics = new Map<BaselineArcId, ArcMetrics>();
      for (const [id, data] of Object.entries(newFaceState.frontArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      for (const [id, data] of Object.entries(newFaceState.sideArcs)) {
        if (data.metrics) baselineMetrics.set(id as BaselineArcId, data.metrics);
      }
      
      const storedArcs: Record<string, StoredArcData> = {};
      for (const [id, data] of Object.entries({ ...newFaceState.frontArcs, ...newFaceState.sideArcs })) {
        storedArcs[id] = { handles: data.handles, intermediates: data.intermediates };
      }
      
      newFaceState.combinedArcs = calculateAllCombinedArcs(baselineMetrics, {
        storedArcs,
        landmarks: { ...updatedFrontLandmarks, ...(updatedSideLandmarks || {}) },
      });
      
      newStates.set(currentFace.id, newFaceState);
      return newStates;
    });
  }, [currentFace, showFront]);
  
  // Export data to JSON
  const exportToJson = useCallback(() => {
    const exportData: Array<{
      faceName: string;
      faceId: string;
      frontLandmarks: NormalizedLandmarkMap;
      sideLandmarks?: NormalizedLandmarkMap;
      // Database-compatible format (StoredArcData) - can be directly saved to frontArcs/sideArcs columns
      frontArcsData: Record<string, StoredArcData>;
      sideArcsData: Record<string, StoredArcData>;
      // Computed metrics for analysis
      arcs: Array<{
        arcId: string;
        arcName: string;
        profile: 'front' | 'side' | 'combined';
        curvatureIndex: number;
        smoothnessLabel: string;
        label: string;
        tag: string;
        curvature: ArcMetrics['curvature'];
        jerk: ArcMetrics['jerk'];
      }>;
      notes: string;
    }> = [];
    
    for (const face of faces) {
      const faceState = faceStates.get(face.id);
      if (!faceState) continue;
      
      const arcs: Array<{
        arcId: string;
        arcName: string;
        profile: 'front' | 'side' | 'combined';
        curvatureIndex: number;
        smoothnessLabel: string;
        label: string;
        tag: string;
        curvature: ArcMetrics['curvature'];
        jerk: ArcMetrics['jerk'];
      }> = [];
      
      // Add front arcs
      for (const [arcId, arcData] of Object.entries(faceState.frontArcs)) {
        const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
        if (arcData.metrics) {
          arcs.push({
            arcId,
            arcName: arcDef?.name || arcId,
            profile: 'front',
            curvatureIndex: arcData.metrics.curvatureIndex,
            smoothnessLabel: arcData.metrics.smoothnessLabel,
            label: arcData.metrics.label,
            tag: arcData.tag,
            curvature: arcData.metrics.curvature,
            jerk: arcData.metrics.jerk,
          });
        }
      }
      
      // Add side arcs
      for (const [arcId, arcData] of Object.entries(faceState.sideArcs)) {
        const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
        if (arcData.metrics) {
          arcs.push({
            arcId,
            arcName: arcDef?.name || arcId,
            profile: 'side',
            curvatureIndex: arcData.metrics.curvatureIndex,
            smoothnessLabel: arcData.metrics.smoothnessLabel,
            label: arcData.metrics.label,
            tag: arcData.tag,
            curvature: arcData.metrics.curvature,
            jerk: arcData.metrics.jerk,
          });
        }
      }
      
      // Add combined arcs
      for (const [combinedArcId, combinedResult] of faceState.combinedArcs) {
        arcs.push({
          arcId: combinedArcId,
          arcName: combinedResult.name,
          profile: 'combined',
          curvatureIndex: combinedResult.curvatureIndex,
          smoothnessLabel: combinedResult.smoothnessLabel || 'N/A',
          label: combinedResult.label,
          tag: faceState.combinedArcTags[combinedArcId] || '',
          curvature: combinedResult.curvature || { mean: 0, max: 0, min: 0, maxAbs: 0, variance: 0, stdDev: 0 },
          jerk: combinedResult.jerk || { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] },
        });
      }
      
      // Build database-compatible StoredArcData format
      const frontArcsData: Record<string, StoredArcData> = {};
      for (const [arcId, arcData] of Object.entries(faceState.frontArcs)) {
        frontArcsData[arcId] = {
          handles: arcData.handles.map(h => ({
            pointIndex: h.pointIndex,
            side: h.side,
            x: h.x,
            y: h.y,
            isIntermediate: h.isIntermediate,
          })),
          intermediates: arcData.intermediates.map(ip => ({
            id: ip.id,
            t: ip.t,
            x: ip.x,
            y: ip.y,
            segmentIndex: ip.segmentIndex,
          })),
        };
      }
      
      const sideArcsData: Record<string, StoredArcData> = {};
      for (const [arcId, arcData] of Object.entries(faceState.sideArcs)) {
        sideArcsData[arcId] = {
          handles: arcData.handles.map(h => ({
            pointIndex: h.pointIndex,
            side: h.side,
            x: h.x,
            y: h.y,
            isIntermediate: h.isIntermediate,
          })),
          intermediates: arcData.intermediates.map(ip => ({
            id: ip.id,
            t: ip.t,
            x: ip.x,
            y: ip.y,
            segmentIndex: ip.segmentIndex,
          })),
        };
      }
      
      exportData.push({
        faceName: face.name,
        faceId: face.id,
        frontLandmarks: face.frontLandmarks,
        sideLandmarks: face.sideLandmarks,
        frontArcsData,
        sideArcsData,
        arcs,
        notes: faceState.notes,
      });
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arc-testing-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [faces, faceStates]);
  
  // Export current face to JSON (for incremental saves)
  const exportCurrentFace = useCallback(() => {
    if (!currentFace || !currentFaceState) return;
    
    const arcs: Array<{
      arcId: string;
      arcName: string;
      profile: 'front' | 'side' | 'combined';
      curvatureIndex: number;
      smoothnessLabel: string;
      label: string;
      tag: string;
      curvature: ArcMetrics['curvature'];
      jerk: ArcMetrics['jerk'];
    }> = [];
    
    // Add front arcs
    for (const [arcId, arcData] of Object.entries(currentFaceState.frontArcs)) {
      const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
      if (arcData.metrics) {
        arcs.push({
          arcId,
          arcName: arcDef?.name || arcId,
          profile: 'front',
          curvatureIndex: arcData.metrics.curvatureIndex,
          smoothnessLabel: arcData.metrics.smoothnessLabel,
          label: arcData.metrics.label,
          tag: arcData.tag,
          curvature: arcData.metrics.curvature,
          jerk: arcData.metrics.jerk,
        });
      }
    }
    
    // Add side arcs
    for (const [arcId, arcData] of Object.entries(currentFaceState.sideArcs)) {
      const arcDef = ALL_ARC_DEFINITIONS.find(d => d.id === arcId);
      if (arcData.metrics) {
        arcs.push({
          arcId,
          arcName: arcDef?.name || arcId,
          profile: 'side',
          curvatureIndex: arcData.metrics.curvatureIndex,
          smoothnessLabel: arcData.metrics.smoothnessLabel,
          label: arcData.metrics.label,
          tag: arcData.tag,
          curvature: arcData.metrics.curvature,
          jerk: arcData.metrics.jerk,
        });
      }
    }
    
    // Add combined arcs
    for (const [combinedArcId, combinedResult] of currentFaceState.combinedArcs) {
      arcs.push({
        arcId: combinedArcId,
        arcName: combinedResult.name,
        profile: 'combined',
        curvatureIndex: combinedResult.curvatureIndex,
        smoothnessLabel: combinedResult.smoothnessLabel || 'N/A',
        label: combinedResult.label,
        tag: currentFaceState.combinedArcTags[combinedArcId] || '',
        curvature: combinedResult.curvature || { mean: 0, max: 0, min: 0, maxAbs: 0, variance: 0, stdDev: 0 },
        jerk: combinedResult.jerk || { mean: 0, max: 0, variance: 0, stdDev: 0, spikeCount: 0, spikeLocations: [] },
      });
    }
    
    // Build database-compatible StoredArcData format
    const frontArcsData: Record<string, StoredArcData> = {};
    for (const [arcId, arcData] of Object.entries(currentFaceState.frontArcs)) {
      frontArcsData[arcId] = {
        handles: arcData.handles.map(h => ({
          pointIndex: h.pointIndex,
          side: h.side,
          x: h.x,
          y: h.y,
          isIntermediate: h.isIntermediate,
        })),
        intermediates: arcData.intermediates.map(ip => ({
          id: ip.id,
          t: ip.t,
          x: ip.x,
          y: ip.y,
          segmentIndex: ip.segmentIndex,
        })),
      };
    }
    
    const sideArcsData: Record<string, StoredArcData> = {};
    for (const [arcId, arcData] of Object.entries(currentFaceState.sideArcs)) {
      sideArcsData[arcId] = {
        handles: arcData.handles.map(h => ({
          pointIndex: h.pointIndex,
          side: h.side,
          x: h.x,
          y: h.y,
          isIntermediate: h.isIntermediate,
        })),
        intermediates: arcData.intermediates.map(ip => ({
          id: ip.id,
          t: ip.t,
          x: ip.x,
          y: ip.y,
          segmentIndex: ip.segmentIndex,
        })),
      };
    }
    
    const exportData = {
      faceName: currentFace.name,
      faceId: currentFace.id,
      email: currentFace.email,
      harmonyScore: currentFace.harmonyScore,
      frontHarmonyScore: currentFace.frontHarmonyScore,
      sideHarmonyScore: currentFace.sideHarmonyScore,
      frontLandmarks: currentFace.frontLandmarks,
      sideLandmarks: currentFace.sideLandmarks,
      frontArcsData,
      sideArcsData,
      arcs,
      notes: currentFaceState.notes,
      exportedAt: new Date().toISOString(),
    };
    
    // Generate filename from face name (sanitize for filesystem)
    const safeName = currentFace.name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
    const filename = `${safeName}-arc-data.json`;
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentFace, currentFaceState]);
  
  // Navigation
  const goToPrevFace = useCallback(() => {
    if (currentFaceIndex > 0) {
      setCurrentFaceIndex(i => i - 1);
    }
  }, [currentFaceIndex]);
  
  const goToNextFace = useCallback(() => {
    if (currentFaceIndex < faces.length - 1) {
      setCurrentFaceIndex(i => i + 1);
    }
  }, [currentFaceIndex, faces.length]);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          goToPrevFace();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          goToNextFace();
          break;
        case 'f':
        case 'F':
          // Toggle front/side
          e.preventDefault();
          setShowFront(prev => !prev);
          break;
        case 'l':
        case 'L':
          // Toggle landmark edit mode
          e.preventDefault();
          setIsLandmarkEditMode(prev => !prev);
          break;
        case 's':
        case 'S':
          // Export current face
          e.preventDefault();
          exportCurrentFace();
          break;
        case 'Escape':
          // Deselect arc and exit landmark edit mode
          setSelectedArcId(null);
          setIsLandmarkEditMode(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevFace, goToNextFace, exportCurrentFace]);
  
  // Get arc definitions for current profile
  const currentArcDefinitions = useMemo(() => {
    return showFront ? FRONT_ARC_DEFINITIONS : SIDE_ARC_DEFINITIONS;
  }, [showFront]);
  
  // Get current arc states for display
  const currentArcStates = useMemo(() => {
    if (!currentFaceState) return {};
    return showFront ? currentFaceState.frontArcs : currentFaceState.sideArcs;
  }, [currentFaceState, showFront]);
  
  // Get combined arc results
  const combinedArcResults = useMemo(() => {
    if (!currentFaceState) return new Map<CombinedArcId, CombinedArcResult>();
    return currentFaceState.combinedArcs;
  }, [currentFaceState]);
  
  // All arc display data for sidebar
  const allArcsDisplay = useMemo(() => getAllArcsForDisplay(), []);
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">Arc Testing Tool</h1>
          {faces.length > 0 && (
            <span className="text-sm text-gray-500">
              Face {currentFaceIndex + 1} of {faces.length}: {currentFace?.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {faces.length === 0 ? (
            <>
              <label className="cursor-pointer px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                <FileJson size={16} />
                Upload JSON
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleJsonUpload}
                />
              </label>
              <label className="cursor-pointer px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Upload size={16} />
                Upload Zip
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleZipUpload}
                />
              </label>
            </>
          ) : (
            <>
              <label className="cursor-pointer px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <FileJson size={14} />
                JSON
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleJsonUpload}
                />
              </label>
              <label className="cursor-pointer px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Upload size={14} />
                Zip
                <input
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={handleZipUpload}
                />
              </label>
              <button
                onClick={() => setShowTaggingModal(true)}
                className="px-3 py-1.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Tags size={14} />
                Bulk Tag
              </button>
              <button
                onClick={exportToJson}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Export All
              </button>
              <button
                onClick={clearSession}
                className="px-3 py-1.5 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                title="Clear saved session data"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </header>
      
      {/* Auto-save indicator */}
      {faces.length > 0 && lastSaved && (
        <div className="absolute top-16 right-4 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded z-10">
          ✓ Saved {lastSaved.toLocaleTimeString()}
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {!hasLoadedFromStorage ? (
          /* Loading state while restoring session */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading session...</p>
            </div>
          </div>
        ) : faces.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <FileJson size={32} className="text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Face Data</h2>
              <p className="text-gray-500 mb-6">
                Upload a JSON file with face data (approved-faces export format) or a zip file containing face images and landmarks.
              </p>
              
              {/* Upload buttons */}
              <div className="flex justify-center gap-3 mb-8">
                <label className="cursor-pointer px-5 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                  <FileJson size={18} />
                  Upload JSON
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleJsonUpload}
                  />
                </label>
                <label className="cursor-pointer px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                  <Upload size={18} />
                  Upload Zip
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleZipUpload}
                  />
                </label>
              </div>
              
              {/* Format info */}
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <FileJson size={14} />
                    JSON Format
                  </p>
                  <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap">
{`[{
  "id": "...",
  "frontPhotoUrl": "https://...",
  "sidePhotoUrl": "https://...",
  "frontLandmarks": {...},
  "sideLandmarks": {...},
  "harmonyScore": 6.5
}]`}
                  </pre>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Upload size={14} />
                    Zip Format
                  </p>
                  <pre className="text-[10px] text-gray-500 font-mono">
{`myfaces.zip/
  face1/
    front.jpg
    frontlandmarks.json
  face2/
    front.png
    landmarks.json`}
                  </pre>
                </div>
              </div>
              
              {/* Keyboard shortcuts hint */}
              <div className="mt-6 text-xs text-gray-400">
                Keyboard: ← → or A/D to navigate, F to toggle front/side
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Left sidebar - Faces list */}
            <FacesList
              faces={faces}
              currentFaceIndex={currentFaceIndex}
              onSelectFace={setCurrentFaceIndex}
              onDeleteFace={deleteFace}
              faceStates={faceStates}
            />
            
            {/* Center - Canvas with face and arcs */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Profile toggle and navigation */}
              <div className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
                {/* Navigation controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={goToPrevFace}
                      disabled={currentFaceIndex === 0}
                      className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                      title="Previous face (← or A)"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Prev</span>
                    </button>
                    <span className="text-sm font-medium text-gray-700 min-w-[80px] text-center">
                      {currentFaceIndex + 1} / {faces.length}
                    </span>
                    <button
                      onClick={goToNextFace}
                      disabled={currentFaceIndex === faces.length - 1}
                      className="px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                      title="Next face (→ or D)"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  {/* Harmony score badge */}
                  {currentFace?.harmonyScore && (
                    <div className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium">
                      Harmony: {currentFace.harmonyScore.toFixed(2)}
                    </div>
                  )}
                </div>
                
                {/* Profile toggle */}
                <div className="flex bg-gray-100 rounded-lg p-0.5" title="Toggle with F key">
                  <button
                    onClick={() => setShowFront(true)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      showFront ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setShowFront(false)}
                    disabled={!currentFace?.sideImageUrl}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                      !showFront ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Side
                  </button>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Landmark edit mode toggle */}
                  <button
                    onClick={() => setIsLandmarkEditMode(prev => !prev)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      isLandmarkEditMode 
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    title="Toggle landmark editing mode (L)"
                  >
                    <Crosshair size={14} />
                    {isLandmarkEditMode ? 'Editing Landmarks' : 'Edit Landmarks'}
                  </button>
                  
                  {selectedArcId && !isLandmarkEditMode && (
                    <button
                      onClick={() => resetArc(selectedArcId)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={14} />
                      Reset Arc
                    </button>
                  )}
                  
                  {/* Export current face button */}
                  <button
                    onClick={exportCurrentFace}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Export current face data (S)"
                  >
                    <Save size={14} />
                    Save Face
                  </button>
                  
                  {/* Delete face button */}
                  <button
                    onClick={deleteCurrentFace}
                    className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Remove this face from the dataset"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                  
                  {/* Keyboard hint */}
                  <span className="hidden lg:inline text-[10px] text-gray-400 ml-2">
                    ←→ A/D | F: toggle | L: landmarks | S: save
                  </span>
                </div>
              </div>
              
              {/* Canvas area */}
              <div className="flex-1 overflow-auto p-4">
                {currentFace && (
                  <ArcCanvas
                    imageUrl={showFront ? currentFace.frontImageUrl : currentFace.sideImageUrl!}
                    landmarks={showFront ? currentFace.frontLandmarks : currentFace.sideLandmarks!}
                    arcDefinitions={currentArcDefinitions}
                    arcStates={currentArcStates}
                    selectedArcId={selectedArcId}
                    onSelectArc={setSelectedArcId}
                    onUpdateHandle={updateArcHandle}
                    onUpdateIntermediate={updateArcIntermediate}
                    onAddIntermediate={addArcIntermediate}
                    onDeleteIntermediate={deleteArcIntermediate}
                    onLandmarkUpdate={updateLandmark}
                    isLandmarkEditMode={isLandmarkEditMode}
                    profileType={showFront ? 'front' : 'side'}
                  />
                )}
              </div>
            </div>
            
            {/* Right sidebar - Arcs list with stats */}
            <ArcsSidebar
              allArcs={allArcsDisplay}
              frontArcStates={currentFaceState?.frontArcs || {}}
              sideArcStates={currentFaceState?.sideArcs || {}}
              combinedArcResults={combinedArcResults}
              combinedArcTags={currentFaceState?.combinedArcTags || {} as Record<CombinedArcId, string>}
              selectedArcId={selectedArcId}
              onSelectArc={setSelectedArcId}
              onUpdateTag={updateArcTag}
              showFront={showFront}
            />
          </>
        )}
      </div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Loading faces...</p>
          </div>
        </div>
      )}
      
      {/* Tagging modal */}
      {showTaggingModal && currentFaceState && (
        <TaggingModal
          frontArcs={currentFaceState.frontArcs}
          sideArcs={currentFaceState.sideArcs}
          combinedArcs={currentFaceState.combinedArcs}
          combinedArcTags={currentFaceState.combinedArcTags}
          onUpdateTag={updateArcTag}
          onClose={() => setShowTaggingModal(false)}
        />
      )}
    </div>
  );
}

