# Genetic Optimization Service

## Overview

`GeneticOptimizationService` is a high-level facade wrapper around `EvolutionEngine` that provides a cleaner, more feature-rich API for genetic algorithm-based script optimization. It adds progress tracking, detailed metrics, batch operations, and convenience methods.

## Architecture

```
GeneticOptimizationService (Facade)
    ↓
EvolutionEngine (Core Logic)
    ↓
ScriptMutator + EngagementPredictor + AiService
```

## Features

### 1. Main Optimization Method
```typescript
const result = await geneticOptimizationService.optimizeScript(topic, {
  generations: 3,
  populationSize: 4,
  targetScore: 95,
  enableElitism: true,
  mutationRate: 0.6,
  logProgress: true,
});
```

### 2. Convenience Methods

#### Quick Optimize
Fast optimization with sensible defaults:
```typescript
const script = await geneticOptimizationService.quickOptimize("AI Future");
```

#### Deep Optimize
Maximum optimization for high-value content:
```typescript
const result = await geneticOptimizationService.deepOptimize("Viral Topic");
// Uses 5 generations, population size 8
```

#### Batch Optimize
Optimize multiple topics in parallel:
```typescript
const results = await geneticOptimizationService.batchOptimize(
  ["Topic 1", "Topic 2", "Topic 3"],
  { generations: 3, populationSize: 4 }
);
```

### 3. Evaluation & Comparison

#### Evaluate Script
Score an existing script without optimization:
```typescript
const score = await geneticOptimizationService.evaluateScript(script, topic);
// Returns: { totalScore, metrics, suggestions }
```

#### Select Best Script
Compare multiple scripts and get the best one:
```typescript
const best = await geneticOptimizationService.selectBestScript(
  [script1, script2, script3],
  topic
);
// Returns: { script, score }
```

### 4. Recommendations
Get optimization parameter recommendations:
```typescript
const recs = await geneticOptimizationService.getOptimizationRecommendations(topic);
// Returns: { recommendedGenerations, recommendedPopulationSize, estimatedDuration, estimatedCost }
```

## API Reference

### `optimizeScript(topic: string, options?: OptimizationOptions): Promise<OptimizationResult>`

Main optimization method.

**Parameters:**
- `topic`: The video topic/theme
- `options`: Configuration options (all optional)

**Options:**
```typescript
interface OptimizationOptions {
  generations?: number;        // Default: 3 (from config or 3)
  populationSize?: number;     // Default: 4 (from config or 4)
  targetScore?: number;        // Default: 95 (early termination)
  enableElitism?: boolean;     // Default: true
  mutationRate?: number;       // Default: 0.6
  logProgress?: boolean;       // Default: true
}
```

**Returns:**
```typescript
interface OptimizationResult {
  script: VideoScript;                    // Optimized script
  finalScore: number;                     // Viral score (0-100)
  generationsRun: number;                 // Actual generations executed
  totalEvaluations: number;               // Total fitness evaluations
  bestScoresPerGeneration: number[];      // Score progression (future enhancement)
  duration: number;                       // Optimization time in ms
}
```

### `quickOptimize(topic: string): Promise<VideoScript>`

Fast optimization with minimal configuration.

**Returns:** Optimized script (no detailed metrics)

### `deepOptimize(topic: string): Promise<OptimizationResult>`

Maximum optimization for high-value content.

**Uses:**
- 5 generations
- Population size 8
- Target score 95
- Progress logging enabled

### `batchOptimize(topics: string[], options?: OptimizationOptions): Promise<OptimizationResult[]>`

Optimize multiple topics in parallel.

**Returns:** Array of optimization results

### `evaluateScript(script: VideoScript, topic: string): Promise<ViralScore>`

Evaluate an existing script without optimization.

**Returns:** Viral score with metrics and suggestions

### `selectBestScript(scripts: VideoScript[], topic: string): Promise<{ script: VideoScript; score: number }>`

Compare scripts and return the best one.

**Returns:** Best script with its score

### `getOptimizationRecommendations(topic: string): Promise<Recommendations>`

Get parameter recommendations based on topic.

**Returns:**
```typescript
{
  recommendedGenerations: number;
  recommendedPopulationSize: number;
  estimatedDuration: number;  // milliseconds
  estimatedCost: number;       // API calls
}
```

## Configuration

### Environment Variables

```bash
# Default generations (default: 3)
GENETIC_GENERATIONS=3

# Default population size (default: 4)
GENETIC_POPULATION_SIZE=4

# Target score for early termination (default: 95)
GENETIC_TARGET_SCORE=95
```

## Usage Examples

### Example 1: Basic Optimization
```typescript
import { GeneticOptimizationService } from './ai/genetic/genetic-optimization.service';

// Inject service
constructor(private readonly geneticService: GeneticOptimizationService) {}

// Optimize
const result = await this.geneticService.optimizeScript("AI Revolution");
console.log(`Score: ${result.finalScore}/100`);
console.log(`Duration: ${result.duration}ms`);
```

### Example 2: Quick Optimization
```typescript
// Fast optimization for rapid iteration
const script = await this.geneticService.quickOptimize("Tech Tips");
```

### Example 3: Deep Optimization
```typescript
// Maximum optimization for important content
const result = await this.geneticService.deepOptimize("Viral Topic");
if (result.finalScore >= 90) {
  // Proceed with video generation
}
```

### Example 4: Batch Processing
```typescript
// Optimize multiple topics
const topics = ["Topic 1", "Topic 2", "Topic 3"];
const results = await this.geneticService.batchOptimize(topics);

// Find best result
const best = results.reduce((a, b) => 
  a.finalScore > b.finalScore ? a : b
);
```

### Example 5: Script Evaluation
```typescript
// Evaluate existing script
const score = await this.geneticService.evaluateScript(myScript, topic);
if (score.totalScore < 70) {
  // Script needs improvement
  console.log("Suggestions:", score.suggestions);
}
```

### Example 6: Script Comparison
```typescript
// Compare multiple scripts
const scripts = [script1, script2, script3];
const best = await this.geneticService.selectBestScript(scripts, topic);
console.log(`Best: ${best.script.title} (${best.score}/100)`);
```

## Integration

### Module Setup

The service is automatically available when `GeneticModule` is imported:

```typescript
import { GeneticModule } from './ai/genetic/genetic.module';

@Module({
  imports: [GeneticModule],
  // ...
})
export class MyModule {}
```

### Service Injection

```typescript
import { GeneticOptimizationService } from './ai/genetic/genetic-optimization.service';

@Injectable()
export class MyService {
  constructor(
    private readonly geneticService: GeneticOptimizationService
  ) {}
}
```

## Migration from EvolutionEngine

### Before (Direct EvolutionEngine)
```typescript
const script = await evolutionEngine.evolveScript(topic, 3, 4);
```

### After (GeneticOptimizationService)
```typescript
// Option 1: Simple (same behavior)
const result = await geneticService.optimizeScript(topic, {
  generations: 3,
  populationSize: 4,
});
const script = result.script;

// Option 2: Quick method
const script = await geneticService.quickOptimize(topic);

// Option 3: With metrics
const result = await geneticService.optimizeScript(topic);
console.log(`Score: ${result.finalScore}, Duration: ${result.duration}ms`);
```

## Benefits Over Direct EvolutionEngine

1. **Better API:** Cleaner, more intuitive methods
2. **Metrics:** Detailed optimization results
3. **Convenience:** Quick/deep/batch methods
4. **Evaluation:** Score scripts without optimization
5. **Comparison:** Compare multiple scripts
6. **Recommendations:** Get optimization suggestions
7. **Error Handling:** Enhanced error messages
8. **Logging:** Better progress tracking

## Performance Considerations

- **Quick Optimize:** ~30-60 seconds (2 generations, 4 population)
- **Standard Optimize:** ~60-120 seconds (3 generations, 4 population)
- **Deep Optimize:** ~150-300 seconds (5 generations, 8 population)
- **Batch Optimize:** Parallel execution (time = slowest topic)

## Best Practices

1. **Use Quick Optimize** for rapid iteration and testing
2. **Use Deep Optimize** for high-value, important content
3. **Use Batch Optimize** when processing multiple topics
4. **Check finalScore** before proceeding with video generation
5. **Use Recommendations** to estimate resource requirements
6. **Evaluate Scripts** before optimization to avoid unnecessary work

## Future Enhancements

- [ ] Score progression tracking per generation
- [ ] Adaptive mutation rates
- [ ] Multi-objective optimization
- [ ] Caching of similar optimizations
- [ ] A/B testing framework
- [ ] Dashboard visualization
