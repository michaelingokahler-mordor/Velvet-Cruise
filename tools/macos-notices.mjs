import fs from 'node:fs';
import path from 'node:path';
/** Electron's notices live next to the .app in the official packaged distribution. */
export function macNoticeFiles(directory) {
  return ['LICENSE', 'LICENSES.chromium.html'].map(name => {
    const file = path.join(directory, name);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || fs.statSync(file).size === 0) throw Error('Missing or empty runtime license notice: ' + name);
    return file;
  });
}
