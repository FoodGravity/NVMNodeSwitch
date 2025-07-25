
// 公共变量
let currentNodeVersion = '';
let installedVersions = [];

// 渲染 NVM 状态
async function renderNvmV(nvmV) {
    const sectionId = 'nvm-v';
    const sElement = document.getElementById(sectionId);
    if (sElement) {
        setLoadingState(sectionId);
        //是否为版本号
        if (nvmV) {
            setAllSectionsToNone(false);
            sElement.querySelector('.content-container').innerHTML = `${nvmV}`;
        } else {
            setAllSectionsToNone();
            sElement.querySelector('.content-container').innerHTML = '<a href="https://github.com/coreybutler/nvm-windows/releases" target="_blank">下载nvm-windows</a>';
        }
        setLoadingState(sectionId, false);
    }
}

// 设置nvmrc检查结果
async function renderNvmrcCheck(data) {
    const sectionId = 'nvmrc-check';
    setLoadingState(sectionId);
    const tooltip = document.getElementById(sectionId).querySelector(`.content-container`);

    // 使用解构和条件简写
    const { found, version } = data || {};
    const [message, colorClass] = found
        ? version
            ? [version, 'success-color']
            : ['版本为空', 'warning-color']
        : ['未找到', 'error-color'];

    tooltip.innerHTML = message;
    tooltip.className = `content-container segmentation ${colorClass}`;

    setLoadingState(sectionId, false);
}


// 推荐版本
async function renderRecommendVersion(data) {
    const sectionId = 'node-recommend';
    setLoadingState(sectionId);
    const container = document.getElementById(sectionId).querySelector('.content-container');
    container.innerHTML = data ? `推荐使用版本：${data}` : '无推荐版本';
    container.className = `content-container segmentation ${hasRecommend ? 'success' : 'warning'}-color`;
    setLoadingState(sectionId, false);
}

// 2. 渲染已安装版本列表
async function renderNvmList(clean = true, result) {
    const sectionId = 'nvm-list';
    setLoadingState(sectionId, true, clean);
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

});

// 2\3. 处理版本按钮创建
function createVersionButton(version, inTable) {
    // 根据参数自动判断状态
    const state = (inTable ? 'table.' : '') + (version === currentNodeVersion ? 'current' : installedVersions.includes(version) ? 'installed' : 'table');
    return createButtonComponent(version, state);
}

//设置所有版块的display属性为none
function setAllSectionsToNone(isNone = true) {
    document.querySelectorAll('.section').forEach(section => {
        if (isNone) { setLoadingState(section.id); }
        if (section.id !== 'nvm-v') {
            section.style.display = isNone ? 'none' : 'flex';
        }
    });
}

//显示section
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) { section.style.display = 'flex'; }
}
//设置section的loading状态
function setLoadingState(sectionId, isLoading = true, clean = true) {
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
            if (section.id === 'nvm-v') {
                setAllSectionsToNone();
                getData('all');
            } else {
                setLoadingState(section.id);
                getData(section.id);
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
    getData('initall');
    // renderNvmV();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
