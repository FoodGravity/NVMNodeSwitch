import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { NodeVersionManager } from './extension';

export class WebviewManager {
    private webviewView: vscode.WebviewView | undefined;
    private manager: NodeVersionManager;

    constructor(manager: NodeVersionManager) {
        this.manager = manager;
    }

    public createWebview() {
        const webviewViewProvider = {
            resolveWebviewView: (webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken) => {
                webviewView.webview.options = {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.file(path.join(this.manager.context.extensionPath, 'assets'))]
                };

                const webviewPath = path.join(this.manager.context.extensionPath, 'assets', 'NVMNodeSwitch.html');
                this.webviewView = webviewView;

                let htmlContent = fs.readFileSync(webviewPath, 'utf8');
                htmlContent = htmlContent.replace(
                    /(href|src)="([^"]*)"/g,
                    (match, p1, p2) => {
                        const resourcePath = path.join(this.manager.context.extensionPath, 'assets', p2);
                        const resourceUri = webviewView.webview.asWebviewUri(vscode.Uri.file(resourcePath));
                        return `${p1}="${resourceUri}"`;
                    }
                );
                webviewView.webview.html = htmlContent;

                if (this.webviewView) {
                    const listener = webviewView.webview.onDidReceiveMessage(
                        async (message) => {
                            await this.manager.executeCommand(message.command, message.requestId);
                        },
                        undefined,
                        this.manager.context.subscriptions
                    );
                    if (listener && typeof listener.dispose === 'function') {
                        this.manager.context.subscriptions.push(listener);
                    }
                }
            }
        };

        vscode.window.registerWebviewViewProvider('nodeVersionManagerWebview', webviewViewProvider);
    }
}
