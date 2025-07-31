function createButtonComponent(text, state, inTable) {
    // 按钮元素
    const button = document.createElement('button');
    button.className = `uni-btn${inTable ? ' table' : ''}`;
    button.setAttribute('data', text);
    button.innerHTML = `<span class="button-text">${text}</span>`;
    //更新按钮状态
    updateButtonState(button, state);
    // 点击事件处理
    button.addEventListener('click', async (event) => {
        let command;
        let state = 'loading';
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
            updateButtonState(button, state, 'loading');
            getData(command, button.getAttribute('data'));

        } else {
            console.log('未触发命令');
        }
    });
    return button;
}

// 状态图标映射
const BUTTON_ICONS = {
    notInstalled: 'download',
    installed: 'delete',
    current: 'success',
    loading: 'loading',
    error: 'error',
    confirm: 'confirm',
    success: 'success',
    warning: 'warning',
};
function updateButtonState(button, state, iconState) {
    // 重置所有状态类名
    button.classList.remove(...Object.keys(BUTTON_ICONS));
    button.classList.add(state);
    // 确定要使用的图标类型
    const iconType = iconState || BUTTON_ICONS[state];
    let iconButton = button.querySelector('.button-icon');
    if (iconType) {
        if (iconButton) {
            updateSvgIcon(iconButton, iconType);
        } else {
            button.appendChild(createSvgButton(iconType));
        }
    }
}


// 恢复所有当前状态的按钮为installed
function resetCurrentButtons() {
    console.log('恢复所有当前按钮为installed');
    const allCurrentButtons = document.querySelectorAll('.uni-btn.current,.uni-btn.table.current');
    allCurrentButtons.forEach(button => {
        updateButtonState(button, 'installed');
    });
}
//设置指定版本的按钮状态
function setVersionButtonState(version, state, iconState) {
    console.log('设置版本按钮状态:', version, state);
    const versionButtons = document.querySelectorAll(`.uni-btn[data="${version}"]`);
    versionButtons.forEach(button => {
        updateButtonState(button, state, iconState);

    });
    const manualInstallBtn = document.getElementById('manual-install-btn');
    const versionInput = document.getElementById('manual-version-input');
    const inputVersion = versionInput.value.trim();
    if (inputVersion === version) {
        versionInput.className = `uni-btn ${state}`;
        versionInput.setAttribute('style', `flex-grow: 1;cursor: ${state === 'loading' ? 'wait' : 'text'}`);
        versionInput.disabled = state === 'loading';
        updateButtonState(manualInstallBtn, state, iconState);
    }
}
//移除指定版本的非table按钮
function removeNonTableVersionButtons(version) {
    console.log('移除非table版本按钮:', version);
    const versionButtons = document.querySelectorAll(`.uni-btn[data="${version}"]`);
    versionButtons.forEach(button => {
        if (!button.classList.contains('table')) {
            button.remove();
        }
    });
}