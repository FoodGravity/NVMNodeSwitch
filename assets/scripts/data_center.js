// 获取VSCode API
const vscode = acquireVsCodeApi();

// 获取数据的主要方法
function getData(sectionId, params) {
    // const command = this.resolveCommand(sectionId, params);
    console.log('发送命令', { sectionId, params });
    vscode.postMessage({ sectionId, params });

}

// 解析命令，根据sectionId获取对应命令
function resolveCommand(sectionId, params) {
    // 特殊处理nvm-list-available命令
    if (sectionId === 'nvm-list-available') {
        return `nvm list available ${document.getElementById('version-source').value || ''}`.trim();
    }

    // 通用处理：将连字符替换为空格并附加参数
    return sectionId.replace(/-/g, ' ') + (params ? ` ${params}` : '');
}


// 独特渲染监听消息
window.addEventListener('message', async (event) => {
    console.log('收到消息', event.data);
    const { sectionId, params, data, error } = event.data;
    if (sectionId === 'nvm-v') {
        renderNvmV(data)
    }
    if (sectionId === 'nvmrc-check' || sectionId === 'create-nvmrc') {
        renderNvmrcCheck(data)
    }
    else if (sectionId === 'node-recommend') {
        renderRecommendVersion(data)
    }
    //列表
    else if (sectionId === 'nvm-list') {
        renderNvmList(true, data)
    }
    else if (sectionId === 'nvm-list-available') {
        renderNvmAvailable(true, data)
    }
    // 按钮
    else if (error) {
        setVersionButtonState(params, 'error');
    } else if (sectionId === 'buttonLoading') {
        setVersionButtonState(params, data === 'delete' ? 'warning' : 'downloading', 'loading');
    }
    else if (sectionId === 'nvm-use') {
        currentNodeVersion = data;
        resetCurrentButtons();
        setVersionButtonState(data, 'current');
    }
    else if (sectionId === 'nvm-install') {
        autoSetVersionButtonState(data);
    }
    else if (sectionId === 'nvm-uninstall') {
        if (data.delete) {
            if (data.version === currentNodeVersion) {
                currentNodeVersion = '';
            }
            removeNonTableVersionButtons(data.version);
            autoSetVersionButtonState(data.version);
            getData('nvm-list')
        } else {
            autoSetVersionButtonState(data.version);
        }
    }
}
);
