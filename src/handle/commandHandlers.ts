import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseInstalledVersions, parseAvailableVersions } from './dataProcessor';
import { localExecuteCommand } from './processUtils';
//列表
export function handleNvmrcOperation(sectionId: string, version?: string) {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');

    if (sectionId === 'create-nvmrc') {
        const nodeVersion = version || '';
        // 规范化写入的版本号 - 确保格式为 X, X.X 或 X.X.X
        const normalizedVersion = nodeVersion.replace(/^v|[^\d.]/g, '').replace(/(\.)+$/, '');
        fs.writeFileSync(nvmrcPath, normalizedVersion);
        return fs.existsSync(nvmrcPath);
    }
    return {
        found: fs.existsSync(nvmrcPath),
        version: fs.existsSync(nvmrcPath) ?
            // 规范化读取的版本号 - 确保格式为 X, X.X 或 X.X.X
            fs.readFileSync(nvmrcPath, 'utf8').trim().replace(/^v|[^\d.]/g, '').replace(/(\.)+$/, '') : ''
    };
}
export async function handleEngineRecommendation() {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkgJson.engines?.node?.match(/\d+\.\d+\.\d+/)?.[0];
}
export async function handleNvmList() {
    return parseInstalledVersions(await localExecuteCommand('nvm list'));
}
export async function handleAvailableVersions(source?: string) {
    if (source?.startsWith('http')) {
        const response = await fetch(source);
        return parseAvailableVersions(await response.json());
    }
    return parseAvailableVersions(await localExecuteCommand('nvm list available'));
}


//按钮
export async function handleInstallAndUse(command: string) {
    const result = await localExecuteCommand(command);

    // 错误检查
    if (/error/i.test(result)) {
        throw new Error(result);
    }

    // 提取版本号
    return result.match(/(\d+\.\d+\.\d+)/)?.[0];
}
export async function handleConfirmDelete(version?: string) {
    const result = await vscode.window.showWarningMessage(
        `确定要删除Node.js版本 ${version} 吗?`,
        { modal: true },
        '确定'
    );
    let data = {
        delete: false,
        version: version
    }
    if (result !== '确定') return data;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `正在删除Node ${version}`,
            cancellable: false
        }, () => localExecuteCommand(`nvm uninstall ${version}`));

        vscode.window.showInformationMessage(`Node ${version} 删除成功`);
        data.delete = true;
        return data;
    } catch (error) {
        vscode.window.showErrorMessage(`删除 Node ${version} 失败: ${error}`);
        return data;
    }
}


