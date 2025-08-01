// 公共变量
function renderNodeV(nodeV) {
    const section = document.getElementById('node-v');
    if (section) {
        const container = section.querySelector('.content-container');
        setT(container, nodeV || '未安装');
        container.className = `content-container segmentation ${nodeV ? 'success' : 'warning'}-color`;
        setLoadingState('node-v', false);
    }
}
function renderRecommendVersion(v) {
    const container = document.getElementById('node-recommend')?.querySelector('.content-container');
    if (container) {
        setT(container, v || '俺不推荐');
        container.className = `content-container segmentation ${v ? 'success' : 'warning'}-color`;
        setLoadingState('node-recommend', false);
    }
}
// 渲染 NVM 状态
function renderNvmV(nvmV) {
    const sectionId = 'nvm-v';
    const sElement = document.getElementById(sectionId);
    if (sElement) {
        const container = sElement.querySelector('.content-container');
        if (nvmV) {
            setAllSectionsToNone(false);
            setT(container, nvmV);
        } else {
            setAllSectionsToNone();
            const link = document.createElement('a');
            link.href = 'https://github.com/coreybutler/nvm-windows/releases';
            link.target = '_blank';
            setT(link, '下载nvm-windows');
            container.innerHTML = '';
            container.appendChild(link);
        }
        setLoadingState(sectionId, false);
    }
}

// 设置nvmrc检查结果
function renderNvmrcCheck(state, version) {
    const sectionId = 'nvmrc-check';
    // setLoadingState(sectionId);
    const tooltip = document.getElementById(sectionId).querySelector(`.content-container`);

    if (state === 'success') {
        setT(tooltip, version);
        tooltip.className = `content-container segmentation success-color`;
    }
    else if (state === 'use') {
        setT(tooltip, '切换', `: ${version}`);
        tooltip.className = `content-container segmentation warning-color`;
    } else if (state === 'install') {
        setT(tooltip, '未安装', `: ${version}`);
        tooltip.className = `content-container segmentation error-color`;
    } else if (state === 'use-fail') {
        setT(tooltip, '切换失败', `: ${version}`);
        tooltip.className = `content-container segmentation error-color`;
    } else if (state === 'nodeInvalid') {
        setT(tooltip, 'node无效');
        tooltip.className = `content-container segmentation error-color`;
    } else if (state === 'not-found') {
        setT(tooltip, 'nvmrc未找到');
        tooltip.className = `content-container segmentation warning-color`;
    }

    setLoadingState(sectionId, false);
}


// 2. 渲染已安装版本列表
function renderNvmList(result) {
    const sectionId = 'nvm-list';
    const containerElement = document.getElementById('installed-versions-container');
    if (containerElement) {
        setT(containerElement, '');
        if (result.versions?.length) {
            // 按主版本号分组
            const versionGroups = {};
            result.versions.forEach(version => {
                const majorVersion = version.split('.')[0];
                if (!versionGroups[majorVersion]) {
                    versionGroups[majorVersion] = [];
                }
                versionGroups[majorVersion].push(version);
            });

            // 创建分组容器并添加按钮
            Object.keys(versionGroups).sort((a, b) => b - a).forEach(majorVersion => {
                const groupContainer = document.createElement('div');
                groupContainer.className = 'uni-btn-s';
                versionGroups[majorVersion].forEach(version => {
                    groupContainer.appendChild(
                        createVersionButton(version, false, result.currentVersion, result.versions)
                    );
                });
                containerElement.appendChild(groupContainer);
            });
        } else {
            setT(containerElement, '没有已安装的Node版本');
        }
    }
    setLoadingState(sectionId, false);
}
//更新version-source
function updateVersionSource(data) {
    const sourceSelect = document.getElementById('version-source');
    if (!sourceSelect) { return; }

    // 清空现有选项
    sourceSelect.innerHTML = '';

    // 添加默认选项
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'nvm';
    sourceSelect.appendChild(defaultOption);

    // 添加配置的版本源选项
    if (data.sources && Array.isArray(data.sources)) {
        data.sources.forEach(source => {
            if (source.name && source.url) {
                const option = document.createElement('option');
                option.value = source.url;
                option.textContent = source.name;
                sourceSelect.appendChild(option);
            }
        });
    }

    // 设置当前选中的选项
    if (data.versionSource) {
        for (let i = 0; i < sourceSelect.options.length; i++) {
            if (sourceSelect.options[i].value === data.versionSource) {
                sourceSelect.selectedIndex = i;
                break;
            }
        }
    }
}
// 3. 渲染可用版本列表
function renderNvmAvailable(data) {
    const sectionId = 'nvm-list-available';
    // setLoadingState(sectionId, true, clean);
    const elementsContainer = document.querySelector('.table-container');
    if (elementsContainer) {
        setT(elementsContainer, '');
        if (data.avList && Object.keys(data.avList).length) {
            // 动态创建表格元素
            const table = document.createElement('table');
            table.id = 'available-versions-table';
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            const categories = Object.keys(data.avList);

            // 创建表头
            const headerRow = document.createElement('tr');
            categories.forEach(category => {
                const th = document.createElement('th');
                setT(th, category);
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // 创建表格内容
            const maxRows = Math.max(...categories.map(cat => data.avList[cat].length));
            Array.from({ length: maxRows }).forEach((_, i) => {
                const row = document.createElement('tr');
                categories.forEach(category => {
                    const td = document.createElement('td');
                    const version = data.avList[category][i];
                    version && td.appendChild(createVersionButton(version, true, data.nodeV, data.insList));
                    row.appendChild(td);
                });
                tbody.appendChild(row);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
            elementsContainer.appendChild(table);
        } else {
            setT(elementsContainer, '没有可用的Node版本');
        }
    }
    setLoadingState(sectionId, false);
}


//以下为辅助函数

//版本源切换处理
document.getElementById('version-source').addEventListener('change', function () {
    getData('nvm-list-available', document.getElementById('version-source').value);
});

// 2\3. 处理版本按钮创建
function createVersionButton(version, inTable, nodeV, insList) {
    // 修改状态判断逻辑
    let state;
    if (version === nodeV) {
        state = 'current';
    } else if (insList.includes(version)) {
        state = 'installed';
    } else {
        state = 'notInstalled';
    }
    return createButtonComponent(version, state, inTable);
}

//设置所有版块的display属性为none
function setAllSectionsToNone(isNone = true) {
    document.querySelectorAll('.section').forEach(section => {
        if (section.id !== 'nvm-v' && section.id !== 'node-v' && section.id !== 'node-recommend') {
            section.style.display = isNone ? 'none' : 'flex';
        } else {
            section.style.display = 'flex';
        }
    });
}

//设置section的loading状态
function setLoadingState(sectionId, isLoading = true, clean = true) {
    const section = document.getElementById(sectionId);
    if (!section) { return; }
    const container = section.querySelector('.content-container');
    const refreshBtn = section.querySelector(`#refresh-${sectionId}`);

    if (isLoading) {
        if (clean) { setT(container, '正在获取'); }
        refreshBtn?.classList.add('loading');
    } else {
        refreshBtn?.classList.remove('loading');
    }
}
// 创建所有刷新图标
function createAllRefreshButtons() {
    document.querySelectorAll('.section').forEach(section => {
        const titleBar = section.querySelector('.title-bar');
        if (!titleBar) {
            return;
        }
        const refreshBtn = createSvgButton('refresh', `refresh-${section.id}`);
        refreshBtn.classList.add('refresh');
        refreshBtn.addEventListener('click', () => {
            if (section.id === 'nvm-v') {
                getData('all');
            }
            if (section.id === 'nvm-list-available') {
                getData(section.id, document.getElementById('version-source').value);
            } else {
                getData(section.id);
            }
        });
        titleBar.appendChild(refreshBtn);
    });
}
//给nvm-v创建设置图标
function createNvmVSettingButton() {
    const nvmVSection = document.getElementById('nvm-v');
    if (!nvmVSection) {
        return;
    }
    const titleBar = nvmVSection.querySelector('.title-bar');
    if (!titleBar) {
        return;
    }
    const settingBtn = createSvgButton('setting', 'nvm-v-setting');
    settingBtn.classList.add('refresh');
    settingBtn.addEventListener('click', () => {
        getData('get-setting', { setting: true });
    });
    titleBar.appendChild(settingBtn);
}

// 手动安装版本功能
function handleManualInstall() {
    const versionInput = document.getElementById('manual-version-input');
    const version = versionInput.value.trim();
    if (version && versionInput.classList.contains('notInstalled')) {
        getData('nvm-install', version);
    }
}
// 手动安装按钮点击事件
document.getElementById('manual-install-btn')?.addEventListener('click', handleManualInstall);
// 添加回车键触发安装
document.getElementById('manual-version-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleManualInstall();
    }
});
// 验证版本号格式
function isValidVersion(version) {
    const currentVersion = version.match(/\d+(?:\.\d+){0,2}/)?.[0] ?? '';
    if (currentVersion !== '0' && currentVersion !== '0.0' && currentVersion !== '0.0.0') {
        return currentVersion;
    }
    return '';
}

// 页面加载完成后绑定事件并初始化页面渲染
// 在 initializePage 函数中添加以下代码
function initializePage() {
    log('页面初始化开始');
    createNvmVSettingButton();
    createAllRefreshButtons();

    // 添加下载图标到手动安装按钮
    const manualInstallBtn = document.getElementById('manual-install-btn');
    if (manualInstallBtn) {
        manualInstallBtn.appendChild(createSvgButton('download', 'manual-install-btn-download'));
    }

    // 添加输入框版本号验证
    const versionInput = document.getElementById('manual-version-input');
    versionInput.addEventListener('input', () => {
        const version = versionInput.value;
        const validVersion = isValidVersion(version);
        log('读取的版本号：', version, '转换的版本号:', validVersion);
        if (validVersion === version && version) {
            updateButtonState(manualInstallBtn, 'installed', 'download');
            versionInput.className = 'uni-btn notInstalled';
        } else {
            versionInput.className = 'uni-btn warning';
            updateButtonState(manualInstallBtn, 'warning');
        }
    });

    setAllSectionsToNone();
    getData('get-setting', { setting: false });
    getData('all');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}
