# nvmNodeSwitch

一个VSCode扩展，用于管理Node.js版本，支持以下功能：

- 显示已安装的Node版本列表，支持切换和删除。
- 显示可用的Node版本列表，支持下载和删除。
- 自动识别当前文件夹的 `.nvmrc` 文件并切换版本。
- 在 `.nvmrc` 不存在时，检查 `package.json` 等文件，给出推荐版本，并在现有版本列表中添加星标推荐。

## 安装

您可以通过VSCode扩展市场安装此扩展，或者从源代码构建并手动安装。

## 使用

1. 安装扩展后，您将在VSCode活动栏中看到"Node Version Manager"图标。
2. 点击图标，您将看到5个视图：nvm版本、.nvmrc文件检查、推荐版本、"已安装版本"、"可用版本"。
3. 扩展会自动检查工作区中的 `.nvmrc` 文件，并尝试切换到指定的版本，如果无，则提供创建 `.nvmrc` 文件的功能。
4. 如果没有 `.nvmrc` 文件，扩展会检查 `package.json` 文件，并推荐一个版本，星标推荐。
5. 在"已安装版本"视图中，点击某个版本可以切换到该版本，也可以删除该版本。
6. 在"可用版本"视图中，点击某个版本可以下载该版本，也可以删除该版本。


## 开发

如果您想从源代码构建此扩展，请按照以下步骤操作：

```bash
# 克隆仓库
git clone <repository-url>
cd node-version-manager

# 安装依赖
npm install

# 编译扩展
npm run compile

# 在VSCode中测试扩展
code --extensionDevelopmentPath=.
```

## 贡献

欢迎提交问题和拉取请求！请查看[贡献指南](CONTRIBUTING.md)了解更多信息。

## 许可证

此扩展遵循[MIT许可证](LICENSE.md)。
