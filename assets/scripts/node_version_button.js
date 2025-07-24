function createButtonComponent(text, state) {
    // 按钮元素
    const button = document.createElement('button');
    button.className = 'node-version-button';
    button.setAttribute('data', text);
    button.textContent = text;
    console.log('创建按钮:', text, state);
    //更新按钮状态
    updateButtonState(button, state);
    // 点击事件处理
    button.addEventListener('click', async (event) => {
        let command;
        let version = button.getAttribute('data');
        let localButton = button;
        //如果点击的是图标且图标是删除图标
        if (event.target.closest('.button-icon')) {
            if (event.target.closest('.button-icon').classList.contains('delete')) {
                command = 'confirm-delete';
            } else if (event.target.closest('.button-icon').classList.contains('confirm')) {
                event.stopPropagation();
                command = 'nvm-uninstall';
            }
        } else if (button.querySelector('.button-icon').classList.contains('download')) {
            command = 'nvm-install';
        } else if (button.classList.contains('installed')) {
            command = 'nvm-use';
        }

        if (command) {
            await handleNvmCommand(command, version, localButton);
        } else {
            console.log('未触发命令');
        }
    });
    return button;
}
async function handleNvmCommand(command, version, button = null, refreshList = true) {
    // 统一设置下载状态
    if (button) updateButtonState(button, command == 'confirm-delete' ? 'confirm' : 'downloading');

    const { data, error } = await getData(command, version);

    // 统一错误处理
    if (error) {
        if (button) updateButtonState(button, 'error');
        console.error('命令执行失败:', error || data);
        return false;
    }
    // 根据命令类型处理
    const actions = {
        'nvm-uninstall': () => {
            removeNonTableVersionButtons(data);
            setVersionButtonState(data, 'table');
        },
        'nvm-use': () => {
            resetCurrentButtons();
            setVersionButtonState(data, 'current');
            if (!refreshList) currentNodeVersion = data;
        },
        'nvm-install': () => {
            if (button) updateButtonState(button, 'installed');
        },
        'confirm-delete': () => {
            if (data) {//data为布尔，此时不能用返回的数据为版本号
                handleNvmCommand('nvm-uninstall', version, button);
            } else {
                autoSetVersionButtonState(version);
            }
            return true;
        }
    };

    if (actions[command]) {
        actions[command]();
        if (refreshList) renderNvmList(false);
    }

    return true;
}
// 状态图标映射
const BUTTON_ICONS = {
    table: 'download',
    installed: 'delete',
    current: 'delete',
    downloading: 'loading',
    error: 'error',
    confirm: 'confirm',
    success: 'success',
    warning: 'warning',
    // nvmrc: 'download'
};
function updateButtonState(button, state, text, iconState) {
    // 更新按钮文本
    if (text) {
        button.textContent = text;
        button.setAttribute('data', text);
    }

    if (button.classList.contains('table')) { state = 'table.' + state; }
    if (button.classList.contains('nvmrc')) { state = 'nvmrc.' + state; }
    console.log('更新按钮状态:', state, text, iconState);
    // 完全重置所有状态类名
    const allStates = Object.keys(BUTTON_ICONS);
    button.classList.remove(...allStates);
    // 添加新状态类名
    if (state) { state.split('.').forEach(statePart => { button.classList.add(statePart); }); }
    // 更新图标   
    let iconButton = button.querySelector('.button-icon');
    if (iconState) {
        if (iconButton) {
            updateSvgIcon(iconButton, iconState);
        } else {
            iconButton = createSvgButton(iconState);
            button.appendChild(iconButton);
        }
    } else {
        const activeState = state?.split('.')?.[1] || state;
        console.log('更新图标:', activeState);
        if (iconButton) {
            updateSvgIcon(iconButton, BUTTON_ICONS[activeState]);
        } else {
            console.log('创建图标按钮:', BUTTON_ICONS[activeState]);
            iconButton = createSvgButton(BUTTON_ICONS[activeState]);
            button.appendChild(iconButton);
        }
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
    const versionButtons = document.querySelectorAll(`.node-version-button[data="${version}"]`);
    versionButtons.forEach(button => {
        updateButtonState(button, state);
    });
}
//移除指定版本的非table按钮
function removeNonTableVersionButtons(version) {
    console.log('移除非table版本按钮:', version);
    const versionButtons = document.querySelectorAll(`.node-version-button[data="${version}"]`);
    versionButtons.forEach(button => {
        if (!button.classList.contains('table')) {
            button.remove();
        }
    });
}
//自动设置指定版本按钮状态
function autoSetVersionButtonState(version) {
    console.log('自动设置版本按钮状态:', version);
    const versionButtons = document.querySelectorAll(`.node-version-button[data="${version}"]`);
    versionButtons.forEach(button => {
        if (installedVersions.includes(version)) {
            updateButtonState(button, version === currentNodeVersion ? 'current' : 'installed');
        } else {
            if (!button.classList.contains('table')) {
                button.remove();
            } else {
                updateButtonState(button, 'table');
            }
        }

    });
}