import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function setupWebview(
    context: vscode.ExtensionContext,
    executeCommand: (command: string, requestId?: string) => Promise<void>
) {
    let webviewView: vscode.WebviewView | undefined;

    // 新增消息发送方法
    const postMessage = (command: string, data: any, error?: string, requestId?: string) => {
        webviewView?.webview.postMessage({ command, data, error, requestId });
    };

    const webviewViewProvider = {
        resolveWebviewView: (view: vscode.WebviewView) => {
            webviewView = view;
            view.webview.options = {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'assets'))]
            };

            const webviewPath = path.join(context.extensionPath, 'assets', 'NVMNodeSwitch.html');

            // 读取HTML内容并替换资源路径
            let htmlContent = fs.readFileSync(webviewPath, 'utf8');
            htmlContent = htmlContent.replace(
                /(href|src)="([^"]*)"/g,
                (match, p1, p2) => {
                    const resourcePath = path.join(context.extensionPath, 'assets', p2);
                    const resourceUri = view.webview.asWebviewUri(vscode.Uri.file(resourcePath));
                    return `${p1}="${resourceUri}"`;
                }
            );
            view.webview.html = htmlContent;

            // 添加消息监听器
            const listener = view.webview.onDidReceiveMessage(
                async (message) => {
                    await executeCommand(message.command, message.requestId);
                }
            );

            context.subscriptions.push(listener);
        }
    };

    vscode.window.registerWebviewViewProvider('NVMNodeSwitchWebview', webviewViewProvider);

    return { postMessage }
}
