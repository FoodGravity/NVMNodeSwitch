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
        const webviewViewProvider = {
            resolveWebviewView: (view: vscode.WebviewView) => {
                this.view = view;
                view.webview.options = {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(this.manager.context.extensionPath, 'assets'))]
                };

                const webviewPath = path.join(this.manager.context.extensionPath, 'assets', 'NVMNodeSwitch.html');
                let htmlContent = fs.readFileSync(webviewPath, 'utf8');
                htmlContent = htmlContent.replace(
                    /(href|src)="([^"]*)"/g,
                    (match, p1, p2) => {
                        const resourcePath = path.join(this.manager.context.extensionPath, 'assets', p2);
                        const resourceUri = view.webview.asWebviewUri(vscode.Uri.file(resourcePath));
                        return `${p1}="${resourceUri}"`;
                    }
                );
                view.webview.html = htmlContent;

                this.listener = view.webview.onDidReceiveMessage(
                    async (message) => {
                        await this.manager.executeCommand(message.sectionId, message.params);
                    }
                );
            }
        };

        vscode.window.registerWebviewViewProvider('NVMNodeSwitchWebview', webviewViewProvider);
    }

    public postMessage(sectionId: string, params: any, data: any, error?: string) {
        this.view?.webview.postMessage({ sectionId, params, data, error });
    }

    public dispose() {
        this.listener?.dispose();
    }
}
