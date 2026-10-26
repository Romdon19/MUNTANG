// สร้างเดโมไฟล์เดียว dist/muntang-demo.html (ไม่ต้องมีเซิร์ฟเวอร์) สำหรับพรีวิว/แชร์
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const coreAlias = {
  name: 'core-alias',
  setup(b) {
    // ไฟล์ใน public/js import '../core/x.js' (เสิร์ฟจาก src/core ในเซิร์ฟเวอร์)
    b.onResolve({ filter: /^\.\.\/core\// }, (args) =>
      args.importer.includes(`${path.sep}public${path.sep}js${path.sep}`) ? { path: path.join(root, 'src', args.path.slice(3)) } : undefined
    );
  },
};

const result = await build({
  entryPoints: [path.join(root, 'scripts/demo/entry.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  plugins: [coreAlias],
  charset: 'utf8',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = ['public/css/theme.css', 'public/css/app.css', 'public/css/sim.css'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const logo = `data:image/png;base64,${fs.readFileSync(path.join(root, 'public/assets/logo-256.png')).toString('base64')}`;
const moods = JSON.stringify(Object.fromEntries(['idle', 'calm', 'ok', 'dizzy', 'spin'].map((l) => [l, `data:image/png;base64,${fs.readFileSync(path.join(root, `public/assets/mood-${l}.png`)).toString('base64')}`])));
const html = fs
  .readFileSync(path.join(root, 'scripts/demo/template.html'), 'utf8')
  .replace('/*__CSS__*/', () => css)
  .replaceAll('__LOGO__', () => logo)
  .replace('__MOODS__', () => moods)
  .replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/muntang-demo.html'), html);
console.log(`dist/muntang-demo.html ${(html.length / 1024).toFixed(0)} KB`);
