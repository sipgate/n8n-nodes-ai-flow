import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class AiFlowTransfer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sipgate AI Flow Transfer',
		name: 'aiFlowTransfer',
		icon: 'file:aiflow-transfer.svg',
		group: ['transform'],
		version: 1,
		description: 'Transfer sipgate AI Flow call to another phone number',
		defaults: {
			name: 'sipgate AI Flow Transfer',
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
				displayName: 'Target Phone Number',
				name: 'targetPhoneNumber',
				type: 'string',
				default: '',
				required: true,
				description: 'Phone number to transfer the call to (E.164 format recommended)',
				placeholder: '+491234567890',
			},
			{
				displayName: 'Caller ID Name',
				name: 'callerIdName',
				type: 'string',
				default: '',
				required: true,
				description: 'Name to display as caller ID',
				placeholder: 'Support Department',
			},
			{
				displayName: 'Caller ID Number',
				name: 'callerIdNumber',
				type: 'string',
				default: '',
				required: true,
				description: 'Phone number to display as caller ID (E.164 format recommended)',
				placeholder: '+491234567890',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const sessionId = this.getNodeParameter('sessionId', i) as string;
				const targetPhoneNumber = this.getNodeParameter('targetPhoneNumber', i) as string;
				const callerIdName = this.getNodeParameter('callerIdName', i) as string;
				const callerIdNumber = this.getNodeParameter('callerIdNumber', i) as string;

				if (!sessionId) {
					throw new NodeOperationError(this.getNode(), 'Session ID is required', {
						itemIndex: i,
					});
				}

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

				const action: IDataObject = {
					type: 'transfer',
					session_id: sessionId,
					target_phone_number: targetPhoneNumber,
					caller_id_name: callerIdName,
					caller_id_number: callerIdNumber,
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
