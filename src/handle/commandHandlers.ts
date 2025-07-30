import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseInsList, parseAvList } from './dataProcessor';
import { localExecuteCommand } from './processUtils';
/**
 * extractVersion("v1.2.3"); // 返回 "1.2.3"
 * extractVersion("version 4.5"); // 返回 "4.5"
 * extractVersion("build 6"); // 返回 "6"
 * extractVersion("no numbers here"); // 返回 undefined
 * extractVersion(); // 返回 undefined
 */
export function extractVersion(version: string) {
    const currentVersion = version.match(/\d+(?:\.\d+){0,2}/)?.[0] ?? '';
    if (currentVersion !== '0' && currentVersion !== '0.0' && currentVersion !== '0.0.0') {
        return currentVersion;
    }
    return '';
}
//处理node版本
export async function handleNodeVersion() {
    const result = await localExecuteCommand('node -v');
    return extractVersion(result.output);
}
//处理NVM版本
export async function handleNvmVersion() {
    const result = await localExecuteCommand('nvm v');
    return extractVersion(result.output);
}
//处理NVM未安装或未正确配置的情况
export async function handleNvmNoV(platform: string, languagePack: any) {
    const selection = await vscode.window.showErrorMessage(
        languagePack['NVM未安装'],
        platform === 'win' ? languagePack['跳转安装NVM'] : languagePack['安装'],
        languagePack['忽略']
    );
    if (selection === languagePack['跳转安装NVM'] || selection === languagePack['安装']) {
        if (platform === 'win') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/coreybutler/nvm-windows/releases'));
        } else if (platform === 'linux' || platform === 'mac') {
            const terminal = vscode.window.createTerminal(languagePack['NVM安装']);
            terminal.show();
            terminal.sendText('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash');
            vscode.window.showInformationMessage(`${languagePack['安装完成后请重启终端:']} source ~/.bashrc`);
        }
    }
}
//处理检查nvmrc文件
export function handleCheckNvmrc() {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');
    const exists = fs.existsSync(nvmrcPath);
    const fileContent = fs.readFileSync(nvmrcPath, 'utf8').trim();
    return { found: exists, version: extractVersion(fileContent) };
}
//处理更新nvmrc文件
export function handleUpdateNvmrc(version: string) {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');
    fs.writeFileSync(nvmrcPath, version);
    const fileContent = fs.readFileSync(nvmrcPath, 'utf8').trim();
    return extractVersion(fileContent);
}
//处理是否是一个项目目录
export async function IsProjectCreateNvmrc(languagePack: any) {
    const workspaceRoot = vscode.workspace.rootPath || '';
    // 检查是否是项目目录
    const isProjectDir = fs.existsSync(path.join(workspaceRoot, 'package.json')) ||
        fs.existsSync(path.join(workspaceRoot, '.git')) ||
        fs.existsSync(path.join(workspaceRoot, '.project'));
    const state = await vscode.window.showInformationMessage(
        isProjectDir ? languagePack['这好像是个项目，要创建.nvmrc吗？'] : languagePack['这好像不是项目，不用创建.nvmrc吧？'],
        languagePack['创建'], languagePack['不创建']);
    return state === languagePack['创建'];
}

//处理引擎推荐版本
export async function handleEngineRecommendation() {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) { return null; }

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return extractVersion(pkgJson.engines?.node);
}
//处理已安装版本列表和当前版本
export async function handleInsList() {
    const result = await localExecuteCommand('nvm list');
    return parseInsList(result.output);

}
//处理可用版本列表
export async function handleAvList(source: string) {
    if (source?.startsWith('http')) {
        const response = await fetch(source);
        return parseAvList(await response.json());
    } else {
        const res = await localExecuteCommand('nvm list available');
        return parseAvList(res.output);
    }
}
//安装和使用
export async function handleInstallAndUse(operation: 'install' | 'use', version: string, languagePack: any) {
    let success = true;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: operation === 'install'
            ? `${languagePack['正在安装Node']} ${version}`
            : `${languagePack['正在切换Node']} ${version}`,
        cancellable: false
    }, async () => {
        const result = await localExecuteCommand(`nvm ${operation} ${version}`);
        if (result.errorOutput) { success = false; }
        version = extractVersion(result.output) || version;
    });
    return success;
}
//处理确认删除
export async function handleConfirmDelete(version: string, languagePack: any) {
    const result = await vscode.window.showWarningMessage(
        `${languagePack['删除Node']}: ${version}?`,
        { modal: true },
        languagePack['确定']
    );
    return result === languagePack['确定'];
}
//处理删除版本
export async function handleDeleteVersion(version: string, languagePack: any) {
    let success = false;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `${languagePack['正在删除Node']} ${version}`,
        cancellable: false
    }, async () => {
        const result = await localExecuteCommand(`nvm uninstall ${version}`);
        success = !result.errorOutput;
    });
    if (success) {
        // await vscode.window.withProgress({
        //     location: vscode.ProgressLocation.Notification,
        //     title: `Node ${version} 删除成功`,
        //     cancellable: false
        // }, async () => {

        //     return new Promise(resolve => setTimeout(resolve, 3000));
        // });
        vscode.window.showInformationMessage(`Node:${version} ${languagePack['已成功删除']}`);
    } else {
        vscode.window.showErrorMessage(`Node:${version} ${languagePack['删除失败']}`);
    }
    return success;
}

