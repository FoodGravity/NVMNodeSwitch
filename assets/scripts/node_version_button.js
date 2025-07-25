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
        let state = 'downloading';
        const iconState = 'loading';
        //如果点击的是图标且图标是删除图标
        const icon = event.target.closest('.button-icon');
        if (icon && icon.classList.contains('delete')) {
            command = 'nvm-uninstall';
            state = 'warning';
        } else if (button.querySelector('.button-icon').classList.contains('download')) {
            command = 'nvm-install';
        } else if (button.classList.contains('installed')) {
            command = 'nvm-use';
        }
        if (command) {
            updateButtonState(button, state, iconState);
            getData(command, button.getAttribute('data'));

        } else {
            console.log('未触发命令');
        }
    });
    return button;
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
function updateButtonState(button, state, iconState) {
    if (button.classList.contains('table')) { state = 'table.' + state; }
    if (button.classList.contains('nvmrc')) { state = 'nvmrc.' + state; }
    console.log('更新按钮状态:', state, iconState);
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
function setVersionButtonState(version, state, iconState) {
    console.log('设置版本按钮状态:', version, state);
    const versionButtons = document.querySelectorAll(`.node-version-button[data="${version}"]`);
    versionButtons.forEach(button => {
        updateButtonState(button, state, iconState);

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