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
		icon: { dark: 'file:Ffmpeg.icon.svg', light: 'file:Ffmpeg.icon.svg' },
		group: ['transform'],
		version: 1,
		description: 'A node that uses ffmpeg to transform media',
		subtitle: '={{"ffmpeg " + $parameter["command"]}}',
		defaults: {
			name: 'Run ffmpeg',
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
				placeholder: '-ss 0 -i {input} -t 30 -c copy {output}',
				description: 'The ffmpeg command to execute use {input} and {output} to refer to the input and output files',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[] = [];

		returnData = await ffmpeg.execute.call(this, items);
		
		return [returnData];
	}
}
