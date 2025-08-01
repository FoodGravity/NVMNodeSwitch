import { spawn } from 'child_process';
import { TextDecoder } from 'util'; // Node.js 内置模块

let DEFAULT_ENCODING = 'GB2312';

const CODE_PAGE_TO_ENCODING: { [key: string]: string } = {
    '936': 'GB2312',
    '54936': 'GB18030',
    '20936': 'GBK',
    '65001': 'UTF-8',
    '28591': 'latin1',
    '1200': 'UTF-16LE',
    '1201': 'UTF-16BE'
};

/** 解码命令输出缓冲区为字符串 */
export const decodeOutput = (buffer: Buffer): string => {
    return new TextDecoder(DEFAULT_ENCODING).decode(buffer).replace(/\0/g, '');
};

/** 设置默认编码 */
export async function setDefaultEncoding(log: (message: string) => void) {
    try {
        const child = spawn('chcp', { shell: 'cmd.exe' });
        let output = '';

        for await (const data of child.stdout) {
            output += decodeOutput(data);
        }

        const codePage = output.match(/(\d+)/)?.[1] || '936';
        DEFAULT_ENCODING = CODE_PAGE_TO_ENCODING[codePage] || 'GB2312';
        log(`默认编码设置为 ${DEFAULT_ENCODING}`);
    } catch (error) {
        DEFAULT_ENCODING = 'GB2312';
        log(`设置编码出错，使用默认编码 ${DEFAULT_ENCODING}`);
    }
}
