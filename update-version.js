const fs = require('fs');
const { execSync } = require('child_process');

// 读取package.json文件
const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 更新版本号
const currentVersion = packageJson.version;
const versionParts = currentVersion.split('.');
const patchVersion = parseInt(versionParts[2], 10) + 1;
const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;
packageJson.version = newVersion;

// 写入更新后的package.json文件
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

console.log(`版本号已更新为: ${newVersion}`);
