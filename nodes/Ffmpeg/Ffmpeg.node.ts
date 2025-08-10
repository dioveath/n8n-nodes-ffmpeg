import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import * as ffmpeg from './action/ffmpeg.operation';

export class Ffmpeg implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ffmpeg',
		name: 'ffmpeg',
		group: ['transform'],
		version: 1,
		description: 'A node that uses ffmpeg to transform media',
		defaults: {
			name: 'Ffmpeg',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Output File Name',
				name: 'outputFileName',
				type: 'string',
				default: '',
				placeholder: 'output.mp4',
				description: 'The name of the output file',
			},
			{
				displayName: 'Output Binary',
				name: 'outputBinary',
				type: 'string',
				default: 'data',
				placeholder: 'data',
				description: 'The description text',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				default: '',
				placeholder: '-i {input} -c:v libx264 -c:a aac {output}',
				description: 'The ffmpeg command to execute use {input} and {output} to refer to the input and output files',
			},
		],
	};

	// The function below is responsible for actually doing whatever this node
	// is supposed to do. In this case, we're just appending the `myString` property
	// with whatever the user has entered.
	// You can make async calls and use `await`.
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[] = [];

		returnData = await ffmpeg.execute.call(this, items);
		
		return [returnData];
	}
}
