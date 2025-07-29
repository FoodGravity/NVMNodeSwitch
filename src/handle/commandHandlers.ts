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
export async function handleNvmNoV(platform: string) {
    const selection = await vscode.window.showErrorMessage(
        'NVM未安装或未正确配置，请检查NVM安装路径和环境变量设置。',
        platform === 'win' ? '跳转安装NVM' : '安装',
        '忽略'
    );
    if (selection === '跳转安装NVM' || selection === '安装') {
        if (platform === 'win') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/coreybutler/nvm-windows/releases'));
        } else if (platform === 'linux' || platform === 'mac') {
            const terminal = vscode.window.createTerminal('NVM安装');
            terminal.show();
            terminal.sendText('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash');
            vscode.window.showInformationMessage('安装完成后请重启终端或执行: source ~/.bashrc');
        }
    }
}
//处理.nvmrc文件
export function handleNvmrc(version: string) {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');
    const exists = fs.existsSync(nvmrcPath);
    // 如果.nvmrc不存在，或version有效，则创建文件
    if (!exists || extractVersion(version)) { fs.writeFileSync(nvmrcPath, version); }
    // 读取文件内容
    const fileContent = fs.readFileSync(nvmrcPath, 'utf8').trim();
    return extractVersion(fileContent);
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
export async function handleInstallAndUse(operation: 'install' | 'use', version: string) {
    let success = true;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: operation === 'install'
            ? `正在安装Node ${version}`
            : `正在切换Node ${version}`,
        cancellable: false
    }, async () => {
        const result = await localExecuteCommand(`nvm ${operation} ${version}`);
        if (result.errorOutput) { success = false; }
        version = extractVersion(result.output) || version;
    });
    return success;
}
//处理确认删除
export async function handleConfirmDelete(version: string, isCurrent: boolean) {
    const result = await vscode.window.showWarningMessage(
        isCurrent
            ? `当前正在使用Node.js版本 ${version}，确定要删除吗?`
            : `确定要删除Node.js版本 ${version} 吗?`,
        { modal: true },
        '确定'
    );
    return result === '确定';
}
//处理删除版本
export async function handleDeleteVersion(version: string) {
    let success = false;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `正在删除Node ${version}`,
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
        vscode.window.showInformationMessage(`Node ${version} 已成功删除。`);
    } else {
        vscode.window.showErrorMessage(`Node ${version} 删除失败。`);
    }
    return success;
}

