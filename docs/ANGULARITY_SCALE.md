# Angularity Scoring Scale

## The 0-10 Scale

Each angularity feature is scored on a 0-10 scale:

| Score | Label | Frame | Description |
|-------|-------|-------|-------------|
| 0 | Very Low | 0 | Minimal definition, soft/rounded |
| 1-2 | Low | 4-8 | Below average definition |
| 3-4 | Average | 12-16 | Typical range for population |
| 5-6 | Above Average | 20-24 | Noticeable definition |
| 7-8 | High | 28-32 | Strong definition |
| 9-10 | Very High | 35-39 | Maximum definition, sharp/angular |

## Frame to Score Mapping

40 morph frames (0-39) map to the 0-10 score range:

```
score = (frame / 39) × 10
frame = (score / 10) × 39
```

## Features

### Jaw Definition
- **Low**: Soft, undefined jawline blending into neck
- **High**: Sharp, clearly defined jaw edge

### Cheek Leanness  
- **Low**: Full, round cheeks
- **High**: Hollow, lean cheeks with visible ogee curve

### Cheekbone Prominence
- **Low**: Flat, minimally visible cheekbones
- **High**: Prominent, high-set cheekbones

### Chin Definition
- **Low**: Rounded, soft chin
- **High**: Defined, structured chin

### Submental Definition
- **Low**: Soft neck-chin transition, possible fat
- **High**: Sharp cervicomental angle, defined

## Training Data Structure

For ML training, the morphs provide labeled examples:

```
{
  "feature": "jaw_definition",
  "gender": "male",
  "frame": 28,
  "score": 7.2,
  "label": "High"
}
```

Each frame is a ground truth example of what that score level looks like.

## Notes for ML Training

1. **Inter-rater reliability**: Morphs were created by averaging multiple expert ratings
2. **Gender differences**: Male/female have separate morph sequences
3. **Non-linear perception**: The visual difference between 4-5 may not equal 7-8
4. **Feature interactions**: High jaw definition often correlates with low cheek fullness
