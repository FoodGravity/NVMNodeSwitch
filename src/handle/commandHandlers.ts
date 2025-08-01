import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseInsList, parseAvList } from './dataProcessor';
import { localExecuteCommand } from './processUtils';
type getTFunc = (key: string) => string;
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
    const { output, error } = await localExecuteCommand('node -v');
    return extractVersion(output);
}
//处理NVM版本
export async function handleNvmVersion() {
    const { output, error } = await localExecuteCommand('nvm v');
    return { nvmV:extractVersion(output), error };
}
//处理NVM未安装或未正确配置的情况
export async function handleNvmNoV(platform: string, getT: getTFunc) {
    const selection = await vscode.window.showErrorMessage(
        getT('NVM未安装'),
        platform === 'win' ? getT('跳转安装NVM') : getT('安装'),
        getT('忽略')
    );
    if (selection === getT('跳转安装NVM') || selection === getT('安装')) {
        if (platform === 'win') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/coreybutler/nvm-windows/releases'));
        } else if (platform === 'linux' || platform === 'mac') {
            const terminal = vscode.window.createTerminal(getT('NVM安装'));
            terminal.show();
            terminal.sendText('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash');
            vscode.window.showInformationMessage(`${getT('安装完成后请重启终端:')} source ~/.bashrc`);
        }
    }
}
//获取工作区路径
export function getWorkspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
}
//处理检查nvmrc文件
export function handleCheckNvmrc() {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { return { found: false, version: '' }; }
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');
    const exists = fs.existsSync(nvmrcPath);
    let version = '';
    if (exists) { version = extractVersion(fs.readFileSync(nvmrcPath, 'utf8').trim()); }
    return { found: exists, version };
}
//处理更新nvmrc文件
export function handleUpdateNvmrc(version: string) {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { return ''; }
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');
    fs.writeFileSync(nvmrcPath, version);
    const fileContent = fs.readFileSync(nvmrcPath, 'utf8').trim();
    return extractVersion(fileContent);
}
//处理是否是一个项目目录
export async function IsProjectCreateNvmrc(getT: getTFunc) {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { return false; }
    // 检查是否是项目目录
    const isProjectDir = fs.existsSync(path.join(workspaceRoot, 'package.json')) ||
        fs.existsSync(path.join(workspaceRoot, '.git')) ||
        fs.existsSync(path.join(workspaceRoot, '.project'));
    const state = await vscode.window.showInformationMessage(
        isProjectDir ? getT('这好像是个项目，要创建.nvmrc吗？') : getT('这好像不是项目，不用创建.nvmrc吧？'),
        getT('创建'), getT('不创建'));
    return state === getT('创建');
}

//处理引擎推荐版本
export async function handleEngineRecommendation() {
    const workspaceRoot = getWorkspaceRoot();
    if (!workspaceRoot) { return ''; }
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
export async function handleInstallAndUse(operation: 'install' | 'use', version: string, getT: getTFunc) {
    let success = true;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: operation === 'install'
            ? `${getT('正在安装Node')} ${version}`
            : `${getT('正在切换Node')} ${version}`,
        cancellable: false
    }, async () => {
        const result = await localExecuteCommand(`nvm ${operation} ${version}`);
        if (result.error) { success = false; }
        version = extractVersion(result.output) || version;
    });
    return success;
}
//处理确认删除
export async function handleConfirmDelete(version: string, getT: getTFunc) {
    const result = await vscode.window.showWarningMessage(
        `${getT('删除')}Node: ${version}?`,
        { modal: true },
        getT('确定')
    );
    return result === getT('确定');
}
//处理删除版本
export async function handleDeleteVersion(version: string, getT: getTFunc) {
    let success = false;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `${getT('正在删除Node')} ${version}`,
        cancellable: false
    }, async () => {
        const result = await localExecuteCommand(`nvm uninstall ${version}`);
        success = !result.error;
    });
    if (success) {
        // await vscode.window.withProgress({
        //     location: vscode.ProgressLocation.Notification,
        //     title: `Node ${version} 删除成功`,
        //     cancellable: false
        // }, async () => {

        //     return new Promise(resolve => setTimeout(resolve, 3000));
        // });
        vscode.window.showInformationMessage(`Node:${version} ${getT('已成功删除')}`);
    } else {
        vscode.window.showErrorMessage(`Node:${version} ${getT('删除失败')}`);
    }
    return success;
}