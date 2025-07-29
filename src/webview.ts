import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { NVMNodeSwitch } from './extension';

export class Webview implements vscode.Disposable {
    private manager: NVMNodeSwitch;
    public view?: vscode.WebviewView;
    private listener?: vscode.Disposable;
    constructor(manager: NVMNodeSwitch) {
        this.manager = manager;
        this.setupWebview();
    }

    private setupWebview() {
        // 提取公共路径部分
        const webPath = path.join(this.manager.context.extensionPath, 'web');
        // 注册 Webview 视图提供者
        vscode.window.registerWebviewViewProvider('NVMNodeSwitchWebview', {
            resolveWebviewView: async (view) => {
                this.view = view;
                // 配置 Webview 选项
                view.webview.options = {
                    enableScripts: true,
                    localResourceRoots: [
                        vscode.Uri.file(webPath)
                    ]
                };

                // 读取并处理 HTML 内容
                const htmlPath = vscode.Uri.file(path.join(webPath, 'NVMNodeSwitch.html'));
                const htmlContent = await vscode.workspace.fs.readFile(htmlPath);
                let html = Buffer.from(htmlContent).toString('utf8');

                html = html.replace(
                    /(href|src)="([^"]*)"/g,
                    (_, p1, p2) =>
                        `${p1}="${view.webview.asWebviewUri(
                            vscode.Uri.file(path.join(webPath, p2))
                        )}"`
                );

                view.webview.html = html;
                // 监听 Webview 消息
                this.listener = view.webview.onDidReceiveMessage(
                    async (message) =>
                        await this.manager.executeCommand(message.sectionId, message.params)
                );
            }
        });
    }

    public postMessage(sectionId: string, params: any, data: any, error?: string) {
        this.manager.log(`发送命令${sectionId} ,${params} ,${data}, ${error}`);
        this.view?.webview.postMessage({ sectionId, params, data, error });
    }

    public dispose() {
        this.listener?.dispose();
    }
}
