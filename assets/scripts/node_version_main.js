
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
// 更新当前版本提示语
async function setCurrentVersionTip(isSuccess) {
    const currentVersionText = document.querySelector('.current-version');
    currentVersionText.innerHTML = currentNodeVersion ? `当前版本：${currentNodeVersion}` : '未选择版本';
    currentVersionText.className = 'segmentation current-version';
    currentVersionText.classList.add(currentNodeVersion ? isSuccess ? 'success-color' : 'warning-color' : 'error-color');
}
// 设置nvmrc检查结果
async function renderNvmrcCheck(needUse = true) {
    // 1. 设置加载状态并获取数据
    const sectionId = 'nvmrc-check';
    setLoadingState(sectionId, true);
    const { data: result } = await getData(sectionId);

    // 2. 获取DOM元素
    const titleBar = document.getElementById(sectionId).querySelector('.title-bar');
    const tooltip = document.getElementById(sectionId).querySelector('.content-container');
    tooltip.className = 'content-container segmentation';

    // 3. 确保按钮存在
    let button = titleBar.querySelector('.node-version-button') || createButtonComponent('创建.nvmrc', 'nvmrc');
    if (!titleBar.contains(button)) {
        const refreshBtn = titleBar.querySelector('.refresh');
        titleBar.insertBefore(button, refreshBtn || null);
    }

    // 4. 解析版本信息
    const version = result?.found ? result.version?.match(/(\d+(?:\.\d+){0,2})/)?.[0] : null;
    const theSame = version === currentNodeVersion;
    const isInstalled = version && installedVersions.includes(version);

    // 5. 根据不同情况处理
    if (!version) {
        // 情况1: 未找到.nvmrc文件
        tooltip.innerHTML = '未找到或为空';
        tooltip.classList.add('error-color');
        updateButtonState(button, 'error', '需要更新');
        await handleNvmCommand('create-nvmrc', currentNodeVersion || '', null, false);
        setCurrentVersionTip(false);
    } else if (needUse && !theSame) {
        // 情况2: 需要切换版本且当前版本与.nvmrc不一致
        const switchSuccess = await handleNvmCommand('nvm-use', version, null, false);
        tooltip.innerHTML = switchSuccess ? `已找到：${version}` : `${version}切换失败`;
        tooltip.classList.add(switchSuccess ? 'success-color' : 'error-color');
        updateButtonState(button, switchSuccess ? 'success' : 'warning', switchSuccess ? '无需更新' : version, switchSuccess ? null : 'download');
        setCurrentVersionTip(switchSuccess);
        renderNvmrcCheck(false); // 递归调用，但不需要再次切换
    } else {
        // 情况3: 其他情况
        tooltip.innerHTML = `已找到：${version}`;
        tooltip.classList.add('success-color');
        updateButtonState(button,
            isInstalled ? (theSame ? 'success' : 'warning') : 'warning',
            isInstalled ? (theSame ? '无需更新' : '需要更新') : version,
            isInstalled ? null : 'download'
        );
        setCurrentVersionTip(theSame && isInstalled);
    }

    // 6. 结束加载状态
    setLoadingState(sectionId, false);
}


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

// 2. 渲染已安装版本列表
async function renderNvmList(clean = true) {
    const sectionId = 'nvm-list';
    //获取数据
    setLoadingState(sectionId, true, clean);
    const { data: result } = await getData(sectionId);
    const { versions, currentVersion } = parseInstalledVersions(result);
    installedVersions = versions;
    currentNodeVersion = currentVersion;
    renderNvmrcCheck(false)
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
    // 根据参数自动判断状态
    const state = (inTable ? 'table.' : '') + (version === currentNodeVersion ? 'current' : installedVersions.includes(version) ? 'installed' : 'table');
    return createButtonComponent(version, state);
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
