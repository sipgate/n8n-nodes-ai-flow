# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an n8n community node package for sipgate AI Flow - a voice assistant platform for building voice applications with real-time speech processing. The package provides two custom nodes that integrate with n8n workflows:

1. **AiFlowTrigger** - A webhook trigger node that receives events from sipgate AI Flow
2. **AiFlowAction** - An action node that sends commands back to AI Flow sessions

## Key Commands

### Development
```bash
# Build the package
npm run build

# Build in watch mode (auto-rebuild on changes)
npm run build:watch

# Development mode with n8n
npm run dev
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Linting
```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix
```

### Publishing
```bash
# Release a new version (handles versioning and publishing)
npm run release
```

## Architecture

### n8n Node Package Structure

This is an n8n community node built with the **n8n programmatic node API**. Each node is a TypeScript class that implements the `INodeType` interface from `n8n-workflow`.

**Key architectural concepts:**

- **No credentials directory**: This package doesn't require credentials (authentication is handled via webhook headers in the trigger node)
- **Two independent nodes**: Each node operates independently and can be used separately in workflows
- **Built with @n8n/node-cli**: Uses the official n8n CLI tool for building, linting, and development
- **Output to dist/**: TypeScript is compiled to JavaScript in the `dist/` directory, which is what gets published

### Node Structure

Each node lives in its own directory under `nodes/`:

```
nodes/
├── AiFlowTrigger/
│   ├── AiFlowTrigger.node.ts       # Main trigger node implementation
│   ├── AiFlowTrigger.node.json     # Node metadata
│   ├── aiflow.svg                  # Node icon (light theme)
│   ├── aiflow.dark.svg             # Node icon (dark theme)
│   └── test/
│       └── AiFlowTrigger.node.test.ts
└── AiFlowAction/
    ├── AiFlowAction.node.ts        # Main action node implementation
    ├── aiflow.svg                  # Node icon
    └── test/
        └── AiFlowAction.node.test.ts
```

### AiFlowTrigger Architecture

The trigger node is a **webhook-based trigger** with **automatic event routing**:

- **7 outputs**: Automatically routes different event types to separate outputs (session_start, user_speak, assistant_speak, assistant_speech_ended, user_input_timeout, session_end, fallback)
- **Fallback behavior modes**:
  - "Unknown Events Only" (default) - routes only unrecognized events to fallback output
  - "All Events" - routes all events to fallback output, ignoring specific outputs
- **Authentication**: Supports none (dev only) or header-based auth
- **Response mode**: `lastNode` - the workflow's last node response is sent back as webhook response

Key implementation details in `AiFlowTrigger.node.ts:webhook()`:
1. Validates authentication (if enabled)
2. Extracts event data from webhook body
3. Routes to appropriate output based on event type
4. Returns event data as workflow execution data

### AiFlowAction Architecture

The action node is a **final node** (no outputs) that generates sipgate AI Flow action objects:

- **5 operations**: speak, audio, transfer, hangup, bargeIn
- **Dynamic UI**: Properties are shown/hidden based on selected operation using `displayOptions`
- **Session-based**: All operations require a session_id (typically from the trigger event)
- **Output as JSON**: Returns properly formatted action objects for AI Flow API

Key implementation details in `AiFlowAction.node.ts:execute()`:
1. Reads operation and session_id parameters
2. Builds action object based on operation type
3. Returns action object as JSON output (to be sent back via webhook response)

### Event Flow Pattern

Typical workflow execution:
1. **AI Flow → Trigger**: sipgate AI Flow sends event via webhook POST
2. **Trigger → Workflow**: Event is routed to appropriate output based on type
3. **Workflow Processing**: n8n workflow nodes process the event (IF, Function, HTTP, etc.)
4. **Workflow → Action**: Action node generates AI Flow command
5. **Action → AI Flow**: Command is returned as webhook response (via `lastNode` mode)

### Testing Approach

- **Jest with ts-jest**: TypeScript testing without pre-compilation
- **Unit tests only**: Tests focus on node logic, not integration with n8n runtime
- **Mock n8n interfaces**: Tests create mock `IWebhookFunctions` and `IExecuteFunctions`
- **Coverage targets**: 94%+ statement coverage for both nodes

Test files validate:
- Node metadata (displayName, outputs, properties)
- Webhook/execute function logic
- Authentication flows
- Event routing logic
- Error handling
- All operation types and configurations

### TypeScript Configuration

- **Target**: ES2019 with CommonJS modules (n8n compatibility)
- **Strict mode**: Full TypeScript strict checks enabled
- **Output**: Compiled to `dist/` with declaration files and source maps
- **No bundling**: Each `.ts` file compiles to separate `.js` file

## Important Notes

### n8n Node Development Patterns

1. **Properties structure**: Use `displayOptions.show` to conditionally show/hide properties based on other selections
2. **Default expressions**: Use `={{$json.session.id}}` pattern for auto-populating from previous node data
3. **Node outputs**: Trigger nodes can have multiple outputs; action nodes can have zero outputs (final nodes)
4. **Webhook response modes**: `lastNode` means the last node's output becomes the webhook HTTP response

### Session ID Pattern

Both nodes work together via session IDs:
- Trigger extracts `session.id` from incoming events
- Action expects `session_id` parameter (defaults to `={{$json.session.id}}` expression)
- This allows Action to reference the session from the Trigger's output

### Testing Single Node

To run tests for just one node:
```bash
# Run only AiFlowTrigger tests
npm test -- AiFlowTrigger

# Run only AiFlowAction tests
npm test -- AiFlowAction

# Run a specific test by name pattern
npm test -- -t "should route session_start event"
```

### n8n Development Mode

When running `npm run dev`, the n8n CLI starts a local n8n instance with your node loaded. This allows testing the node in a real n8n environment before publishing.
