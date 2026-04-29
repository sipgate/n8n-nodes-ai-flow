import { AiFlowAction } from '../AiFlowAction.node';
import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';

describe('AiFlowAction', () => {
	let action: AiFlowAction;

	beforeEach(() => {
		action = new AiFlowAction();
	});

	describe('Node Definition', () => {
		it('should have correct basic properties', () => {
			expect(action.description.displayName).toBe('sipgate AI Flow');
			expect(action.description.name).toBe('aiFlowAction');
			expect(action.description.group).toEqual(['output']);
			expect(action.description.version).toBe(1);
		});

		it('should have no outputs (final node)', () => {
			expect(action.description.outputs).toEqual([]);
		});

		it('should have 8 operations', () => {
			const operationProperty = action.description.properties.find((p) => p.name === 'operation');
			expect(operationProperty).toBeDefined();
			expect(operationProperty?.type).toBe('options');
			expect(
				'options' in operationProperty! ? (operationProperty.options as unknown[]) : [],
			).toHaveLength(8);
		});

		it('should have operations in alphabetical order', () => {
			const operationProperty = action.description.properties.find((p) => p.name === 'operation');
			const options =
				'options' in operationProperty!
					? (operationProperty.options as Array<{ name: string }>)
					: [];
			const operations = options.map((o) => o.name);
			expect(operations).toEqual([
				'Barge-In',
				'Configure Transcription',
				'Hangup',
				'Mix Audio',
				'Play Audio',
				'Send SMS',
				'Speak',
				'Transfer Call',
			]);
		});
	});

	describe('Execute Method', () => {
		const createMockExecuteFunctions = (
			items: INodeExecutionData[],
			parameters: IDataObject,
		): IExecuteFunctions => {
			return {
				getInputData: jest.fn().mockReturnValue(items),
				getNodeParameter: jest.fn((paramName: string) => {
					return parameters[paramName];
				}),
				getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
				continueOnFail: jest.fn().mockReturnValue(false),
				helpers: {
					assertBinaryData: jest.fn((_itemIndex: number, propertyName: string) => {
						const binaryData = parameters.binaryData as IDataObject | undefined;
						if (binaryData && binaryData[propertyName]) {
							return binaryData[propertyName];
						}
						throw new Error(`Binary property '${propertyName}' does not exist`);
					}),
				},
			} as unknown as IExecuteFunctions;
		};

		describe('Speak Operation', () => {
			it('should create speak action with text', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'text',
						text: 'Hello World',
						userInputTimeout: 0,
						ttsProvider: 'default',
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual({
					type: 'speak',
					session_id: 'test-session-123',
					text: 'Hello World',
				});
			});

			it('should create speak action with SSML', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'ssml',
						ssml: '<speak>Hello World</speak>',
						userInputTimeout: 0,
						ttsProvider: 'default',
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'speak',
					session_id: 'test-session-123',
					ssml: '<speak>Hello World</speak>',
				});
			});

			it('should include user input timeout when > 0', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'text',
						text: 'Hello',
						userInputTimeout: 8,
						ttsProvider: 'default',
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.user_input_timeout_seconds).toBe(8);
			});

			it('should include TTS provider configuration for Azure', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'text',
						text: 'Hello',
						userInputTimeout: 0,
						ttsProvider: 'azure',
						language: 'de-DE',
						voice: 'de-DE-KatjaNeural',
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.tts).toEqual({
					provider: 'azure',
					language: 'de-DE',
					voice: 'de-DE-KatjaNeural',
				});
			});

			it('should include TTS provider configuration for ElevenLabs', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'text',
						text: 'Hello',
						userInputTimeout: 0,
						ttsProvider: 'eleven_labs',
						voice: '21m00Tcm4TlvDq8ikWAM',
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.tts).toEqual({
					provider: 'eleven_labs',
					voice: '21m00Tcm4TlvDq8ikWAM',
				});
			});

			it('should include barge-in configuration', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'text',
						text: 'Hello',
						userInputTimeout: 0,
						ttsProvider: 'default',
						bargeInOptions: {
							strategy: 'minimum_characters',
							minimumCharacters: 5,
							allowAfterMs: 1000,
						},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.barge_in).toEqual({
					strategy: 'minimum_characters',
					minimum_characters: 5,
					allow_after_ms: 1000,
				});
			});

			it('should throw error if session ID is missing', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: '',
						contentType: 'text',
						text: 'Hello',
						userInputTimeout: 0,
						ttsProvider: 'default',
						bargeInOptions: {},
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow('Session ID is required');
			});

			it('should throw error if text is missing', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: 'test-session-123',
						contentType: 'text',
						text: '',
						userInputTimeout: 0,
						ttsProvider: 'default',
						bargeInOptions: {},
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow('Text is required');
			});
		});

		describe('Audio Operation', () => {
			it('should create audio action with base64 string', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'audio',
						sessionId: 'test-session-123',
						audioSource: 'base64',
						audioBase64: 'UklGRiQAAABXQVZF...',
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'audio',
					session_id: 'test-session-123',
					audio: 'UklGRiQAAABXQVZF...',
				});
			});

			it('should create audio action with binary data', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'audio',
						sessionId: 'test-session-123',
						audioSource: 'binary',
						binaryProperty: 'data',
						binaryData: {
							data: {
								data: 'UklGRiQAAABXQVZF...',
							},
						},
						bargeInOptions: {},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'audio',
					session_id: 'test-session-123',
					audio: 'UklGRiQAAABXQVZF...',
				});
			});

			it('should include barge-in configuration for audio', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'audio',
						sessionId: 'test-session-123',
						audioSource: 'base64',
						audioBase64: 'UklGRiQAAABXQVZF...',
						bargeInOptions: {
							strategy: 'manual',
							allowAfterMs: 500,
						},
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.barge_in).toEqual({
					strategy: 'manual',
					allow_after_ms: 500,
				});
			});
		});

		describe('Transfer Operation', () => {
			it('should create transfer action', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'transfer',
						sessionId: 'test-session-123',
						targetPhoneNumber: '+491234567890',
						callerIdName: 'Support Team',
						callerIdNumber: '+490987654321',
						transferTimeout: 0,
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'transfer',
					session_id: 'test-session-123',
					target_phone_number: '+491234567890',
					caller_id_name: 'Support Team',
					caller_id_number: '+490987654321',
				});
			});

			it('should include timeout when provided', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'transfer',
						sessionId: 'test-session-123',
						targetPhoneNumber: '+491234567890',
						callerIdName: 'Support Team',
						callerIdNumber: '+490987654321',
						transferTimeout: 30,
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.timeout).toBe(30);
			});

			it('should reject timeout outside the 5-120 range', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'transfer',
						sessionId: 'test-session-123',
						targetPhoneNumber: '+491234567890',
						callerIdName: 'Support Team',
						callerIdNumber: '+490987654321',
						transferTimeout: 3,
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'Transfer timeout must be between 5 and 120 seconds',
				);
			});

			it('should throw error if target phone number is missing', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'transfer',
						sessionId: 'test-session-123',
						targetPhoneNumber: '',
						callerIdName: 'Support Team',
						callerIdNumber: '+490987654321',
						transferTimeout: 0,
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'Target phone number is required',
				);
			});
		});

		describe('Mix Audio Operation', () => {
			it('should create mix_audio action with base64 and default volume', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'mixAudio',
						sessionId: 'test-session-123',
						mixAudioMode: 'start',
						mixAudioSource: 'base64',
						mixAudioBase64: 'UklGRiQAAABXQVZF...',
						mixAudioVolume: 0.5,
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'mix_audio',
					session_id: 'test-session-123',
					audio: 'UklGRiQAAABXQVZF...',
					volume: 0.5,
				});
			});

			it('should create mix_audio stop action without audio', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'mixAudio',
						sessionId: 'test-session-123',
						mixAudioMode: 'stop',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'mix_audio',
					session_id: 'test-session-123',
					stop: true,
				});
			});

			it('should reject volume outside 0..1', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'mixAudio',
						sessionId: 'test-session-123',
						mixAudioMode: 'start',
						mixAudioSource: 'base64',
						mixAudioBase64: 'UklGRiQAAABXQVZF...',
						mixAudioVolume: 1.5,
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'Volume must be between 0.0 and 1.0',
				);
			});
		});

		describe('Configure Transcription Operation', () => {
			it('should set provider only', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'configureTranscription',
						sessionId: 'test-session-123',
						transcriptionProvider: 'DEEPGRAM',
						transcriptionLanguages: '',
						transcriptionVocabulary: '',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'configure_transcription',
					session_id: 'test-session-123',
					provider: 'DEEPGRAM',
				});
			});

			it('should parse comma-separated languages and vocabulary', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'configureTranscription',
						sessionId: 'test-session-123',
						transcriptionProvider: 'keep',
						transcriptionLanguages: 'de-DE, en-US',
						transcriptionVocabulary: 'sipgate, AI Flow\nDüsseldorf',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'configure_transcription',
					session_id: 'test-session-123',
					languages: ['de-DE', 'en-US'],
					custom_vocabulary: ['sipgate', 'AI Flow', 'Düsseldorf'],
				});
			});

			it('should throw if no field is provided', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'configureTranscription',
						sessionId: 'test-session-123',
						transcriptionProvider: 'keep',
						transcriptionLanguages: '',
						transcriptionVocabulary: '',
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'configure_transcription needs at least a provider, languages, or custom vocabulary',
				);
			});

			it('should reject more than 4 languages', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'configureTranscription',
						sessionId: 'test-session-123',
						transcriptionProvider: 'keep',
						transcriptionLanguages: 'de-DE,en-US,fr-FR,es-ES,it-IT',
						transcriptionVocabulary: '',
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'At most 4 languages are allowed',
				);
			});
		});

		describe('Send SMS Operation', () => {
			it('should create send_sms action', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'sendSms',
						sessionId: 'test-session-123',
						smsPhoneNumber: '491234567890',
						smsMessage: 'Hello from AI Flow',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'send_sms',
					session_id: 'test-session-123',
					phone_number: '491234567890',
					message: 'Hello from AI Flow',
				});
			});

			it('should throw if message is missing', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'sendSms',
						sessionId: 'test-session-123',
						smsPhoneNumber: '491234567890',
						smsMessage: '',
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'Message is required',
				);
			});
		});

		describe('Hangup Operation', () => {
			it('should create hangup action', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'hangup',
						sessionId: 'test-session-123',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'hangup',
					session_id: 'test-session-123',
				});
			});
		});

		describe('Barge-In Operation', () => {
			it('should create barge-in action', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'bargeIn',
						sessionId: 'test-session-123',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json).toEqual({
					type: 'barge_in',
					session_id: 'test-session-123',
				});
			});
		});

		describe('Multiple Items', () => {
			it('should process multiple items', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }, { json: {} }, { json: {} }],
					{
						operation: 'hangup',
						sessionId: 'test-session-123',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result).toHaveLength(1);
				expect(result[0]).toHaveLength(3);
				expect(result[0][0].json.type).toBe('hangup');
				expect(result[0][1].json.type).toBe('hangup');
				expect(result[0][2].json.type).toBe('hangup');
			});
		});

		describe('Error Handling', () => {
			it('should handle errors gracefully with continueOnFail', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'speak',
						sessionId: '',
						contentType: 'text',
						text: 'Hello',
						userInputTimeout: 0,
						ttsProvider: 'default',
						bargeInOptions: {},
					},
				);

				(mockFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].json.error).toContain('Session ID is required');
			});
		});

		describe('Paired Items', () => {
			it('should include pairedItem index', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'hangup',
						sessionId: 'test-session-123',
					},
				);

				const result = await action.execute.call(mockFunctions);

				expect(result[0][0].pairedItem).toBe(0);
			});
		});
	});
});
