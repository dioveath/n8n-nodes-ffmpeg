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
				displayName: 'Input Binary Fields',
				name: 'inputBinaryFields',
				type: 'string',
				default: '',
				placeholder: 'data, audio, subtitle',
				description: 'Comma-separated binary field names to use as inputs. Leave empty to use the first binary field. Use {input}, {input1}, {input2}, etc. in the command.',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				default: '',
				placeholder: '-i {input1} -i {input2} -c copy {output}',
				description: 'The command to execute. Use {input} or {input1}, {input2}, etc. for input files and {output} for ffmpeg output.',
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
