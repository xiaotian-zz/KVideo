import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

test('navbar exposes user menu with history, favorites, settings and logout', () => {
  const source = readFileSync(
    join(projectRoot, 'components/layout/Navbar.tsx'),
    'utf8',
  );

  assert.match(source, /aria-label="用户菜单"/);
  assert.match(source, /session\.username \|\| session\.name/);
  assert.match(source, /'管理员'[\s\S]*?'高级会员'[\s\S]*?'普通用户'/);
  assert.match(source, /观看历史/);
  assert.match(source, /href=\{favoritesHref\}/);
  assert.match(source, /session\.role === 'admin' && \([\s\S]*?href=\{settingsHref\}/);
  assert.match(source, /退出登录/);
});

test('premium settings includes the shared account management section', () => {
  const source = readFileSync(
    join(projectRoot, 'app/premium/settings/page.tsx'),
    'utf8',
  );

  assert.match(source, /import \{ AccountSettings \} from '@\/components\/settings\/AccountSettings';/);
  assert.match(source, /<SettingsTabs/);
  assert.match(source, /id: 'account'[\s\S]*?<AccountSettings \/>/);
  assert.match(source, /id: 'about'[\s\S]*?<AppVersionSettings \/>/);
});
