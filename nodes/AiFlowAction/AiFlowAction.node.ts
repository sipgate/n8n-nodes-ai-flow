import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class AiFlowAction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sipgate AI Flow',
		name: 'aiFlowAction',
		icon: 'file:aiflow.svg',
		group: ['transform'],
		version: 1,
		description: 'Control sipgate AI Flow calls with various actions',
		defaults: {
			name: 'sipgate AI Flow',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Barge-In',
						value: 'bargeIn',
						description: 'Manually interrupt playback',
						action: 'Interrupt playback',
					},
					{
						name: 'Hangup',
						value: 'hangup',
						description: 'End the call',
						action: 'End the call',
					},
					{
						name: 'Play Audio',
						value: 'audio',
						description: 'Play pre-recorded audio',
						action: 'Play audio file',
					},
					{
						name: 'Speak',
						value: 'speak',
						description: 'Make the AI assistant speak text or SSML',
						action: 'Make the assistant speak',
					},
					{
						name: 'Transfer Call',
						value: 'transfer',
						description: 'Transfer call to another phone number',
						action: 'Transfer the call',
					},
				],
				default: 'speak',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '={{$json.session.id}}',
				required: true,
				description: 'The session ID from the AI Flow event',
				placeholder: '550e8400-e29b-41d4-a716-446655440000',
			},

			// ===== SPEAK OPERATION =====
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
				displayOptions: {
					show: {
						operation: ['speak'],
					},
				},
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
						operation: ['speak'],
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
						operation: ['speak'],
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
				displayOptions: {
					show: {
						operation: ['speak'],
					},
				},
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
				displayOptions: {
					show: {
						operation: ['speak'],
					},
				},
				description: 'Text-to-speech provider to use',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'en-US',
				displayOptions: {
					show: {
						operation: ['speak'],
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
						operation: ['speak'],
						ttsProvider: ['azure', 'eleven_labs'],
					},
				},
				description: 'Voice name or ID (Azure: en-US-JennyNeural, ElevenLabs: voice ID)',
				placeholder: 'en-US-JennyNeural or 21m00Tcm4TlvDq8ikWAM',
			},

			// ===== AUDIO OPERATION =====
			{
				displayName: 'Audio Source',
				name: 'audioSource',
				type: 'options',
				options: [
					{
						name: 'Base64 String',
						value: 'base64',
						description: 'Provide audio as base64 encoded string',
					},
					{
						name: 'Binary Data',
						value: 'binary',
						description: 'Use binary data from previous node',
					},
				],
				default: 'base64',
				displayOptions: {
					show: {
						operation: ['audio'],
					},
				},
				description: 'Source of the audio data',
			},
			{
				displayName: 'Audio (Base64)',
				name: 'audioBase64',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['audio'],
						audioSource: ['base64'],
					},
				},
				description: 'Base64 encoded WAV audio (16kHz, mono, 16-bit PCM)',
				placeholder: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['audio'],
						audioSource: ['binary'],
					},
				},
				description: 'Name of the binary property containing the audio file',
			},
			{
				displayName: 'Audio Format Requirements',
				name: 'formatNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						operation: ['audio'],
						audioSource: ['binary'],
					},
				},
			},

			// ===== TRANSFER OPERATION =====
			{
				displayName: 'Target Phone Number',
				name: 'targetPhoneNumber',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['transfer'],
					},
				},
				description: 'Phone number to transfer the call to (E.164 format recommended)',
				placeholder: '+491234567890',
			},
			{
				displayName: 'Caller ID Name',
				name: 'callerIdName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['transfer'],
					},
				},
				description: 'Name to display as caller ID',
				placeholder: 'Support Department',
			},
			{
				displayName: 'Caller ID Number',
				name: 'callerIdNumber',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['transfer'],
					},
				},
				description: 'Phone number to display as caller ID (E.164 format recommended)',
				placeholder: '+491234567890',
			},

			// ===== BARGE-IN OPTIONS (for speak and audio) =====
			{
				displayName: 'Barge-In Options',
				name: 'bargeInOptions',
				type: 'collection',
				placeholder: 'Add Barge-In Option',
				default: {},
				displayOptions: {
					show: {
						operation: ['speak', 'audio'],
					},
				},
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
				const operation = this.getNodeParameter('operation', i) as string;
				const sessionId = this.getNodeParameter('sessionId', i) as string;

				if (!sessionId) {
					throw new NodeOperationError(this.getNode(), 'Session ID is required', {
						itemIndex: i,
					});
				}

				const action: IDataObject = {
					session_id: sessionId,
				};

				// Execute based on operation
				switch (operation) {
					case 'speak': {
						action.type = 'speak';

						const contentType = this.getNodeParameter('contentType', i) as string;
						const userInputTimeout = this.getNodeParameter('userInputTimeout', i) as number;
						const ttsProvider = this.getNodeParameter('ttsProvider', i) as string;
						const bargeInOptions = this.getNodeParameter('bargeInOptions', i) as IDataObject;

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
						break;
					}

					case 'audio': {
						action.type = 'audio';

						const audioSource = this.getNodeParameter('audioSource', i) as string;
						const bargeInOptions = this.getNodeParameter('bargeInOptions', i) as IDataObject;

						let audioBase64: string;

						if (audioSource === 'base64') {
							audioBase64 = this.getNodeParameter('audioBase64', i) as string;
							if (!audioBase64) {
								throw new NodeOperationError(this.getNode(), 'Audio base64 string is required', {
									itemIndex: i,
								});
							}
						} else {
							// Get from binary data
							const binaryPropertyName = this.getNodeParameter('binaryProperty', i) as string;
							const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);

							if (!binaryData.data) {
								throw new NodeOperationError(
									this.getNode(),
									`Binary property '${binaryPropertyName}' does not contain data`,
									{ itemIndex: i },
								);
							}

							audioBase64 = binaryData.data;
						}

						action.audio = audioBase64;

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
						break;
					}

					case 'transfer': {
						action.type = 'transfer';

						const targetPhoneNumber = this.getNodeParameter('targetPhoneNumber', i) as string;
						const callerIdName = this.getNodeParameter('callerIdName', i) as string;
						const callerIdNumber = this.getNodeParameter('callerIdNumber', i) as string;

						if (!targetPhoneNumber) {
							throw new NodeOperationError(this.getNode(), 'Target phone number is required', {
								itemIndex: i,
							});
						}

						if (!callerIdName) {
							throw new NodeOperationError(this.getNode(), 'Caller ID name is required', {
								itemIndex: i,
							});
						}

						if (!callerIdNumber) {
							throw new NodeOperationError(this.getNode(), 'Caller ID number is required', {
								itemIndex: i,
							});
						}

						action.target_phone_number = targetPhoneNumber;
						action.caller_id_name = callerIdName;
						action.caller_id_number = callerIdNumber;
						break;
					}

					case 'hangup': {
						action.type = 'hangup';
						break;
					}

					case 'bargeIn': {
						action.type = 'barge_in';
						break;
					}

					default:
						throw new NodeOperationError(
							this.getNode(),
							`Unknown operation: ${operation}`,
							{ itemIndex: i },
						);
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
