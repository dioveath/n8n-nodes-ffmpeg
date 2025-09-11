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


export async function execute(
    this: IExecuteFunctions,
    items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
    const returnData: INodeExecutionData[] = [];

    const ffprobeCommand = this.getNodeParameter('command', 0) as string;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.binary) continue;

        const [binaryKey] = Object.keys(item.binary);
        if (!binaryKey) continue;

        const binaryInfo = item.binary[binaryKey];
        if (!binaryInfo) continue;

        const inputExtension = path.extname(binaryInfo.fileName || '') || '.mp4';
        const tempInputFilePath = path.join(os.tmpdir(), `input_${Date.now()}${inputExtension}`);

        try {
            const inputBuffer = await this.helpers.getBinaryDataBuffer(i, binaryKey);
            fs.writeFileSync(tempInputFilePath, inputBuffer);

            // Replace {input} in the ffprobe command
            const command = ffprobeCommand.replace('{input}', tempInputFilePath);

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
            fs.existsSync(tempInputFilePath) && fs.unlinkSync(tempInputFilePath);
        }
    }

    return returnData;
}