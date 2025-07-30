import * as vscode from 'vscode';
import { setDefaultEncoding } from './handle/encodingUtils';
import * as commandHandlers from './handle/commandHandlers';
import { BottomBar } from './bottomBar';
import { Webview } from './webview';
import * as fs from 'fs';
import * as path from 'path';
// import { version } from 'os';

export class NVMNodeSwitch {
    static log(arg0: string) {
        throw new Error('Method not implemented.');
    }
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
        this.initialCommand();
        this.languagePack = this.getLanguagePack();
        // 添加配置变化监听
        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('nvmNodeSwitch.language')) {
                    this.executeCommand('get-languagePack');
                }
            })
        );
    }
    // 公共变量
    public platform = 'win';
    public nvmV = '';
    public nodeV = '';
    public insList: string[] = [];
    public languagePack: { [key: string]: string } = {};
    //初始打开时依次执行命令函数
    private async initialCommand() {
        await this.executeCommand('node-v');
        // await this.executeCommand('node-recommend');
        await this.executeCommand('nvm-v');
        if (this.nvmV) {
            await this.executeCommand('nvm-list');
            await this.executeCommand('nvmrc-check');
            if (this.webview.view) {
                await this.executeCommand('nvm-list-available');
            }
        }
    }
    /** 执行Webview命令并返回结果 */
    public async executeCommand(sectionId: string, params: any = null) {
        this.log(`接收命令${sectionId} ,${params}`);
        if (sectionId === 'all') { this.initialCommand(); return; }

        // 新增设置相关命令处理
        if (sectionId === 'get-setting') {
            const config = vscode.workspace.getConfiguration('nvmNodeSwitch');
            const packageJson = require('../package.json');
            const defaultConfig = packageJson.contributes.configuration.properties;

            // 获取所有设置项
            const settings: { [key: string]: any } = {};
            for (const key in defaultConfig) {
                const settingKey = key.replace('nvmNodeSwitch.', '');
                settings[settingKey] = params?.reset
                    ? defaultConfig[key].default
                    : config.get(settingKey);
            }
            if (params?.reset) { this.executeCommand('update-setting', settings); }
            else { this.webview.postMessage('get-setting', params, settings); }
            return;
        }
        else if (sectionId === 'update-setting') {
            const config = vscode.workspace.getConfiguration('nvmNodeSwitch');
            // 遍历params对象，逐个更新配置项
            for (const key in params) {
                await config.update(key, params[key], vscode.ConfigurationTarget.Global);
            }
            this.webview.postMessage('update-setting', '', true);
            this.executeCommand('get-setting', { setting: true });
            return;
        } else if (sectionId === 'get-languagePack') {
            this.languagePack = this.getLanguagePack();
            this.webview.postMessage('get-languagePack', '', this.languagePack);
            return;
        }

        //统一设置版块或按钮加载状态
        this.webview.postMessage(sectionId, params, 'loading');

        /**以下处理版块 */
        if (sectionId === 'node-v') {
            const result = await commandHandlers.handleNodeVersion();
            this.nodeV = commandHandlers.extractVersion(result);
            this.bottomBar.updateNodeVStatus(this.nodeV);
            this.webview.postMessage('node-v', '', this.nodeV);
        }
        else if (sectionId === 'node-recommend') {
            const version = await commandHandlers.handleEngineRecommendation();
            this.webview.postMessage('node-recommend', '', version);
        }
        else if (sectionId === 'nvm-v') {
            this.nvmV = await commandHandlers.handleNvmVersion();
            this.webview.postMessage('nvm-v', '', this.nvmV);
            if (!this.nvmV) { await commandHandlers.handleNvmNoV(this.platform, this.languagePack); }
        }

        /**以下命令依赖nvm版本 */
        else if (!this.nvmV) { this.executeCommand('nvm-v'); return; }

        else if (sectionId === 'nvm-list') {
            const result = await commandHandlers.handleInsList();
            if (result.currentVersion !== this.nodeV) { await this.executeCommand('node-v'); }
            this.insList = result.versions;
            this.webview.postMessage('nvm-list', params, result);
        }
        else if (sectionId === 'nvm-list-available') {
            const av = await commandHandlers.handleAvList(params);
            const data = { avList: av, nodeV: this.nodeV, insList: this.insList };
            this.webview.postMessage('nvm-list-available', '', data);
        }
        else if (sectionId === 'nvmrc-check') {
            const { found, version } = commandHandlers.handleCheckNvmrc();
            // 未检测到 .nvmrc，直接写入当前 nodeV 并返回
            if (!found || !version) {
                if (!found) { this.webview.postMessage('nvmrc-check', 'not-found', this.nodeV); }
                this.executeCommand('update-nvmrc');
                return;
            }
            // .nvmrc 版本已是当前 nodeV
            if (version === this.nodeV) {
                this.webview.postMessage('nvmrc-check', 'success', this.nodeV);
                return;
            }
            // 已安装该版本，尝试切换
            if (this.insList.includes(version)) {
                this.webview.postMessage('nvmrc-check', 'use', version);
                await this.executeCommand('nvm-use', version);
                if (version !== this.nodeV) {
                    this.webview.postMessage('nvmrc-check', 'use-fail', version);
                }
            } else {
                // 未安装该版本，提示安装
                this.webview.postMessage('nvmrc-check', 'install', version);
                const installNow = await vscode.window.showInformationMessage(
                    `Node ${version} 未安装，是否立即安装？`,
                    '安装',
                    '取消'
                );
                if (installNow === '安装') {
                    this.executeCommand('nvm-install', version);
                }
            }
        }
        else if (sectionId === 'update-nvmrc') {
            await this.executeCommand('node-v');
            if (!this.nodeV) {
                this.webview.postMessage('nvmrc-check', 'nodeInvalid', this.nodeV);
                return;
            }
            const { found } = commandHandlers.handleCheckNvmrc();
            if (found || (await commandHandlers.IsProjectCreateNvmrc()) === '创建') {
                commandHandlers.handleUpdateNvmrc(this.nodeV);
                this.webview.postMessage('nvmrc-check', 'success', this.nodeV);
            }
        }

        /**以下都是按钮*/
        else if (sectionId === 'nvm-use') {
            const success = await commandHandlers.handleInstallAndUse('use', params, this.languagePack);
            this.webview.postMessage('nvm-use', params, success ? 'current' : 'error');
            if (success) { this.executeCommand('create-nvmrc'); }
        }
        else if (sectionId === 'nvm-install') {
            const success = await commandHandlers.handleInstallAndUse('install', params, this.languagePack);

            if (!success) { this.webview.postMessage('nvm-install', params, 'error'); return; }

            await this.executeCommand('nvm-list', 'noClear');
            this.webview.postMessage('nvm-install', params, 'success');
            // 安装成功后询问是否立即切换
            const useNow = await vscode.window.showInformationMessage(
                `Node ${params} 安装成功，是否立即切换？`,
                '确定',
                '取消'
            );
            if (useNow === '确定') {
                this.executeCommand('nvm-use', params);
            } else {
                this.webview.postMessage('nvm-install', params, 'installed');
            }

        }
        else if (sectionId === 'nvm-uninstall') {
            const yes = await commandHandlers.handleConfirmDelete(params, this.languagePack);
            if (!yes) {
                this.webview.postMessage('nvm-uninstall', params, 'cancelled');
                return;
            }
            const success = await commandHandlers.handleDeleteVersion(params, this.languagePack);
            this.webview.postMessage('nvm-uninstall', params, success ? 'success' : 'error');
            if (success) { await this.executeCommand('nvm-list', 'noClear'); }
        }
    }
    private getLanguagePack(): any {
        const config = vscode.workspace.getConfiguration('nvmNodeSwitch');
        const language = config.get('language') || 'zh-CN';
        const localePath = path.join(this.context.extensionPath, 'locales', `${language}.json`);

        try {
            const fileContent = fs.readFileSync(localePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            // 如果指定语言文件不存在，回退到英文
            const defaultPath = path.join(this.context.extensionPath, 'locales', 'zh-CN.json');
            const defaultContent = fs.readFileSync(defaultPath, 'utf8');
            return JSON.parse(defaultContent);
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
