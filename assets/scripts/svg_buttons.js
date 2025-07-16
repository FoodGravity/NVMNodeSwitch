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
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" >
<circle cx="12" cy="12" r="10"></circle>
<line x1="12" y1="8" x2="12" y2="12"></line>
<line x1="12" y1="16" x2="12.01" y2="16"></line>
</svg>`,
    loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
</svg>`
};
//创建svg按钮 
function createSvgButton(iconName, iconId) {
    const svgButton = document.createElement('button');
    svgButton.className = `button-icon ${iconName}`;
    if (iconId) {
        svgButton.id = iconId;
    }
    svgButton.innerHTML = icons[iconName];
    // svgButton.append(createSvgIcon(iconName, iconId));
    return svgButton;
}
//修改svg图标
function updateSvgIcon(svgButton, iconName) {
    if (svgButton) {
        svgButton.className = `button-icon ${iconName}`;
        svgButton.innerHTML = icons[iconName];
    }
}