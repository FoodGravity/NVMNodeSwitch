import * as vscode from 'vscode';
import type { NVMNodeSwitch } from './extension';
import { extractVersion } from './handle/commandHandlers';
// 定义自定义 QuickPickItem 类型
interface CustomQuickPickItem extends vscode.QuickPickItem {
    version: string;
    buttons: vscode.QuickInputButton[];
}
export class BottomBar implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private manager: NVMNodeSwitch;
    private commandDisposable: vscode.Disposable;// 命令注册
    constructor(manager: NVMNodeSwitch) {
        this.manager = manager;
        // 创建状态栏项
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'nvm.showVersionManager';
        this.commandDisposable = vscode.commands.registerCommand('nvm.showVersionManager', () => {
            this.showVersionQuickPick();
        });
    }

    /** 更新状态栏显示当前Node版本 */
    public async updateNodeVStatus(version: string) {
        this.statusBarItem.text = `Node: ${version || 'unknown'}`;
        this.statusBarItem.show();
    }

    /** 显示版本管理快速操作面板 */
    public async showVersionQuickPick() {
        const items = this.createVersionItems(this.manager.insList, this.manager.nodeV);
        const quickPick = this.createQuickPick(items);

        const [selectedAction, selectedVersion] = await this.waitForAction(quickPick, items);
        if (!selectedAction || !selectedVersion) { return; }
        this.manager.webview.postMessage('buttonLoading', selectedVersion, selectedAction);
        this.manager.executeCommand(selectedAction, selectedVersion);

    }

    private createDeleteButton(): vscode.QuickInputButton {
        return {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: this.manager.getT('删除此版本')
        };
    }

    private createVersionItems(
        versions: string[],
        currentVersion: string,
    ): CustomQuickPickItem[] {
        return versions.map(version => ({
            label: version === currentVersion ? `$(check) ${version}` : `$(debug-stackframe-dot) ${version}`,
            description: version === currentVersion ? this.manager.getT('当前使用版本') : this.manager.getT('点击切换到此版本'),
            version,
            buttons: version === currentVersion ? [] : [this.createDeleteButton()]  // 只有非当前版本才显示删除按钮
        }));
    }

    private createQuickPick(items: CustomQuickPickItem[]): vscode.QuickPick<CustomQuickPickItem> {
        const quickPick = vscode.window.createQuickPick<CustomQuickPickItem>();
        quickPick.placeholder = this.manager.getT('选择Node版本或输入新版本号安装');
        quickPick.items = items;
        return quickPick;
    }

    private setupButtonClickHandler(
        quickPick: vscode.QuickPick<CustomQuickPickItem>,
        resolve: (value: [string | undefined, string | undefined]) => void
    ) {
        quickPick.onDidTriggerItemButton(async (event) => {
            const item = event.item as CustomQuickPickItem;
            if (!item.version) { return; }
            resolve(['nvm-uninstall', item.version]);
            quickPick.hide();
        });
    }

    private setupInputChangeHandler(
        quickPick: vscode.QuickPick<CustomQuickPickItem>,
        items: CustomQuickPickItem[]
    ) {
        quickPick.onDidChangeValue(value => {
            const normalizedVersion = extractVersion(value);
            if (!normalizedVersion) {
                quickPick.items = items;
                return;
            }

            const filteredItems = items.filter(item =>
                item.version.includes(normalizedVersion) &&
                !item.label.includes(this.manager.getT('安装'))
            );

            quickPick.items = filteredItems.length > 0
                ? filteredItems
                : [{
                    label: `$(add) ${this.manager.getT('安装')} ${normalizedVersion}`,
                    description: this.manager.getT('按Enter安装此版本'),
                    version: normalizedVersion,
                    buttons: [this.createDeleteButton()]
                }];
        });
    }

    private waitForAction(quickPick: vscode.QuickPick<CustomQuickPickItem>, items: CustomQuickPickItem[]): Promise<[string | undefined, string | undefined]> {
        return new Promise(resolve => {
            this.setupButtonClickHandler(quickPick, resolve);
            this.setupInputChangeHandler(quickPick, items);

            quickPick.onDidAccept(() => {
                const activeItem = quickPick.activeItems[0] as CustomQuickPickItem;
                if (!activeItem) {
                    resolve([undefined, undefined]);
                    quickPick.hide();
                    return;
                }
                const action = activeItem.label.includes(this.manager.getT('安装')) ? 'nvm-install' : 'nvm-use';
                resolve([action, activeItem.version]);
                quickPick.hide();
            });
            quickPick.show();
        });
    }

    public dispose() {
        this.statusBarItem.dispose();
        this.commandDisposable.dispose();
    }
}
