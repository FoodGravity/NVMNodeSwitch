// 获取VSCode API
const vscode = acquireVsCodeApi();

// 获取数据的主要方法
function getData(sectionId, params) {
    const command = this.resolveCommand(sectionId, params);
    const requestId = this.generateRequestId(sectionId);

    this.cancelPreviousRequest(sectionId, params);

    console.log('发送命令', command, requestId);
    vscode.postMessage({ command, requestId });

    return this.createRequestPromise(sectionId, command, requestId);
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

// 生成唯一的请求ID
function generateRequestId(sectionId) {
    return `${sectionId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// 取消之前的相同请求
function cancelPreviousRequest(sectionId, params) {
    const requestKey = params
        ? `currentRequest_${sectionId}_${params}`
        : `currentRequest_${sectionId}`;

    const currentRequest = window[requestKey];
    if (currentRequest) {
        currentRequest.isObsolete = true;
        currentRequest.cleanup();
    }
}

// 创建请求Promise
function createRequestPromise(sectionId, command, requestId) {
    return new Promise((resolve) => {
        const { listener, cleanup } = this.createMessageListener(
            sectionId, command, requestId, resolve
        );

        const requestObj = {
            id: requestId,
            cleanup,
            isObsolete: false
        };

        window[`currentRequest_${sectionId}`] = requestObj;
        window.addEventListener('message', listener);

        this.setRequestTimeout(sectionId, command, requestObj, resolve);
    });
}

// 创建消息监听器
function createMessageListener(sectionId, command, requestId, resolve) {
    const listener = (event) => {
        const message = event.data;
        if (message.requestId !== requestId) return;

        if (this.isObsolete) {
            console.log('忽略废弃请求的结果:', requestId);
            return;
        }

        console.log('接收数据', message);
        cleanupRequest(sectionId, listener);

        resolve({
            sectionId,
            command: message.command,
            data: message.data,
            error: message.error || null
        });
    };

    const cleanup = () => {
        cleanupRequest(sectionId, listener);
    };

    return { listener, cleanup };
}

// 清理请求资源
function cleanupRequest(sectionId, listener) {
    if (listener) {
        window.removeEventListener('message', listener);
    }
    delete window[`currentRequest_${sectionId}`];
}

// 设置请求超时处理
function setRequestTimeout(sectionId, command, requestObj, resolve) {
    const timeoutId = setTimeout(() => {
        if (requestObj.isObsolete) return;

        this.cleanupRequest(sectionId);
        resolve({
            sectionId,
            command,
            data: null,
            error: '请求超时'
        });
    }, 1200000);//20分钟、20*60*1000

    requestObj.timeoutId = timeoutId;
}
// 监听消息
window.addEventListener('message', async (event) => {
    const { command, data } = event.data;
    if (command === 'update-button-status') {
        const { activate, version } = data;
        if (activate === 'nvm-use') {
            currentNodeVersion = version;
            resetCurrentButtons();
            setVersionButtonState(version, 'current');
        } else if (activate === 'nvm-uninstall') {
            if (version === currentNodeVersion) {
                currentNodeVersion = '';
            }
            removeNonTableVersionButtons(version);
            setVersionButtonState(version, 'table');
        }
    }
});
