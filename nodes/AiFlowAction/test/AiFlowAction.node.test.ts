import { AiFlowAction } from '../AiFlowAction.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

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

		it('should have 5 operations', () => {
			const operationProperty = action.description.properties.find((p) => p.name === 'operation');
			expect(operationProperty).toBeDefined();
			expect(operationProperty?.type).toBe('options');
			expect((operationProperty as any).options).toHaveLength(5);
		});

		it('should have operations in alphabetical order', () => {
			const operationProperty = action.description.properties.find((p) => p.name === 'operation');
			const operations = (operationProperty as any).options.map((o: any) => o.name);
			expect(operations).toEqual(['Barge-In', 'Hangup', 'Play Audio', 'Speak', 'Transfer Call']);
		});
	});

	describe('Execute Method', () => {
		const createMockExecuteFunctions = (
			items: INodeExecutionData[],
			parameters: { [key: string]: any },
		): IExecuteFunctions => {
			return {
				getInputData: jest.fn().mockReturnValue(items),
				getNodeParameter: jest.fn((paramName: string, itemIndex: number) => {
					return parameters[paramName];
				}),
				getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
				continueOnFail: jest.fn().mockReturnValue(false),
				helpers: {
					assertBinaryData: jest.fn((itemIndex: number, propertyName: string) => {
						if (parameters.binaryData && parameters.binaryData[propertyName]) {
							return parameters.binaryData[propertyName];
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

			it('should throw error if target phone number is missing', async () => {
				const mockFunctions = createMockExecuteFunctions(
					[{ json: {} }],
					{
						operation: 'transfer',
						sessionId: 'test-session-123',
						targetPhoneNumber: '',
						callerIdName: 'Support Team',
						callerIdNumber: '+490987654321',
					},
				);

				await expect(action.execute.call(mockFunctions)).rejects.toThrow(
					'Target phone number is required',
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
