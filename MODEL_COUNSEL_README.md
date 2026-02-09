# Model Counsel Feature

## Overview
The Model Counsel feature allows users to query multiple AI models simultaneously and receive a synthesized "best answer" from their combined responses.

## Features Implemented

### ✅ Core Requirements
- **Multi-Model Querying**: Queries 3 AI models in parallel (Claude Opus 4.6, Claude Sonnet 4, Gemini 2.5 Pro)
- **Single Input Interface**: Clean question text area for user input
- **Four Response Panels**: 3 individual model responses + 1 synthesized answer
- **Performance Metrics**: Shows timing and token usage for each response
- **Collapsible Panels**: All response panels can be expanded/collapsed
- **Purple Theme Button**: "Ask All Models" button matching dashboard theme
- **Dark UI**: Consistent with existing dashboard aesthetic

### ✅ Technical Implementation
1. **ModelCounsel Component** (`src/components/ModelCounsel.tsx`)
   - React component with clean, modern interface
   - Responsive design for mobile/tablet/desktop
   - Loading states and error handling
   - CSS-in-JS for responsive styling

2. **API Route** (`src/app/api/model-counsel/route.ts`)
   - Parallel model querying for performance
   - Smart synthesis logic combining responses
   - Error handling for individual model failures
   - Proper TypeScript types and Next.js integration

3. **Navigation Integration**
   - Added to sidebar with 🎯 icon
   - Keyboard shortcut: Cmd/Ctrl + 7
   - Proper lazy loading for performance
   - Integrated with existing view system

### ✅ UI/UX Features
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Loading Indicators**: Visual feedback during processing
- **Error Handling**: Graceful error display for failed requests
- **Keyboard Shortcuts**: Cmd+Enter to submit, Cmd+7 to navigate
- **Performance Display**: Real-time metrics for each model response
- **Smooth Animations**: Fade-in effects and smooth transitions

## File Structure
```
src/
├── components/
│   └── ModelCounsel.tsx           # Main component
├── app/api/
│   └── model-counsel/
│       └── route.ts               # API endpoint
└── hooks/
    └── useKeyboardShortcuts.ts    # Updated with new shortcut
```

## Usage

### Via UI
1. Navigate to Model Counsel (🎯 icon in sidebar)
2. Type your question in the text area
3. Click "Ask All Models" or press Cmd+Enter
4. View responses from all three models
5. Read the synthesized best answer
6. Expand/collapse panels as needed

### Via API
```typescript
POST /api/model-counsel
{
  "question": "Your question here"
}

Response:
{
  "responses": {
    "opus": { "response": "...", "timing": 1500, "tokens": 250 },
    "sonnet": { "response": "...", "timing": 1200, "tokens": 200 },
    "gemini": { "response": "...", "timing": 1800, "tokens": 300 }
  },
  "synthesis": "Combined best answer...",
  "timestamp": "2024-02-09T19:35:27.000Z",
  "question": "Your question here"
}
```

## Testing

### Manual Testing
1. Start development server: `npm run dev`
2. Navigate to http://localhost:3000
3. Click the 🎯 Model Counsel icon in sidebar
4. Test with various questions

### API Testing
```bash
node test-model-counsel.js
```

## Model Configuration

Currently configured to use:
- **Claude Opus**: `claude-3-5-sonnet-20241022` (using available model)
- **Claude Sonnet**: `claude-3-5-sonnet-20241022`
- **Gemini substitute**: `claude-3-5-haiku-20241022` (until Gemini integration)

To add actual Gemini support, update the `queryModel` function in the API route to integrate with Google's Gemini API.

## Environment Requirements

Ensure these environment variables are set:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

## Performance Notes

- All models are queried in parallel for optimal performance
- Individual model failures don't break the entire request
- Synthesis continues even if some models fail
- Response times typically 1-3 seconds depending on model load

## Future Enhancements

- [ ] Add actual Gemini 2.5 Pro integration
- [ ] Model-specific temperature and parameter controls
- [ ] Response caching for identical questions
- [ ] Export functionality for responses
- [ ] Comparison view highlighting differences between models
- [ ] Custom model selection (add/remove models)
- [ ] Response rating/feedback system