import { pinyin } from 'pinyin-pro';

/**
 * 根据源名称生成拼音全拼 ID，非中文保留字母数字。
 */
export function generateSourceIdFromName(name: string): string {
  const fullPinyin = pinyin(name, {
    toneType: 'none',
    type: 'string',
    nonZh: 'consecutive',
  });
  const slug = fullPinyin.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return slug || `custom-${Date.now().toString(36)}`;
}

/**
 * 生成不与现有 ID 冲突的拼音 ID，同音名称自动追加序号。
 */
export function createUniqueSourceId(name: string, usedIds: Set<string>): string {
  const base = generateSourceIdFromName(name);
  let id = base;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${base}-${suffix++}`;
  }
  usedIds.add(id);
  return id;
}
