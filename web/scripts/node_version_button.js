function createButtonComponent(text, state, inTable) {
    // 按钮元素
    const button = document.createElement('button');
    button.className = `uni-btn${inTable ? ' table' : ''}`;
    button.setAttribute('data', text);
    button.innerHTML = `<span class="button-text">${text}</span>`;
    // button.textContent = text;
    console.log('创建按钮:', text, state);
    //更新按钮状态
    updateButtonState(button, state);
    // 点击事件处理
    button.addEventListener('click', async (event) => {
        let command;
        let state = 'downloading';
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
    table: 'download',
    installed: 'delete',
    current: 'success',
    downloading: 'loading',
    error: 'error',
    confirm: 'confirm',
    success: 'success',
    warning: 'warning',
};
function updateButtonState(button, state, iconState) {
    // 处理状态前缀
    if (button.classList.contains('table')) { state = 'table.' + state; }

    // 重置所有状态类名
    button.classList.remove(...Object.keys(BUTTON_ICONS));

    // 添加新状态类名
    if (state) {
        state.split('.').forEach(statePart => button.classList.add(statePart));
    }

    const activeState = state?.split('.')?.[1] || state;

    // 确定要使用的图标类型
    const iconType = iconState || BUTTON_ICONS[activeState];
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
//自动设置指定版本按钮状态
function autoSetVersionButtonState(version, nodeV, insList) {
    console.log('自动设置版本按钮状态:', version);
    const versionButtons = document.querySelectorAll(`.uni-btn[data="${version}"]`);
    versionButtons.forEach(button => {
        if (insList.includes(version)) {
            updateButtonState(button, version === nodeV ? 'current' : 'installed');
        } else {
            if (!button.classList.contains('table')) {
                button.remove();
            } else {
                updateButtonState(button, 'table');
            }
        }

    });
}