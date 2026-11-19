[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/KuekHaoYang/KVideo)

# 视频聚合平台 (KVideo)

![KVideo Banner](public/icon.png)

> 一个基于 Next.js 16 构建的现代化视频聚合播放平台。采用独特的 "Liquid Glass" 设计语言，提供流畅的视觉体验和强大的视频搜索功能。

> **本仓库定制版**：使用 Docker Compose 部署，应用与 Kvrocks 一起运行；首页提供精品推荐，导航与分类逻辑对齐 LunaTV；播放器支持进度条缩略图预览。

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

## 项目简介

**KVideo** 是一个高性能、现代化的视频聚合与播放应用，专注于提供极致的用户体验和视觉设计。本项目利用 Next.js 16 的最新特性，结合 React 19 和 Tailwind CSS v4，打造了一个既美观又强大的视频浏览平台。

> **说明**：仓库默认不内置任何视频源、高级源或 IPTV 源。部署者必须自行配置已获授权、可合法使用且允许当前部署方式访问的内容来源。

### 核心设计理念：Liquid Glass（液态玻璃）

项目的视觉设计基于 **"Liquid Glass"** 设计系统，这是一套融合了以下特性的现代化 UI 设计语言：

- **玻璃拟态效果**：通过 `backdrop-filter` 实现的磨砂半透明效果，让 UI 元素如同真实的玻璃材质
- **通用柔和度**：统一使用 `rounded-2xl` 和 `rounded-full` 两种圆角半径，创造和谐的视觉体验
- **光影交互**：悬停和聚焦状态下的内发光效果，模拟光线被"捕获"的物理现象
- **流畅动画**：基于物理的 `cubic-bezier` 曲线，实现自然的加速和减速过渡
- **深度层级**：清晰的 z-axis 层次结构，增强空间感和交互反馈

## 核心功能

### 智能视频播放

- **HLS 流媒体支持**：基于 [hls.js](https://github.com/video-dev/hls.js/) 原生支持 HLS (.m3u8) 格式，提供流畅的视频播放体验
- **进度条缩略图预览**：鼠标悬停进度条时，按目标时间点实时抽帧显示画面预览
- **播放控制**：完整的播放控制功能，包括进度条、音量控制、播放速度调节、全屏模式等
- **自动跳过片头/片尾**：可设置自动跳过片头和片尾的秒数
- **自动连播**：支持自动播放下一集
- **移动端优化**：专门为移动设备优化的播放器界面和双击手势控制
- **Chromecast 投屏**：支持通过 Google Cast 投屏到电视等设备
- **画中画 (PiP)**：支持浮动窗口模式播放
- **全屏模式选择**：支持系统全屏和网页全屏两种模式
- **代理播放**：三种代理模式（智能重试、仅直连、总是代理），灵活应对不同网络环境
- **卡顿检测**：自动检测播放卡顿并提示
- **一起看 (VideoTogether)**：播放器页面内置官方网页集成脚本，可直接创建或加入房间与朋友同步观看
- **键盘快捷键**：空格/K 播放暂停、F 全屏、M 静音、P 画中画、J/L/方向键 快进快退、上下键 音量调节

### 多源并行搜索

- **聚合搜索引擎**：同时在多个全局视频源中并行搜索，通过 Server-Sent Events (SSE) 实时返回结果
- **全局视频源**：视频源由管理员在设置中统一维护，所有用户共享，源名称显示为后台填写的名称
- **订阅源管理**：支持通过 JSON 链接批量导入和自动更新视频源
- **JSON 批量导入**：在导入设置中直接粘贴 JSON 数组格式的视频源进行批量添加
- **智能解析**：统一的解析器系统，自动处理不同源的数据格式
- **搜索历史**：自动保存搜索历史，支持快速重新搜索
- **搜索结果显示**：支持默认显示和合并同名源两种模式
- **实时延迟监测**：可选实时显示各源的网络延迟
- **清晰度标签**：自动解析并显示视频清晰度（4K/蓝光/1080P/720P/HD 等），方便快速分辨源质量
- **实际分辨率检测**：播放视频时自动检测并显示实际视频分辨率（如 1920x1080），不依赖源标签，显示真实清晰度。分辨率标签 5 秒后自动隐藏，鼠标移动时重新显示
- **全源分辨率探测**：播放器源列表中所有源均自动通过 m3u8 清单探测实际分辨率，显示精确的分辨率标签（1080P/720P/4K 等），不仅限于当前播放的源
- **繁体中文搜索**：自动将繁体中文转换为简体中文进行搜索，确保繁体输入也能搜到结果
- **源过滤**：支持按源和类型筛选搜索结果，源标签支持按类型分组显示，智能合并同名分类标签，展开/折叠状态持久化记忆
- **多级标签**：搜索结果和播放器中显示源名称和内容类型双重标签
- **搜索取消**：搜索进行中可随时点击"取消"按钮终止搜索，释放资源
- **内容类目过滤**：在设置中添加屏蔽关键词（如"伦理"），匹配类目的视频将自动从搜索结果中过滤
- **搜索性能优化**：服务端支持客户端断开检测（AbortSignal），每源超时保护，总结果数上限，防止内存溢出

### 首页与分类浏览

- **精品推荐**：首页横向展示热门电影、热门剧集、热门综艺、热门短剧，支持「查看更多」跳转对应分类页
- **统一导航**：精品推荐、源浏览器、电影、剧集、短剧、动漫、综艺、直播合并为一排胶囊导航
- **豆瓣分类页**：支持类型、地区、年代、排序筛选和标签切换，分页加载
- **短剧频道**：按源分类浏览短剧，展示集数与更新状态
- **源浏览器**：按全局视频源的真实分类浏览，分类标签完全以源返回为准，支持页码跳转
- **海报直达播放**：源浏览器中的海报点击后在新窗口打开播放页

### 多线路折叠

- **智能折叠**：播放页面的线路列表默认只显示前 5 个源，避免长列表影响体验
- **展开/收起**：超过 5 个源时显示"展开更多 (N)"按钮，可随时展开查看全部线路
- **按类型分组**：当线路包含类型信息时，自动按内容类型分组显示（如"电影"、"电视剧"等）
- **延迟排序**：线路按网络延迟自动排序，最快的源排在前面
- **源切换**：在线路列表中快速切换到其他源，支持断点续播
- **自动切源**：当当前源不可用时，自动切换到延迟最低的可用源
- **短链接优化**：使用 sessionStorage 缓存源数据，避免 URL 过长导致 CDN 414 错误

### IPTV 直播

- **M3U 播放列表**：支持导入和管理 M3U/M3U8 格式的 IPTV 源
- **JSON 频道列表**：支持导入 JSON 格式的频道列表（数组或对象格式，自动识别）
- **HEVC 智能兼容**：自动检测 HEVC/H.265 编码流，优先选择 H.264 级别以避免音画不同步或仅有声音问题
- **频道网格**：按分组展示频道，支持分页浏览，大列表搜索优化
- **多级频道列表**：播放器内按源分组 → 按分类分组 → 频道的三级列表导航
- **多线路折叠**：频道多线路默认显示前 3 条，可点击展开查看全部
- **线路合并与自动切换**：按 `tvg-id` 将同一频道的多条线路合并，播放失败或超时时自动尝试下一条线路
- **自定义请求头**：自动解析 M3U 中的 `http-user-agent` 和 `http-referrer` 属性，通过代理传递
- **User-Agent 智能代理**：当频道指定自定义 User-Agent 时，自动走代理路径避免浏览器限制，解决 CCTV 等频道仅有声音无画面的问题
- **流媒体代理**：内置 HLS 流代理，自动处理 CORS 问题和 M3U8 URL 重写
- **智能内容检测**：当 content-type 不明确时，检查响应体内容自动识别 M3U8 格式，同时保持二进制流数据完整性
- **重定向跟随**：自动跟随 HTTP 3xx 重定向，提升兼容性
- **超时保护**：15 秒请求超时、30 秒加载超时、20 秒分片加载超时、3 次清单重试
- **逐源频道缓存**：每个 IPTV 源的频道独立缓存，避免重复加载
- **并发控制**：最多同时拉取 3 个源，防止网络拥堵
- **权限控制**：登录用户可访问 IPTV 功能
- **键盘快捷键**：播放器内支持空格暂停/继续、F 全屏、M 静音、方向键调节音量等
- **搜索优化**：播放器内搜索使用 `useTransition` 非阻塞渲染，避免大列表卡顿

### 豆瓣集成

- **电影 & 电视剧分类**：支持在电影和电视剧之间无缝切换，方便查找不同类型的影视资源
- **详细影视信息**：自动获取豆瓣评分、演员阵容、剧情简介等详细信息
- **推荐系统**：基于豆瓣数据的相关推荐
- **豆瓣数据与图片代理**：可配置数据代理与图片代理线路，并支持豆瓣认证 Cookies
- **可点击演员/导演**：播放页面的演员、导演名字可直接点击搜索其他作品

### 个性化推荐

- **基于观看历史**：根据观看历史自动分析偏好，推荐相关影视内容
- **智能分析**：分析最常观看的类型、演员和地区，生成精准推荐
- **标签集成**：推荐作为首个标签「为你推荐」出现在标签栏中（需观看 2 部以上作品）
- **自动加载**：无限滚动自动加载更多推荐内容
- **独立模式**：普通模式和高级模式的推荐互相独立
- **缓存优化**：推荐结果缓存 30 分钟，避免重复请求

### 收藏管理

- **一键收藏**：在搜索结果和播放页面快速收藏视频
- **收藏列表**：独立的收藏侧边栏，快速访问已收藏的视频
- **容量限制**：每个模式最多 100 条收藏
- **普通/高级隔离**：普通模式和高级模式的收藏互相独立
- **数据隔离**：多账户场景下，每个用户拥有独立的收藏数据

### 观看历史管理

- **自动记录**：自动记录观看进度和历史
- **断点续播**：从上次观看位置继续播放
- **智能去重**：按标题去重（V2），相同标题不同源的历史合并为一条
- **容量限制**：最多保存 50 条历史记录
- **历史管理**：支持删除单条历史或清空全部历史
- **隐私保护**：所有数据存储在本地，不上传到服务器

### 弹幕 (Danmaku)

- **弹幕聚合**：接入自建弹幕聚合 API（兼容 [danmu_api](https://github.com/huangxd-/danmu_api) 格式），自动匹配当前播放内容
- **Canvas 渲染**：基于 Canvas 的高性能弹幕渲染，支持数百条弹幕同时滚动，不影响播放交互
- **滚动/顶部/底部弹幕**：支持三种弹幕类型，自动分配轨道防止重叠
- **自定义显示**：可调节弹幕透明度（10%-100%）和字号（14/18/20/24/28px）
- **显示区域**：可选 25%/50%/75%/100% 的屏幕区域显示弹幕
- **播放器联动**：暂停时弹幕冻结，跳转时自动清除，全屏模式下正常显示
- **多 API 管理**：每个用户可添加多个弹幕 API，选择当前使用的 API
- **优先级规则**：用户选择的弹幕 API 优先于系统默认配置
- **环境变量预设**：可通过 `DANMAKU_API_URL` 或 `NEXT_PUBLIC_DANMAKU_API_URL` 为所有用户预设弹幕 API 地址

### 广告过滤

- **多模式选择**：支持关闭、关键词过滤、智能启发式过滤(Beta)和激进模式
- **UI 集成**：在播放器设置菜单中直接切换模式，实时生效
- **自定义关键词**：支持通过环境变量或文件扩展过滤关键词
- **高性能**：基于流式处理，对播放加载速度几乎无影响

### 响应式设计

- **全端适配**：完美支持桌面、平板、移动设备和 TV/机顶盒
- **移动优先**：专门的移动端组件和交互设计
- **触摸优化**：针对触摸屏优化的手势和交互（双击快进/快退、滑动音量控制）
- **TV 适配**：遥控器方向键导航和大屏 UI 优化

### 主题系统

- **深色/浅色模式**：支持系统级主题切换
- **动态主题**：基于 CSS Variables 的动态主题系统
- **无缝过渡**：主题切换时的平滑过渡动画

### PWA 支持

- **可安装应用**：支持将 KVideo 安装为独立应用
- **Service Worker**：离线缓存和资源预加载
- **全屏体验**：独立应用模式下的沉浸式体验
- **配置同步**：iOS Safari 添加到主屏幕后，视频源和设置自动从服务端同步，无需重新配置

### 跨设备配置同步

用户配置、收藏、观看历史等数据统一存储在服务端 Kvrocks 中，按登录账户隔离，多设备访问同一账户即可自动同步。

**工作原理：**

1. **服务端存储（Kvrocks）**：用户数据通过 `/api/user/data` 按账户命名空间写入 Kvrocks，连接地址由 `KVROCKS_URL` 配置，同时兼容 Upstash Redis。
2. **自动同步**：应用加载时从服务端拉取数据，本地变更后自动推送（防抖），避免频繁写入。
3. **同步范围**：收藏、观看历史、播放进度、播放器设置、显示设置、弹幕设置、搜索历史等。
4. **全局配置**：视频源、订阅、豆瓣/Bangumi 代理配置由管理员统一维护，存储在同一 Kvrocks 实例中。

**数据隔离：** 每个账户的数据互不可见；全局配置仅管理员可修改。

### 无障碍设计

- **键盘导航**：完整的键盘快捷键支持（播放控制、音量、进度等）
- **ARIA 标签**：符合 WCAG 标准的无障碍实现
- **语义化 HTML**：使用语义化标签提升可访问性

### 高级模式

- **独立入口**：在浏览器地址栏直接输入 `/premium` 即可进入独立的高级视频专区
- **内容隔离**：高级内容与普通内容完全物理隔离，互不干扰
- **专属设置**：拥有独立的内容源管理和功能设置（播放器、显示、弹幕等设置完全独立）
- **独立推荐**：基于高级模式观看历史的个性化推荐，与普通模式互不影响
- **分类浏览**：支持模糊匹配合并多源的相同分类标签，提供统一浏览体验
- **交错排列**：多源结果智能交错排列，平衡各源展示

### TV/大屏适配

- **自动检测**：自动检测 TV 浏览器（Smart TV、Tizen、WebOS、Fire TV 等）
- **空间导航**：支持遥控器/方向键在页面元素间导航
- **10 英尺 UI**：TV 模式下自动放大字体、交互元素和间距
- **焦点高亮**：TV 模式下聚焦元素显示醒目的高亮边框和缩放效果
- **播放器兼容**：播放器区域不受空间导航干扰，方向键正常控制播放

### Android TV 应用

- **WebView 封装**：基于 Android WebView 的轻量 APK，直接加载 KVideo 网页
- **遥控器支持**：D-pad 中心键映射为 Enter，Back 键映射为网页后退
- **全屏沉浸**：自动横屏、全屏、硬件加速
- **Leanback 启动器**：支持从 Android TV 主屏直接启动
- **可配置 URL**：在 `MainActivity.kt` 中修改 `KVIDEO_URL` 常量指向你的部署实例

### Apple TV 应用

- **WKWebView 封装**：基于 tvOS WKWebView 的轻量 SwiftUI 应用，直接加载 KVideo 网页
- **遥控器支持**：滑动手势映射为滚动，点击映射为聚焦/选择，Menu 按钮支持网页后退
- **TV 模式注入**：页面加载后自动注入 `tv-mode` CSS 类，激活大屏优化样式
- **可配置 URL**：在 `ContentView.swift` 中修改 `kvideoURL` 常量指向你的部署实例

### 数据管理

- **设置导出/导入**：支持将所有设置导出为 JSON 文件，方便备份和迁移
- **JSON 批量导入**：支持粘贴 JSON 数组格式的视频源进行批量导入
- **滚动位置记忆**：退出或刷新页面后，自动恢复到之前的滚动位置
- **返回顶部**：一键返回页面顶部
- **数据隔离**：所有用户数据（历史、收藏、设置）按账户完全隔离，统一存储在 Kvrocks

## 隐私保护

- **数据自托管**：所有数据存储在你自己的 Kvrocks 实例中，不依赖第三方服务
- **账户隔离**：收藏、历史、播放记录、设置等按账户独立存储
- **全局配置**：视频源与代理配置由管理员统一维护，普通用户只读使用
- **最小化本地数据**：浏览器仅保留必要的界面偏好与会话 Cookie

## 账户与访问控制

应用采用服务端账户认证，登录状态由签名的 HTTP-only 会话 Cookie 维护。登录后才能访问收藏、观看历史、设置等需要身份的数据。

### 访问范围

- **普通用户**：搜索、播放、收藏、历史、IPTV、源浏览器等全部内容功能
- **管理员**：在后台管理全局视频源、订阅、账户，以及豆瓣 / Bangumi 元数据代理配置
- 账户数据按账户隔离，统一存储在 Kvrocks

### 部署配置

管理员账户在首次启动时由部署环境提供的凭据初始化；`AUTH_SECRET` 用于会话签名，必须设置为足够长的随机字符串。相关变量存放在仓库根目录的 `.env` 中，由 Docker Compose 读取，不要将真实凭据提交到仓库。

| 变量名 | 说明 |
|--------|------|
| `AUTH_SECRET` | 会话签名密钥，必填 |
| `ADMIN_USERNAME` | 初始管理员用户名，可选 |
| `ADMIN_PASSWORD` | 初始管理员密码，首次启动必填 |
| `ALLOW_REGISTRATION` | 是否开放注册页 |

> `.env` 已被 `.gitignore` 忽略；仓库中的 `docker-compose.yml` 只引用变量，不包含任何凭据。

## 站点名称自定义配置

通过环境变量可以自定义站点名称、标题和描述，无需修改源代码。

### 可用环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_SITE_TITLE` | 浏览器标签页标题 | `KVideo - 视频聚合平台` |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 站点描述 | `视频聚合平台` |
| `NEXT_PUBLIC_SITE_NAME` | 站点头部名称 | `KVideo` |

### 配置示例：

**Vercel 部署：**
在 Vercel 项目设置中添加环境变量：

- 变量名：`NEXT_PUBLIC_SITE_NAME`
- 变量值：`我的视频平台`

**Cloudflare Pages 部署：**
在 Cloudflare Pages 项目设置中添加环境变量：
- 变量名：`NEXT_PUBLIC_SITE_NAME`
- 变量值：`我的视频平台`

**本地开发：**
在项目根目录创建 `.env.local` 文件：
```env
NEXT_PUBLIC_SITE_NAME=我的视频平台
NEXT_PUBLIC_SITE_TITLE=我的视频 - 聚合播放平台
NEXT_PUBLIC_SITE_DESCRIPTION=专属视频聚合播放平台
```

> [!NOTE]
> `NEXT_PUBLIC_SITE_*` 属于构建时变量。直接运行 Docker Hub 的预构建镜像时，`docker run -e NEXT_PUBLIC_SITE_* ...` 不会覆盖已经打包进前端的文案。

## Docker 图标自定义

Docker 预构建镜像支持在运行时替换图标，无需重新构建镜像。该配置会作用于顶部 Logo 和浏览器 favicon；如果你还要同步替换安装后的 PWA 图标，请直接覆盖仓库中的 `public/icon.png` 后重新构建镜像。

### 可用环境变量：

| 变量名 | 说明 |
|--------|------|
| `SITE_ICON_FILE` | 从容器内文件路径读取图标，适合 Docker 挂载，优先级高于 `SITE_ICON_URL` |
| `SITE_ICON_URL` | 直接使用外部 URL 或站内路径作为图标 |

### 配置示例：

**Docker 挂载文件（推荐）：**
```bash
docker run -d -p 3001:3000 \
  -v /path/to/icon.png:/app/custom/icon.png:ro \
  -e SITE_ICON_FILE=/app/custom/icon.png \
  --name kvideo kuekhaoyang/kvideo:latest
```

**Docker 使用 URL：**
```bash
docker run -d -p 3001:3000 \
  -e SITE_ICON_URL="https://example.com/icon.png" \
  --name kvideo kuekhaoyang/kvideo:latest
```

**Docker 使用站内路径：**
```bash
docker run -d -p 3001:3000 \
  -e SITE_ICON_URL="/placeholder-poster.svg" \
  --name kvideo kuekhaoyang/kvideo:latest
```

## 自动订阅源配置

可以通过环境变量自动配置订阅源，应用启动时会自动加载并设置为自动更新。

支持两种环境变量名：`SUBSCRIPTION_SOURCES`（服务端） 和 `NEXT_PUBLIC_SUBSCRIPTION_SOURCES`（客户端构建时嵌入）。

**格式：** JSON 数组字符串，包含 `name` 和 `url` 字段；或直接提供订阅 URL（逗号分隔多个）。

**示例：**

```bash
# JSON 格式
SUBSCRIPTION_SOURCES='[{"name":"每日更新源","url":"https://example.com/api.json"},{"name":"备用源","url":"https://backup.com/api.json"}]'

# 简单 URL 格式
SUBSCRIPTION_SOURCES='https://example.com/api.json,https://backup.com/api.json'
```

**Docker 部署：**

```bash
docker run -d -p 3001:3000 -e SUBSCRIPTION_SOURCES='[{"name":"MySource","url":"..."}]' --name kvideo kuekhaoyang/kvideo:latest
```

**Vercel 部署：**

在 Vercel 项目设置中添加环境变量：
- 变量名：`SUBSCRIPTION_SOURCES`
- 变量值：`[{"name":"...","url":"..."}]`

**Cloudflare Pages 部署：**

在 Cloudflare Pages 项目设置中添加环境变量：
- 变量名：`NEXT_PUBLIC_SUBSCRIPTION_SOURCES`
- 变量值：`[{"name":"...","url":"..."}]`

## 广告过滤关键词配置

通过环境变量自定义广告过滤关键词，用于在 HLS 播放时识别和过滤广告片段。

| 变量名 | 说明 |
|--------|------|
| `AD_KEYWORDS` 或 `NEXT_PUBLIC_AD_KEYWORDS` | 广告关键词，逗号或换行分隔 |
| `AD_KEYWORDS_FILE` | 广告关键词文件路径（适用于 Docker 挂载） |

**示例：**

```bash
# 环境变量方式
AD_KEYWORDS="ad,sponsor,preroll,midroll"

# Docker 挂载文件方式
docker run -d -p 3001:3000 \
  -v /path/to/keywords.txt:/app/keywords.txt \
  -e AD_KEYWORDS_FILE=/app/keywords.txt \
  --name kvideo kuekhaoyang/kvideo:latest
```

## 弹幕 API 配置

通过环境变量预设弹幕聚合 API 地址，用户无需手动配置即可使用弹幕功能。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DANMAKU_API_URL` / `NEXT_PUBLIC_DANMAKU_API_URL` | 弹幕聚合 API 地址 | - |

需要自建或使用兼容 [danmu_api](https://github.com/huangxd-/danmu_api) 格式的弹幕聚合服务。

**示例：**

```bash
# Docker
docker run -d -p 3001:3000 \
  -e NEXT_PUBLIC_DANMAKU_API_URL="https://your-danmu-api.example.com" \
  --name kvideo kuekhaoyang/kvideo:latest
```

设置后用户在播放器菜单中即可直接开启弹幕，也可在设置页面中覆盖此地址。

> 用户还可以在设置页面的「弹幕 API」区域添加多个 API 端点并选择当前使用的，用户选择的 API 优先于系统默认配置。

## 一起看 (VideoTogether) 配置

播放器页面和 IPTV 页面支持集成 [VideoTogether](https://videotogether.github.io/zh-cn/guide/website.html) 官方网页脚本。应用内默认关闭，用户可在设置页手动开启；开启后仅在播放器和 IPTV 页面显示，并默认折叠为小图标。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VIDEOTOGETHER_ENABLED` | 设为 `false` 时彻底禁用一起看集成（即使用户在设置页开启也不会加载） | `true` |
| `VIDEOTOGETHER_SCRIPT_URL` | 自定义 VideoTogether 脚本地址，适合自托管或替换 CDN | `https://fastly.jsdelivr.net/gh/VideoTogether/VideoTogether@latest/release/extension.website.user.js` |
| `VIDEOTOGETHER_SETTING_URL` | 自定义 VideoTogether 设置页地址，对应官方 `window.videoTogetherWebsiteSettingUrl` 接口 | - |

**示例：**

```bash
# Docker
docker run -d -p 3001:3000 \
  -e VIDEOTOGETHER_SCRIPT_URL="https://your-domain.example.com/extension.website.user.js" \
  -e VIDEOTOGETHER_SETTING_URL="https://your-domain.example.com/videotogether-settings.html" \
  --name kvideo kuekhaoyang/kvideo:latest
```

> 如果部署环境无法稳定访问 jsDelivr，直接自托管 `extension.website.user.js` 并通过 `VIDEOTOGETHER_SCRIPT_URL` 指向自己的地址即可。

## IPTV 直播源配置

通过环境变量预设 IPTV 直播源，应用启动时会自动添加到直播源列表中。

> **注意**：在 Vercel / Cloudflare 托管部署的合规模式下，IPTV 页面与流中继默认关闭，`IPTV_SOURCES` / `NEXT_PUBLIC_IPTV_SOURCES` 不会生效。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `IPTV_SOURCES` | IPTV 直播源配置（服务端） | - |
| `NEXT_PUBLIC_IPTV_SOURCES` | IPTV 直播源配置（客户端） | - |

**格式：** JSON 数组字符串，包含 `name` 和 `url` 字段；或直接提供 M3U 链接（逗号分隔多个）。

**示例：**

```bash
# JSON 格式
IPTV_SOURCES='[{"name":"央视","url":"https://example.com/cctv.m3u"},{"name":"地方台","url":"https://example.com/local.m3u"}]'

# 简单 URL 格式
IPTV_SOURCES='https://example.com/cctv.m3u,https://example.com/local.m3u'
```

## 合并同名源配置

通过环境变量设置默认启用搜索结果的合并同名源显示模式。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MERGE_SOURCES` | 启用合并同名源（`true` 或 `1`） | - |
| `NEXT_PUBLIC_MERGE_SOURCES` | 启用合并同名源（客户端） | - |

**示例：**

```bash
MERGE_SOURCES=true
```

设置后搜索结果会自动以合并模式显示，将来自不同源的同名视频合并为一个卡片。用户仍可在设置页面中手动切换显示模式。

## 自定义端口

通过 `PORT` 环境变量自定义应用端口，默认为 3000。

```bash
# 开发模式
PORT=8080 npm run dev

# 生产模式
PORT=8080 npm run start

# Docker
docker run -e PORT=8080 -p 8080:8080 --name kvideo kuekhaoyang/kvideo:latest
```

## 局域网 IP 访问

通过 `ALLOW_LAN_ACCESS` 环境变量控制本机开发或传统 Node.js 自托管时是否允许同一局域网设备直接访问当前设备 IP。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ALLOW_LAN_ACCESS` | 设为 `true` / `1` / `yes` / `on` 时，`npm run dev` 和 `npm run start` 会绑定 `0.0.0.0`，并在开发模式下放行常见内网 IPv4 来源；未开启时默认只绑定 `localhost` | `false` |
| `NEXT_PUBLIC_ALLOW_LAN_ACCESS` | `ALLOW_LAN_ACCESS` 的构建时兼容名称；优先使用 `ALLOW_LAN_ACCESS` | `false` |
| `LAN_ALLOWED_DEV_ORIGINS` | 追加 Next.js 开发模式允许访问 dev 资源的主机名或通配符，逗号、空格或换行分隔 | - |

**示例：**

```bash
# 开发模式允许同局域网设备访问
ALLOW_LAN_ACCESS=true npm run dev

# 传统 Node.js 生产模式允许同局域网设备访问
ALLOW_LAN_ACCESS=true npm run start

# 追加自定义开发来源；Next.js 需要主机名，不要填写路径
ALLOW_LAN_ACCESS=true LAN_ALLOWED_DEV_ORIGINS="kvideo.lan,192.168.50.10" npm run dev
```

开启后访问地址通常是 `http://<当前设备内网 IP>:3000`。如果仍然无法访问，优先检查系统防火墙、路由器客户端隔离、端口映射、反向代理监听地址以及实际运行端口；这些不是 KVideo 前端代码可以绕过的问题。Docker 镜像已经在容器内绑定 `0.0.0.0`，是否能从局域网访问主要取决于 `-p` 端口映射和宿主机网络策略。

## 内置媒体代理说明

设置页的“代理播放模式”使用的是当前 KVideo 部署内置的 `/api/proxy` 媒体转发端点，不是让用户填写第三方 HTTP/SOCKS 代理服务器。

| 模式 | 行为 |
|------|------|
| 智能重试 | 优先直连，播放失败后自动切换到 `/api/proxy` |
| 仅直连 | 不使用 `/api/proxy`，失败时直接报错 |
| 总是代理 | 播放地址始终通过 `/api/proxy` 转发 |

`/api/proxy?url=<encoded-video-url>` 只在 Docker 或传统 Node.js 自托管完整模式下启用。Vercel / Cloudflare 托管部署运行合规模式，会禁用外部媒体代理、热链转发和 IPTV 流中继；这种部署环境下设置页会显示仅支持直连播放。

## 自定义源 JSON 格式

如果你想创建自己的订阅源或批量导入源，可以使用以下 JSON 格式。

**基本结构：**

可以是单个对象数组，也可以是包含 `sources` 或 `list` 字段的对象。

**源对象字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 否 | 唯一标识符，自动生成或自定义 |
| `name` | string | 是 | 显示名称 |
| `baseUrl` | string | 是 | API 地址 (例如: `https://example.com/api.php/provide/vod`) |
| `searchPath` | string | 否 | 搜索路径，默认 `/provide/vod` |
| `detailPath` | string | 否 | 详情路径，默认 `/provide/vod` |
| `group` | string | 否 | 分组，可选值: `"normal"` (默认) 或 `"premium"` |
| `enabled` | boolean | 否 | 是否启用，默认为 `true` |
| `priority` | number | 否 | 优先级，数字越小优先级越高，默认为 1 |
| `headers` | object | 否 | 自定义请求头 |

**示例 JSON：**

```json
[
  {
    "id": "my_source_1",
    "name": "我的精选源",
    "baseUrl": "https://api.example.com/vod",
    "group": "normal",
    "priority": 1
  },
  {
    "id": "premium_source_1",
    "name": "特殊资源",
    "baseUrl": "https://api.premium-source.com/vod",
    "group": "premium",
    "enabled": true
  }
]
```

### JSON 批量导入

除了通过订阅 URL 或文件导入外，还可以在导入设置中选择 **JSON** 标签页，直接粘贴上述格式的 JSON 数组进行批量导入。系统会解析、预览数量后再确认导入。

### 重要的区别说明：订阅源 vs 视频源

**这是一个常见的误区，请仔细阅读：**

- **视频源 (Source)**：
  - 指向单个 CMS/App API 接口
  - 例如：`https://api.example.com/vod`
  - 这种链接**不能**直接作为"订阅"添加
  - 只能在"自定义源管理"中作为单个源添加

- **订阅源 (Subscription)**：
  - 指向一个 **JSON 文件**（如上面的示例）的 URL
  - 这个 JSON 文件里包含了一个或多个视频源的列表
  - 例如：`https://mysite.com/kvideo-sources.json`
  - 这是一个**配置文件**的链接，不是视频 API 的链接
  - 只有这种返回 JSON 列表的链接才能在"订阅管理"中添加

> **简单来说**：如果你只有一个 m3u8 或 API 接口地址，请去"自定义源"添加。如果你有一个包含多个源的 JSON 文件链接，请去"订阅管理"添加。

## 全部环境变量参考

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AUTH_SECRET` | 会话签名密钥，必填 | - |
| `ADMIN_USERNAME` | 初始管理员用户名 | - |
| `ADMIN_PASSWORD` | 初始管理员密码，首次启动必填 | - |
| `ALLOW_REGISTRATION` | 是否开放注册页 | `true` |
| `KVROCKS_URL` | Kvrocks / Redis 连接地址 | `redis://kvideo-kvrocks:6666` |
| `PORT` | 自定义应用端口 | `3000` |
| `ALLOW_LAN_ACCESS` / `NEXT_PUBLIC_ALLOW_LAN_ACCESS` | 允许同局域网设备通过当前设备 IP 访问本机开发或传统 Node.js 自托管服务 | `false` |
| `LAN_ALLOWED_DEV_ORIGINS` / `NEXT_PUBLIC_LAN_ALLOWED_DEV_ORIGINS` | 追加 Next.js 开发模式允许访问 dev 资源的主机名或通配符 | - |
| `NEXT_PUBLIC_SITE_TITLE` | 浏览器标签页标题 | `KVideo - 视频聚合平台` |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 站点描述 | `视频聚合平台` |
| `NEXT_PUBLIC_SITE_NAME` | 站点头部名称 | `KVideo` |
| `SITE_ICON_FILE` | Docker 运行时图标文件路径（优先于 `SITE_ICON_URL`） | - |
| `SITE_ICON_URL` | Docker 运行时图标 URL 或站内路径 | - |
| `SUBSCRIPTION_SOURCES` | 自动订阅源配置（服务端） | - |
| `NEXT_PUBLIC_SUBSCRIPTION_SOURCES` | 自动订阅源配置（客户端） | - |
| `IPTV_SOURCES` / `NEXT_PUBLIC_IPTV_SOURCES` | IPTV 直播源配置 | - |
| `MERGE_SOURCES` / `NEXT_PUBLIC_MERGE_SOURCES` | 启用合并同名源显示（`true`/`1`） | - |
| `AD_KEYWORDS` / `NEXT_PUBLIC_AD_KEYWORDS` | 广告过滤关键词 | - |
| `AD_KEYWORDS_FILE` | 广告关键词文件路径 | - |
| `DANMAKU_API_URL` / `NEXT_PUBLIC_DANMAKU_API_URL` | 弹幕聚合 API 地址 | - |
| `VIDEOTOGETHER_ENABLED` | 是否允许 VideoTogether 一起看集成（`false` 时关闭） | `true` |
| `VIDEOTOGETHER_SCRIPT_URL` | VideoTogether 脚本地址 | `https://fastly.jsdelivr.net/gh/VideoTogether/VideoTogether@latest/release/extension.website.user.js` |
| `VIDEOTOGETHER_SETTING_URL` | VideoTogether 设置页地址 | - |

## 技术栈

### 前端核心

| 技术 | 版本 | 用途 |
|------|------|------|
| **[Next.js](https://nextjs.org/)** | 16.4.6 | React 框架，使用 App Router |
| **[React](https://react.dev/)** | 19.3.1 | UI 组件库 |
| **[TypeScript](https://www.typescriptlang.org/)** | 5.x | 类型安全的 JavaScript |
| **[Tailwind CSS](https://tailwindcss.com/)** | 4.x | 实用优先的 CSS 框架 |
| **[Zustand](https://github.com/pmndrs/zustand)** | 5.x | 轻量级状态管理 |
| **[hls.js](https://github.com/video-dev/hls.js/)** | 1.x | HLS 流媒体播放引擎 |
| **[Lucide React](https://lucide.dev/)** | 0.x | 图标库 |
| **[@dnd-kit](https://dndkit.com/)** | 6.x | 拖拽交互（标签排序等） |

### 开发工具

- **ESLint 10**：代码质量检查
- **PostCSS 8**：CSS 处理器
- **Vercel Analytics**：仅在 Vercel 部署中启用的性能监控和分析
- **Cloudflare Pages**：边缘部署支持

### 架构特点

- **App Router**：Next.js 的新路由系统，支持服务端组件和流式渲染
- **API Routes**：内置 API 端点，处理认证、豆瓣数据、弹幕聚合，以及仅在自托管完整模式下启用的媒体代理 / IPTV 中继
- **Server-Sent Events**：搜索 API 使用 SSE 流式返回实时结果
- **Service Worker**：PWA 支持和资源缓存
- **Server Components**：优化首屏加载性能
- **Client Components**：复杂交互和状态管理
- **Edge Runtime**：API 路由运行在 Edge Runtime 上，提供更低延迟
- **Profile-based Storage**：所有用户数据按账户隔离存储，统一持久化到 Kvrocks

## 部署合规说明

Issue [#127](https://github.com/KuekHaoYang/KVideo/issues/127) 之后，仓库的公开部署策略做了调整，目的只有一个：避免把这个项目继续包装成“GitHub 账号直连第三方平台的一键导入仓库”。

- 不再推荐任何 `Deploy with Vercel`、`Connect GitHub`、`Fork 后直接授权第三方读取仓库` 这一类 GitHub 直连导入流程。
- Vercel / Cloudflare 托管部署现在默认运行在**合规模式**：自动关闭外部媒体代理、热链转发和 IPTV 流中继，仅保留直连播放路径。
- 需要 `/api/proxy`、`/api/iptv/stream`、自定义 `User-Agent` / `Referer` 转发、IPTV 中继等能力时，请使用 Docker 或传统 Node.js 自托管。
- 无论部署到哪里，都只应接入你有权使用、且允许当前部署环境访问的内容来源。
- 相关政策请直接阅读官方原文：
  - [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service)
  - [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
  - [Vercel: why running another CDN / proxy on top of Vercel is not recommended](https://vercel.com/guides/why-running-another-cdn-on-top-of-vercel-is-not-recommended)
  - [Cloudflare abuse approach](https://www.cloudflare.com/trust-hub/abuse-approach/)

## 快速部署

### 部署到自己的服务器

#### 选项 1：Docker Compose 部署（推荐，完整功能）

```bash
git clone https://github.com/xiaotian-zz/KVideo.git
cd KVideo

# 在仓库根目录创建 .env，填入 AUTH_SECRET、ADMIN_USERNAME、ADMIN_PASSWORD 等变量
docker compose up -d --build
```

应用与 Kvrocks 会一起启动：应用默认访问 `http://localhost:3001`，Kvrocks 映射到 `6666`，数据保存在 `kvrocks-data` 卷中。

`docker-compose.yml` 只引用环境变量，不包含任何凭据；`.env` 已被 `.gitignore` 忽略，请勿提交。

> **镜像架构**：如需自行构建镜像，Dockerfile 支持 `linux/amd64` 与 `linux/arm64`。

#### 选项 2：传统 Node.js 部署（完整功能）

```bash
# 1. 克隆仓库
git clone https://github.com/xiaotian-zz/KVideo.git
cd KVideo

# 2. 安装依赖
npm install

# 3. 构建项目
npm run build

# 4. 启动生产服务器
npm start
```

应用将在 `http://localhost:3001` 启动。

同一局域网设备需要直接访问当前设备 IP 时，使用 `ALLOW_LAN_ACCESS=true npm run start`，并确认系统防火墙允许入站访问对应端口。

#### 选项 3：Vercel / Cloudflare 托管部署（合规模式）

适用于只需要搜索、账户、设置、直连播放等基础能力，不需要外部媒体代理 / IPTV 中继的场景。

1. **只从本地工作副本部署**：不要使用 GitHub 一键导入、Fork 后导入、Connect GitHub 读取仓库等流程。
2. **Vercel**：使用本地 CLI 部署现有项目，参考官方文档：[Import an existing project](https://vercel.com/docs/getting-started-with-vercel/import)。
3. **Cloudflare**：使用官方 **Direct Upload** 或 CLI 工作流，不要使用 Git integration，参考官方文档：[Getting started with Pages](https://developers.cloudflare.com/pages/get-started)。
4. **Cloudflare Direct Upload 正确流程**：
   ```bash
   npm install
   npm run pages:build
   ```
   构建完成后，上传 **`.vercel/output/static`** 目录，而不是仓库根目录、`.next` 目录或源码文件。上传仓库根目录只会把源码当静态文件托管，根路径没有构建产物可供 Pages 入口加载，结果就是 404。
5. **Cloudflare CLI 发布**：如果你使用 CLI，请发布同一个构建产物目录：
   ```bash
   npx wrangler pages deploy .vercel/output/static
   ```
6. **Cloudflare 构建链路**：`npm run pages:build` 现在固定使用仓库内安装的 `next-on-pages` 和兼容版本的 `vercel`，避免构建时临时拉取不受控版本。`wrangler.toml` 继续提供 `nodejs_compat` 兼容标志。
7. **功能限制**：托管平台会自动禁用外部媒体代理和 IPTV 流中继；请仅使用允许浏览器直连、允许当前来源访问且具备合法授权的内容源。
8. **如果你需要完整能力**：直接改用 Docker 或传统 Node.js 自托管，不要在托管平台上强行恢复这些能力。

#### 选项 4：Android TV APK 构建

项目内置了一个轻量的 Android TV WebView 壳应用，可以将 KVideo 打包成 APK 安装到 Android TV 或机顶盒上。

**直接下载：**

- 仓库维护者可以通过 GitHub Actions 的 `Android TV APK` 工作流直接发布预构建 APK 到 **Releases**
- 用户下载安装后，首次启动时填写自己的 KVideo 地址即可，不需要再改源码重新编译

**前置要求：**

- [Android Studio](https://developer.android.com/studio)（推荐）或 Android SDK Command-line Tools
- JDK 17+

**步骤：**

1. **使用 Android Studio 构建（推荐）**：
   - 用 Android Studio 打开 `android-tv/` 目录
   - 等待 Gradle 同步完成
   - 点击 **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - APK 输出在 `android-tv/app/build/outputs/apk/debug/app-debug.apk`

2. **使用命令行构建**：
   ```bash
   cd android-tv
   ./gradlew assembleDebug
   ```
   APK 输出在 `app/build/outputs/apk/debug/app-debug.apk`

   如果你希望在构建时预置默认地址，可额外传入 `-PkvideoUrl`：
   ```bash
   cd android-tv
   ./gradlew assembleDebug -PkvideoUrl="https://your-kvideo-instance.com"
   ```

3. **安装到 Android TV**：
   ```bash
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```
   或通过 U 盘、文件管理器等方式侧载安装。

4. **首次启动配置**：
   - 首次打开 APK 时输入你的 KVideo 部署地址
   - 保存后应用会记住该地址，后续直接打开即可
   - 需要修改地址时，可在站点根页按返回，或使用部分遥控器的菜单键重新打开设置页

> **注意**：此 APK 是一个 WebView 壳应用，需要你的 KVideo 实例已经部署并可访问。APK 本身不包含 KVideo 代码，仅作为 TV 端的浏览器入口。
>
> **最低系统要求**：Android 8.0 (API 26) 及以上。Android 7.0 及更低版本的 WebView 不支持本项目使用的 ES2017+ JavaScript 特性和现代 CSS，可能导致白屏。如遇白屏问题，请升级系统 WebView 或使用 Android 8.0+ 设备。
>
> **发布方式**：GitHub Actions 的 `Android TV APK` 工作流会持续验证壳应用可构建；如需对外发布预构建 APK，可手动触发该工作流并填写 `release_tag`，生成对应的 GitHub Release 资产。

#### 选项 5：Apple TV 应用构建

项目内置了一个轻量的 tvOS WKWebView 壳应用，可以将 KVideo 安装到 Apple TV 上。

**前置要求：**

- macOS + Xcode 15+
- Apple Developer 账号（免费账号即可侧载到个人设备）

**步骤：**

1. **创建 Xcode 项目**：打开 Xcode → **File → New → Project** → 选择 **tvOS → App** → 设置 Product Name 为 `KVideoTV`，Interface 选 **SwiftUI**，Language 选 **Swift**

2. **替换源文件**：将项目中 `apple-tv/KVideoTV/KVideoTV/` 目录下的 `KVideoTVApp.swift` 和 `ContentView.swift` 复制替换 Xcode 生成的同名文件

3. **修改目标 URL**：编辑 `ContentView.swift`，将 `kvideoURL` 改为你的部署地址：
   ```swift
   let kvideoURL = "https://your-kvideo-instance.com"
   ```

4. **设置部署目标**：将 Deployment Target 设置为 **tvOS 16.0** 或更高

5. **构建运行**：连接 Apple TV（或使用 tvOS 模拟器），按 **Cmd+R** 构建运行

**工作原理：**
- 全屏 `WKWebView` 加载 KVideo URL
- 页面加载后自动注入 `tv-mode` CSS 类，激活 TV 优化样式
- Apple TV 遥控器滑动手势映射为滚动，点击映射为聚焦/选择
- Menu 按钮支持网页后退导航

> **注意**：Apple TV 应用如果仅是 Web 壳应用，不可上架 App Store。此功能仅供个人侧载使用。也可以直接从 iPhone/iPad/Mac 使用 AirPlay 投屏，无需此应用。

## 如何更新

### Vercel 部署

不要依赖 GitHub 仓库自动导入。请在本地工作副本完成更新后，使用 Vercel CLI 重新发布当前目录。

### Cloudflare 托管部署

请在本地工作副本完成更新后，重新执行：

```bash
npm install
npm run pages:build
```

然后使用 Direct Upload 或 CLI 发布 **`.vercel/output/static`**。不要上传仓库根目录，也不要上传 `.next`，否则 Pages 只会托管源码文件，访问站点时直接 404。

### Docker Compose 部署

拉取代码更新后重新构建：

```bash
git pull origin main
docker compose up -d --build
```

数据保存在 `kvrocks-data` 卷中，重建容器不会影响已有账户、收藏与观看历史。

### Node.js 部署

```bash
cd KVideo
git pull origin main
npm install
npm run build
npm start
```

> **自动化部署**：本项目使用 GitHub Actions 自动构建和发布 Docker 镜像。每次代码推送到 main 分支时，会自动构建多架构镜像并推送到 Docker Hub。

## 常见问题

### Cloudflare Pages 部署报 "Unknown internal error"

这是 Cloudflare 的临时服务端错误，与代码无关。请在 Deployments 列表中重试部署即可。项目已内置 `wrangler.toml` 配置 `nodejs_compat` 兼容性标志。

### Cloudflare Pages Direct Upload 部署后打开是 404

这通常不是应用路由问题，而是上传了错误的目录。Cloudflare Pages 的 Direct Upload 需要上传已经构建完成的产物目录。

正确做法：

```bash
npm install
npm run pages:build
```

然后上传 **`.vercel/output/static`**。

错误做法：

- 上传仓库根目录
- 上传 `.next`
- 直接把源码压缩包丢给 Direct Upload

这些做法都不会生成 Pages 可执行入口，部署成功后打开站点就会是 404。

### IPv6 环境下 HTTPS 访问视频无法播放

如果你的网络使用 IPv6 访问，且通过路由器端口映射（如 20443 → 443），请确保：
- 反向代理（如 Caddy/Nginx）正确监听 IPv6 地址
- 路由器的 IPv6 端口映射规则与 IPv4 一致
- 如使用非标准端口，确保 IPv6 防火墙规则也已放行

这是网络/反向代理配置问题，非 KVideo 代码问题。

### Android 7.0 设备白屏

Android 7.0 (API 24) 的 WebView 基于 Chrome 51，不支持本项目使用的现代 JavaScript（ES2017+）和 CSS 特性。最低要求 Android 8.0 (API 26) 及以上。

### IPTV 部分直播流无法播放

如果你部署在 Vercel / Cloudflare 托管平台，IPTV 在合规模式下是**默认禁用**的；这不是 Bug，而是刻意限制。下面的说明只适用于 Docker / Node.js 自托管完整模式。

浏览器原生仅支持 HLS (m3u8) 和部分 MP4/WebM 格式。以下格式在浏览器中不受支持：
- RTMP/RTSP 流（需要专用播放器如 VLC/PotPlayer）
- 某些加密或受 DRM 保护的流
- 需要特定客户端验证的流

在自托管完整模式下，KVideo 的 IPTV 代理会处理 CORS 问题和 HLS URL 重写，大部分 HLS 直播流应能正常播放。

### IPTV CCTV 等频道只有声音没有画面

部分 CCTV 和卫视频道使用 HEVC (H.265) 编码，某些浏览器不支持硬件解码 HEVC。KVideo v4.5.0+ 已自动检测 HEVC 流并优先选择 H.264 级别以提高兼容性。如果问题仍存在，建议使用 Chrome 或 Edge 浏览器。

### 部分浏览器无法播放视频

一些内置浏览器（如 vivo 浏览器、QQ 浏览器等）的 WebView 可能不完整支持 MSE (Media Source Extensions) 和 HLS.js。建议使用以下浏览器：
- Chrome（推荐）
- Edge
- Safari（iOS/macOS）
- Firefox

KVideo v4.5.0+ 已增加多级回退机制，会依次尝试 HLS.js、原生 HLS、代理播放等方式。

## 贡献代码

我们非常欢迎各种形式的贡献！无论是报告 Bug、提出新功能建议、改进文档，还是提交代码，你的每一份贡献都让这个项目变得更好。

**想要参与开发？请查看 [贡献指南](CONTRIBUTING.md) 了解详细的开发规范和流程。**

快速开始：
1. **报告 Bug**：[提交 Issue](https://github.com/KuekHaoYang/KVideo/issues)
2. **功能建议**：在 Issues 中提出你的想法
3. **代码贡献**：Fork → Branch → PR
4. **文档改进**：直接提交 PR

## 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 致谢

感谢以下开源项目：

- [Next.js](https://nextjs.org/) - React 框架
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Zustand](https://github.com/pmndrs/zustand) - 状态管理
- [React](https://react.dev/) - UI 库
- [hls.js](https://github.com/video-dev/hls.js/) - HLS 播放引擎
- [Lucide](https://lucide.dev/) - 图标库
- [dnd-kit](https://dndkit.com/) - 拖拽交互

## 联系方式

- **作者**：[KuekHaoYang](https://github.com/KuekHaoYang)
- **项目主页**：[https://github.com/KuekHaoYang/KVideo](https://github.com/KuekHaoYang/KVideo)
- **问题反馈**：[GitHub Issues](https://github.com/KuekHaoYang/KVideo/issues)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/KuekHaoYang">KuekHaoYang</a>
  <br>
  如果这个项目对你有帮助，请考虑给一个 ⭐️
</div>

# Buy Me A Coffee
# Buy Me A Coffee
[![Buy Me A Coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=kuekhaoyang&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/kuekhaoyang)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=KuekHaoYang/KVideo&type=date&legend=top-left)](https://www.star-history.com/#KuekHaoYang/KVideo&type=date&legend=top-left)
