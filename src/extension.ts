import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
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
        this.outputChannel = vscode.window.createOutputChannel('NVMNode版本切换');
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
    private async executeCommand(command: string, requestId?: string) {
        this.log(`接收命令${command}`);
        // HTTP 请求处理
        if (command.includes('npmmirror') || command.includes('nodejs')) {
            return this.handleHttpRequest(command, requestId);
        }

        // 特殊命令处理
        switch (true) {
            case command === 'nvmrc check':
                return this.handleNvmrcCheck(command, requestId);
            case command.includes('create nvmrc'):
                return this.handleCreateNvmrc(command, requestId);
            case command === 'node recommend':
                return this.handleEngineRecommendation(command, requestId);
            case command.includes('confirm delete'):
                return this.handleConfirmDelete(command, requestId);
        }

        // 本地命令执行
        return this.executeLocalCommand(command, requestId);
    }

    /** 确认删除Node.js版本 */
    private async handleConfirmDelete(command: string, requestId?: string) {
        this.log(`调用确认框${command}`);
        const version = command.split(' ')[2];
        const result = await vscode.window.showInformationMessage(
            `确定要删除Node.js版本 ${version} 吗?`,
            { modal: true },
            '确定'
        );
        this.postMessage(command, result === '确定', undefined, requestId);
    }

    /** 处理HTTP请求 */
    private async handleHttpRequest(command: string, requestId?: string) {
        const url = command.split(' ')[1];
        try {
            const response = await fetch(url);
            const jsonData = await response.json();
            this.postMessage(command, jsonData, undefined, requestId);
        } catch (error: any) {
            this.handleError(command, error, requestId);
        }
    }

    /** 处理.nvmrc检查 */
    private handleNvmrcCheck(command: string, requestId?: string) {
        const workspaceRoot = vscode.workspace.rootPath || '';
        const nvmrcPath = path.join(workspaceRoot, '.nvmrc');
        const hasNvmrc = fs.existsSync(nvmrcPath);
        const content = hasNvmrc ? fs.readFileSync(nvmrcPath, 'utf8').trim() : '';
        this.postMessage(command, {
            found: hasNvmrc,
            version: content
        }, undefined, requestId);
    }
    /** 处理创建.nvmrc文件 */
    private handleCreateNvmrc(command: string, requestId?: string) {
        const nodeVersion = command.split(' ')[2] || '';
        const nvmrcPath = path.join(vscode.workspace.rootPath || '', '.nvmrc');
        fs.writeFileSync(nvmrcPath, nodeVersion);
        this.postMessage(command, fs.existsSync(nvmrcPath), undefined, requestId);
    }
    /** 处理引擎版本推荐 */
    private handleEngineRecommendation(command: string, requestId?: string) {
        try {
            const workspaceRoot = vscode.workspace.rootPath || '';
            const pkgPath = path.join(workspaceRoot, 'package.json');
            const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const engineVersion = pkgJson.engines?.node?.match(/\d+\.\d+\.\d+/)?.[0];
            this.postMessage(
                command,
                fs.existsSync(pkgPath) ? engineVersion : null,
                undefined,
                requestId);

        } catch (error: any) {
            this.handleError(command, error, requestId);
        }
    }

    /** 执行本地命令 */
    private async executeLocalCommand(command: string, requestId?: string) {
        try {
            const exe = process.platform === 'win32' ? `cmd.exe /c ${command}` : command;
            const child = spawn(exe, {
                shell: process.platform === 'win32' ? 'cmd.exe' : true,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const { output, errorOutput, exitCode } = await this.processCommandOutput(child);

            if (exitCode !== 0) {
                throw new Error(`退出码: ${exitCode}\n${errorOutput || output}`);
            }

            this.postMessage(command, output, undefined, requestId);
            this.log(`命令执行完成: ${exe}`);

        } catch (error) {
            this.handleError(command, error, requestId);
        }
    }
    /** 统一消息发送方法 */
    private postMessage(command: string, data: any, error?: string, requestId?: string) {
        this.log(`发送数据: ${command},${data},${error},${requestId}`)
        this.webviewView?.webview.postMessage({ command, data, error, requestId });
    }


    /** 统一错误处理方法 */
    private handleError(command: string, error: Error | unknown, requestId?: string) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        this.log(`执行出错: ${errorMessage}`);
        this.postMessage(command, null, errorMessage, requestId);
    }

    /** 处理命令输出 */
    private async processCommandOutput(child: ChildProcess) {
        let output = '';
        let errorOutput = '';

        child.stdout?.on('data', (data: Buffer) => {
            const chunk = decodeOutput(data);
            output += chunk;
            // this.log(`[输出]: ${chunk}`);
        });

        child.stderr?.on('data', (data: Buffer) => {
            const chunk = decodeOutput(data);
            errorOutput += chunk;
            // this.log(`[错误]: ${chunk}`);
        });

        const exitCode = await new Promise<number>((resolve) => {
            child.on('close', resolve);
        });

        return { output, errorOutput, exitCode };
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
                    // 修改 Webview 消息监听器部分
                    const listener = webviewView.webview.onDidReceiveMessage(
                        async (message) => {
                            await this.executeCommand(message.command, message.requestId);
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
