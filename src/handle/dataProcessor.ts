// 2. 解析已安装版本
export function parseInsList(result: string) {
    const versions: string[] = [];
    let currentVersion = '';
    const versionRegex = /(\d+\.\d+\.\d+)/;

    result.split('\n').filter(Boolean).forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.includes('*')) {
            currentVersion = trimmedLine.replace('*', '').trim().match(versionRegex)?.[0] || '';
        }
        const version = trimmedLine.replace('*', '').trim();
        const match = version.match(versionRegex);
        if (match) { versions.push(match[0]); }
    });

    return { versions, currentVersion };
}
// 3. 解析可用版本
export function parseAvList(result: any) {
    //如果result为对象
    if (typeof result === 'object') {
        return {
            'LTS': result
                .filter((v: { lts: boolean; version: string }) => v.lts)
                .map((v: { version: string }) => v.version.replace(/^v/, '')),
            'Other': result
                .filter((v: { lts: boolean; version: string }) => !v.lts && /^\d+\.\d+\.\d+$/.test(v.version.replace(/^v/, '')))
                .map((v: { version: string }) => v.version.replace(/^v/, ''))
        };
    }
    const lines = result.split('\n').filter((line: string) => line.trim());
    const versions = {};

    if (lines.length > 1) {
        // 使用更高效的数组操作方法
        const headers = lines[0].split('|')
            .map((col: string) => col.trim())
            .filter((col: string) => col && !/^-+$/.test(col)); // 过滤掉表头中的分隔线

        // 使用reduce优化数据收集
        return lines.slice(2).reduce((acc: { [key: string]: string[] }, line: string) => {
            const columns = line.split('|')
                .map(col => col.trim())
                .filter(col => col);

            if (columns.length === headers.length) {
                headers.forEach((header: string, index: number) => {
                    const version = columns[index].match(/(\d+\.\d+\.\d+)/)?.[0];
                    if (version) { acc[header].push(version); }
                });
            }
            return acc;
        }, Object.fromEntries(headers.map((h: any) => [h, []])));
    }

    return versions;
}