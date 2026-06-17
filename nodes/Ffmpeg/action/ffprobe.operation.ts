import { IExecuteFunctions, INodeExecutionData } from "n8n-workflow";
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as childProcess from 'child_process';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

function runFfprobe(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const ffprobeProcess = childProcess.spawn(ffprobeInstaller.path, command.split(" "), { stdio: ['ignore', 'pipe', 'pipe']});
        let stdoutOutput = "";
        let stderrOutput = "";
        
        ffprobeProcess.stdout.on('data', (data: any) => {
            stdoutOutput += data.toString();
        })

        ffprobeProcess.stderr.on('data', (data: any) => {
            stderrOutput += data.toString();
        })

        ffprobeProcess.on('close', (code: any) => {
            if (code === 0) {
                resolve(stdoutOutput || stderrOutput);
            } else {
                reject(new Error(`ffprobe command failed with code ${code}. stderr: ${stderrOutput}`));
            }
        })

        ffprobeProcess.on('error', (error: any) => 
            reject(new Error(`ffprobe command failed with error: ${JSON.stringify(error)}, stderr: ${stderrOutput}`))
        );        
    })
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

    const ffprobeCommand = this.getNodeParameter('command', 0) as string;
    const inputBinaryFields = this.getNodeParameter('inputBinaryFields', 0) as string;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.binary) continue;

        const tempInputFilePaths: string[] = [];

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

            const command = replaceInputPlaceholders(ffprobeCommand, tempInputFilePaths);

            const probeOutput = await runFfprobe(command);
            let parsedOutput: any = probeOutput;

            try {
                parsedOutput = JSON.parse(probeOutput); // if JSON requested
            } catch {
                // fallback: keep as raw text
            }

            returnData.push({
                json: {
                    ...item.json,
                    success: true,
                    metadata: parsedOutput,
                },
                pairedItem: {
                    item: i,
                },
            });

        } catch (error) {
            if (this.continueOnFail()) {
                returnData.push({
                    json: {
                        ...item.json,
                        success: false,
                        error: error.message,
                    },
                    pairedItem: {
                        item: i,
                    },
                });
                continue;
            }
            throw error;
        } finally {
            tempInputFilePaths.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));
        }
    }

    return returnData;
}
