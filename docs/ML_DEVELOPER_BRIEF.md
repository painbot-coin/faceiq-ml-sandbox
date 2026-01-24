# FaceIQ ML Developer Brief

## Application Overview

FaceIQ analyzes facial aesthetics using **4 pillars**:

| Pillar | What it measures |
|--------|-----------------|
| **Harmony** | Facial proportions/ratios (eye separation, thirds, FWHR, etc.) |
| **Angularity** | Bone structure definition (jaw, chin, cheekbones, submental area) |
| **Dimorphism** | Gender-typical features (brow ridge, chin shape, neck width) |
| **Features** | Soft tissue quality (skin, symmetry, coloring) |

Currently: All assessments use geometric landmarks + rule-based scoring with hand-tuned thresholds.

---

## ML Training Task

### Goal
Train models to detect/classify **pillar assessments** that are difficult to quantify geometrically.

### Target Features (Priority)

**Angularity** (hardest to quantify):
- Cheek leanness / ogee curve presence
- Jaw definition (sharp vs soft)
- Chin definition
- Cheekbone prominence (high-set vs flat)
- Submental definition (fat/tissue vs defined)

**Dimorphism**:
- Brow ridge prominence
- Eye masculinity/femininity
- Face shape masculinity/femininity
- Overall gender-typicality score

---

## ML Approach Recommendations

### Your Task
1. **Determine optimal approach** for each feature:

| Approach | Best For | Example Use Case |
|----------|----------|------------------|
| **Supervised (CNN/Vision Transformer)** | Clear categorical labels | "Sharp jaw" vs "Soft jaw" classification |
| **Supervised Regression** | Continuous scores | Angularity score 0-100 |
| **Hierarchical Clustering** | Discovery/grouping when labels unclear | Finding natural clusters of face shapes |
| **Naive Bayes** | Fast baseline, limited features | Quick binary classifiers |
| **Self-supervised (Contrastive)** | Limited labeled data | Pre-train on unlabeled faces, fine-tune |
| **Any other algos or approaches** |

### Likely Best Fits

- **Angularity features**: Supervised CNN with ordinal regression (Very Angular → Very Rounded is ordinal, not categorical)
- **Dimorphism**: Binary/multi-class classification per feature, or regression to a masculinity-femininity spectrum
- **Clustering**: Useful for **discovering** if our manual categories match natural face groupings

### Data Requirements
- ~500-2000 labeled samples per class for supervised
- Clear labeling protocol (you'll help define this)
- Potential: use existing user analyses as weak labels

---

## Current Arc System (newRatios2 branch)

### What It Does
Measures **shape curvature** of facial contours using Bezier curves.

### Math Summary

```
Curvature Index (CI) = mean signed curvature × 10

Where curvature κ = (x'y'' - y'x'') / (x'² + y'²)^(3/2)
```

Also tracks **jerk** (f‴) = rate of curvature change, detecting spikes/irregularities.

### Arc-Specific Thresholds (Already Calibrated)

Each arc has **6 thresholds defining 7 labels** (Very Angular → Very Rounded). Thresholds vary by feature because baselines differ:

| Arc | Type | Thresholds [t1...t6] | Interpretation |
|-----|------|---------------------|----------------|
| **Chin** | Rounded baseline | [40, 50, 60, 70, 77, 85] | CI ~72 typical; lower = more angular |
| **Cheek (L/R)** | Straight baseline | [-5, 0, 5, 10, 15, 20] | CI 0-3 = straight (angular); negative = hollow |
| **Mandible (L/R)** | Straight baseline | [-4, 1, 6, 13, 22, 38] | CI 0-5 = straight (angular jaw) |
| **Gonion (L/R)** | Rounded baseline | [0, 8, 15, 22, 32, 42] | Hidden; only used in combined arcs |
| **Nasal Bridge** | Straight baseline | [-25, -15, -8, 0, 8, 18] | Negative = ski-slope; positive = hump |

### Current Arcs (14 baseline + 9 combined)
- **Front**: Chin, mandible, gonion, cheek contours, hairline
- **Side**: Forehead, submental, nasal bridge, nose tip, lips

### Question for You (Math PhD)
1. Is Bezier-based curvature the right approach for measuring "angularity" of facial contours?
2. What are limitations? (e.g., sensitive to landmark placement, doesn't capture texture/shadow)
3. **Threshold validation**: Our thresholds are hand-tuned from observed CI ranges. Should we:
   - Validate via user study that labels match perceived angularity?
   - Learn thresholds from labeled data instead?
   - Use a different statistical approach for boundary detection (edge detection/sobel to auto-place arcs)?

### Next Steps Needed
- [ ] Validate CI correlates with perceived angularity (user study?)
- [ ] Determine if thresholds should be learned from data vs hand-tuned
- [ ] Decide if arc-based CI should feed into ML model as a feature, or if ML should replace it entirely

---

## Deliverables

1. **Approach recommendation** per feature (algorithm + rationale)
2. **Data collection/labeling protocol**
3. **Proof-of-concept** for 1-2 priority features
4. **Math review** of arc curvature approach

---
Or if you propose an entirely different approach (e.g., VLMs) instead of training our own model, let me know. 

---

## ChadGPT - AI Chatbot System

### Architecture Overview

ChadGPT is a RAG-powered chatbot that wraps LLMs (currently Grok/GPT-4) with domain-specific context.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Question  │────▶│  Context Builder │────▶│   LLM (Grok)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │                         │
                    ┌─────────▼─────────┐              │
                    │ 1. User Analysis  │              │
                    │    (ratios, flaws,│              │
                    │     strengths)    │              │
                    ├───────────────────┤              │
                    │ 2. RAG Knowledge  │◀─────────────┘
                    │    (pgvector)     │
                    └───────────────────┘
```

### Components

| Component | Tech | Purpose |
|-----------|------|---------|
| **Vector Store** | pgvector (Postgres) | Stores embedded knowledge chunks |
| **Embeddings** | `text-embedding-3-small` | Converts text → 1536-dim vectors |
| **Knowledge Base** | TypeScript content files | Rating philosophy, pillar interactions, treatment info |
| **Context Builder** | Custom | Injects user's analysis data (ratios, scores, flaws, strengths) |
| **Response Sanitizer** | Regex + streaming | Strips model identity leaks, replaces "Grok" → "ChadGPT" |

### How Context Injection Works

1. User asks question about their face
2. System loads their analysis: ratios, pillar scores, detected flaws/strengths
3. RAG retrieves relevant knowledge chunks (e.g., "pillar interactions", "harmony philosophy")
4. Combined context + question sent to LLM
5. Response sanitized and streamed back

### Current Knowledge Categories
- Rating philosophy (why harmony > symmetry, koinophilia theory)
- Pillar interactions (how angularity affects dimorphism perception)
- Treatment recommendations
- Surgeon search integration

### Potential ML Developer Help

1. **Improve RAG retrieval** - Current cosine similarity may miss nuanced queries
2. **Fine-tune embedding model** on facial aesthetics domain vocabulary
3. **Evaluate if fine-tuning the LLM** would improve response quality vs. pure RAG
4. **Add multimodal** - Let user upload images and ask questions about specific features
5. **Knowledge graph** - Replace flat vector store with structured relationships between concepts

### Open Linear Tasks (ChadGPT Project)

| Task | Status | Description |
|------|--------|-------------|
| **FAC-332** | Backlog | Add arc knowledge to RAG knowledge base |
| **FAC-258** | Todo | Integration smoke tests (navigation commands, embeds) |
| **FAC-256** | Todo | Session lifecycle testing (token expiry, auth state) |
| **FAC-253** | Todo | Network resilience testing (slow 3G, connection drops) |
| **FAC-252** | Todo | Long conversation sessions testing (50+ messages) |

### Completed Features (for context)
- Surgeon search integration (Google Places API)
- Response sanitizer (strips model identity leaks)
- Syntax highlighting for code blocks
- Concurrent session handling
- Rate limiting + token tracking

---

## Access & Onboarding Notes

### What You Need Access To

| Task Area | Code Access? | What You Get Instead |
|-----------|--------------|---------------------|
| **Arc System Review (Math PhD)** | ❌ No | This doc + demo + screenshare walkthrough |
| **ChadGPT Improvements** | ❌ No (initially) | Architecture explanation + API spec + sample responses |
| **ML Model Training (Angularity)** | ⚠️ Limited | Sandbox branch with isolated module + labeled data |

### Arc System & ChadGPT
No code access needed. You just need to understand them at a meta level:
- **Arcs**: We'll do a demo showing how CI values change as you adjust curves
- **ChadGPT**: We'll show sample prompts/responses and explain the RAG flow

Your job is to advise on approach, not implement initially.

### ML Model Training (Angularity)
For this, we'll create a **sandbox branch** with:
- Cropped facial region images (anonymized)
- Labels CSV (e.g., `cheek_leanness: 1-5`)
- Basic type definitions (Point2D, landmark schema)
- Sample output format spec

**Not included**: scoring thresholds, ratio calculations, API routes, auth, database schema.

This gives you everything needed to train/evaluate a model without exposing core IP.

---

## Facial Landmark Detection Pipeline

The sandbox now includes the complete landmark detection system. This is how FaceIQ detects and places facial landmarks on both front and side profile images.

### Overview

| Profile | Detection Method | Landmark Count | Notes |
|---------|-----------------|----------------|-------|
| **Front** | MediaPipe (client-side) | 468 raw → ~50 semantic | Google's ML model |
| **Side** | AWS Lambda (server-side) | 106 raw → ~30 semantic | Custom "oasis-model" |

### Front Profile Detection (MediaPipe)

Uses Google's MediaPipe Face Landmarker to detect 468 facial landmarks from frontal images.

```typescript
import { detectFrontLandmarks, preloadMediaPipe } from '@/lib/landmarks';

// Preload model (call early to avoid delay)
await preloadMediaPipe();

// Detect landmarks - returns pixel coordinates
const landmarks = await detectFrontLandmarks(imageElement, canvasWidth, canvasHeight);
// landmarks = { hairline: {x, y}, leftEyePupil: {x, y}, ... }
```

**Key files:**
- `src/lib/landmarks/mediapipe.ts` - Detection and standardization
- `src/lib/landmarks/definitions.ts` - Landmark metadata

**MediaPipe Index Mapping:**
```typescript
const MEDIAPIPE_LANDMARK_MAP = {
  'hairline': 10,
  'leftEyePupil': 468,
  'rightEyePupil': 473,
  'chinBottom': 152,
  // ... ~50 mappings total
};
```

### Side Profile Detection (AWS Lambda)

Uses our custom Lambda function "oasis-model" for side profile detection.

```typescript
import { detectSideLandmarks, computeStandardizationParams } from '@/lib/landmarks';

// Server-side only (requires AWS credentials)
const result = await detectSideLandmarks(base64Image, { width, height });
// result = { bbox, landmarks: [{x,y}, ...], dimensions }

const params = computeStandardizationParams(result);
// params = { rotationAngle, direction, center, crop, landmarks, bbox }
```

### Side Landmark Auto-Placement

The Lambda returns raw 106-point coordinates. Auto-placement maps these to semantic names.

```typescript
import { applyAutoPlacement, mirrorLandmarksHorizontally } from '@/lib/landmarks';

const semanticLandmarks = applyAutoPlacement(lambdaData, width, height);
// semanticLandmarks = { pronasale: {x, y}, nasion: {x, y}, pogonion: {x, y}, ... }

// Mirror for right-facing profiles (analysis assumes left-facing)
const mirrored = mirrorLandmarksHorizontally(semanticLandmarks);
```

**Mapping types:**
1. **Direct mapping**: `pronasale: 83` → Lambda point 83
2. **Computed**: `forehead: midpoint(trichion, glabella)` → derived geometrically
3. **Dependencies**: Some landmarks depend on others being computed first

### Landmark Schema

**Front Profile Landmarks (~50):**
- Eyes: pupil, medial/lateral canthus, upper/lower eyelid, crease, hood end
- Brows: head, inner corner, arch, peak, tail
- Nose: bridge, bottom, left/right sides
- Mouth: corners, cupid's bow, middle, lower lip
- Jaw: top/bottom gonion (both sides), chin points
- Face: temples, cheeks, outer ears, neck points

**Side Profile Landmarks (~30):**
- Cranium: vertex, occiput, trichion
- Forehead: forehead, glabella
- Eyes: orbitale, cornealApex, eyelidEnd, lowerEyelid
- Nose: nasion, rhinion, supratip, pronasale, infratip, columella, subnasale, subalare
- Mouth: labraleSuperius, cheilion, labraleInferius, sublabiale
- Chin/Jaw: pogonion, menton, gonionTop, gonionBottom
- Ear: porion, tragus, intertragicNotch
- Neck: cervicalPoint, neckPoint, cheekbone

### Coordinate Systems

All landmarks use **normalized coordinates (0-1)**:
- `x: 0` = left edge, `x: 1` = right edge
- `y: 0` = top edge, `y: 1` = bottom edge

To convert to pixels: `pixelX = normalized.x * imageWidth`

### Experimentation Ideas

With landmark detection available, you could:

1. **Extract facial regions** - Use landmarks to crop specific areas (eyes, nose, jaw)
2. **Compute geometric features** - Distances, angles, ratios between landmarks
3. **Train region-specific models** - CNN on cropped cheekbone regions for angularity
4. **Landmark-guided attention** - Use landmarks to focus model attention
5. **Augmentation** - Generate training variations by slight landmark perturbation
