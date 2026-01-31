# Voice Code Review - Opie2ndbrain

**Date:** 2025-01-31  
**Codebase:** `/home/node/clawd/Opie2ndbrain/`

---

## 📦 Inventory of All Voice Code

### 1. TTS API Endpoint
**File:** `src/app/api/tts/route.ts` (53 lines)

| Aspect | Details |
|--------|---------|
| **Tech** | ElevenLabs API |
| **Voice ID** | `MClEFoImJXBTgLwdLI5n` (hardcoded) |
| **Model** | `eleven_monolingual_v1` |
| **Settings** | stability: 0.5, similarity_boost: 0.5 |
| **Output** | `audio/mpeg` stream |

### 2. Chat API with Voice Mode
**File:** `src/app/api/chat/route.ts` (89 lines)

| Aspect | Details |
|--------|---------|
| **Feature** | Voice-specific prompt injection |
| **Instructions** | Concise 2-3 sentences, no formatting |
| **Detection** | `isVoice` boolean param |

### 3. Speech Recognition (STT)
**File:** `src/components/OpieKanban.tsx` (lines 377-460)

| Aspect | Details |
|--------|---------|
| **Tech** | Web Speech API (`webkitSpeechRecognition`) |
| **Mode** | Continuous, interim results enabled |
| **Silence Detection** | 3.5 second timeout |
| **Features** | Barge-in (interrupt AI), auto-restart |

### 4. Voice UI Components

| Component | File | Voice Features |
|-----------|------|----------------|
| **FloatingChat** | `src/components/FloatingChat.tsx` | Voice state display, mic toggle, live transcript |
| **MobileChat** | `src/components/MobileChat.tsx` | Full-screen voice mode, listening animations |
| **OpieKanban** | `src/components/OpieKanban.tsx` | Main voice orchestration, TTS playback |

### 5. Sound Effects Hook
**File:** `src/hooks/useSounds.ts` (148 lines)

| Sound | Use Case |
|-------|----------|
| `playNotification` | Two-tone chime (A5→C#6) |
| `playSuccess` | Ascending arpeggio (C5→E5→G5→C6) |
| `playError` | Descending low tone (A3→lower) |

### 6. Status Indicators
**Files:** `SidebarWidgets.tsx`, `StatusIndicators.tsx`, `SmartDashboardHome.tsx`

- Voice availability status display
- Real-time voice state indicators

---

## ✅ Working Features

### Speech-to-Text (STT) ✅ WORKING
- **Chrome-only** (webkitSpeechRecognition)
- Continuous listening mode
- Interim transcripts displayed in real-time
- Silence detection auto-sends after 3.5s pause
- **Barge-in capability** - user can interrupt AI mid-speech

### Text-to-Speech (TTS) ✅ WORKING
- ElevenLabs integration
- High-quality voice output
- Proper error handling with fallback
- Audio validation (size > 1KB check)

### Voice UI States ✅ WORKING
- Idle / Listening / Processing / Speaking states
- Visual indicators (color-coded, pulsing animations)
- Live transcript display

### Mobile Voice Mode ✅ WORKING
- Full-screen listening UI
- Animated avatar with pulse rings
- Touch-optimized controls
- Haptic feedback

---

## ⚠️ Issues & Gaps

### 1. Browser Compatibility 🔴 CRITICAL
```typescript
if (!('webkitSpeechRecognition' in window)) return;
```
- **Only works in Chrome/Edge** (webkit prefix)
- Firefox, Safari: Complete feature loss
- No fallback or error message shown to user

### 2. Hardcoded Voice 🟡 MEDIUM
```typescript
fetch('https://api.elevenlabs.io/v1/text-to-speech/MClEFoImJXBTgLwdLI5n', {
```
- Single hardcoded voice ID
- No voice selection UI
- No way to change voice without code change

### 3. Missing Voice Settings 🟡 MEDIUM
- No voice speed control
- No volume control
- Fixed stability/similarity settings
- No pitch adjustment

### 4. No Offline Fallback 🟡 MEDIUM
- ElevenLabs requires network
- No Web Speech Synthesis API fallback
- App is silent if API key missing/fails

### 5. Audio Management 🟢 MINOR
- No "stop speaking" button visible (barge-in works, but not obvious)
- No audio queue for multiple TTS requests
- Audio may overlap if triggered rapidly

### 6. Recognition Errors 🟢 MINOR
```typescript
recognition.onerror = (e: any) => {
  console.log('Speech recognition error:', e.error);
```
- Errors logged to console only
- User sees no indication of recognition failure
- No retry mechanism UI

---

## 🚀 Recommendations (Prioritized)

### Priority 1: Critical Fixes

#### 1.1 Add Browser Compatibility Detection
```typescript
const getSpeechRecognition = () => {
  return window.SpeechRecognition || 
         (window as any).webkitSpeechRecognition || 
         null;
};

// Show fallback UI if unavailable
if (!getSpeechRecognition()) {
  return <div>Voice not supported. Try Chrome or Edge.</div>;
}
```

#### 1.2 Add TTS Fallback
```typescript
// Fallback to browser TTS if ElevenLabs fails
const fallbackSpeak = (text: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
};
```

### Priority 2: UX Improvements

#### 2.1 Voice Selection UI
- Let users choose from available ElevenLabs voices
- Store preference in localStorage
- API endpoint: `GET https://api.elevenlabs.io/v1/voices`

#### 2.2 Voice Settings Panel
```typescript
interface VoiceSettings {
  voiceId: string;
  stability: number;      // 0-1
  similarityBoost: number; // 0-1
  speed: number;          // 0.5-2.0
  autoPlay: boolean;      // Auto-play responses
}
```

#### 2.3 Stop Speaking Button
- Visible button to stop TTS playback
- Currently hidden behind barge-in mechanism

### Priority 3: New Features

#### 3.1 Voice Commands / Shortcuts
```typescript
const VOICE_COMMANDS = {
  "stop": () => stopSpeaking(),
  "cancel": () => cancelRequest(),
  "repeat": () => speakLastResponse(),
  "louder": () => increaseVolume(),
  "quieter": () => decreaseVolume(),
};
```

#### 3.2 Conversation Mode Toggle
- **Push-to-talk** vs **Always listening**
- Configurable silence timeout
- Wake word detection (future)

#### 3.3 Audio Feedback Sounds
- Play `useSounds.playSuccess()` when response arrives
- Play tone when listening starts
- Error sound on failures

---

## 🎯 Quick Wins (Low Effort, High Impact)

### 1. Add Missing Environment Variable Check
**File:** `.env.example`
```env
ELEVENLABS_API_KEY=your_api_key_here
```
Currently no documentation that this is required.

### 2. Show Voice Unavailable State
Add to FloatingChat when STT not supported:
```typescript
{!speechRecognitionSupported && (
  <div className="voice-unavailable">
    🎤 Voice requires Chrome or Edge
  </div>
)}
```

### 3. Add Stop Speaking Button
In FloatingChat when `isSpeaking`:
```typescript
{isSpeaking && (
  <button onClick={stopSpeaking}>⏹️ Stop</button>
)}
```

### 4. Connect useSounds to Voice Events
```typescript
// In speak() function
playNotification(); // When starting to speak
playSuccess(); // When message received
playError(); // When TTS fails
```

### 5. Add Voice Speed Control
Update TTS API:
```typescript
// In route.ts
const { text, speed = 1.0 } = await request.json();
// ElevenLabs doesn't have speed param, but can add client-side playback rate:
audioRef.current.playbackRate = speed;
```

---

## 🌟 Bigger Ideas (More Effort)

### 1. Real-time Streaming TTS
- Use ElevenLabs streaming API for lower latency
- Start playing audio before full response generated
- Feels much more conversational

### 2. Voice Message Recording
- Record user audio as voice notes
- Store in S3/storage
- Playback in chat history

### 3. Whisper STT Integration
- Server-side speech recognition via OpenAI Whisper
- Better accuracy than Web Speech API
- Works on all browsers

### 4. Wake Word Detection
- "Hey Opie" to start listening
- Use Picovoice Porcupine or similar
- Always-on listening mode

### 5. Voice Emotion Detection
- Detect user's tone/emotion from audio
- Adjust responses accordingly
- ElevenLabs has some emotion features

### 6. Multi-language Support
- Language detection from speech
- Automatic response translation
- Switch ElevenLabs model for non-English

---

## 📊 Code Quality Notes

### Good Practices Found
- ✅ Barge-in interrupt support (excellent UX)
- ✅ Silence detection with configurable timeout
- ✅ Audio validation before playback
- ✅ Error handling with fallback restart
- ✅ Mobile-optimized full-screen voice mode
- ✅ Haptic feedback on mobile

### Areas for Improvement
- ⚠️ Heavy component coupling (OpieKanban does too much)
- ⚠️ No dedicated `useVoice` hook (would improve reusability)
- ⚠️ TypeScript `any` types for Speech Recognition
- ⚠️ Magic numbers (3500ms timeout should be configurable)

---

## 🏗️ Suggested Architecture Refactor

Create a dedicated voice hook:

```typescript
// src/hooks/useVoice.ts
export function useVoice(options?: VoiceOptions) {
  return {
    // STT
    isListening,
    transcript,
    startListening,
    stopListening,
    
    // TTS
    isSpeaking,
    speak,
    stopSpeaking,
    
    // Settings
    voiceId,
    setVoiceId,
    
    // Status
    sttSupported,
    ttsAvailable,
    error,
  };
}
```

This would decouple voice logic from OpieKanban and make it reusable across components.

---

## Summary

| Category | Status | Count |
|----------|--------|-------|
| **Working Features** | ✅ | 6 |
| **Issues/Gaps** | ⚠️ | 6 |
| **Quick Wins** | 🎯 | 5 |
| **Bigger Ideas** | 🌟 | 6 |

**Overall Assessment:** Voice features are functional and well-implemented for Chrome users. Main gaps are browser compatibility and configurability. The barge-in feature is particularly well done. Quick wins could significantly improve UX with minimal effort.
