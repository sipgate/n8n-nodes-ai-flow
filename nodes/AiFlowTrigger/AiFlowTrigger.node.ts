import type {
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
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
		],
		outputNames: [
			'Session Start',
			'User Speak',
			'Assistant Speak',
			'Assistant Speech Ended',
			'User Input Timeout',
			'Session End',
		],
		usableAsTool: true,
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
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
				displayName: 'Response Mode',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'No Response',
						value: 'noResponse',
						description: 'Return 204 No Content',
					},
					{
						name: 'Return Last Node',
						value: 'lastNode',
						description: 'Return data from the last node in the workflow',
					},
				],
				default: 'noResponse',
				description: 'How to respond to the webhook',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData();
		const authentication = this.getNodeParameter('authentication') as string;

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
		const event = body as IDataObject;
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

		const outputIndex = eventOutputMap[eventType];

		// If event type is unknown, return error
		if (outputIndex === undefined) {
			return {
				webhookResponse: {
					status: 400,
					body: { error: `Unknown event type: ${eventType}` },
				},
				noWebhookResponse: false,
			};
		}

		// Prepare output data
		const includeBargeIn = this.getNodeParameter('includeBargeIn') as boolean;
		const outputData: IDataObject = {
			eventType: event.type,
			session: event.session,
			...event,
		};

		// Handle barge-in flag
		if (!includeBargeIn && 'barged_in' in outputData) {
			delete outputData.barged_in;
		}

		const responseMode = this.getNodeParameter('responseMode') as string;

		// Route to the correct output
		const workflowData: Array<Array<{ json: IDataObject }>> = Array(6)
			.fill(null)
			.map((_, index) => (index === outputIndex ? [{ json: outputData }] : []));

		return {
			workflowData,
			webhookResponse:
				responseMode === 'noResponse'
					? {
							status: 204,
							body: '',
						}
					: undefined,
		};
	}
}
