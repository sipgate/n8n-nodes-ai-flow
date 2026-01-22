import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class AiFlowAudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sipgate AI Flow Audio',
		name: 'aiFlowAudio',
		icon: 'file:aiflow-audio.svg',
		group: ['transform'],
		version: 1,
		description: 'Play pre-recorded audio in sipgate AI Flow call',
		defaults: {
			name: 'sipgate AI Flow Audio',
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
						audioSource: ['binary'],
					},
				},
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
				const audioSource = this.getNodeParameter('audioSource', i) as string;
				const bargeInOptions = this.getNodeParameter('bargeInOptions', i) as IDataObject;

				if (!sessionId) {
					throw new NodeOperationError(this.getNode(), 'Session ID is required', {
						itemIndex: i,
					});
				}

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

				const action: IDataObject = {
					type: 'audio',
					session_id: sessionId,
					audio: audioBase64,
				};

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
