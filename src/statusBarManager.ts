import * as vscode from 'vscode';
import { NodeVersionManager } from './extension';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private manager: NodeVersionManager;

    constructor(manager: NodeVersionManager) {
        this.manager = manager;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'nvm.showInstalledVersions';
        this.manager.context.subscriptions.push(this.statusBarItem);
    }

    public updateStatusBar(currentVersion?: string) {
        this.statusBarItem.text = `Node: ${currentVersion || '未选择'}`;
        this.statusBarItem.tooltip = '点击查看/切换 Node 版本';
        this.statusBarItem.show();
    }

    public registerCommands() {
        this.manager.context.subscriptions.push(
            vscode.commands.registerCommand('nvm.showInstalledVersions', async () => {
                const versions = await this.getInstalledVersions();
                const quickPick = vscode.window.createQuickPick();
                
                quickPick.title = 'Node 版本管理';
                quickPick.placeholder = '输入版本号或选择已有版本';
                quickPick.items = versions.map(v => ({
                    label: v.version,
                    description: v.isCurrent ? '当前使用' : '',
                    detail: `点击切换到此版本 ${v.isCurrent ? '✓' : ''}`
                }));
                
                quickPick.buttons = [{
                    iconPath: new vscode.ThemeIcon('add'),
                    tooltip: '安装新版本'
                }];
                
                quickPick.onDidTriggerButton(async () => {
                    const version = await vscode.window.showInputBox({
                        prompt: '输入要安装的 Node 版本号',
                        placeHolder: '例如: 18.12.1'
                    });
                    if (version) {
                        await this.installVersion(version);
                        quickPick.dispose();
                    }
                });
                
                quickPick.onDidChangeSelection(async ([item]) => {
                    if (item) {
                        await this.switchVersion(item.label);
                        quickPick.dispose();
                    }
                });
                
                quickPick.show();
            })
        );
    }

    private async getInstalledVersions() {
        const { output } = await this.manager.executeCommand('nvm list');
        return output.split('\n')
            .filter(line => line.trim())
            .map(line => {
                const version = line.replace('*', '').trim().match(/(\d+\.\d+\.\d+)/)?.[0];
                return version ? {
                    version,
                    isCurrent: line.includes('*')
                } : null;
            })
            .filter(Boolean) as {version: string, isCurrent: boolean}[];
    }

    private async installVersion(version: string) {
        try {
            await this.manager.executeCommand(`nvm install ${version}`);
            vscode.window.showInformationMessage(`Node ${version} 安装成功`);
        } catch (error) {
            vscode.window.showErrorMessage(`安装 Node ${version} 失败: ${error}`);
        }
    }

    private async switchVersion(version: string) {
        try {
            await this.manager.executeCommand(`nvm use ${version}`);
            vscode.window.showInformationMessage(`已切换到 Node ${version}`);
        } catch (error) {
            vscode.window.showErrorMessage(`切换 Node ${version} 失败: ${error}`);
        }
    }
}
