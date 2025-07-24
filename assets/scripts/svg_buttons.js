const icons = {
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M20.1,15.93c-.04.09-.09.18-.13.26-1.51,2.86-4.51,4.8-7.96,4.8-4.97,0-9-4.03-9-9S7.03,3,12,3c3.53,0,6.59,2.04,8.06,5"/>
  <polyline points="20 2 20 8 14 8"/>
    </svg>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="6.89 11.55 12 16.59 17.11 11.55"/>
    <line x1="12" y1="16" x2="12" y2="2"/>
    <path d="M21,15h0c0,3.31-2.24,6-5,6H8c-2.76,0-5-2.69-5-6h0"/>
    </svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12,6v7"/>
    <path d="M12,15v3"/>
    </svg>`,
    loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
    </svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M20 6L9 17l-5-5"/>
    </svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M10.53,4.85l-7.3,12.5c-.48.85-.19,1.93.63,2.41.26.15.55.23.84.24h14.59c.95-.01,1.71-.81,1.7-1.79,0-.3-.08-.6-.23-.86l-7.3-12.5c-.49-.83-1.55-1.1-2.37-.59-.24.15-.44.35-.58.59Z"/>
    <path d="M12,16v2"/>
    <path d="M12,8v6"/>
    </svg>`,
    confirm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M19,7l-1,12c0,1.1-.9,2-2,2h-8c-1.1,0-2-.9-2-2l-1-12h14Z"/>
    <path d="M9,5c0-1.1.9-2,2-2h2c1.1,0,2,.9,2,2v2h-6v-2Z"/>
    <path d="M12,9v6"/>
    <path d="M12,17v2"/>
</svg>`,
};
//创建svg按钮 
function createSvgButton(iconName, iconId) {
    const svgButton = document.createElement('button');
    svgButton.className = `button-icon ${iconName}`;
    if (iconId) {
        svgButton.id = iconId;
    }
    svgButton.innerHTML = icons[iconName];
    return svgButton;
}
//修改svg图标
function updateSvgIcon(svgButton, iconName) {
    if (svgButton) {
        svgButton.className = `button-icon ${iconName}`;
        svgButton.innerHTML = icons[iconName];
    }
}