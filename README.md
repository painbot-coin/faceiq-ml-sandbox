# FaceIQ ML Sandbox

Isolated environment for ML model training and arc curvature experimentation.

## What's Included

### 1. Arc Testing Tool
Interactive tool to understand how Curvature Index (CI) values change as you adjust Bezier curves on facial contours.

- **14 baseline arcs**: chin, mandible, gonion, cheek, hairline, forehead, submental, nasal bridge, nose tip, lips
- **9 combined arcs**: composite curves from multiple baseline arcs
- **Real-time CI calculation**: See curvature values update as you drag handles

### 2. Angularity Morphs
40-frame morph sequences showing the 0-10 angularity spectrum for each feature:

| Feature | What it shows |
|---------|---------------|
| Jaw Definition | Sharp → Soft jawline |
| Cheek Leanness | Hollow → Full cheeks |
| Cheek Prominence | Flat → Prominent cheekbones |
| Chin Definition | Rounded → Defined chin |
| Submental Definition | Soft → Defined neck-chin angle |

### 3. Slider UI
Assessment slider component with stamps showing score labels (Very Low → Very High).

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Directory Structure

```
src/
├── lib/arcs/           # Curvature math (CI, jerk, Bezier utils)
├── components/
│   ├── arctesting/     # Arc canvas, sidebar, tagging UI
│   └── angularity/     # Morph slider, frame loading
├── types/              # TypeScript interfaces
└── app/                # Next.js pages

public/
└── morphs/             # Morph video frames (copy from main repo)

data/
└── sample-faces.json   # Sample face data for testing
```

## Key Concepts

### Curvature Index (CI)
```
CI = mean signed curvature × 10

Where: κ = (x'y'' - y'x'') / (x'² + y'²)^(3/2)
```

- **Negative CI**: Angular/concave
- **Zero CI**: Straight
- **Positive CI**: Rounded/convex

### Jerk (f‴)
Rate of curvature change - detects spikes/irregularities in the curve.

## Notes

- Thresholds in this sandbox are **generic placeholders** (not calibrated)
- Production thresholds are arc-specific and confidential
- Morph frames must be copied manually from the main repo

## Task

Your goal is to train a model that can predict angularity scores (0-10) from facial images.

1. Use the morph frames as labeled training data
2. Use the arc testing tool to understand the curvature math
3. Propose improvements to the approach

See `docs/` for additional documentation.
