# Arc Curvature Mathematics

## Overview

The arc system measures facial contour shape using Bezier curves and curvature analysis.

## Curvature Index (CI)

The primary metric for arc shape.

### Formula

```
CI = mean(κ) × 10
```

Where κ (kappa) is the signed curvature at each point:

```
κ = (x'y'' - y'x'') / (x'² + y'²)^(3/2)
```

### Interpretation

| CI Value | Meaning |
|----------|---------|
| CI < 0 | Angular (concave) |
| CI ≈ 0 | Straight |
| CI > 0 | Rounded (convex) |

### Important Notes

1. **Sign depends on traversal direction** - We normalize by inverting the sign for right-side bilateral arcs
2. **Scale factor of 10** - Makes values more readable (typically -10 to +10 range)
3. **Arc-specific baselines** - Some arcs are naturally rounded (chin), others straight (cheek)

## Jerk (f‴)

The third derivative - rate of curvature change.

### Formula

```
jerk = dκ/dt ≈ (κ(t+Δt) - κ(t-Δt)) / 2Δt
```

### Purpose

Detects sudden transitions in the curve:
- **Low jerk**: Smooth, gradual curves
- **High jerk**: Sharp corners, spikes, irregularities

### Metrics

- **Mean jerk**: Average smoothness
- **Spike count**: Number of harsh transitions
- **Spike locations**: Where along the curve (t value 0-1)

## Arc Types

### Rounded Baseline (naturally positive CI)
- Chin arc
- Gonion arcs
- Hairline arc

### Straight Baseline (CI near 0)
- Cheek contour
- Mandible
- Nasal bridge

## Combined Arcs

Multiple baseline arcs stitched together:

```
Full Jaw Contour = Cheek L + Gonion L + Mandible L + Chin + Mandible R + Gonion R + Cheek R
```

Combined CI is calculated on the full stitched curve, not averaged from components.

## Bezier Curve Basics

Each arc segment is a cubic Bezier curve:

```
B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
```

Where:
- P₀, P₃ = endpoints (landmarks)
- P₁, P₂ = control handles (adjustable)
- t = parameter 0 to 1

The control handles determine curve shape without changing the endpoints.
