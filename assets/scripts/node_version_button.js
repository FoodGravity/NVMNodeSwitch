function createButtonComponent(version, isCurrent, inTable, installed) {
    // 按钮元素
    const button = document.createElement('button');
    button.className = 'node-version-button';
    button.setAttribute('data-version', version);
    button.textContent = version;
    // 根据参数自动判断状态
    const state = (inTable ? 'table.' : '') + (isCurrent ? 'current' : installed ? 'installed' : 'table');
    //更新按钮状态
    updateButtonState(button, state);
    // 点击事件处理
    button.addEventListener('click', async (event) => {
        let command;
        //如果点击的是图标且图标是删除图标
        if (event.target.closest('.button-icon') && event.target.closest('.button-icon').classList.contains('delete')) {
            event.stopPropagation();
            command = nvm.uninstall(version);
        } else if (button.querySelector('.button-icon').classList.contains('download')) {
            command = nvm.install(version);
        } else if (button.classList.contains('installed')) {
            command = nvm.use(version);
        }
        if (command) {
            console.log('发送命令:', command);
            vscode.postMessage(command);
            updateButtonState(button, 'downloading');
            window.addEventListener('message', handleMessage, { once: true });
        } else {
            console.log('未触发命令');
        }
    });
    // 监听来自扩展的消息
    const handleMessage = (event) => {
        const message = event.data;
        if (message.command && message.command.includes(version)) {
            console.log('接收到消息:', event.data);
            window.removeEventListener('message', handleMessage);
            if (message.error || (message.data && message.data.includes('error'))) {
                updateButtonState(button, 'error');
                console.error('命令执行失败:', message.error || message.data);
            } else if (message.command === nvm.uninstall(version)) {
                removeNonTableVersionButtons(version);
                setVersionButtonState(version, 'table');
                vscode.postMessage(nvm.l);
            } else if (message.command === nvm.use(version)) {
                resetCurrentButtons();
                setVersionButtonState(version, 'current');
            } else if (message.command === nvm.install(version)) {
                updateButtonState(button, 'installed');
                vscode.postMessage(nvm.l);
            }
        }
    };
    return button;
}


function updateButtonState(button, state) {
    if (button.classList.contains('table')) { state = 'table.' + state; }
    // 完全重置所有状态类名
    const allStates = ['table', 'installed', 'current', 'downloading', 'error'];
    button.classList.remove(...allStates);
    // 添加新状态类名
    if (state) {
        state.split('.').forEach(statePart => {
            button.classList.add(statePart);
        });
    }
    const stateMap = { table: 'download', current: 'delete', installed: 'delete', downloading: 'loading', error: 'error' };
    const stateConfig = stateMap[state?.split('.')?.find(s => s !== 'table') || 'table'];
    // 更新图标  
    const iconButton = button.querySelector('.button-icon');
    if (iconButton) {
        updateSvgIcon(iconButton, stateConfig);
    } else {
        button.appendChild(createSvgButton(stateConfig));
    }
}

// 恢复所有当前状态的按钮为installed
function resetCurrentButtons() {
    console.log('恢复所有当前按钮为installed');
    const allCurrentButtons = document.querySelectorAll('.node-version-button.current,.node-version-button.table.current');
    allCurrentButtons.forEach(button => {
        updateButtonState(button, 'installed');
    });
}
//设置指定版本的按钮状态
function setVersionButtonState(version, state) {
    console.log('设置版本按钮状态:', version, state);
    const versionButtons = document.querySelectorAll(`.node-version-button[data-version="${version}"]`);
    versionButtons.forEach(button => {
        updateButtonState(button, state);
    });
}
//移除指定版本的非table按钮
function removeNonTableVersionButtons(version) {
    console.log('移除非table版本按钮:', version);
    const versionButtons = document.querySelectorAll(`.node-version-button[data-version="${version}"]`);
    versionButtons.forEach(button => {
        if (!button.classList.contains('table')) {
            button.remove();
        }
    });
}