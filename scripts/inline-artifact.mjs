// Inlines the Vite build in dist-artifact/ into one self-contained HTML file
// (artifact/agroclimatic.html) that can be opened or hosted without a server.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist-artifact';
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const read = (ref) => readFileSync(join(dist, ref.replace(/^\.?\//, '')), 'utf8');
const css = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g)].map(m => read(m[1]));
const js = [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*><\/script>/g)].map(m => read(m[1]));
if (!css.length || !js.length) throw new Error('Could not find built CSS/JS in dist-artifact/index.html');

// A literal "</script" inside the bundle would end the inline <script> early.
const safeJs = js.join('\n').replace(/<\/script/gi, '<\\/script');

const out = `<title>AgroClimatic Lab</title>
<style>
${css.join('\n')}
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`;

mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/agroclimatic.html', out);
console.log(`artifact/agroclimatic.html written (${(out.length / 1024).toFixed(0)} KB)`);
