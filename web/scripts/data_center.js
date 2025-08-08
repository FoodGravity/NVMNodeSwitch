// 获取VSCode API
const vscode = acquireVsCodeApi();
let t = {};
let isdev = false;
function log(...args) {//可以接收多个消息
    if (isdev) { console.log(...args); }
}


// 获取数据的主要方法
function getData(sectionId, params) {
    log('发送命令', { sectionId, params });
    vscode.postMessage({ sectionId, params });

}

// 独特渲染监听消息
window.addEventListener('message', async (event) => {
    const { sectionId, params, data, error } = event.data;

    if (sectionId === 'isdev') { isdev = data; return; }

    log('收到消息', event.data);


    if (sectionId === 'get-setting') {
        // 区分消息来源
        if (params?.isConfigChange) {
            // 来自 extension.ts 的配置变更消息
            const settingsContainer = document.getElementById('settings-container');
            if (settingsContainer) {
                // 如果设置页面已打开，更新现有容器
                createSettingsContainer(data);
            }
        } else {
            // 来自 node_version_main.js 的主动设置消息
            if (params?.setting) {
                createSettingsContainer(data);
            } else {
                updateVersionSource(data);
            }
        }
        return;
    } else if (sectionId === 'get-languagePack') {
        t = data;
        // 应用语言包到界面
        applyLanguagePack();
    }
    // 设置加载状态
    if (data === 'loading') {
        if (sectionId === 'nvm-use' || sectionId === 'nvm-install' || sectionId === 'nvm-uninstall') {
            setVersionButtonState(params, sectionId === 'nvm-uninstall' ? 'warning' : 'loading');
        } else {
            setLoadingState(sectionId, true, params !== 'noClear');
        }
    }
    else if (sectionId === 'node-v') {
        renderNodeV(data);
        resetCurrentButtons();
        setVersionButtonState(data, 'current');
    }
    else if (sectionId === 'node-recommend') {
        renderRecommendVersion(data);
    }
    else if (sectionId === 'nvm-v') {
        renderNvmV(data);
    }
    else if (sectionId === 'nvmrc-check') {
        renderNvmrcCheck(params, data);
    }

    //列表
    else if (sectionId === 'nvm-list') {
        renderNvmList(data);
    }
    else if (sectionId === 'nvm-list-available') {
        renderNvmAvailable(data);
    }
    // 按钮
    else if (sectionId === 'nvm-use') {
        if (data === 'current') { resetCurrentButtons(); }
        setVersionButtonState(params, data);
    }
    else if (sectionId === 'nvm-install') {
        setVersionButtonState(params, data);
    }
    else if (sectionId === 'nvm-uninstall') {
        if (data === 'success') {
            removeNonTableVersionButtons(params);
            setVersionButtonState(params, 'notInstalled');
        } else if (data === 'cancelled') {
            setVersionButtonState(params, 'installed');
        }
        else if (data === 'error') {
            setVersionButtonState(params, 'error');
        }
    }
}
);


function applyLanguagePack() {
    //获取所有包含data-locale的元素
    const elements = document.querySelectorAll(`[data-locale]`);
    elements.forEach(el => {
        const key = el.getAttribute('data-locale');
        const addText = el.getAttribute('addText') || '';
        setT(el, key, addText);

        // 新增：处理input元素的placeholder
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
            const translated = t[key] || key;
            el.placeholder = translated + addText;
        }
    });
}
//设置单个元素的语言
function setT(element, key, addText = '') {
    if (!element) { return; }
    element.removeAttribute('data-locale');
    element.removeAttribute('addText');
    if (!key) {
        element.textContent = '';
        return;
    }

    const translated = t[key] || key;
    if (t[key]) {
        element.setAttribute('data-locale', key);
        if (addText) {
            element.setAttribute('addText', addText);
        }
    }
    element.textContent = translated + addText;
}

// 初始化时请求语言包
getData('get-languagePack');