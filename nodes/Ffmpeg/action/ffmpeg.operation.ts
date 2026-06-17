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

function getInputBinaryFields(inputBinaryFields: string, item: INodeExecutionData): string[] {
    const configuredFields = inputBinaryFields
        .split(',')
        .map((field) => field.trim())
        .filter(Boolean);

    if (configuredFields.length > 0) {
        return configuredFields;
    }

    return item.binary ? Object.keys(item.binary).slice(0, 1) : [];
}

function replaceInputPlaceholders(command: string, inputFilePaths: string[]): string {
    let commandWithInputs = command.split('{input}').join(inputFilePaths[0] || '');

    inputFilePaths.forEach((inputFilePath, index) => {
        commandWithInputs = commandWithInputs.split(`{input${index + 1}}`).join(inputFilePath);
    });

    return commandWithInputs;
}


export async function execute(
    this: IExecuteFunctions,
    items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
    const returnData: INodeExecutionData[] = [];

    const ffmpegCommand = this.getNodeParameter('command', 0) as string;
    const inputBinaryFields = this.getNodeParameter('inputBinaryFields', 0) as string;
    const outputFileName = this.getNodeParameter('outputFileName', 0) as string;
    const outputBinary = this.getNodeParameter('outputBinary', 0) as string;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.binary) continue;

        const outputExtension = path.extname(outputFileName || '') || '.mp4';
        const tempInputFilePaths: string[] = [];
        const tempOutputFilePath = path.join(os.tmpdir(), `output_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}${outputExtension}`);

        try {
            const binaryFields = getInputBinaryFields(inputBinaryFields, item);

            for (const [inputIndex, binaryField] of binaryFields.entries()) {
                const binaryInfo = item.binary[binaryField];

                if (!binaryInfo) {
                    throw new Error(`Binary field "${binaryField}" was not found on item ${i}`);
                }

                const inputExtension = path.extname(binaryInfo.fileName || '') || '.mp4';
                const tempInputFilePath = path.join(os.tmpdir(), `input_${Date.now()}_${i}_${inputIndex}_${Math.random().toString(36).slice(2)}${inputExtension}`);
                const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryField);
                fs.writeFileSync(tempInputFilePath, inputBuffer);
                tempInputFilePaths.push(tempInputFilePath);
            }

            const command = replaceInputPlaceholders(ffmpegCommand, tempInputFilePaths).replace('{output}', tempOutputFilePath);

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
            [...tempInputFilePaths, tempOutputFilePath].forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
        }
    } // end of for loop (each input item)

    return returnData;
}
