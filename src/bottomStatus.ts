import * as vscode from 'vscode';
import { executeCommand } from './handle/processUtils';
import { handleNvmList, handleNvmrcOperation, handleConfirmDelete } from './handle/commandHandlers';

// 定义自定义 QuickPickItem 类型
interface CustomQuickPickItem extends vscode.QuickPickItem {
    version: string;
    buttons: vscode.QuickInputButton[];
}

// 定义 postMessage 函数类型
type PostMessage = (command: string, data: any, error?: string, requestId?: string) => void;

export class BottomStatus {
    private statusBarItem: vscode.StatusBarItem;
    private outputChannel: vscode.OutputChannel;
    private postMessage?: PostMessage;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        // 创建状态栏项
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'nvm.showVersionManager';
    }

    public setPostMessage(postMessage: PostMessage) {
        this.postMessage = postMessage;
    }

    /** 更新状态栏显示当前Node版本 */
    public async updateNodeVersionStatus() {
        try {
            const version = (await executeCommand('node -v')).trim();
            this.statusBarItem.text = `Node: ${version || 'unknown'}`;
        } catch {
            this.statusBarItem.text = `Node: unknown`;
        }
        this.statusBarItem.show();
    }

    /** 显示版本管理快速操作面板 */
    public async showVersionQuickPick() {
        try {
            this.outputChannel.appendLine('开始获取已安装的Node版本...');
            const { versions, currentVersion } = await handleNvmList('nvm list');
            this.outputChannel.appendLine(`获取到${versions.length}个已安装版本，当前版本: ${currentVersion}`);

            const deleteButton = this.createDeleteButton();
            const items = this.createVersionItems(versions, currentVersion, deleteButton);
            const quickPick = this.createQuickPick(items);

            this.setupButtonClickHandler(quickPick, items, versions, currentVersion, deleteButton);
            this.setupInputChangeHandler(quickPick, items);

            const selected = await this.waitForSelection(quickPick);
            if (!selected) return;

            if (selected.label.includes('安装')) {
                await this.installAndSwitchVersion(selected.version);
            } else {
                await this.switchVersion(selected.version);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`版本操作失败: ${error}`);
        }
    }

    private createDeleteButton(): vscode.QuickInputButton {
        return {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: '删除此版本'
        };
    }

    private createVersionItems(
        versions: string[],
        currentVersion: string,
        deleteButton: vscode.QuickInputButton
    ): CustomQuickPickItem[] {
        const versionItems = versions.map(version => ({
            label: version === currentVersion ? `$(check) ${version}` : `$(debug-stackframe-dot) ${version}`,
            description: version === currentVersion ? '当前使用版本' : '点击切换到此版本',
            version,
            buttons: [deleteButton]
        }));

        return [
            {
                label: '$(add) 或者安装新版本',
                description: '输入版本号下载安装',
                version: '',
                buttons: [deleteButton]
            },
            ...versionItems
        ];
    }

    private createQuickPick(items: CustomQuickPickItem[]): vscode.QuickPick<CustomQuickPickItem> {
        const quickPick = vscode.window.createQuickPick<CustomQuickPickItem>();
        quickPick.placeholder = '选择Node版本或输入新版本号安装';
        quickPick.items = items;
        return quickPick;
    }

    private setupButtonClickHandler(
        quickPick: vscode.QuickPick<CustomQuickPickItem>,
        items: CustomQuickPickItem[],
        versions: string[],
        currentVersion: string,
        deleteButton: vscode.QuickInputButton
    ) {
        quickPick.onDidTriggerItemButton(async (event) => {
            const item = event.item as CustomQuickPickItem;
            if (!item.version) return;

            const confirm = await handleConfirmDelete(`delete ${item.version}`);
            if (!confirm) return;

            try {
                await this.showProgress(`正在删除Node ${item.version}`, async () => {
                    await executeCommand(`nvm uninstall ${item.version}`);
                });

                const index = versions.indexOf(item.version);
                if (index > -1) versions.splice(index, 1);

                const newItems = this.createVersionItems(versions, currentVersion, deleteButton);
                quickPick.items = newItems;

                this.updateNodeVersionStatus();
                this.postMessage?.('update-button-status', { activate: 'nvm-uninstall', version: item.version }, undefined);
            } catch (error) {
                vscode.window.showErrorMessage(`删除 Node ${item.version} 失败: ${error}`);
            }
        });
    }

    private setupInputChangeHandler(
        quickPick: vscode.QuickPick<CustomQuickPickItem>,
        items: CustomQuickPickItem[]
    ) {
        quickPick.onDidChangeValue(value => {
            const normalizedVersion = value.trim().match(/\d+(?:\.\d+)*/)?.[0] || '';

            if (!normalizedVersion) {
                quickPick.items = items;
                return;
            }

            const filteredItems = items.filter(item =>
                item.version.includes(normalizedVersion) &&
                !item.label.includes('安装')
            );

            quickPick.items = filteredItems.length > 0
                ? filteredItems
                : [{
                    label: `$(add) 安装 ${normalizedVersion}`,
                    description: '按Enter安装此版本',
                    version: normalizedVersion,
                    buttons: [this.createDeleteButton()]
                }];
        });
    }

    private waitForSelection(quickPick: vscode.QuickPick<CustomQuickPickItem>): Promise<CustomQuickPickItem | undefined> {
        return new Promise(resolve => {
            quickPick.onDidAccept(() => {
                const activeItem = quickPick.activeItems[0] as CustomQuickPickItem;
                resolve(activeItem);
                quickPick.hide();
            });
            quickPick.show();
        });
    }

    private async showProgress(title: string, action: () => Promise<void>) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0 });
            await action();
            progress.report({ increment: 100 });
        });
    }

    private async installAndSwitchVersion(version: string) {
        await this.showProgress(`正在安装Node ${version}`, async () => {
            await executeCommand(`nvm install ${version}`);
            await executeCommand(`nvm use ${version}`);
            handleNvmrcOperation(`create nvmrc ${version}`);
        });
        this.updateNodeVersionStatus();
        this.postMessage?.('update-button-status', { activate: 'nvm-use', version }, undefined);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    private async switchVersion(version: string) {
        await this.showProgress(`正在切换到Node ${version}`, async () => {
            await executeCommand(`nvm use ${version}`);
            handleNvmrcOperation(`create nvmrc ${version}`);
        });
        this.updateNodeVersionStatus();
        this.postMessage?.('update-button-status', { activate: 'nvm-use', version }, undefined);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    public dispose() {
        this.statusBarItem.dispose();
    }
}
