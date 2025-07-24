
// 公共变量
let currentNodeVersion = '';
let installedVersions = [];

// 渲染 NVM 状态
async function renderNvmV(nvmV) {
    const sectionId = 'nvm-v';
    const sElement = document.getElementById(sectionId);
    if (sElement) {
        setLoadingState(sectionId, true);
        nvmV ??= (await getData(sectionId)).data;
        //是否为版本号
        if (nvmV) {
            sElement.querySelector('.content-container').innerHTML = `${nvmV}`;
            // 自动获取其他数据 
            await renderNvmrcCheck();
            renderRecommendVersion()
            await renderNvmList();
            await renderNvmAvailable();
        } else {
            setAllSectionsToNone();
            sElement.querySelector('.content-container').innerHTML = '未安装，请下载安装: <a href="https://github.com/coreybutler/nvm-windows/releases" target="_blank">nvm-windows 官方下载</a>';
        }
        setLoadingState(sectionId, false);
    }
}

// 设置nvmrc检查结果
async function renderNvmrcCheck(udataNvmrc) {
    const sectionId = 'nvmrc-check';
    setLoadingState(sectionId, true);
    const { data: result } = await getData(sectionId);
    const tooltip = document.getElementById(sectionId).querySelector(`.content-container`);
    const nvmrcVersion = result?.found ? result.version : '';
    if (udataNvmrc) {
        // 始终更新.nvmrc为当前版本
        const success = await handleNvmCommand('create-nvmrc', currentNodeVersion, null, false);
        tooltip.innerHTML = success ? `已更新为 ${currentNodeVersion}` : `同步失败${currentNodeVersion}`;
        tooltip.className = `content-container segmentation ${success ? 'success' : 'error'}-color`;
    } else {
        // 自动切换.nvmrc版本
        const success = await handleNvmCommand('nvm-use', nvmrcVersion, null, false);
        tooltip.innerHTML = success ? `已自动切换至 ${nvmrcVersion}` : `自动切换失败 ${nvmrcVersion}`;
        tooltip.className = `content-container segmentation ${success ? 'success' : 'error'}-color`;

    }

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
async function renderNvmList(clean = true, result) {
    const sectionId = 'nvm-list';
    setLoadingState(sectionId, true, clean);
    result ??= (await getData(sectionId)).data;
    installedVersions = result.versions;
    currentNodeVersion = result.currentVersion;
    if (currentNodeVersion) { await renderNvmrcCheck(true); }
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
async function renderNvmAvailable(clean = true, availableVersions) {
    const sectionId = 'nvm-list-available';
    setLoadingState(sectionId, true, clean);
    availableVersions ??= (await getData(sectionId)).data;
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


//以下为辅助函数

//版本源切换处理
document.getElementById('version-source').addEventListener('change', function () {
    renderNvmAvailable();
});

// 2\3. 处理版本按钮创建
function createVersionButton(version, inTable) {
    // 根据参数自动判断状态
    const state = (inTable ? 'table.' : '') + (version === currentNodeVersion ? 'current' : installedVersions.includes(version) ? 'installed' : 'table');
    return createButtonComponent(version, state);
}

//设置所有版块的display属性为none
function setAllSectionsToNone() {
    document.querySelectorAll('.section').forEach(section => section.style.display = 'none');
}

//显示section
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) { section.style.display = 'flex'; }
}
//设置section的loading状态
function setLoadingState(sectionId, isLoading, clean = true) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    showSection(sectionId);
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
    setAllSectionsToNone();
    renderNvmV();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
