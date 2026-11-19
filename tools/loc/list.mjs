// 한 파일의 한글 문자열을 줄 번호와 함께 늘어놓는다 (D-650 재고 손질용): node tools/loc/list.mjs <파일.ts>
import fs from 'node:fs'; import ts from 'typescript';
const f = process.argv[2]; const src = fs.readFileSync(f, 'utf8'); const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true);
const v = (n) => {
  let t = null;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) t = n.text;
  else if (ts.isTemplateExpression(n)) t = [n.head.text, ...n.templateSpans.map((s) => '{}' + s.literal.text)].join('');
  if (t !== null && /[가-힣]/.test(t)) {
    console.log(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, JSON.stringify(t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 90)));
    if (ts.isTemplateExpression(n)) { n.templateSpans.forEach((s) => v(s.expression)); return; }
  }
  ts.forEachChild(n, v);
};
v(sf);
