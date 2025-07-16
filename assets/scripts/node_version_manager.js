// 获取VSCode API
const vscode = acquireVsCodeApi();
// 存储 NVM 命令的对象
const nodeSources = {
    nvm: 'nvm list available',
    npmmirror: 'npmmirror https://npmmirror.com/mirrors/node/index.json',
    nodejs: 'nodejs https://nodejs.org/dist/index.json',
};
const nvm = {
    v: 'nvm v',
    l: 'nvm list',
    get la() {
        const versionSource = document.getElementById('version-source').value;
        return nodeSources[versionSource];
    },
    use: version => `nvm use ${version}`,
    install: version => `nvm install ${version}`,
    uninstall: version => `nvm uninstall ${version}`,
};

//命令转id
function commandToId(command) {
    //如果command包含
    if (command.includes('nvm')) {
        return command.replace(/\s+/g, '-');
    } else if (command.includes('npmmirror') || command.includes('nodejs')) {
        return 'nvm-list-available';
    }

}
//id转命令
function idToCommand(id) {
    if (id === 'nvm-list-available') { return nvm.la; }
    if (id === 'node-recommend') { return id; }
    if (id === 'create-nvmrc') { return id; }
    if (id === 'nvmrc-check') { return id; }
    return id.replace(/-/g, ' ');
}
// 公共变量
let nvmVersion = null;
let currentNodeVersion = '';
let installedVersions = [];
let availableVersions = {};

// 监听来自扩展的消息，处理 NVM 命令结果
// 在message事件监听器中添加新分支
window.addEventListener('message', event => {
    const message = event.data;
    console.log('收到', message);
    //停止刷新按钮
    const refreshBtn = document.querySelector(`#refresh-${commandToId(message.command)}`);
    if (refreshBtn) {
        refreshBtn.stopLoading();
    }
    // 添加错误处理
    if (message.error) {
        console.error('命令执行出错:', message.error);
        if (message.command === nvm.v) { nvmVersion = ''; renderNvmV(); }
        return;
    }
    if (message.command === nvm.v) {
        nvmVersion = message.data;
        renderNvmV();
    } else if (message.command === nvm.l) {
        const { versions, currentVersion } = parseInstalledVersions(message.data);
        installedVersions = versions;
        currentNodeVersion = currentVersion;
        renderNvmList();
    } else if (message.command === nvm.la) {
        availableVersions = parseAvailableVersions(message.data);
        renderNvmAvailable();
    }
    else if (message.command === 'nvmrc-check') {
        renderNvmrcCheck(message.data);
    }
    else if (message.command === 'node-recommend') {
        renderRecommendVersion(message.data);
    }
    else if (message.command === 'create-nvmrc') {
        renderNvmrcCheck(message.data);
    }

});

// 新增渲染函数
function renderNvmrcCheck(result) {
    const container = document.getElementById('nvmrc-check').querySelector('.content-container');
    const createBtn = document.getElementById('create-nvmrc');

    if (result.includes('.nvmrc found')) {
        container.innerHTML = `已找到.nvmrc文件，推荐版本：${recommendedVersion}`;
        createBtn.style.display = 'none';
    } else {
        container.innerHTML = '未找到.nvmrc文件';
        createBtn.style.display = 'flex';
    }
}

function renderRecommendVersion(result) {
    const container = document.getElementById('node-recommend').querySelector('.content-container');
    container.innerHTML = result ?
        `推荐使用版本：<span class="recommended-version">${result}</span>` :
        '无推荐版本';
}

// 2. 解析已安装版本
function parseInstalledVersions(result) {
    const versions = [];
    let currentVersion = '';
    const versionRegex = /(\d+\.\d+\.\d+)/;

    result.split('\n').filter(Boolean).forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('*')) {
            currentVersion = trimmedLine.replace('*', '').trim().match(versionRegex)?.[0] || '';
        }
        const version = trimmedLine.replace('*', '').trim();
        const match = version.match(versionRegex);
        if (match) { versions.push(match[0]); }
    });

    return { versions, currentVersion };
}
// 3. 解析nvm源可用版本
function parseAvailableVersions(result) {
    if (nvm.la.includes('npmmirror') || nvm.la.includes('nodejs')) {
        return {
            'LTS': result
                .filter(v => v.lts)
                .map(v => v.version.replace(/^v/, '')),
            'other': result
                .filter(v => !v.lts && /^\d+\.\d+\.\d+$/.test(v.version.replace(/^v/, '')))
                .map(v => v.version.replace(/^v/, ''))
        };
    }
    const lines = result.split('\n').filter(line => line.trim());
    const versions = {};

    if (lines.length > 1) {
        // 使用更高效的数组操作方法
        const headers = lines[0].split('|')
            .map(col => col.trim())
            .filter(col => col && !/^-+$/.test(col)); // 过滤掉表头中的分隔线

        // 使用reduce优化数据收集
        return lines.slice(2).reduce((acc, line) => {
            const columns = line.split('|')
                .map(col => col.trim())
                .filter(col => col);

            if (columns.length === headers.length) {
                headers.forEach((header, index) => {
                    const version = columns[index].match(/(\d+\.\d+\.\d+)/)?.[0];
                    if (version) { acc[header].push(version); }
                });
            }
            return acc;
        }, Object.fromEntries(headers.map(h => [h, []])));
    }

    return versions;
}
//版本源切换处理
document.getElementById('version-source').addEventListener('change', function () {
    executeUpdateCommand(nvm.la);
});
//创建.nvmrc文件
document.getElementById('create-nvmrc').addEventListener('click', () => {
    vscode.postMessage(`create-nvmrc ${nvmVersion}`);
});

// 渲染 NVM 状态
function renderNvmV() {
    const nvmVElement = document.getElementById(commandToId(nvm.v));
    if (nvmVElement) {
        if (nvmVersion) {
            setAllSectionsToNone(false);
            nvmVElement.querySelector('.content-container').innerHTML = `${nvmVersion}`;
            executeUpdateCommand(nvm.l);
            executeUpdateCommand(nvm.la);
            executeUpdateCommand('nvmrc check');
            executeUpdateCommand('nvm recommend');
        } else if (nvmVersion === '') {
            setAllSectionsToNone(true);
            nvmVElement.querySelector('.content-container').innerHTML = '未安装，请下载安装: <a href="https://github.com/coreybutler/nvm-windows/releases" target="_blank">nvm-windows 官方下载</a>';
        }
    }
}
// 2. 渲染已安装版本列表
function renderNvmList() {
    console.log('渲染已安装版本列表', installedVersions);
    const containerElement = document.getElementById('installed-versions-container');
    if (containerElement) {
        containerElement.innerHTML = '';
        if (installedVersions?.length) {
            installedVersions.forEach(version => {
                containerElement.appendChild(
                    createVersionButton(version, version === currentNodeVersion, false)
                );
            });
        } else {
            containerElement.innerHTML = '没有已安装的 Node 版本';
        }
    }
}
// 3. 渲染可用版本列表
function renderNvmAvailable() {
    console.log('渲染可用版本列表', availableVersions);
    const elements = {
        container: document.querySelector('.table-container'),
        title: document.getElementById('available-versions-title')
    };
    if (elements.container) {
        elements.container.innerHTML = '';

        if (availableVersions && Object.keys(availableVersions).length) {
            // 动态创建表格元素
            const table = document.createElement('table');
            table.id = 'available-versions-table';
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            const categories = Object.keys(availableVersions);

            // 创建表头
            const headerRow = document.createElement('tr');
            categories.forEach(category => {
                const th = document.createElement('th');
                th.textContent = category;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // 创建表格内容
            const maxRows = Math.max(...categories.map(cat => availableVersions[cat].length));
            Array.from({ length: maxRows }).forEach((_, i) => {
                const row = document.createElement('tr');
                categories.forEach(category => {
                    const td = document.createElement('td');
                    const version = availableVersions[category][i];
                    version && td.appendChild(createVersionButton(version, version === currentNodeVersion, true));
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            elements.container.appendChild(table);
        } else {
            elements.container.innerHTML = '没有可用的node版本';
        }
    }
}

// 2\3. 提取公共函数处理版本按钮创建
function createVersionButton(version, isCurrent, inTable) {
    return createButtonComponent(version, isCurrent, inTable, installedVersions.includes(version));
}

//设置所有非nvm-v版块的display属性
function setAllSectionsToNone(isNone) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        setLoadingText(section.id);
        if (section.id !== commandToId(nvm.v)) {
            section.style.display = isNone ? 'none' : 'flex';
        }
    });
}
//设置提示语
function setLoadingText(sectionId) {
    document.getElementById(sectionId).querySelector('.content-container').innerHTML = '正在获取...';
}

// 通用命令执行函数
function executeUpdateCommand(command) {
    console.log('执行命令:', command);
    // 1. 设置提示语 
    setLoadingText(commandToId(command));
    // 2. 触发转圈动画（通过按钮的stopLoading方法控制）
    const refreshBtn = document.getElementById(`refresh-${command}`);
    if (refreshBtn && !refreshBtn.classList.contains('loading')) {
        refreshBtn.classList.add('loading');
    }
    // 3. 发送命令
    vscode.postMessage(command);
}
//创建所有刷新按钮
function createAllRefreshButtons() {
    document.querySelectorAll('.section').forEach(section => {
        // 修改选择器以匹配新的标题栏结构
        const titleBar = section.querySelector('.title-bar');
        if (!titleBar) { return; }

        // 创建并配置刷新按钮
        const refreshBtn = createSvgButton('refresh', `refresh-${section.id}`);
        refreshBtn.classList.add('refresh');
        refreshBtn.style.marginLeft = '8px';

        // 添加加载状态控制
        refreshBtn.stopLoading = () => {
            refreshBtn.classList.remove('loading');
        };

        // 绑定点击事件
        refreshBtn.addEventListener('click', () => {
            const command = idToCommand(section.id);
            if (command) {
                executeUpdateCommand(command);
            }
        });

        titleBar.appendChild(refreshBtn);
    });
}
// 页面加载完成后绑定事件并初始化页面渲染
function initializePage() {
    console.log('页面初始化开始');
    createAllRefreshButtons();
    setAllSectionsToNone(true);
    renderNvmV();
    executeUpdateCommand(nvm.v);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
