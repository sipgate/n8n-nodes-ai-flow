import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class AiFlowBargeIn implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sipgate AI Flow Barge-In',
		name: 'aiFlowBargeIn',
		icon: 'file:aiflow-bargein.svg',
		group: ['transform'],
		version: 1,
		description: 'Manually interrupt sipgate AI Flow playback',
		defaults: {
			name: 'sipgate AI Flow Barge-In',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const sessionId = this.getNodeParameter('sessionId', i) as string;

				if (!sessionId) {
					throw new NodeOperationError(this.getNode(), 'Session ID is required', {
						itemIndex: i,
					});
				}

				const action: IDataObject = {
					type: 'barge_in',
					session_id: sessionId,
				};

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
