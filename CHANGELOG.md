# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-22 - Phase 2 Complete

### Added
- **NEW: 5 Action Nodes** for sipgate AI Flow operations
  - **AI Flow Speak Node**
    - Text or SSML content support
    - TTS provider selection (Default, Azure, ElevenLabs)
    - Voice and language configuration
    - User input timeout configuration
    - Barge-in strategy configuration (none, manual, minimum_characters)
  - **AI Flow Audio Node**
    - Play pre-recorded audio files
    - Support for base64 string or binary data input
    - WAV format (16kHz, mono, 16-bit PCM)
    - Barge-in configuration
  - **AI Flow Transfer Node**
    - Transfer calls to phone numbers
    - Caller ID name and number configuration
    - E.164 phone number format support
  - **AI Flow Hangup Node**
    - Simple call termination
    - Session-based hangup
  - **AI Flow Barge-In Node**
    - Manual playback interruption
    - Programmatic barge-in control

### Changed
- Updated package version to 0.2.0
- Improved documentation with action node examples
- Added comprehensive workflow examples

### Benefits
- ✅ No more manual HTTP requests needed
- ✅ Clean, typed interfaces for all actions
- ✅ Full intellisense support in n8n
- ✅ Automatic JSON construction
- ✅ Better error handling with validation
- ✅ Consistent parameter naming

## [0.1.0] - 2026-01-22 - Phase 1 Complete

### Added
- Initial release of sipgate AI Flow n8n integration
- **AI Flow Trigger Node**: Webhook trigger node with multiple outputs
  - Support for all AI Flow events:
    - session_start - Call begins
    - user_speak - User speaks (includes speech-to-text result)
    - assistant_speak - Assistant starts speaking
    - assistant_speech_ended - Assistant finishes speaking
    - user_input_timeout - Timeout waiting for user input
    - session_end - Call ends
  - 6 dedicated outputs for automatic event routing
  - No IF/Switch nodes needed for event type handling
  - Event filtering: Select which events to process
  - Authentication support:
    - None (for development/testing)
    - Header Auth with shared secret (recommended for production)
  - Barge-in flag support for user_speak events
  - Complete session information in all events
  - Configurable response mode (No Response or Return Last Node)
- Comprehensive documentation:
  - README with setup instructions and examples
  - Node-specific README with detailed usage guide
  - Example workflows for common use cases

### Benefits
- ✅ Clean workflow structure with automatic event routing
- ✅ No need for IF/Switch nodes to route events
- ✅ Secure authentication with shared secrets
- ✅ Full support for all sipgate AI Flow event types
