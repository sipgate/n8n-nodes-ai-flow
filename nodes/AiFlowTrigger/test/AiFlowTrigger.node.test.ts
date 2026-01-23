import { AiFlowTrigger } from '../AiFlowTrigger.node';
import type { IWebhookFunctions, IDataObject } from 'n8n-workflow';

describe('AiFlowTrigger', () => {
	let trigger: AiFlowTrigger;

	beforeEach(() => {
		trigger = new AiFlowTrigger();
	});

	describe('Node Definition', () => {
		it('should have correct basic properties', () => {
			expect(trigger.description.displayName).toBe('sipgate AI Flow Trigger');
			expect(trigger.description.name).toBe('aiFlowTrigger');
			expect(trigger.description.group).toEqual(['trigger']);
			expect(trigger.description.version).toBe(1);
		});

		it('should have 7 outputs', () => {
			expect(trigger.description.outputs).toHaveLength(7);
		});

		it('should have correct output names', () => {
			expect(trigger.description.outputNames).toEqual([
				'Session Start',
				'User Speak',
				'Assistant Speak',
				'Assistant Speech Ended',
				'User Input Timeout',
				'Session End',
				'Fallback',
			]);
		});

		it('should have webhook configuration', () => {
			expect(trigger.description.webhooks).toHaveLength(1);
			expect(trigger.description.webhooks![0].httpMethod).toBe('POST');
			expect(trigger.description.webhooks![0].path).toBe('webhook');
		});
	});

	describe('Webhook Handler', () => {
		const createMockWebhookFunctions = (
			bodyData: IDataObject,
			headers: { [key: string]: string } = {},
			params: { [key: string]: any } = {},
		): IWebhookFunctions => {
			return {
				getBodyData: jest.fn().mockReturnValue(bodyData),
				getRequestObject: jest.fn().mockReturnValue({ headers }),
				getNodeParameter: jest.fn((paramName: string) => {
					return params[paramName];
				}),
			} as unknown as IWebhookFunctions;
		};

		describe('Authentication', () => {
			it('should accept request with valid header auth', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'session_start', session: { id: '123' } },
					{ 'x-api-token': 'valid-token' },
					{
						authentication: 'headerAuth',
						headerName: 'X-API-TOKEN',
						headerValue: 'valid-token',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData).toBeDefined();
				expect(result.webhookResponse).toBeUndefined();
			});

			it('should reject request with invalid header auth', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'session_start', session: { id: '123' } },
					{ 'x-api-token': 'wrong-token' },
					{
						authentication: 'headerAuth',
						headerName: 'X-API-TOKEN',
						headerValue: 'valid-token',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.webhookResponse?.status).toBe(401);
				expect(result.webhookResponse?.body).toEqual({ error: 'Unauthorized' });
			});

			it('should accept request with no authentication', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'session_start', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData).toBeDefined();
			});
		});

		describe('Event Routing', () => {
			it('should route session_start to output 0', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'session_start', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData).toHaveLength(7);
				expect(result.workflowData![0]).toHaveLength(1);
				expect(result.workflowData![0][0].json.type).toBe('session_start');
				// All other outputs should be empty
				for (let i = 1; i < 7; i++) {
					expect(result.workflowData![i]).toHaveLength(0);
				}
			});

			it('should route user_speak to output 1', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'user_speak', session: { id: '123' }, transcript: 'hello' },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![1]).toHaveLength(1);
				expect(result.workflowData![1][0].json.type).toBe('user_speak');
			});

			it('should route assistant_speak to output 2', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'assistant_speak', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![2]).toHaveLength(1);
				expect(result.workflowData![2][0].json.type).toBe('assistant_speak');
			});

			it('should route assistant_speech_ended to output 3', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'assistant_speech_ended', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![3]).toHaveLength(1);
				expect(result.workflowData![3][0].json.type).toBe('assistant_speech_ended');
			});

			it('should route user_input_timeout to output 4', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'user_input_timeout', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![4]).toHaveLength(1);
				expect(result.workflowData![4][0].json.type).toBe('user_input_timeout');
			});

			it('should route session_end to output 5', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'session_end', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![5]).toHaveLength(1);
				expect(result.workflowData![5][0].json.type).toBe('session_end');
			});

			it('should route unknown event type to fallback output (6)', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'unknown_event', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![6]).toHaveLength(1);
				expect(result.workflowData![6][0].json.type).toBe('unknown_event');
			});
		});

		describe('Fallback Behavior', () => {
			it('should route all events to fallback when fallbackBehavior is "allEvents"', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'session_start', session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'allEvents',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				// Fallback output (6) should have data
				expect(result.workflowData![6]).toHaveLength(1);
				expect(result.workflowData![6][0].json.type).toBe('session_start');

				// Specific output (0) should be empty
				expect(result.workflowData![0]).toHaveLength(0);
			});
		});

		describe('Barge-In Flag', () => {
			it('should include barged_in flag when includeBargeIn is true', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'user_speak', session: { id: '123' }, barged_in: true },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![1][0].json.barged_in).toBe(true);
			});

			it('should exclude barged_in flag when includeBargeIn is false', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ type: 'user_speak', session: { id: '123' }, barged_in: true },
					{},
					{
						authentication: 'none',
						includeBargeIn: false,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![1][0].json.barged_in).toBeUndefined();
			});
		});

		describe('Error Handling', () => {
			it('should return 400 for missing event type', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ session: { id: '123' } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.webhookResponse?.status).toBe(400);
				expect(result.webhookResponse?.body).toEqual({
					error: 'Invalid event: missing type field',
				});
			});
		});

		describe('Data Extraction', () => {
			it('should extract event from nested body structure', async () => {
				const mockFunctions = createMockWebhookFunctions(
					{ body: { type: 'session_start', session: { id: '123' } } },
					{},
					{
						authentication: 'none',
						includeBargeIn: true,
						fallbackBehavior: 'unknownOnly',
					},
				);

				const result = await trigger.webhook.call(mockFunctions);

				expect(result.workflowData![0]).toHaveLength(1);
				expect(result.workflowData![0][0].json.type).toBe('session_start');
			});

			it('should preserve all event fields', async () => {
				const eventData = {
					type: 'user_speak',
					session: { id: '123', caller_id: '+1234567890' },
					transcript: 'hello world',
					confidence: 0.95,
					barged_in: false,
				};

				const mockFunctions = createMockWebhookFunctions(eventData, {}, {
					authentication: 'none',
					includeBargeIn: true,
					fallbackBehavior: 'unknownOnly',
				});

				const result = await trigger.webhook.call(mockFunctions);

				const outputData = result.workflowData![1][0].json;
				expect(outputData.type).toBe('user_speak');
				expect(outputData.session).toEqual({ id: '123', caller_id: '+1234567890' });
				expect(outputData.transcript).toBe('hello world');
				expect(outputData.confidence).toBe(0.95);
				expect(outputData.barged_in).toBe(false);
			});
		});
	});
});
