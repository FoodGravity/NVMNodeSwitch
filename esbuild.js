const fs = require('fs');
const esbuild = require("esbuild");
const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const htmlMinifier = require('html-minifier');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

async function main() {
	// 打包 extension.ts
	const extensionCtx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outdir: 'dist',
		external: [
			'vscode',
			'html-minifier',
			'vsce',
			// 'node',
			'esbuild'
		],
		logLevel: 'silent',
		plugins: [esbuildProblemMatcherPlugin],
	});

	// 打包 web 资源
	const webCtx = await esbuild.context({
		entryPoints: [
			'web/NVMNodeSwitch.html',
			'web/scripts/*.js',
			'web/styles/*.css'
		],
		bundle: false,
		minify: production,
		outdir: 'dist/web',
		loader: {
			'.html': 'copy',
			'.css': 'css',
			'.js': 'js'
		},
		plugins: [
			{
				name: 'html-minifier',
				setup(build) {
					if (production || watch) {
						build.onLoad({ filter: /\.html$/ }, async (args) => {
							const contents = await fs.promises.readFile(args.path, 'utf8');
							const minified = htmlMinifier.minify(contents, {
								collapseWhitespace: true,
								removeComments: true,
								minifyCSS: true,
								minifyJS: true,
								// 保留引号避免路径问题
								removeAttributeQuotes: false,
								removeEmptyAttributes: true,
								// 保留URI格式
								conservativeCollapse: true
							});
							return { contents: minified, loader: 'copy' };
						});
					}
				}
			}
		],
		charset: 'utf8'
	});

	if (watch) {
		await Promise.all([
			extensionCtx.watch(),
			webCtx.watch()
		]);
	} else {
		await Promise.all([
			extensionCtx.rebuild().then(() => extensionCtx.dispose()),
			webCtx.rebuild().then(() => webCtx.dispose())
		]);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
