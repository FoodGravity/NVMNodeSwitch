// 创建设置容器
function createSettingsContainer(data) {
    // 创建新数据副本
    let newData = JSON.parse(JSON.stringify(data));

    //如果检查到已经有settings-container，则销毁settings-container重建
    const settingsContainer = document.getElementById('settings-container');
    if (settingsContainer) {
        settingsContainer.remove();
        createSettingsContainer(data);
        return;
    }
    //隐藏主容器
    const minContainer = document.getElementById('main-container');
    minContainer.style.display = 'none';
    //创建设置容器
    const container = document.createElement('div');
    container.id = 'settings-container';
    container.className = 'container';

    // 返回按钮部分
    const backButton = createSvgButton('back', 'back-button');
    backButton.classList.add('refresh');
    backButton.style.margin = '0 auto 0 0';
    backButton.style.padding = '6px 12px 6px 6px';
    backButton.style.gap = '8px';
    backButton.addEventListener('click', function () {
        minContainer.style.display = 'flex';
        container.remove();
    });


    const span = document.createElement('span');
    span.style.lineHeight = '16px';
    span.style.fontSize = '14px';
    span.style.verticalAlign = 'middle';
    setT(span, '返回');

    backButton.appendChild(span);
    container.appendChild(backButton);

    //标题
    const title = document.createElement('div');
    title.className = 'title';
    setT(title, '综合设置');
    title.style.textAlign = 'center';
    container.appendChild(title);


    // 创建提示设置部分
    const promptSection = document.createElement('div');
    promptSection.className = 'section';

    const promptTitleBar = document.createElement('div');
    promptTitleBar.className = 'title-bar';

    const promptTitleDiv = document.createElement('div');
    promptTitleDiv.classList.add('segmentation');
    setT(promptTitleDiv, '打开新窗口时是否提示创建.nvmrc文件');
    promptTitleBar.appendChild(promptTitleDiv);

    const promptCheckbox = document.createElement('input');
    promptCheckbox.type = 'checkbox';
    promptCheckbox.id = 'prompt-nvmrc-checkbox';
    promptCheckbox.checked = data.promptCreateNvmrc !== false;
    promptTitleBar.appendChild(promptCheckbox);

    promptSection.appendChild(promptTitleBar);
    container.appendChild(promptSection);

    // 监听变化
    promptCheckbox.addEventListener('change', function () {
        newData.promptCreateNvmrc = this.checked;
        checkSettingsChanged();
    });

    // 创建语言设置部分
    const languageSection = document.createElement('div');
    languageSection.className = 'section';

    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';

    const titleDiv = document.createElement('div');
    setT(titleDiv, '界面语言:');
    titleBar.appendChild(titleDiv);

    const languageSelect = document.createElement('select');
    languageSelect.id = 'language-select';
    languageSelect.className = 'uni-btn installed source-selector';

    const zhOption = document.createElement('option');
    zhOption.value = 'zh-CN';
    zhOption.textContent = '中文';
    if (data.language === 'zh-CN') { zhOption.selected = true; }

    const enOption = document.createElement('option');
    enOption.value = 'en';
    enOption.textContent = 'English';
    if (data.language === 'en') { enOption.selected = true; }

    languageSelect.appendChild(zhOption);
    languageSelect.appendChild(enOption);
    titleBar.appendChild(languageSelect);

    languageSection.appendChild(titleBar);
    container.appendChild(languageSection);

    // 监听语言选择变化
    languageSelect.addEventListener('change', function () {
        newData.language = this.value;
        checkSettingsChanged();
    });

    // 来源设置部分
    const sourceSection = document.createElement('div');
    sourceSection.className = 'section';
    const sourceTitleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    const sourceTitleDiv = document.createElement('div');
    setT(sourceTitleDiv, '可用列表的来源:');
    sourceTitleBar.appendChild(sourceTitleDiv);
    sourceSection.appendChild(sourceTitleBar);

    // 创建来源表格
    const sourcesTable = document.createElement('table');
    sourcesTable.id = 'sources-list';
    sourcesTable.className = 'table-container';

    // 创建表格内容
    const tbody = document.createElement('tbody');
    data.sources.forEach(source => {
        const name = source.name;
        const url = source.url;
        const row = createSourceRow(name, url);
        tbody.appendChild(row);
    });
    sourcesTable.appendChild(tbody);
    sourceSection.appendChild(sourcesTable);

    // 添加来源按钮
    const addSourceButton = createSvgButton('add', 'addSource');
    addSourceButton.classList.add('refresh');
    addSourceButton.style.width = '100%';
    addSourceButton.addEventListener('click', function () {
        const row = createSourceRow('', '');
        tbody.appendChild(row);
    });
    sourceSection.appendChild(addSourceButton);
    container.appendChild(sourceSection);

    // 保存按钮部分
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    // 重置按钮
    const resetButton = document.createElement('button');
    resetButton.id = 'reset-settings';
    resetButton.className = 'uni-btn table installed';
    setT(resetButton, '重置设置');
    resetButton.addEventListener('click', function () {
        getData('get-setting', { reset: true });
    });
    buttonContainer.appendChild(resetButton);
    //取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancel-settings';
    cancelButton.className = 'uni-btn table notInstalled';
    cancelButton.disabled = true;
    setT(cancelButton, '取消');
    cancelButton.addEventListener('click', function () {
        createSettingsContainer(data);
    });
    buttonContainer.appendChild(cancelButton);

    // 保存按钮
    const saveButton = document.createElement('button');
    saveButton.id = 'save-settings';
    saveButton.className = 'uni-btn table notInstalled';
    saveButton.disabled = true;
    setT(saveButton, '保存设置');
    saveButton.addEventListener('click', function () {
        getData('update-setting', newData);
    });
    buttonContainer.appendChild(saveButton);

    container.appendChild(buttonContainer);

    // 组装容器
    document.body.appendChild(container);

    //以下都是辅助函数
    // 添加设置变更检测函数
    function checkSettingsChanged() {
        // 比较语言设置
        const languageChanged = newData.language !== data.language;

        // 比较来源设置
        const sourcesChanged = JSON.stringify(newData.sources) !== JSON.stringify(data.sources);

        // 比较初始提示设置
        const promptChanged = newData.promptCreateNvmrc !== data.promptCreateNvmrc;
    
        const isChanged = languageChanged || sourcesChanged || promptChanged;

        // 取消按钮
        cancelButton.className = isChanged ? 'uni-btn table installed' : 'uni-btn table disabled notInstalled';
        cancelButton.disabled = !isChanged;
        // 保存按钮
        saveButton.className = isChanged ? 'uni-btn table installed' : 'uni-btn table disabled notInstalled';
        saveButton.disabled = !isChanged;
    }

    // 创建来源表格行
    function createSourceRow(name, url) {
        const row = document.createElement('tr');
        row.className = 'source-item';
        row.innerHTML = `
        <td>
        <input type="text" value="${name}" class="uni-btn table notInstalled" style="width: auto; box-sizing: border-box;"></td>
        <td style="width: 100%">
        <input type="text" value="${url}" class="uni-btn table notInstalled" style="box-sizing: border-box;"></td>
        <td style="padding: 2px;">
            ${createSvgButton('delete', '').outerHTML}
        </td>
    `;

        // 获取输入元素
        const nameInput = row.querySelector('td:first-child input');
        const urlInput = row.querySelector('td:nth-child(2) input');

        // 监听输入变化
        const updateData = () => {
            newData.sources = [];
            const rows = document.querySelectorAll('#sources-list tr');
            rows.forEach(row => {
                const name = row.querySelector('td:first-child input').value;
                const url = row.querySelector('td:nth-child(2) input').value;
                if (name || url) {
                    newData.sources.push({ name, url });
                }
            });
            checkSettingsChanged();
        };

        nameInput.addEventListener('input', updateData);
        urlInput.addEventListener('input', updateData);

        // 绑定删除按钮事件
        row.querySelector('.button-icon.delete').addEventListener('click', function () {
            row.remove();
            updateData();
        });
        return row;
    }
}
