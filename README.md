# @sipgate/n8n-nodes-ai-flow

This is an n8n community node. It lets you use sipgate AI Flow in your n8n workflows.

sipgate AI Flow is a voice assistant platform for building AI-powered voice applications with real-time speech processing. It supports event-driven architecture with built-in speech-to-text and text-to-speech capabilities.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Testing](#testing)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Manual Installation

```bash
npm install @sipgate/n8n-nodes-ai-flow
```

## Operations

This package provides two nodes for working with sipgate AI Flow:

### 1. sipgate AI Flow Trigger (Webhook)

A webhook trigger node that receives events from sipgate AI Flow and **automatically routes them to dedicated outputs**.

#### 🎯 Nine Dedicated Outputs for Event Routing

The trigger provides **automatic event routing** to 9 separate outputs, eliminating the need for IF or Switch nodes:

1. **Session Start** - Call begins
2. **User Speak** - User speaks (includes speech-to-text result)
3. **Assistant Speak** - Assistant starts speaking
4. **Assistant Speech Ended** - Assistant finishes speaking
5. **User Input Timeout** - Timeout waiting for user input
6. **Session End** - Call ends
7. **Fallback** - Unknown event types or catch-all
8. **DTMF Received** - Keypad digit pressed during the call
9. **SMS Failed** - An SMS sent via the Send SMS action could not be delivered

#### Fallback Behavior

The Fallback output can be configured with two modes:

- **Unknown Events Only** (default): Routes only unknown/unrecognized event types to the fallback output
- **All Events**: Routes all events through the fallback output, ignoring specific outputs (useful for simple workflows)

#### Additional Features

- **Authentication**: None (development) or Header Auth (production)
- **Barge-In Flag**: Optional inclusion of barge-in indicator in user_speak events

---

### 2. sipgate AI Flow (Action)

A unified action node with 8 operations for controlling AI Flow calls. This is a **final node** (no output connections) that generates the action JSON.

#### Available Operations

##### 🔊 Speak
Make the assistant speak text or SSML with advanced options:
- **Content Type**: Plain text or SSML markup
- **User Input Timeout**: Configure timeout for user response (seconds)
- **TTS Provider**: Default, Azure, or ElevenLabs
  - Azure: Language and voice configuration
  - ElevenLabs: Voice ID configuration
- **Barge-In Options**: Strategy (immediate, minimum characters, manual, none) and timing

##### 🎵 Play Audio
Play pre-recorded audio files:
- **Audio Source**: Base64 string or binary data from previous node
- **Format**: WAV (16kHz, mono, 16-bit PCM recommended)
- **Barge-In Options**: Configure interruption behavior

##### ↗️ Transfer Call
Transfer the call to another phone number:
- **Target Phone Number**: E.164 format recommended
- **Caller ID Name**: Name displayed to recipient
- **Caller ID Number**: Phone number displayed to recipient
- **Ring Timeout**: Optional 5–120 s ring timeout

##### ☎️ Hangup
End the call immediately:
- Simple session-based hangup
- No additional configuration needed

##### ⏸️ Barge-In
Manually interrupt current playback:
- Programmatic interruption control
- Useful for stopping long audio/speech

##### 🎚️ Mix Audio
Loop a background audio track underneath speech (e.g. hold music, ambient bed):
- **Mode**: Start/replace the loop or stop it
- **Audio Source**: Base64 string or binary data
- **Volume**: 0.0–1.0 (default 0.5)

##### 🗣️ Configure Transcription
Change speech-to-text behavior mid-call:
- **Provider**: Azure, Deepgram, ElevenLabs, or keep current
- **Languages**: Comma-separated BCP-47 codes (1–4)
- **Custom Vocabulary**: Up to 100 phrases (≤ 200 chars each) to bias recognition

##### 📨 Send SMS
Send an SMS during the call (fire-and-forget; failures arrive on the SMS Failed trigger output):
- **Recipient Phone Number**: E.164 without leading `+`
- **Message**: SMS body

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
   - Use the "sipgate AI Flow" action node to respond to events
   - Select the desired operation (Speak, Play Audio, Transfer, Hangup, Barge-In)
   - Configure operation-specific parameters

3. **Activate Workflow**
   - Activate your workflow to get the Production webhook URL
   - Copy the webhook URL

4. **Configure sipgate AI Flow**
   - Add the webhook URL to your AI Flow configuration
   - Set the shared secret (if using Header Auth)

### Example Workflow 1: Simple Echo Bot

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ AI Flow → Operation: Speak
│     └─ Text: "Welcome! How can I help?"
│
└─ [Output 2: User Speak]
   └─ AI Flow → Operation: Speak
      └─ Text: "You said: {{$json.transcript}}"
```

### Example Workflow 2: Intent-Based Routing

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ AI Flow → Speak: "Hello! Say 'booking' or 'support'"
│
├─ [Output 2: User Speak]
│  └─ IF ({{$json.transcript}} contains "booking")
│     ├─ True → AI Flow → Speak: "Processing your booking..."
│     └─ False → IF ({{$json.transcript}} contains "support")
│        ├─ True → AI Flow → Operation: Transfer Call
│        │  └─ Target: +491234567890
│        └─ False → AI Flow → Speak: "Sorry, I didn't understand"
│
├─ [Output 5: User Input Timeout]
│  └─ Function (Count timeouts)
│     └─ IF (count >= 3)
│        ├─ True → AI Flow → Operation: Hangup
│        └─ False → AI Flow → Speak: "Are you there?"
│
└─ [Output 6: Session End]
   └─ Database → Log conversation
```

### Example Workflow 3: Audio Playback with Fallback

```
AI Flow Trigger
├─ [Output 1: Session Start]
│  └─ Read Binary File (hold-music.wav)
│     └─ AI Flow → Operation: Play Audio
│        - Audio Source: Binary Data
│        - Binary Property: data
│
└─ [Output 7: Fallback]
   └─ Function → Log Unknown Event
```

### Example Workflow 4: Custom TTS with ElevenLabs

```
AI Flow Trigger
└─ [Output 2: User Speak]
   └─ AI Flow → Operation: Speak
      - Text: "Hello in a different voice!"
      - TTS Provider: ElevenLabs
      - Voice: 21m00Tcm4TlvDq8ikWAM
```

### Example Workflow 5: Simple Catch-All with Fallback

```
AI Flow Trigger (Fallback Behavior: All Events)
└─ [Output 7: Fallback]
   └─ Switch ({{$json.type}})
      ├─ case "session_start" → AI Flow → Speak: "Welcome"
      ├─ case "user_speak" → OpenAI → AI Flow → Speak
      └─ default → Function → Log Event
```

### Event Data Structure

All events include the following session information:

```json
{
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

> **Note:** Earlier sipgate AI Flow versions delivered the recognized speech as `transcript`. The current API uses `text`. The trigger forwards whatever the API sends, so update workflow expressions accordingly.

### Action Node Outputs

The action node generates properly formatted action objects ready for sipgate AI Flow:

```json
{
  "type": "speak",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "text": "Hello! How can I help you?",
  "user_input_timeout_seconds": 8
}
```

For more details on actions and advanced features, see the [sipgate AI Flow API Documentation](https://sipgate.github.io/sipgate-ai-flow-api/).

## Testing

This package includes comprehensive test coverage using Jest.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

- **42 test cases** covering both nodes
- **94%+ statement coverage**
- Tests include:
  - Node definitions and configurations
  - All operations and event types
  - Authentication flows
  - Event routing logic
  - Error handling
  - Data transformation

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

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) and the [GitHub Releases](https://github.com/sipgate/n8n-nodes-ai-flow/releases) page.

## License

MIT

## Author

sipgate GmbH (aiflow@sipgate.de)
