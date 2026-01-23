import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

export class AiFlowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sipgate AI Flow Trigger',
		name: 'aiFlowTrigger',
		icon: 'file:aiflow.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handles webhook events from sipgate AI Flow voice assistant',
		defaults: {
			name: 'AI Flow Trigger',
		},
		inputs: [],
		outputs: [
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
			NodeConnectionTypes.Main,
		],
		outputNames: [
			'Session Start',
			'User Speak',
			'Assistant Speak',
			'Assistant Speech Ended',
			'User Input Timeout',
			'Session End',
			'Fallback',
		],
		usableAsTool: true,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'lastNode',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
				],
				default: 'headerAuth',
				description: 'Method to authenticate incoming webhook requests',
			},
			{
				displayName: 'Header Name',
				name: 'headerName',
				type: 'string',
				default: 'X-API-TOKEN',
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
				description: 'Name of the header that contains the authentication token',
			},
			{
				displayName: 'Header Value',
				name: 'headerValue',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
				description: 'Expected value of the authentication header',
			},
			{
				displayName: 'Include Barge-In Flag',
				name: 'includeBargeIn',
				type: 'boolean',
				default: true,
				description:
					'Whether to include the barged_in flag in user_speak events (indicates user interrupted)',
			},
			{
				displayName: 'Debug Mode',
				name: 'debugMode',
				type: 'boolean',
				default: false,
				description:
					'Whether to include debug information in the output (raw bodyData, event type, etc.)',
			},
			{
				displayName: 'Fallback Behavior',
				name: 'fallbackBehavior',
				type: 'options',
				options: [
					{
						name: 'Unknown Events Only',
						value: 'unknownOnly',
						description: 'Route only unknown event types to fallback output',
					},
					{
						name: 'All Events',
						value: 'allEvents',
						description: 'Route all events to fallback output (ignore specific outputs)',
					},
				],
				default: 'unknownOnly',
				description: 'How to use the fallback output',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const bodyData = this.getBodyData();
		const authentication = this.getNodeParameter('authentication') as string;

		// Extract the actual event data
		// getBodyData() might return the data in different formats
		let event: IDataObject;
		if (bodyData && typeof bodyData === 'object') {
			// If body has a 'body' property, use that
			event = (bodyData as any).body || bodyData;
		} else {
			event = bodyData as IDataObject;
		}

		// Authenticate request
		if (authentication === 'headerAuth') {
			const headerName = this.getNodeParameter('headerName') as string;
			const expectedValue = this.getNodeParameter('headerValue') as string;
			const providedValue = req.headers[headerName.toLowerCase()];

			if (providedValue !== expectedValue) {
				return {
					webhookResponse: {
						status: 401,
						body: { error: 'Unauthorized' },
					},
					noWebhookResponse: false,
				};
			}
		}

		// Validate event structure
		if (!event || !event.type) {
			return {
				webhookResponse: {
					status: 400,
					body: { error: 'Invalid event: missing type field' },
				},
				noWebhookResponse: false,
			};
		}

		const eventType = event.type as string;

		// Map event type to output index
		const eventOutputMap: { [key: string]: number } = {
			session_start: 0,
			user_speak: 1,
			assistant_speak: 2,
			assistant_speech_ended: 3,
			user_input_timeout: 4,
			session_end: 5,
		};

		const FALLBACK_OUTPUT = 6;
		const specificOutputIndex = eventOutputMap[eventType];

		// Prepare output data - use the event directly
		const includeBargeIn = this.getNodeParameter('includeBargeIn') as boolean;
		const outputData: IDataObject = { ...event };

		// Handle barge-in flag
		if (!includeBargeIn && 'barged_in' in outputData) {
			delete outputData.barged_in;
		}

		const fallbackBehavior = this.getNodeParameter('fallbackBehavior') as string;

		// Determine which output to use based on fallback behavior
		let targetOutputIndex: number;

		if (fallbackBehavior === 'allEvents') {
			// Route all events to fallback
			targetOutputIndex = FALLBACK_OUTPUT;
		} else {
			// Route known events to specific output, unknown to fallback
			targetOutputIndex = specificOutputIndex !== undefined ? specificOutputIndex : FALLBACK_OUTPUT;
		}

		// Route to the determined output (either specific or fallback)
		const workflowData: INodeExecutionData[][] = Array(7)
			.fill(null)
			.map((_, index) => (index === targetOutputIndex ? [{ json: outputData }] : []));

		return {
			workflowData,
		};
	}
}
