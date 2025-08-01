import { spawn } from 'child_process';
// import { decodeOutput } from './encodingUtils';

/** 执行命令并返回输出结果 */
export async function localExecuteCommand(command: string) {
    const exe = process.platform === 'win32' ? `cmd.exe /c ${command}` : command;
    const child = spawn(exe, {
        shell: process.platform === 'win32' ? 'cmd.exe' : true,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    child.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
        error += data.toString();
    });

    const exitCode = await new Promise<number>((resolve) => {
        child.on('close', resolve);
    });

    // 可配置的错误关键词数组（可按需添加）
    const errorKeywords = [
        'error', 'fail', 'warning',
        'not found', '无法', '失败',
        '警告', 'missing', 'not installed'
    ];
    const errorPattern = new RegExp(`(${errorKeywords.join('|')})`, 'i');

    if ((exitCode !== 0 && !error) || errorPattern.test(output)) {
        error = output;
        output = '';
    }
    return {
        output,
        error,
    };
}
