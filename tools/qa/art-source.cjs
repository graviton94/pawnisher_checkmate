// Vite가 PNG를 인라인하거나 파일로 내보내는 경우 모두 실제 바이트를 대조한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
module.exports = async (pg, cssUrl, path) => {
  const url = cssUrl.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
  assert(url, `missing art: ${path}`);
  const expected = fs.readFileSync(path);
  const actual = url.startsWith('data:') ? Buffer.from(url.split(',')[1], 'base64') : await (await pg.request.get(new URL(url, pg.url()).href)).body();
  assert(actual.equals(expected), `wrong art payload: ${path}`);
};
