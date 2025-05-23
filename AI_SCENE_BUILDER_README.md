# AI Scene Builder Feature

## Overview
The AI Scene Builder is a new premium feature that allows users to reimagine themselves in different historical or fantasy scenes using OpenAI's GPT-4 Vision API.

## Features
- **Pre-defined Scenes:**
  - 1920s New York
  - Ancient Rome
  - World War II Era
  - Cyberpunk City
  - Old Hollywood
- **Custom Scene Creation:** Users can describe their own scenes
- **10 Credits per use**
- **Beautiful UI/UX** with scene selection cards and smooth animations

## Setup Instructions

### 1. Add Your OpenAI API Key
The app now uses a single hardcoded API key. You need to replace the placeholder in `lib/openai-service.ts`:

```typescript
// Replace this with your actual OpenAI API key - this is a placeholder
private apiKey: string = "sk-placeholder-key-replace-with-your-actual-key";
```

### 2. Usage Flow
1. Upload and colorize a photo first
2. Once colorized, scroll down to see the premium features
3. Click "Try this Feature" on the AI Scene Builder card (marked with "NEW FEATURE" ribbon)
4. Select a pre-defined scene or create your own
5. Click "Generate Scene" (requires 10 credits)
6. Watch the AI reimagine you in your chosen scene!

## Technical Implementation

### Components
- **AISceneBuilderModal**: Beautiful modal for scene selection
- **OpenAIService**: Handles API communication with OpenAI
- **EnhancementLoadingIndicator**: Custom loading animation for scene generation

### API Configuration
The feature uses OpenAI's GPT-4 Vision API. Make sure your API key has access to:
- `gpt-4-vision-preview` model
- `dall-e-3` image generation model

## Future Enhancements
- Add more pre-defined scenes
- Allow users to save their favorite scenes
- Implement scene history
- Add sharing options for generated scenes

## Notes
- The person in the original photo is maintained in the new scene
- Only the outfit and environment change to match the selected scene
- High-quality colorized images produce better results
- Processing typically takes 10-30 seconds depending on the scene complexity 