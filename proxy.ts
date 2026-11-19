import { NextRequest, NextResponse } from 'next/server';

import {
  getAuthoritativeSession,
  getPublicAuthConfig,
  getServerSession,
  isAdminSession,
} from '@/lib/server/auth';

/**
 * 设置页唯一鉴权层：只允许管理员进入。
 * - 未配置托管账户时同样拦截，避免后台在无认证状态下暴露
 * - 普通用户或未登录用户直接重定向，无法通过 URL 绕过
 */
export const config = {
  matcher: ['/settings/:path*', '/premium/settings/:path*'],
};

export default async function proxy(request: NextRequest) {
  let hasAuth = true;

  try {
    const authConfig = await getPublicAuthConfig();
    hasAuth = authConfig.hasAuth;
  } catch {
    // 认证存储异常时按已配置认证处理，保持失败关闭
  }

  if (!hasAuth) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith('/premium') ? '/premium' : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  let session = null;

  try {
    // 以存储中的账户状态为准：封禁或降权后旧会话同样失效
    session = await getAuthoritativeSession(request);
  } catch {
    try {
      session = await getServerSession(request);
    } catch {
      session = null;
    }
  }

  if (!session || !isAdminSession(session)) {
    const url = request.nextUrl.clone();
    url.pathname = request.nextUrl.pathname.startsWith('/premium') ? '/premium' : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
