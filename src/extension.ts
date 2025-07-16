import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as iconv from 'iconv-lite';


let DEFAULT_ENCODING = 'GB2312'; // 默认编码，直接使用默认值
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
const decodeOutput = (buffer: Buffer): string => {
    return iconv.decode(buffer, DEFAULT_ENCODING).replace(/\0/g, '');
};

class NodeVersionManager {
    // 扩展上下文和输出通道
    private context: vscode.ExtensionContext;
    // 输出通道，用于记录日志
    private outputChannel: vscode.OutputChannel;

    /** 记录日志消息 */
    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }
    /// Webview视图和终端
    private webviewView: vscode.WebviewView | undefined;

    /// 构造函数，初始化扩展上下文和输出通道
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Node Version Manager');
    }

    /** 激活扩展并打开Webview */
    public activate() {
        this.setDefaultEncoding();
        this.openWebview();
    }

    /** 设置默认编码 */
    private async setDefaultEncoding() {
        try {
            const child = spawn('chcp', { shell: 'cmd.exe' });
            let output = '';

            for await (const data of child.stdout) {
                output += decodeOutput(data);
            }

            const codePage = output.match(/(\d+)/)?.[1] || '936';
            DEFAULT_ENCODING = CODE_PAGE_TO_ENCODING[codePage] || 'GB2312';
            this.log(`默认编码设置为 ${DEFAULT_ENCODING}`);
        } catch (error) {
            DEFAULT_ENCODING = 'GB2312';
            this.log(`设置编码出错，使用默认编码 ${DEFAULT_ENCODING}`);
        }
    }

    /** 执行Webview命令并返回结果 */
    private async executeCommand(command: string) {
        try {
            const exe = process.platform === 'win32' ? `cmd.exe /c ${command}` : command;
            this.log(`执行命令: ${exe}`);
            // 使用 spawn 执行命令
            const child = spawn(exe, {
                shell: process.platform === 'win32' ? 'cmd.exe' : true,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let output = '';
            let errorOutput = '';
            // 使用 iconv-lite 解码输出
            child.stdout.on('data', (data: Buffer) => {
                const chunk = decodeOutput(data);
                output += chunk;
                this.log(`[输出]: ${chunk}`);
            });
            // 捕获错误输出
            child.stderr.on('data', (data: Buffer) => {
                const chunk = decodeOutput(data);
                errorOutput += chunk;
                this.log(`[错误]: ${chunk}`);
            });
            // 等待子进程结束
            const exitCode = await new Promise<number>((resolve) => {
                child.on('close', resolve);
            });
            // 确保输出和错误输出都被记录
            if (errorOutput) { this.log(`命令错误: ${errorOutput}`); }
            // 将结果发送到Webview
            if (this.webviewView) {
                const errorToSend = exitCode !== 0 ? (errorOutput || `命令执行失败，退出码: ${exitCode}`) : undefined;
                this.webviewView.webview.postMessage({
                    command,
                    data: output,
                    error: errorToSend
                });
            }
            // 如果退出码不是0，抛出错误
            if (exitCode === 0) {
                this.log(`命令执行${exe}完成，退出码: ${exitCode}`);
            } else {
                this.log(`命令执行失败，退出码: ${exitCode}`);
                throw new Error(`命令执行失败，退出码: ${exitCode}\n${errorOutput || output}`);
            }
            return output;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.log(`执行出错: ${errorMessage}`);
            // 将错误信息发送到Webview
            if (this.webviewView) {
                this.webviewView.webview.postMessage({
                    command,
                    error: errorMessage
                });
            }

            throw error;
        }
    }

    /** 辅助方法：获取Webview资源的URI */
    private getWebviewUri(...pathSegments: string[]): string {
        return this.webviewView?.webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, ...pathSegments))).toString() || '';
    }

    /** 打开Webview视图 */
    public openWebview() {
        const webviewViewProvider = {
            resolveWebviewView: (webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) => {
                webviewView.webview.options = {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'assets'))]
                };
    
                const webviewPath = path.join(this.context.extensionPath, 'assets', 'NVMNodeSwitch.html');
                this.webviewView = webviewView;
    
                // 读取HTML内容并替换资源路径
                let htmlContent = fs.readFileSync(webviewPath, 'utf8');
                // 替换资源路径为Webview可访问的URI
                htmlContent = htmlContent.replace(
                    /(href|src)="([^"]*)"/g,
                    (match, p1, p2) => {
                        const resourcePath = path.join(this.context.extensionPath, 'assets', p2);
                        const resourceUri = webviewView.webview.asWebviewUri(vscode.Uri.file(resourcePath));
                        return `${p1}="${resourceUri}"`;
                    }
                );
                webviewView.webview.html = htmlContent;

                // 添加消息监听器，并确保在添加前 webviewView 已初始化
                if (this.webviewView) {
                    const listener = webviewView.webview.onDidReceiveMessage(
                        command => {
                            this.executeCommand(command);
                        },
                        undefined,
                        this.context.subscriptions
                    );
                    // 确保 listener 是有效的 Disposable 对象
                    if (listener && typeof listener.dispose === 'function') {
                        this.context.subscriptions.push(listener);
                    }
                }
            }
        };

        vscode.window.registerWebviewViewProvider('nodeVersionManagerWebview', webviewViewProvider);
    }
}
/** VS Code扩展激活函数 */
export function activate(context: vscode.ExtensionContext) {
    const manager = new NodeVersionManager(context);
    manager.activate();
}

/** VS Code扩展卸载函数 */
export function deactivate() {
    // 在扩展卸载时执行清理操作
    // 由于某些对象可能没有实现 dispose 方法，我们在这里捕获错误
    try {
        // 没有额外的清理操作需要执行，因为 context.subscriptions 会自动处理
    } catch (error) {
        console.error('扩展卸载时发生错误:', error);
    }
}
