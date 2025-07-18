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
        if (event.target.closest('.button-icon')) {
            if (event.target.closest('.button-icon').classList.contains('delete')) {
                updateButtonState(button, 'confirm');
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
            await handleNvmCommand(command, version, button);
        } else {
            console.log('未触发命令');
        }
    });
    return button;
}
async function handleNvmCommand(command, version, button = null) {
    // 统一设置下载状态
    if (button) updateButtonState(button, 'downloading');

    const { data, error } = await getData(command, version);

    // 统一错误处理
    if (error || (data && data.includes('error'))) {
        if (button) updateButtonState(button, 'error');
        console.error('命令执行失败:', error || data);
        return false;
    }

    // 根据命令类型处理
    const actions = {
        'nvm-uninstall': () => {
            removeNonTableVersionButtons(version);
            setVersionButtonState(version, 'table');
        },
        'nvm-use': () => {
            resetCurrentButtons();
            setVersionButtonState(version, 'current');
        },
        'nvm-install': () => {
            if (button) updateButtonState(button, 'installed');
        }
    };

    if (actions[command]) {
        actions[command]();
        renderNvmList(false);
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
    confirm: 'confirm'
};
function updateButtonState(button, state) {
    // 如果是确认状态，添加超时自动取消
    if (state === 'confirm') {
        const version = button.getAttribute('data-version');
        button.innerHTML = `${version}<div class="progress-bar"></div>`;
        button.appendChild(createSvgButton(BUTTON_ICONS[state]));
        
        const progressBar = button.querySelector('.progress-bar');
        progressBar.style.width = '100%';
        progressBar.style.transition = 'width 3s linear';
        
        setTimeout(() => {
            progressBar.style.width = '0%';
        }, 10);
        
        const timer = setTimeout(() => {
            if (button.classList.contains('confirm')) {
                const activeState = version === currentNodeVersion ? 'current' : 'installed';
                button.innerHTML = version;
                updateButtonState(button, activeState);
            }
        }, 3000);
    }
    console.log('更新按钮状态:', state);
    if (button.classList.contains('table')) { state = 'table.' + state; }
    // 完全重置所有状态类名
    const allStates = Object.keys(BUTTON_ICONS);
    button.classList.remove(...allStates);
    // 添加新状态类名
    if (state) {
        state.split('.').forEach(statePart => {
            button.classList.add(statePart);

        });
    }
    // 更新图标
    const activeState = state?.split('.')?.find(s => s !== 'table') || 'table';
    const iconButton = button.querySelector('.button-icon');
    if (iconButton) {
        updateSvgIcon(iconButton, BUTTON_ICONS[activeState]);
    } else {
        button.appendChild(createSvgButton(BUTTON_ICONS[activeState]));
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