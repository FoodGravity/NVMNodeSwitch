import * as vscode from 'vscode';
import { localExecuteCommand } from './handle/processUtils';
import { setDefaultEncoding } from './handle/encodingUtils';
import * as commandHandlers from './handle/commandHandlers';
import { BottomBar } from './bottomBar';
import { Webview } from './webview';

export class NVMNodeSwitch {
    public context: vscode.ExtensionContext;
    public outputChannel: vscode.OutputChannel;
    public webview: Webview;
    public bottomBar: BottomBar;

    public log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    constructor(context: vscode.ExtensionContext) {
        this.context = context; // 用于管理订阅和传递给webview
        this.outputChannel = vscode.window.createOutputChannel('NVMNode版本切换');
        this.bottomBar = new BottomBar(this);
        this.webview = new Webview(this);
        this.context.subscriptions.push(this.bottomBar, this.webview);
    }

    public activate() {
        setDefaultEncoding(this.log.bind(this));
        this.bottomBar.updateNodeVersionStatus();
        this.initialCommand();
    }
    //设置一个web状态标识，表示可以接受web的all命令
    private canHandleWebAll = false;
    //初始打开时依次执行命令函数
    private async initialCommand() {
        await this.executeCommand('nvm-v');
        await this.executeCommand('nvmrc-check');
        await this.executeCommand('node-recommend');
        await this.executeCommand('nvm-list');
        await this.executeCommand('nvm-list-available');
        this.canHandleWebAll = true;
    }
    /** 执行Webview命令并返回结果 */
    public async executeCommand(sectionId: string, params?: string) {
        this.log(`接收命令${sectionId} ,${params}`);
        if (sectionId === 'initall') return this.canHandleWebAll ? this.initialCommand() : this.log('不让执行initall');
        if (sectionId === 'all') return this.initialCommand();
        try {
            let data;
            // 其他
            if (sectionId === 'nvmrc-check' || sectionId === 'create-nvmrc') {
                data = await commandHandlers.handleNvmrcOperation(sectionId, params);
            } else if (sectionId === 'node-recommend') {
                data = await commandHandlers.handleEngineRecommendation();
            }
            //列表
            else if (sectionId === 'nvm-v') {
                data = await localExecuteCommand('nvm v');
            } else if (sectionId === 'nvm-list') {
                data = await commandHandlers.handleNvmList();
            } else if (sectionId === 'nvm-list-available') {
                data = await commandHandlers.handleAvailableVersions(params);
            }
            // 按钮
            else if (sectionId === 'nvm-uninstall') {
                data = await commandHandlers.handleConfirmDelete(params);
                this.bottomBar.updateNodeVersionStatus();
            } else if (sectionId === 'nvm-install') {
                await commandHandlers.handleInstallAndUse(`nvm install ${params}`);
                this.executeCommand('nvm-use', params)
                return;
            } else if (sectionId === 'nvm-use') {
                data = await commandHandlers.handleInstallAndUse(`nvm use ${params}`);
                this.bottomBar.updateNodeVersionStatus();
            }
            else {
                throw new Error('未知命令');
            }
            this.webview.postMessage(sectionId, params, data);
            this.log(`发送命令${sectionId} ,${params} ,${data}`);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.log(`执行出错: ${errorMessage}`);
            this.webview.postMessage(sectionId, params, params, errorMessage);
            throw error;
        }
    }
}
/** VS Code扩展激活函数 */
export function activate(context: vscode.ExtensionContext) {
    const manager = new NVMNodeSwitch(context);
    manager.activate();
}

/** VS Code扩展卸载函数 */
export function deactivate() { }
