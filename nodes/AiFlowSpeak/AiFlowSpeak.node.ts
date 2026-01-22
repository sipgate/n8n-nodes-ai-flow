import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class AiFlowSpeak implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sipgate AI Flow Speak',
		name: 'aiFlowSpeak',
		icon: 'file:aiflow-speak.svg',
		group: ['transform'],
		version: 1,
		description: 'Make the sipgate AI Flow assistant speak text or SSML',
		defaults: {
			name: 'sipgate AI Flow Speak',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{$json.session.id}}',
				required: true,
				description: 'The session ID from the AI Flow event',
				placeholder: '550e8400-e29b-41d4-a716-446655440000',
			},
			{
				displayName: 'Content Type',
				name: 'contentType',
				type: 'options',
				options: [
					{
						name: 'Text',
						value: 'text',
						description: 'Plain text to speak',
					},
					{
						name: 'SSML',
						value: 'ssml',
						description: 'SSML markup for advanced control',
					},
				],
				default: 'text',
				description: 'Type of content to speak',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						contentType: ['text'],
					},
				},
				description: 'The text the assistant should speak',
				placeholder: 'Hello! How can I help you today?',
			},
			{
				displayName: 'SSML',
				name: 'ssml',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						contentType: ['ssml'],
					},
				},
				description: 'SSML markup for advanced speech control',
				placeholder:
					'<speak><prosody rate="slow">Please listen carefully.</prosody></speak>',
			},
			{
				displayName: 'User Input Timeout (Seconds)',
				name: 'userInputTimeout',
				type: 'number',
				default: 0,
				description:
					'Timeout in seconds to wait for user input after speech ends. 0 = no timeout.',
				placeholder: '8',
			},
			{
				displayName: 'TTS Provider',
				name: 'ttsProvider',
				type: 'options',
				options: [
					{
						name: 'Default',
						value: 'default',
						description: 'Use the default TTS provider configured in AI Flow',
					},
					{
						name: 'Azure',
						value: 'azure',
						description: 'Azure Cognitive Services TTS',
					},
					{
						name: 'ElevenLabs',
						value: 'eleven_labs',
						description: 'ElevenLabs TTS',
					},
				],
				default: 'default',
				description: 'Text-to-speech provider to use',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'en-US',
				displayOptions: {
					show: {
						ttsProvider: ['azure'],
					},
				},
				description: 'Language code for Azure TTS',
				placeholder: 'en-US, de-DE, en-GB',
			},
			{
				displayName: 'Voice',
				name: 'voice',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						ttsProvider: ['azure', 'eleven_labs'],
					},
				},
				description: 'Voice name or ID (Azure: en-US-JennyNeural, ElevenLabs: voice ID)',
				placeholder: 'en-US-JennyNeural or 21m00Tcm4TlvDq8ikWAM',
			},
			{
				displayName: 'Barge-In Options',
				name: 'bargeInOptions',
				type: 'collection',
				placeholder: 'Add Barge-In Option',
				default: {},
				options: [
					{
						displayName: 'Strategy',
						name: 'strategy',
						type: 'options',
						options: [
							{
								name: 'Minimum Characters',
								value: 'minimum_characters',
								description: 'Allow barge-in after minimum characters detected',
							},
							{
								name: 'Manual',
								value: 'manual',
								description: 'Only allow manual barge-in via API',
							},
							{
								name: 'None',
								value: 'none',
								description: 'Disable barge-in completely',
							},
						],
						default: 'minimum_characters',
						description: 'Barge-in detection strategy',
					},
					{
						displayName: 'Minimum Characters',
						name: 'minimumCharacters',
						type: 'number',
						default: 3,
						description: 'Minimum characters before barge-in is allowed',
						displayOptions: {
							show: {
								strategy: ['minimum_characters'],
							},
						},
					},
					{
						displayName: 'Allow After (Ms)',
						name: 'allowAfterMs',
						type: 'number',
						default: 0,
						description: 'Delay in milliseconds before barge-in is allowed',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const sessionId = this.getNodeParameter('sessionId', i) as string;
				const contentType = this.getNodeParameter('contentType', i) as string;
				const userInputTimeout = this.getNodeParameter('userInputTimeout', i) as number;
				const ttsProvider = this.getNodeParameter('ttsProvider', i) as string;
				const bargeInOptions = this.getNodeParameter('bargeInOptions', i) as IDataObject;

				if (!sessionId) {
					throw new NodeOperationError(this.getNode(), 'Session ID is required', {
						itemIndex: i,
					});
				}

				const action: IDataObject = {
					type: 'speak',
					session_id: sessionId,
				};

				// Add text or SSML
				if (contentType === 'text') {
					const text = this.getNodeParameter('text', i) as string;
					if (!text) {
						throw new NodeOperationError(this.getNode(), 'Text is required', {
							itemIndex: i,
						});
					}
					action.text = text;
				} else {
					const ssml = this.getNodeParameter('ssml', i) as string;
					if (!ssml) {
						throw new NodeOperationError(this.getNode(), 'SSML is required', {
							itemIndex: i,
						});
					}
					action.ssml = ssml;
				}

				// Add user input timeout
				if (userInputTimeout > 0) {
					action.user_input_timeout_seconds = userInputTimeout;
				}

				// Add TTS provider config
				if (ttsProvider !== 'default') {
					const tts: IDataObject = {
						provider: ttsProvider,
					};

					if (ttsProvider === 'azure') {
						const language = this.getNodeParameter('language', i) as string;
						const voice = this.getNodeParameter('voice', i) as string;
						if (language) tts.language = language;
						if (voice) tts.voice = voice;
					} else if (ttsProvider === 'eleven_labs') {
						const voice = this.getNodeParameter('voice', i) as string;
						if (voice) tts.voice = voice;
					}

					action.tts = tts;
				}

				// Add barge-in config
				if (bargeInOptions && Object.keys(bargeInOptions).length > 0) {
					const bargeIn: IDataObject = {};
					if (bargeInOptions.strategy) {
						bargeIn.strategy = bargeInOptions.strategy;
					}
					if (
						bargeInOptions.minimumCharacters !== undefined &&
						bargeInOptions.strategy === 'minimum_characters'
					) {
						bargeIn.minimum_characters = bargeInOptions.minimumCharacters;
					}
					if (bargeInOptions.allowAfterMs !== undefined) {
						bargeIn.allow_after_ms = bargeInOptions.allowAfterMs;
					}
					if (Object.keys(bargeIn).length > 0) {
						action.barge_in = bargeIn;
					}
				}

				returnData.push({
					json: action,
					pairedItem: i,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: i,
					});
				} else {
					throw error;
				}
			}
		}

		return [returnData];
	}
}
