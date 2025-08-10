import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as childProcess from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { fileTypeFromFile } from 'file-type';

function runFfmpeg(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const ffmpegProcess = childProcess.spawn(ffmpegInstaller.path, command.split(" "), { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderrOutput = ""
        ffmpegProcess.stderr.on('data', (data: any) => {
            stderrOutput += data.toString();
        });
        ffmpegProcess.on('close', (code: any) => {            
            if (code === 0) {
                resolve(stderrOutput)
            } else {
                reject(new Error(`FFmpeg command failed with code ${code}. stderr: ${stderrOutput}`))
            }
        })
        ffmpegProcess.on('error', (error: any) => reject(new Error(`FFmpeg command failed with error: ${JSON.stringify(error)}, stderr: ${stderrOutput}`)))
    });
}


export async function execute(
    this: IExecuteFunctions,
    items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
    const returnData: INodeExecutionData[] = [];

    const ffmpegCommand = this.getNodeParameter('command', 0) as string;
    const outputFileName = this.getNodeParameter('outputFileName', 0) as string;
    const outputBinary = this.getNodeParameter('outputBinary', 0) as string;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.binary) continue;

        const [binaryKey] = Object.keys(item.binary);
        if (!binaryKey) continue;

        const binaryInfo = item.binary[binaryKey];
        if (!binaryInfo) continue;

        const inputExtension = path.extname(binaryInfo.fileName || '') || '.mp4';
        const tempInputFilePath = path.join(os.tmpdir(), `input_${Date.now()}${inputExtension}`);

        const outputExtension = path.extname(outputFileName || '') || '.mp4';
        const tempOutputFilePath = path.join(os.tmpdir(), `output_${Date.now()}${outputExtension}`);

        try {
            const command = ffmpegCommand.replace('{input}', tempInputFilePath).replace('{output}', tempOutputFilePath);
            const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryKey);
            fs.writeFileSync(tempInputFilePath, inputBuffer);

            await runFfmpeg(command);

            const outputData = fs.readFileSync(tempOutputFilePath);
            const fileSize = fs.statSync(tempOutputFilePath).size;

            const fileTypeResult = await fileTypeFromFile(tempOutputFilePath);
            let finalMimeType = fileTypeResult?.mime || 'application/octet-stream';

            returnData.push({
                json: {
                    ...item.json,
                    success: true,
                    fileSize
                },
                binary: {
                    [outputBinary]: await this.helpers.prepareBinaryData(outputData, outputFileName, finalMimeType),
                },
                pairedItem: {
                    item: i
                }
            });

        } catch (error) {
            if (this.continueOnFail()) {
                returnData.push({
                    json: {
                        ...item.json,
                        success: false,
                        error: error.message
                    },
                    pairedItem: {
                        item: i
                    }
                })
                continue;
            }
            throw error
        } finally {
            [tempInputFilePath, tempOutputFilePath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
        }
    } // end of for loop (each input item)

    return returnData;
}