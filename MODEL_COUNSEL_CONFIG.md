# Model Counsel Configuration

## How to Change Models

The Model Counsel feature uses 3 models that can be easily swapped out. 

### 1. Update API Configuration

Edit `src/app/api/model-counsel/route.ts` - look for the `MODELS` constant:

```typescript
const MODELS = {
  opus: { 
    model: 'claude-opus-4-6-20251022',     // ← Change this model ID
    name: 'Claude Opus 4.6',               // ← Change this display name
    provider: 'anthropic'                  // ← anthropic or ollama
  },
  sonnet: { 
    model: 'claude-sonnet-4-20250514',     // ← Change this model ID
    name: 'Claude Sonnet 4',               // ← Change this display name  
    provider: 'anthropic'                  // ← anthropic or ollama
  },
  kimi: { 
    model: 'kimi-k2.5:cloud',              // ← Change this model ID
    name: 'Kimi K2.5',                     // ← Change this display name
    provider: 'ollama'                     // ← anthropic or ollama
  }
};
```

### 2. Update Frontend Display

Edit `src/components/ModelCounsel.tsx` - look for the `MODELS` array:

```typescript
const MODELS = [
  { id: 'opus', name: 'Claude Opus 4.6', color: '#ff6b6b' },     // ← Match the name from API
  { id: 'sonnet', name: 'Claude Sonnet 4', color: '#4ecdc4' },   // ← Match the name from API  
  { id: 'kimi', name: 'Kimi K2.5', color: '#45b7d1' }           // ← Match the name from API
];
```

### 3. Model IDs You Have Access To

Based on your OpenClaw setup:
- `claude-opus-4-6-20251022` (Anthropic)
- `claude-sonnet-4-20250514` (Anthropic) 
- `claude-sonnet-5-20260203` (Anthropic - if available)
- `kimi-k2.5:cloud` (Ollama)
- `claude-3-5-haiku-latest` (Anthropic)

### 4. Example: Switch to Sonnet 5

```typescript
// In API route.ts
sonnet: { 
  model: 'claude-sonnet-5-20260203',    // ← Updated to Sonnet 5
  name: 'Claude Sonnet 5',              // ← Updated name
  provider: 'anthropic'
},

// In component ModelCounsel.tsx  
{ id: 'sonnet', name: 'Claude Sonnet 5', color: '#4ecdc4' },
```

### 5. Deploy Changes

After making changes:
```bash
git add .
git commit -m "Update Model Counsel models"
git push origin main
```

The changes will auto-deploy to Vercel.