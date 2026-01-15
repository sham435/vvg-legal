# Pre-Generation Scoring Integration

## Overview

Pre-generation scoring allows the system to evaluate video prompts for viral potential **before** committing resources to video generation. This optimization saves compute resources by filtering out low-potential content early in the pipeline.

## Implementation

### Location
- **Service:** `VideoService.generateVideo()`
- **Predictor:** `EngagementPredictor.predictViralScore()`

### How It Works

1. **Before Generation:** When `generateVideo()` is called, the system optionally evaluates the prompt using `EngagementPredictor`
2. **Scoring:** The predictor analyzes:
   - Hook Strength (weight: 3.0)
   - Pacing Score (weight: 2.5)
   - Emotional Impact (weight: 2.5)
   - Trend Alignment (weight: 2.0)
3. **Decision:** If score < threshold, generation is skipped with an error
4. **Logging:** Score details and suggestions are logged for transparency

## Configuration

### Environment Variables

```bash
# Enable/disable pre-generation scoring (default: true)
ENABLE_PRE_GENERATION_SCORING=true

# Minimum score threshold (0-100, default: 60)
PRE_GENERATION_SCORING_THRESHOLD=60

# Abort on scoring failure (default: false)
# If false, continues generation even if scoring fails
ABORT_ON_SCORING_FAILURE=false
```

### API Usage

#### Basic Request (with scoring)
```json
POST /api/video/generate
{
  "prompt": "A cyberpunk city at night with neon rain",
  "duration": 5
}
```

#### With Topic (improves scoring accuracy)
```json
POST /api/video/generate
{
  "prompt": "A cyberpunk city at night with neon rain",
  "duration": 5,
  "topic": "Cyberpunk Aesthetics"
}
```

#### Skip Scoring (for already-evolved scripts)
```json
POST /api/video/generate
{
  "prompt": "A cyberpunk city at night with neon rain",
  "duration": 5,
  "skipScoring": true
}
```

## Integration Points

### Automatic Skipping

Pre-generation scoring is **automatically skipped** in these scenarios:

1. **PipelineCoordinator:** Scripts from `EvolutionEngine` are already scored
2. **generateFromScript:** Multi-scene scripts are already evolved
3. **Manual skip:** When `skipScoring: true` is passed

### Manual Control

You can control scoring behavior per request:

```typescript
// Skip scoring
await videoService.generateVideo(prompt, duration, topic, true);

// Enable scoring with topic
await videoService.generateVideo(prompt, duration, topic, false);
```

## Scoring Details

### Score Calculation

```
Total Score = (Hook × 3.0) + (Pacing × 2.5) + (Emotion × 2.5) + (Trend × 2.0)
Max Possible: ~100 points
```

### Score Interpretation

- **90-100:** Exceptional viral potential
- **80-89:** High viral potential
- **70-79:** Good viral potential
- **60-69:** Moderate viral potential (threshold)
- **<60:** Low viral potential (rejected)

### Suggestions

When scoring fails or score is low, the predictor provides actionable suggestions:

```json
{
  "totalScore": 55,
  "metrics": {
    "hookStrength": 6,
    "pacingScore": 7,
    "emotionalImpact": 5,
    "trendAlignment": 4
  },
  "suggestions": [
    "Make the hook more shocking",
    "Cut the middle section",
    "Add emotional appeal"
  ]
}
```

## Logging

### Success Log
```
🔍 Pre-generation scoring enabled. Evaluating prompt potential...
📊 Viral Score: 85/100 (Hook: 9, Pacing: 8, Emotion: 8, Trend: 7)
✅ Pre-generation scoring passed (85 >= 60). Proceeding with generation.
```

### Failure Log
```
🔍 Pre-generation scoring enabled. Evaluating prompt potential...
📊 Viral Score: 45/100 (Hook: 5, Pacing: 4, Emotion: 5, Trend: 3)
⛔ Pre-generation scoring failed: Score 45 below threshold 60. Suggestions: Make the hook more shocking, Add emotional appeal
```

## Performance Impact

### Benefits
- **Resource Savings:** Skip low-potential videos before expensive generation
- **Quality Filter:** Only generate high-potential content
- **Cost Optimization:** Reduce wasted API calls and compute

### Overhead
- **Latency:** Adds ~1-5 seconds per request (depends on model)
- **API Calls:** Uses free-tier models via OpenRouter (no cost)
- **Optional:** Can be disabled entirely

## Best Practices

1. **Use Topics:** Provide `topic` parameter for better scoring accuracy
2. **Adjust Threshold:** Lower threshold (50-60) for more permissive filtering
3. **Skip for Evolved Scripts:** Always skip scoring for scripts from `EvolutionEngine`
4. **Monitor Logs:** Review scores to understand what works
5. **Iterate:** Use suggestions to improve prompts

## Error Handling

### Scoring Failure Behavior

- **ABORT_ON_SCORING_FAILURE=false (default):**
  - Scoring errors are logged as warnings
  - Generation continues normally
  - Ensures system resilience

- **ABORT_ON_SCORING_FAILURE=true:**
  - Scoring errors abort generation
  - Use when scoring is critical
  - Requires reliable API access

### Common Scenarios

1. **API Key Missing:**
   - Returns mock score (75)
   - Continues generation
   - Logs warning

2. **API Timeout:**
   - Falls back to mock score
   - Continues generation
   - Logs error

3. **Score Below Threshold:**
   - Throws error with suggestions
   - Skips generation
   - Returns detailed feedback

## Examples

### Example 1: High Score (Passes)
```typescript
const result = await videoService.generateVideo(
  "Hidden iPhone features that will blow your mind! This secret trick...",
  5,
  "Tech Tips"
);
// Score: 88/100 → Generation proceeds
```

### Example 2: Low Score (Rejected)
```typescript
try {
  const result = await videoService.generateVideo(
    "A video about something",
    5
  );
} catch (error) {
  // Error: "Pre-generation scoring failed: Score 42 below threshold 60"
  // Suggestions: ["Make the hook more shocking", "Add emotional appeal"]
}
```

### Example 3: Skip Scoring
```typescript
// For already-evolved scripts
const result = await videoService.generateVideo(
  evolvedScript.hook,
  5,
  evolvedScript.title,
  true // Skip scoring
);
```

## Future Enhancements

- [ ] Cache scores for similar prompts
- [ ] A/B testing with/without scoring
- [ ] Dynamic threshold adjustment based on queue size
- [ ] Score history tracking
- [ ] Dashboard visualization of scores
