import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
import * as ffmpeg from './action/ffmpeg.operation';
import * as ffprobe from './action/ffprobe.operation';

export class Ffmpeg implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Ffmpeg',
		name: 'ffmpeg',
		icon: { dark: 'file:Ffmpeg.icon.svg', light: 'file:Ffmpeg.icon.svg' },
		group: ['transform'],
		version: 1,
		description: 'A node that uses ffmpeg to transform media',
		subtitle: '={{$parameter["tool"] + " " + $parameter["command"]}}',
		defaults: {
			name: 'Run ffmpeg',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Tool',
				name: 'tool',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Ffmpeg',
						value: 'ffmpeg'
					},
					{
						name: 'Ffprobe',
						value: 'ffprobe'
					}
				],
				default: 'ffmpeg'
			},
			{
				displayName: 'Output File Name',
				name: 'outputFileName',
				type: 'string',
				displayOptions: {
					show: {
						tool: ['ffmpeg']
					}
				},
				default: '',
				placeholder: 'output.mp4',
				description: 'The name of the output file',
			},
			{
				displayName: 'Output Binary',
				name: 'outputBinary',
				type: 'string',
				displayOptions: {
					show: {
						tool: ['ffmpeg']
					}
				},				
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
				description: 'The ffmpeg command to execute use {input} and {output} to refer to the input and output file. The {input} comes from binary output of the previous node.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[] = [];

		const tool = this.getNodeParameter('tool', 0) as string;
		this.logger.info("TOOL: " + tool);

		if (tool === 'ffmpeg') {
			returnData = await ffmpeg.execute.call(this, items);
		} else if (tool === 'ffprobe') {
			returnData = await ffprobe.execute.call(this, items);
		}
		
		return [returnData];
	}
}
