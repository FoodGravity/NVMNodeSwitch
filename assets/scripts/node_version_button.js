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
        } else if (button.classList.contains('nvmrc')) {
            await handleNvmCommand('create-nvmrc', currentNodeVersion || '', button);
            return;
        }

        if (command) {
            await handleNvmCommand(command, button.getAttribute('data'), button);
        } else {
            console.log('未触发命令');
        }
    });
    return button;
}
async function handleNvmCommand(command, version, button = null, refreshList) {
    // 统一设置下载状态
    if (button) updateButtonState(button, 'downloading');

    const { data, error } = await getData(command, version);

    // 统一错误处理
    const errorMessage = String(data || '');
    if (error || (data && errorMessage.includes('error'))) {
        if (button) updateButtonState(button, 'error');
        console.error('命令执行失败:', error || data);
        return false;
    }
    // 从返回数据中提取版本号
    let versionFromResponse = version;
    if (data) {
        const versionMatch = data.match(/(\d+\.\d+\.\d+)/);
        if (versionMatch) versionFromResponse = versionMatch[0];
        console.log('返回的版本号', versionFromResponse);
    }


    // 根据命令类型处理
    const actions = {
        'nvm-uninstall': () => {
            removeNonTableVersionButtons(version);
            setVersionButtonState(versionFromResponse, 'table');
        },
        'nvm-use': () => {
            resetCurrentButtons();
            setVersionButtonState(versionFromResponse, 'current');
        },
        'nvm-install': () => {
            if (button) updateButtonState(button, 'installed');
        },
        'create-nvmrc': () => {
            if (button) updateButtonState(button, 'success');
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
    // 如果是确认状态，添加超时自动取消
    if (state === 'confirm') {
        const version = button.getAttribute('data');
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