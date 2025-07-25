import { ChildProcess, spawn } from 'child_process';
import { decodeOutput } from './encodingUtils';

/** 执行命令并返回输出结果 */
export async function localExecuteCommand(command: string) {
    const exe = process.platform === 'win32' ? `cmd.exe /c ${command}` : command;
    const child = spawn(exe, {
        shell: process.platform === 'win32' ? 'cmd.exe' : true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data: Buffer) => {
        output += decodeOutput(data);
    });

    child.stderr?.on('data', (data: Buffer) => {
        errorOutput += decodeOutput(data);
    });

    const exitCode = await new Promise<number>((resolve) => {
        child.on('close', resolve);
    });

    if (exitCode !== 0) {
        throw new Error(`命令执行失败 (${exitCode}): ${errorOutput || output}`);
    }

    return output;
}
