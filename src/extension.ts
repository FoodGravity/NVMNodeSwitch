import * as vscode from 'vscode';
import { executeCommand } from './handle/processUtils';
import { setDefaultEncoding } from './handle/encodingUtils';
import * as commandHandlers from './handle/commandHandlers';
import { setupWebview } from './webviewManager';
import { BottomStatus } from './bottomStatus';

class NVMNodeSwitch {
    // 扩展上下文和输出通道
    private context: vscode.ExtensionContext;
    // 输出通道，用于记录日志
    private outputChannel: vscode.OutputChannel;
    // 私有状态barItem：vscode。状态栏项；
    private bottomStatus: BottomStatus;
    /** 记录日志消息 */
    private log(message: string): void {
        this.outputChannel.appendLine(message);
    }
    /** 获取底部状态栏实例 */
    public getBottomStatus() {
        return this.bottomStatus;
    }
    /// 构造函数，初始化扩展上下文和输出通道
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('NVMNode版本切换');
        this.bottomStatus = new BottomStatus(this.outputChannel);
        this.context.subscriptions.push(this.bottomStatus);
    }

    /** 统一消息发送方法 */
    private postMessage!: ((command: string, data: any, error?: string, requestId?: string) => void);

    /** 激活扩展并打开Webview */
    public activate() {
        setDefaultEncoding(this.log.bind(this));
        const { postMessage } = setupWebview(this.context, this.executeCommand.bind(this));
        this.postMessage = postMessage;
        this.bottomStatus.updateNodeVersionStatus();
        this.bottomStatus.setPostMessage(this.postMessage);
    }

    /** 执行Webview命令并返回结果 */
    private async executeCommand(command: string, requestId?: string) {
        this.log(`接收命令${command}`);

        try {
            let data;
            // 其他
            if (command === 'nvmrc check' || command.includes('create nvmrc')) {
                data = await commandHandlers.handleNvmrcOperation(command);
            } else if (command === 'node recommend') {
                data = await commandHandlers.handleEngineRecommendation(command);
            }
            //列表
            else if (command === 'nvm list') {
                data = await commandHandlers.handleNvmList(command);
            } else if (command.includes('nvm list available')) {
                data = await commandHandlers.handleAvailableVersions(command);
            }
            // 按钮
            else if (command.includes('confirm delete')) {
                data = await commandHandlers.handleConfirmDelete(command);
            } else if (command.includes('nvm install')) {
                data = await commandHandlers.handleButtonCommand(command);
            } else if (command.includes('nvm use') || command.includes('nvm uninstall')) {
                data = await commandHandlers.handleButtonCommand(command);
                this.bottomStatus.updateNodeVersionStatus();
            }
            // 默认处理本地命令
            else {
                data = await executeCommand(command);
            }

            this.postMessage(command, data, undefined, requestId);
            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '未知错误';
            this.log(`执行出错: ${errorMessage}`);
            this.postMessage(command, null, errorMessage, requestId);
            throw error;
        }
    }

    /** 获取输出通道 */
    public getOutputChannel() {
        return this.outputChannel;
    }
}
/** VS Code扩展激活函数 */
export function activate(context: vscode.ExtensionContext) {
    const manager = new NVMNodeSwitch(context);
    manager.activate();

    // 在activate函数中添加
    context.subscriptions.push(
        vscode.commands.registerCommand('nvm.showVersionManager', () => {
            manager.getBottomStatus().showVersionQuickPick(); // 通过公共方法访问
        })
    );

}

/** VS Code扩展卸载函数 */
export function deactivate() { }
