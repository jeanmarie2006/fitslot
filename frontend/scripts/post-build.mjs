// Transforme public/spa/index.html en vue Blade et place les fichiers PWA à la racine publique.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const pub = path.resolve(here, '../../public')
const spa = path.join(pub, 'spa')

// fichiers PWA : ils doivent être à la racine de l'application (portée du service worker)
for (const f of fs.readdirSync(spa)) {
  if (/^(sw\.js|manifest\.webmanifest|icon.*|apple-touch-icon.*)$/.test(f)) {
    fs.copyFileSync(path.join(spa, f), path.join(pub, f))
    fs.rmSync(path.join(spa, f))
  }
}

let html = fs.readFileSync(path.join(spa, 'index.html'), 'utf8')
html = html
  .replace(/(href|src)="\.\/assets\//g, '$1="spa/assets/')
  .replace(/href="\.?\/?(manifest\.webmanifest|icon\.svg|apple-touch-icon\.png)"/g, 'href="$1"')
  .replace('<head>', '<head>\n  <base href="{{ rtrim(url(\'/\'), \'/\') }}/">')
const dest = path.resolve(here, '../../resources/views/spa.blade.php')
fs.mkdirSync(path.dirname(dest), { recursive: true })
fs.writeFileSync(dest, html)
console.log('Vue Blade générée :', path.relative(process.cwd(), dest))
