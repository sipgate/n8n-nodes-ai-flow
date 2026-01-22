# @sipgate/n8n-nodes-ai-flow

This is an n8n community node. It lets you use sipgate AI Flow in your n8n workflows.

sipgate AI Flow is a voice assistant platform for building AI-powered voice applications with real-time speech processing. It supports event-driven architecture with built-in speech-to-text and text-to-speech capabilities.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Manual Installation

```bash
npm install @sipgate/n8n-nodes-ai-flow
```

## Operations

### Trigger Node

**sipgate AI Flow Trigger** - A webhook trigger node that receives events from sipgate AI Flow and **automatically routes them to dedicated outputs**:

#### 🎯 Six Dedicated Outputs for Event Routing

The trigger provides **automatic event routing** to 6 separate outputs, eliminating the need for IF or Switch nodes:

1. **Session Start** - Call begins
2. **User Speak** - User speaks (includes speech-to-text result)
3. **Assistant Speak** - Assistant starts speaking
4. **Assistant Speech Ended** - Assistant finishes speaking
5. **User Input Timeout** - Timeout waiting for user input
6. **Session End** - Call ends

### Action Nodes

#### **AI Flow Speak** 🔊
Make the assistant speak text or SSML with advanced options:
- Plain text or SSML markup
- User input timeout configuration
- TTS provider selection (Azure, ElevenLabs)
- Voice and language customization
- Barge-in configuration

#### **AI Flow Audio** 🎵
Play pre-recorded audio files:
- Support for base64 encoded audio or binary data
- WAV format (16kHz, mono, 16-bit PCM)
- Barge-in configuration

#### **AI Flow Transfer** ↗️
Transfer the call to another phone number:
- Target phone number (E.164 format)
- Caller ID configuration (name and number)

#### **AI Flow Hangup** ☎️
End the call immediately:
- Simple session-based hangup

#### **AI Flow Barge-In** ⏸️
Manually interrupt current playback:
- Programmatic interruption control

## Credentials

The sipgate AI Flow Trigger node supports two authentication methods:

### None (Development Only)
No authentication required. **Only use this for local testing!**

### Header Auth (Recommended for Production)
Authenticate incoming webhook requests using a shared secret in HTTP headers.

**Setup:**
1. In the AI Flow Trigger node, select "Header Auth"
2. Configure the header name (default: `X-API-TOKEN`)
3. Generate a secure random token and set it as the header value
4. Configure the same token in your sipgate AI Flow settings

**Security Best Practices:**
- Use a cryptographically secure random token
- Store the token securely (environment variables, secret manager)
- Use HTTPS for webhook URLs in production
- Rotate tokens regularly

## Compatibility

- Minimum n8n version: 1.0.0
- Tested against: n8n 1.x
- Node.js: >= 18.x

## Usage

### Basic Setup

1. **Add the Trigger Node**
   - Add "sipgate AI Flow Trigger" to your workflow
   - Configure authentication (recommended: Header Auth)
   - Connect different nodes to different outputs based on event type

2. **Add Action Nodes**
   - Use AI Flow action nodes to respond to events
   - Connect outputs from the trigger to action nodes

3. **Activate Workflow**
   - Activate your workflow to get the Production webhook URL
   - Copy the webhook URL

4. **Configure sipgate AI Flow**
   - Add the webhook URL to your AI Flow configuration
   - Set the shared secret (if using Header Auth)

### Example Workflow 1: Simple Echo Bot with Action Nodes

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ AI Flow Speak → Text: "Welcome! How can I help?"
│
└─ [Output 2: User Speak]
   └─ AI Flow Speak → Text: "You said: {{$json.text}}"
```

### Example Workflow 2: Intent-Based Routing

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ AI Flow Speak → "Hello! Say 'booking' or 'support'"
│
├─ [Output 2: User Speak]
│  └─ IF ({{$json.text}} contains "booking")
│     ├─ True → AI Flow Speak → "Processing your booking..."
│     └─ False → IF ({{$json.text}} contains "support")
│        ├─ True → AI Flow Transfer → Transfer to agent
│        └─ False → AI Flow Speak → "Sorry, I didn't understand"
│
├─ [Output 5: User Input Timeout]
│  └─ Function (Count timeouts)
│     └─ IF (count >= 3)
│        ├─ True → AI Flow Hangup
│        └─ False → AI Flow Speak → "Are you there?"
│
└─ [Output 6: Session End]
   └─ Database → Log conversation
```

### Example Workflow 3: Audio Playback

```
AI Flow Trigger
└─ [Output 1: Session Start]
   └─ Read Binary File (hold-music.wav)
      └─ AI Flow Audio
         - Audio Source: Binary Data
         - Binary Property: data
```

### Example Workflow 4: Custom TTS

```
AI Flow Trigger
└─ [Output 2: User Speak]
   └─ AI Flow Speak
      - Text: "Hello in a different voice!"
      - TTS Provider: ElevenLabs
      - Voice: 21m00Tcm4TlvDq8ikWAM
```

### Event Data Structure

All events include the following session information:

```json
{
  "eventType": "user_speak",
  "type": "user_speak",
  "text": "Hello",
  "barged_in": false,
  "session": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "account_id": "account-123",
    "phone_number": "+491234567890",
    "direction": "inbound",
    "from_phone_number": "+499876543210",
    "to_phone_number": "+491234567890"
  }
}
```

### Action Node Outputs

All action nodes output a properly formatted action object ready to be sent to sipgate AI Flow:

```json
{
  "type": "speak",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Hello! How can I help you?",
  "user_input_timeout_seconds": 8
}
```

For more details on actions and advanced features, see the [sipgate AI Flow API Documentation](https://sipgate.github.io/sipgate-ai-flow-api/).

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [sipgate AI Flow API Documentation](https://sipgate.github.io/sipgate-ai-flow-api/)
- [sipgate AI Flow LLM Reference](https://sipgate.github.io/sipgate-ai-flow-api/LLM_REFERENCE.txt)
- [n8n workflow automation](https://n8n.io/)

## Development

### Building the Node

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Version History

### 0.2.0 (Current) - Phase 2 Complete
- **NEW: 5 Action Nodes** for AI Flow operations
  - **AI Flow Speak** - Text/SSML speech with TTS provider selection
  - **AI Flow Audio** - Pre-recorded audio playback
  - **AI Flow Transfer** - Call transfer to phone number
  - **AI Flow Hangup** - End the call
  - **AI Flow Barge-In** - Manual playback interruption
- Each action node provides a clean, typed interface
- No more manual HTTP requests or JSON construction
- Full support for all sipgate AI Flow features:
  - TTS provider configuration (Azure, ElevenLabs)
  - Barge-in strategies and configuration
  - User input timeout handling
  - Binary audio data support

### 0.1.0 - Phase 1 Complete
- Initial release
- **sipgate AI Flow Trigger node with multiple outputs**
  - 6 dedicated outputs for automatic event routing
  - No IF/Switch nodes needed for event type handling
  - Support for all AI Flow events (session_start, user_speak, etc.)
- Authentication support (None, Header Auth)
- Barge-in flag support
- Complete session information in all events
- Configurable response mode

## License

MIT

## Author

Michael Rotmanov (leachiM2k@leachiM2k.de)
