
// 公共变量
let currentNodeVersion = '';
let installedVersions = [];
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
// 3. 解析可用版本
function parseAvailableVersions(result) {
    //如果result为对象
    if (typeof result === 'object') {
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
    renderNvmAvailable();
});


// 渲染 NVM 状态
async function renderNvmV() {
    const sectionId = 'nvm-v';
    const nvmVElement = document.getElementById(sectionId);
    if (nvmVElement) {
        setLoadingState(sectionId, true);
        const { data: nvmV } = await getData(sectionId);  // 修改这里
        //是否为版本号
        if (nvmV) {
            setAllSectionsToNone(false);
            nvmVElement.querySelector('.content-container').innerHTML = `${nvmV}`;
            // 自动获取其他数据 
            renderNvmrcCheck();
            renderRecommendVersion()
            renderNvmList();
            renderNvmAvailable();
        } else {
            setAllSectionsToNone(true);
            nvmVElement.querySelector('.content-container').innerHTML = '未安装，请下载安装: <a href="https://github.com/coreybutler/nvm-windows/releases" target="_blank">nvm-windows 官方下载</a>';
        }
        setLoadingState(sectionId, false);
    }
}

// 设置nvmrc检查结果
async function renderNvmrcCheck() {
    const sectionId = 'nvmrc-check';
    setLoadingState(sectionId, true);

    const { data: result } = await getData(sectionId);
    const container = document.getElementById(sectionId).querySelector('.content-container');
    const version = result?.match(/(\d+\.\d+\.\d+)/)?.[0];

    if (version) {
        const switchSuccess = await handleNvmCommand('nvm-use', version);
        container.classList.toggle('success-color', switchSuccess);
        container.classList.toggle('error-color', !switchSuccess);
        container.innerHTML = switchSuccess ? `已找到：${version}` : `${version}切换失败`;
    } else {
        container.innerHTML = '未找到或为空';
        container.classList.remove('success-color');
        container.classList.add('error-color');
        updateNvmrcButtonState('error', '需要创建');
    }

    setLoadingState(sectionId, false);
}
// 更新.nvmrc按钮状态的函数
function updateNvmrcButtonState(state, text) {
    const createBtn = document.getElementById('create-nvmrc')
    createBtn.className = "node-version-button nvmrc";
    createBtn.classList.add(state);
    createBtn.innerHTML = text;
    createBtn.style.padding = '0 1px 0 8px';
    createBtn.appendChild(createSvgButton(state));
}

// 检查.nvmrc状态并更新UI
async function checkAndUpdateNvmrcState() {
    const { data: currentNvmrc } = await getData('nvmrc-check');
    const currentVersion = currentNvmrc?.match(/(\d+\.\d+\.\d+)/)?.[0];

    if (!currentVersion) {
        updateNvmrcButtonState('error', '版本为空');
        if (currentNodeVersion) { createOrUpdateNvmrc(); }
        return false;
    }

    const consistent = currentVersion === currentNodeVersion;
    updateNvmrcButtonState(consistent ? 'success' : 'warning', consistent ? '无需更新' : '需要更新');
    return consistent;
}
//创建或更新.nvmrc文件
async function createOrUpdateNvmrc() {
    const { data: create } = await getData('create-nvmrc', currentNodeVersion || '');
    if (create) {
        await renderNvmrcCheck();
        updateNvmrcButtonState('success', '创建成功');
    } else {
        updateNvmrcButtonState('error', '创建失败');
    }
}

// 监听创建.nvmrc按钮点击事件
document.getElementById('create-nvmrc').addEventListener('click', async (e) => {
    await createOrUpdateNvmrc();
});

// 推荐版本
async function renderRecommendVersion() {
    const sectionId = 'node-recommend';
    setLoadingState(sectionId);
    const container = document.getElementById(sectionId).querySelector('.content-container');
    const { data: result } = await getData(sectionId);
    container.innerHTML = result ?
        `推荐使用版本：<span class="recommended-version">${result}</span>` :
        '无推荐版本';
    setLoadingState(sectionId, false);
}
// 新增函数：设置当前版本
async function setCurrentVersion(version) {
    currentNodeVersion = version;
    const consistent = await checkAndUpdateNvmrcState();
    const currentVersionText = document.querySelector('.current-version');
    currentVersionText.classList.remove('warning-color', 'success-color');
    currentVersionText.classList.add(version && consistent ? 'success-color' : 'warning-color');
    currentVersionText.innerHTML = version ? `当前版本：${version}` : '未选择版本';

}

// 2. 渲染已安装版本列表
async function renderNvmList(clean = true) {
    const sectionId = 'nvm-list';
    //获取数据
    setLoadingState(sectionId, true, clean);
    const { data: result } = await getData(sectionId);
    const { versions, currentVersion } = parseInstalledVersions(result);
    installedVersions = versions;
    setCurrentVersion(currentVersion);
    //创建按钮
    const containerElement = document.getElementById('installed-versions-container');
    if (containerElement) {
        containerElement.innerHTML = '';
        if (installedVersions?.length) {
            installedVersions.forEach(version => {
                containerElement.appendChild(
                    createVersionButton(version, false)
                );
            });
        } else {
            containerElement.innerHTML = '没有已安装的 Node 版本';
        }
    }
    setLoadingState(sectionId, false);
}
// 3. 渲染可用版本列表
async function renderNvmAvailable() {
    const sectionId = 'nvm-list-available';
    setLoadingState(sectionId, true);
    const { data: result } = await getData(sectionId);
    const availableVersions = parseAvailableVersions(result);
    const elementsContainer = document.querySelector('.table-container');
    if (elementsContainer) {
        elementsContainer.innerHTML = '';
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
                    version && td.appendChild(createVersionButton(version, true));
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            elementsContainer.appendChild(table);
        } else {
            elementsContainer.innerHTML = '没有可用的node版本';
        }
    }
    setLoadingState(sectionId, false);
}

// 2\3. 提取公共函数处理版本按钮创建
function createVersionButton(version, inTable) {
    return createButtonComponent(version, version === currentNodeVersion, inTable, installedVersions.includes(version));
}

//设置所有非nvm-v版块的display属性
function setAllSectionsToNone(isNone) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        if (section.id !== 'nvm-v') {
            section.style.display = isNone ? 'none' : 'flex';
        }
    });
}

function setLoadingState(sectionId, isLoading, clean = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    const container = section.querySelector('.content-container');
    const refreshBtn = section.querySelector(`#refresh-${sectionId}`);

    if (isLoading) {
        if (clean) { container.innerHTML = '正在获取...'; }
        refreshBtn?.classList.add('loading');
    } else {
        refreshBtn?.classList.remove('loading');
    }
}
// 修改 createAllRefreshButtons 函数中的点击事件处理
function createAllRefreshButtons() {
    document.querySelectorAll('.section').forEach(section => {
        const titleBar = section.querySelector('.title-bar');
        if (!titleBar) {
            return;
        }
        const refreshBtn = createSvgButton('refresh', `refresh-${section.id}`);
        refreshBtn.classList.add('refresh');
        refreshBtn.addEventListener('click', async () => {
            const renderFunctions = {
                'node-recommend': renderRecommendVersion,
                'nvm-list': renderNvmList,
                'nvm-list-available': renderNvmAvailable,
                'nvm-v': renderNvmV,
                'nvmrc-check': renderNvmrcCheck
            };
            if (renderFunctions[section.id]) {
                await renderFunctions[section.id]();
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
