export const SAMPLE = `1. 高莉()
2. 刘振
   1. 群-刘振
   2. 美-刘振
   3. 魏-刘振
3. 单申兵
4. 宋晓东
5. 刘恒心
   1. 魏-刘恒心
   2. 蜀-刘恒心
   3. V-刘恒心
6. 李雷廷`;

// Indentation, rather than the numbering value, defines each item's parent.
export function parseList(text) {
  const entries = [], stack = [];
  for (const [line, raw] of text.replace(/^\uFEFF/, '').split(/\r\n?|\n/).entries()) {
    const expanded = raw.replace(/\t/g, '    ').replace(/\u3000/g, '  ');
    const indent = expanded.match(/^\s*/)[0].length;
    let name = expanded.trim().replace(/^(?:(?:[0-9０-９]+(?:[.．][0-9０-９]+)*[.．、)）:：]|[（(][0-9０-９]+[)）]|[一二三四五六七八九十百]+[、.．)）])\s*|[-*•]\s+)/, '').trim();
    name = name.replace(/[（(]\s*[)）]/g, '').trim();
    if (!name) continue;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();
    const parent = stack.at(-1);
    const item = { id: String(line), name, indent, parentId: parent?.id ?? null, depth: stack.length, path: [...(parent?.path ?? []), name], children: [] };
    if (parent) parent.children.push(item.id);
    entries.push(item); stack.push(item);
  }
  return entries;
}
export function getPool(entries, scope, excluded = new Set(), noRepeat = true) {
  const map = new Map(entries.map(e => [e.id, e]));
  return entries.filter(item => {
    const inScope = scope === 'roots' ? item.parentId === null : scope === 'all' ? true : scope === 'leaves' ? item.children.length === 0 : (() => {
      let parent = item.parentId;
      while (parent !== null) { if (parent === scope.slice(6)) return true; parent = map.get(parent)?.parentId ?? null; }
      return false;
    })();
    return inScope && (!noRepeat || !excluded.has(item.id));
  });
}
export function randomInt(max, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(max) || max < 1 || max > 4294967296) throw new RangeError('Invalid random range');
  const limit = Math.floor(4294967296 / max) * max;
  const values = new Uint32Array(1);
  do { cryptoSource.getRandomValues(values); } while (values[0] >= limit);
  return values[0] % max;
}
export function pick(pool, count) {
  if (!Number.isInteger(count) || count < 1 || count > pool.length) throw new RangeError('抽选数量超过可选人数');
  const copy = [...pool];
  for (let i = 0; i < count; i++) { const j = i + randomInt(copy.length - i); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy.slice(0, count);
}
export function csvCell(value) {
  let text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
