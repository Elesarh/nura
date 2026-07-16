const fs = require('fs');

function processFile(file, level) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('translateError') && !content.includes('import { translateError }')) {
    const importPath = level === 0 ? './lib/errorTranslator' : level === 1 ? '../lib/errorTranslator' : '../../lib/errorTranslator';
    content = `import { translateError } from '${importPath}';\n` + content;
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}

try { fs.readdirSync('src/views/store').forEach(f => processFile(`src/views/store/${f}`, 2)); } catch(e){}
try { fs.readdirSync('src/views/superadmin').forEach(f => processFile(`src/views/superadmin/${f}`, 2)); } catch(e){}
try { fs.readdirSync('src/components').forEach(f => processFile(`src/components/${f}`, 1)); } catch(e){}
processFile('src/App.tsx', 0);
