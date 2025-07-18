const icons = {
    refresh: `<svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2">
<path class="cls-1" d="M19,6c-1.4-2.96-4.46-5-8-5C5.48,1,1,5.48,1,11s4.48,10,10,10c4.15,0,7.62-2.72,8.76-6.5M19.75.75v5.5h-5"/>`,
    delete: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<line x1="18" y1="6" x2="6" y2="18"></line>
<line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
<polyline points="7 10 12 15 17 10"></polyline>
<line x1="12" y1="15" x2="12" y2="3"></line>
</svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<circle cx="12" cy="12" r="10"></circle>
<path d="M12 7v5" stroke-linecap="round"/>
<path d="M12 16v0.5" stroke-linecap="round"/>
</svg>`,
    loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
</svg>`,
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M20 6L9 17l-5-5"/>
</svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
<line x1="12" y1="9" x2="12" y2="13"></line>
<line x1="12" y1="17" x2="12.01" y2="17"></line>
</svg>`,
    confirm: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M4 7h16m-1 0l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7"></path>
<path d="M9 5a2 2 0 012-2h2a2 2 0 012 2v2H9V5z"></path>
<path d="M10 12l2 2 4-4" stroke-linecap="round"/>
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