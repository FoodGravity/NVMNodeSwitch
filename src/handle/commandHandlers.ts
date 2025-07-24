import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parseInstalledVersions, parseAvailableVersions } from './dataProcessor';
import { executeCommand } from './processUtils';

export async function handleNvmList(command: string) {
    return parseInstalledVersions(await executeCommand(command));
}
export async function handleButtonCommand(command: string) {
    const result = await executeCommand(command);

    // 错误检查
    if (/error/i.test(result)) {
        throw new Error(result);
    }

    // 提取版本号
    return result.match(/(\d+\.\d+\.\d+)/)?.[0];
}
export async function handleAvailableVersions(command: string) {
    const source = command.split(' ')[3];
    if (source?.startsWith('http')) {
        const response = await fetch(source);
        return parseAvailableVersions(await response.json());
    }
    return parseAvailableVersions(await executeCommand(command));
}

export async function handleConfirmDelete(command: string) {
    const version = command.split(' ')[2];
    const result = await vscode.window.showWarningMessage(
        `确定要删除Node.js版本 ${version} 吗?`,
        { modal: true },//弹出系统弹窗
        '确定'
    );
    return result === '确定';
    //在vscode右下角
    // const result = await vscode.window.showWarningMessage(
    //     `确定要删除Node.js版本 ${version} 吗?`,
    //     '确定',
    //     '取消'
    // );
    // return result === '确定';
}

export function handleNvmrcOperation(command: string) {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const nvmrcPath = path.join(workspaceRoot, '.nvmrc');

    if (command.includes('create nvmrc')) {
        const nodeVersion = command.split(' ')[2] || '';
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

export async function handleEngineRecommendation(command: string) {
    const workspaceRoot = vscode.workspace.rootPath || '';
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;

    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkgJson.engines?.node?.match(/\d+\.\d+\.\d+/)?.[0];
}
