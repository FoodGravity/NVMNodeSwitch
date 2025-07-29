// 获取VSCode API
const vscode = acquireVsCodeApi();

// 获取数据的主要方法
function getData(sectionId, params) {
    console.log('发送命令', { sectionId, params });
    vscode.postMessage({ sectionId, params });

}

// 独特渲染监听消息
window.addEventListener('message', async (event) => {
    console.log('收到消息', event.data);
    const { sectionId, params, data, error } = event.data;
    if (sectionId === 'get-setting') {
        if(params?.setting){
            createSettingsContainer(data, params);
        }else{
            updateVersionSource(data);
        }
        return;
    }
    // 设置加载状态
    if (data === 'loading') {
        if (sectionId === 'nvm-use' || sectionId === 'nvm-install' || sectionId === 'nvm-uninstall') {
            setVersionButtonState(params, sectionId === 'nvm-install' ? 'warning' : 'downloading', 'loading');
        } else {
            setLoadingState(sectionId, true, params !== 'noClear');
        }
    }
    else if (sectionId === 'node-v') {
        renderNodeV(data);
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
            setVersionButtonState(params, 'table');
        } else if (data === 'cancelled') {
            setVersionButtonState(params, 'installed');
        }
        else if (data === 'error') {
            setVersionButtonState(params, 'error');
        }
    }
}
);
