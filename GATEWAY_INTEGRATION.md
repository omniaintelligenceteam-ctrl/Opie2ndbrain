# OpenClaw Gateway Integration

This document describes the OpenClaw gateway integration implemented for the Opie2ndbrain dashboard.

## Overview

The Opie2ndbrain dashboard now supports routing chat completions through the OpenClaw gateway at `https://gateway.omnialightscapepro.com` instead of making direct API calls to Anthropic and Ollama. This integration provides centralized model access through the OpenClaw bridge while maintaining full backward compatibility.

## Features Implemented

### 1. Gateway Chat Client (`src/lib/gateway-chat.ts`)
- New utility library for OpenClaw gateway communication
- Supports both streaming and non-streaming chat completions
- Automatic SSE (Server-Sent Events) parsing for streaming responses
- Error handling and fallback mechanisms
- OpenAI-compatible response format

### 2. Chat Route Updates (`src/app/api/chat/route.ts`)
- Updated `streamAnthropic()` function to use gateway routing when available
- Updated `streamOllama()` function to use gateway routing when available
- Updated execution plan generation functions to support gateway routing
- Maintained all existing functionality and backward compatibility
- Tool execution mode works with existing fallback mechanisms

### 3. Model Counsel Updates (`src/app/api/model-counsel/route.ts`)
- Updated `queryModel()` function to use gateway routing for all providers
- Updated `synthesizeResponses()` function to use gateway routing
- Parallel model querying maintains performance while using gateway
- Backward compatibility maintained for direct API access

### 4. Configuration
- Uses existing environment variables from `.env.example`
- Gateway URL: `OPENCLAW_GATEWAY_URL` (defaults to `https://gateway.omnialightscapepro.com`)
- Authentication: `GATEWAY_TOKEN`
- Automatic fallback when gateway is not configured

## Environment Variables

```bash
# Primary gateway configuration
OPENCLAW_GATEWAY_URL=https://gateway.omnialightscapepro.com
GATEWAY_TOKEN=your_gateway_token_here

# Fallback API keys (still required for local development)
ANTHROPIC_API_KEY=your_anthropic_key
OLLAMA_API_KEY=your_ollama_key
```

## Usage Behavior

### When Gateway is Available
1. Check if `OPENCLAW_GATEWAY_URL` and `GATEWAY_TOKEN` are set
2. Route requests to `/v1/chat/completions` endpoint on the gateway
3. Include `Authorization: Bearer ${GATEWAY_TOKEN}` header
4. Parse streaming SSE responses from gateway
5. Convert to OpenAI-compatible format for frontend

### When Gateway is Not Available
1. Fall back to direct API calls (Anthropic SDK, Ollama API)
2. Log the fallback for debugging
3. Maintain full functionality with existing implementation
4. No breaking changes or degraded experience

## API Compatibility

### Request Format
```json
{
  "messages": [
    {"role": "system", "content": "System prompt"},
    {"role": "user", "content": "User message"}
  ],
  "model": "claude-sonnet-4-20250514",
  "stream": true,
  "max_tokens": 1024,
  "temperature": 0.7
}
```

### Streaming Response Format
```
data: {"choices":[{"delta":{"content":"Hello"}}]}
data: {"choices":[{"delta":{"content":" there!"}}]}
data: [DONE]
```

## Testing

### Automatic Testing
- Build passes with TypeScript compilation clean
- No breaking changes to existing functionality
- Gateway integration is opt-in via environment variables

### Manual Testing
Use the included test script:
```bash
node test-gateway-integration.js
```

This tests:
- Gateway availability checking
- Non-streaming completions
- Streaming completions  
- Fallback behavior
- Chat API integration

## Implementation Details

### Gateway Client Initialization
```typescript
export class GatewayChatClient {
  constructor() {
    this.gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'https://gateway.omnialightscapepro.com';
    this.gatewayToken = process.env.GATEWAY_TOKEN || '';
    this.useGateway = !!(this.gatewayUrl && this.gatewayToken);
  }
}
```

### Routing Logic
```typescript
// Check if gateway should be used
if (shouldUseGateway()) {
  try {
    // Use gateway
    const response = await gatewayChatClient.createStreamingCompletion(request);
    return response;
  } catch (error) {
    // Fall back to direct API
    return directApiCall();
  }
}
```

## Benefits

1. **Centralized Model Access**: All model requests go through OpenClaw gateway
2. **Unified Authentication**: Single token for all model access
3. **Load Balancing**: Gateway can distribute requests across providers
4. **Rate Limiting**: Centralized rate limiting and quota management
5. **Monitoring**: Centralized logging and analytics
6. **Zero Downtime**: Automatic fallback ensures service continuity
7. **Easy Migration**: No frontend changes required

## Deployment Considerations

### Production Deployment
- Set `OPENCLAW_GATEWAY_URL=https://gateway.omnialightscapepro.com`
- Set `GATEWAY_TOKEN=your_production_token`
- Fallback API keys can be removed once gateway is stable

### Local Development
- Gateway integration is optional
- Developers can continue using direct API keys
- No changes to development workflow

### Monitoring
- Gateway client logs routing decisions
- Failed gateway requests log errors before falling back
- Build includes gateway availability in initialization logs

## Future Enhancements

1. **Token Usage Tracking**: Implement gateway token usage reporting
2. **Advanced Error Handling**: More sophisticated retry logic
3. **Gateway Health Checks**: Periodic connectivity testing
4. **Model Selection**: Dynamic model routing through gateway
5. **Caching**: Response caching through gateway
6. **Tool Execution**: Route tool calls through gateway when supported

## Support

For issues with the gateway integration:

1. Check environment variable configuration
2. Verify gateway token validity
3. Review console logs for routing decisions
4. Test fallback behavior by temporarily unsetting gateway variables
5. Use the test script to diagnose specific issues

The integration is designed to be robust and self-healing, always falling back to direct API access when the gateway is unavailable.