# 杭↔蓉报销导向机票 PWA — 技术调研文档

> **版本**：v1.0  
> **日期**：2026-07-06  
> **状态**：需求拷问已完成，待进入实现阶段  
> **关联**：本调研基于 [需求共识基线（PRD 简版）](#附录-a-需求共识摘要)

---

## 1. 调研结论（Executive Summary）

| 维度 | 推荐方案 | 理由 |
|------|----------|------|
| **前端** | Vite + React + TypeScript | 生态成熟、PWA 插件完善、策略引擎可抽成纯 TS 包单测 |
| **样式** | CSS Variables + `prefers-color-scheme` | 纯系统极简、零 UI 库依赖、包体最小 |
| **BFF** | Node.js 单路由 API（`child_process` 调 `@fly-ai/flyai-cli`） | 与官方 CLI 行为一致；v1 无需逆向 MCP |
| **搜票** | `search-flight` 结构化接口 | 符合 v1「无 AI 聊天」决策；杭↔蓉实测可用 |
| **放假表** | `holiday-calendar` CN JSON，构建时 vendor 进仓库 | 含调休补班；比 `holiday-cn` 更适合「连续假期」计算 |
| **存储** | `localStorage` + 可选 `idb-keyval` | 状态量极小，无需 IndexedDB 复杂度 |
| **部署** | 静态前端（Vercel/Cloudflare Pages）+ Serverless BFF | 个人工具成本趋近于零 |
| **工期粗估** | 5–8 人日（含策略引擎单测 + 真机 PWA 联调） | 不含 UI 精修与多机型适配 |

**核心风险**：FlyAI 体验模式结果受限；iOS PWA 无自动安装提示；`search-flight` 响应字段与文档示例略有差异（见 §4）。

---

## 2. 产品范围复述

### 2.1 做什么

- **A**：杭州 ↔ 成都经济舱结构化搜票（锁定航线）
- **B**：报销窗口 / 节假日策略推荐（两阶段 UI）
- **PWA**：iPhone 竖屏主屏全屏、纯系统极简、深色跟随系统
- **本机状态**：每季度手动标记「已报销」；边界日半配置

### 2.2 不做什么（v1）

改城市、AI 聊天、登录同步、收藏行程、订单同步、小假智能排期、推送提醒。

### 2.3 验收标准

1. iPhone 可「添加到主屏幕」竖屏全屏使用  
2. 策略引擎覆盖：季度额度、国务院放假表、边界日 9/30·10/1·1/1、小假简要提示  
3. 真机可搜票并跳转飞猪 `jumpUrl`  
4. 「本季已报销」影响首页与结果策略展示  

---

## 3. 系统架构

### 3.1 推荐架构图

```
┌─────────────────────────────────────────────────────────┐
│  iPhone Safari PWA (standalone)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Search UI   │  │ Strategy     │  │ Settings        │ │
│  │ (dates/list)│◄─┤ Engine (TS)  │  │ (boundary/quota)│ │
│  └──────┬──────┘  └──────▲───────┘  └────────┬────────┘ │
│         │                │                     │          │
│         │           localStorage               │          │
└─────────┼────────────────┼─────────────────────┼──────────┘
          │ POST /api/flight/search              │
          ▼                                        │
┌─────────────────────────────────────────────────┴────────┐
│  BFF (Node Serverless / 单文件 Express)                   │
│  spawn: npx @fly-ai/flyai-cli search-flight ...          │
│  env: FLYAI_API_KEY (optional)                           │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
              Fliggy MCP / fly.ai (streamable_http)
```

### 3.2 模块划分

| 包/目录 | 职责 |
|---------|------|
| `packages/strategy` | 纯函数：季度判定、边界日、大假匹配、横幅文案、结果标签 |
| `packages/holidays` | 国务院放假表类型 + 按年 JSON（vendor 自 `holiday-calendar`） |
| `apps/web` | PWA 前端：搜票 UI、设置、安装引导 |
| `apps/bff` | 转发 FlyAI CLI，统一错误格式 |

**关键原则**：策略引擎 **零网络依赖**，100% 可单测；放假表 **构建时打入**，避免运行时 CDN 失败。

---

## 4. FlyAI / 飞猪接口调研

### 4.1 CLI 概况

- **包名**：`@fly-ai/flyai-cli@1.0.16`
- **安装**：`npm i -g @fly-ai/flyai-cli` 或 BFF 内 `npx`
- **输出**：单行 JSON → `stdout`；错误/提示 → `stderr`
- **配置**：`flyai config set FLYAI_API_KEY "..."`（可选，解锁完整结果）
- **描述**：飞猪酒店、机票查询命令行工具（streamable_http）

### 4.2 `search-flight` 参数（v1 使用子集）

| 参数 | v1 用法 |
|------|---------|
| `--origin` | 固定 `"杭州"` |
| `--destination` | 固定 `"成都"` |
| `--dep-date` / `--back-date` | 用户选择，`YYYY-MM-DD` |
| `--journey-type` | `1` 直飞（默认可筛） |
| `--seat-class-name` | `"经济舱"` |
| `--sort-type` | `3` 价格升序（UI 可切换 6/7/8） |
| `--dep-hour-start/end` | 时段筛选 |
| `--max-price` | 可选价格上限 |

### 4.3 实测结果（2026-07-06）

**请求**：

```bash
npx @fly-ai/flyai-cli search-flight \
  --origin "杭州" --destination "成都" \
  --dep-date 2026-10-01 --back-date 2026-10-07 \
  --journey-type 1 --sort-type 3
```

**结论**：

| 项 | 结果 |
|----|------|
| 城市名 `杭州`/`成都` | ✅ 正常解析为 HGH/CTU、TFU |
| 往返结果 | ✅ `itemList` 含去程+返程 `journeys` |
| 价格字段 | 实际为 `ticketPrice`（如 `"2980.00"`），文档示例写 `adultPrice` — **BFF 需做字段归一化** |
| 预订链接 | ✅ `jumpUrl` → `https://a.feizhu.com/...` |
| 图片 | ❌ 航班列表 **无** `picUrl` / `mainPic` — UI 不展示机票图 |
| 退改/行李 | ⚠️ 当前响应 **未返回** 独立退改字段 — v1「轻量辅助」需降级为：飞行时长、航司、直飞/经停、机场（双流/天府） |
| 体验模式 | `systemMessage` 提示部分结果受限，建议配置 API Key |
| 日期校验 | 过去日期返回 `{"message":"出发日期非法","status":1}` — 前端需限制最小日期为「今天」 |

### 4.4 BFF 实现要点

```typescript
// 伪代码 — 推荐接口形状
POST /api/flight/search
Body: { depDate, backDate?, journeyType?, sortType?, depHourStart?, depHourEnd? }

Response: {
  items: NormalizedFlightOffer[]  // ticketPrice, segments, jumpUrl, tags
  systemMessage?: string
}
```

- 使用 `execFile` 而非 `shell`，防止参数注入  
- 超时：建议 25–30s  
- 缓存：可对「同日同参」短缓存 2–5min（可选）  
- **勿**把 `FLYAI_API_KEY` 暴露到前端  

### 4.5 为何不 v1 使用 `ai-search` / `keyword-search`

需求已锁定 **结构化搜票**；NL 接口不利于解释报销季度，且结果结构不稳定。v2 可在结果页增加「AI 解释」按钮。

---

## 5. 策略引擎设计

### 5.1 领域模型

```typescript
type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface ReimbursementPolicy {
  route: { from: '杭州'; to: '成都' }  // 固定
  cabin: '经济舱'
  tripsPerQuarter: 1
  boundaryDates: Array<'09-30' | '10-01' | '01-01'>
  majorHolidays: ['春节', '劳动节', '国庆节']  // 名称匹配 holiday-calendar
}

interface UserState {
  year: number
  quarters: Record<Quarter, { reimbursed: boolean }>
  boundaryAssignments: Array<{
    date: string       // ISO date
    assignTo: Quarter | 'prevQ4' | 'nextQ1'
  }>
}
```

### 5.2 核心算法

#### （1）季度归属 `getQuarter(date)`

- 自然季度：1–3 → Q1，4–6 → Q2，7–9 → Q3，10–12 → Q4  
- **边界日覆盖**（用户已选时）：  
  - `09-30` / `10-01` → 用户选 Q3 或 Q4  
  - `01-01` → 用户选 **上年 Q4** 或 **当年 Q1**

#### （2）大假区间 `getMajorHolidayWindow(year, name)`

从 `holiday-calendar` 取 `type === 'public_holiday'` 且 `name_cn` 含「春节|劳动节|国庆节」的 **连续日期段**（相邻日期间隔 >1 天则切段，取含法定节假日的最长段）。

示例 2026：

| 大假 | 放假区间（法定+连休） |
|------|----------------------|
| 春节 | 2026-02-15 ~ 2026-02-23 |
| 劳动节 | 2026-05-01 ~ 2026-05-05 |
| 国庆节 | 2026-10-01 ~ 2026-10-07 |

#### （3）出行报销建议 `adviseTrip(depDate, backDate?, userState)`

输出 `TripAdvice`：

```typescript
interface TripAdvice {
  reimbursementMode: 'eligible' | 'self_pay' | 'quota_used' | 'boundary_choice_required'
  suggestedQuarter?: Quarter
  boundaryOptions?: Quarter[]
  labels: string[]           // 用于列表标签
  warnings: string[]       // 日期选择器/横幅
  reason: string             // 可展开说明
}
```

**规则优先级**：

1. 若 `suggestedQuarter` 已报销 → `quota_used` + 警告「本季额度已用，视为自付」  
2. 若 depDate（或去程）落在边界日且未 assignment → `boundary_choice_required`  
3. 若落在三大假区间内 → `eligible`，建议对应季度  
4. 若落在其他法定假（清明/端午/中秋等）→ `self_pay` + 小假提示上下文  
5. 普通工作日 → `self_pay`（仍可搜票）

#### （4）首页横幅 `getHomeBanner(today, userState, holidays)`

合并输出：

- `Q3 未报销 · 国庆节 87 天后（2026-10-01）`  
- 若下一重大假已过，指向下一年春节  
- 小假提示：`距中秋节还有 12 天，可考虑自付回一次`（下一 **非法定三大假** 的 `public_holiday` 段，且 today 在两大假之间的「探亲空窗期」）

### 5.3 单测用例（必须覆盖）

| # | 场景 | 期望 |
|---|------|------|
| 1 | 2026-10-01 去程，Q4 未报销，无边界选择 | `eligible`, Q4 |
| 2 | 2026-09-30，未选边界 | `boundary_choice_required`, [Q3,Q4] |
| 3 | 2026-09-30，用户选 Q3，Q3 已报销 | `quota_used` |
| 4 | 2026-01-01，用户选 prevQ4 | 计入上年 Q4 |
| 5 | 2026-04-04 清明 | `self_pay` |
| 6 | Q3 已报销，选 2026-08-15 | 可搜票 + 警告 self_pay |
| 7 | 跨年 2025-12-31 vs 2026-01-01 边界 | 季度与 assignment 正确 |

---

## 6. 国务院放假表数据源对比

| 项目 | holiday-cn | holiday-calendar | chinese-days |
|------|------------|------------------|--------------|
| **维护** | CI 抓国务院 | 多地区官方源 | AI+PR 更新 |
| **调休补班** | `isOffDay` 布尔 | `transfer_workday` 类型 | 有 |
| **大假连续段** | 需自行聚合 | 需自行聚合 | 提供函数库 |
| **格式** | `{ name, date, isOffDay }` | `{ name_cn, type }` | npm 包 + JSON |
| **国内 CDN** | jsDelivr gh | unpkg / jsDelivr | jsDelivr npm |
| **推荐度** | ⭐⭐⭐ | ⭐⭐⭐⭐ **v1 选用** | ⭐⭐⭐⭐（若要用 API） |

### 6.1 推荐：vendor `holiday-calendar`

- 构建脚本：`scripts/vendor-holidays.mjs` 拉取 `data/CN/{year}.json` 写入 `packages/holidays/data/`  
- 运行时 **不依赖外网**  
- 每年国务院公布后运行一次 vendor（README 写明流程）  
- 匹配大假：`name_cn` includes `春节` | `劳动节` | `国庆节`

### 6.2 与报销边界日的关系

- **9/30、10/1**：在 2026 年，`10-01` 属国庆法定假；`09-30` 2026 **非**法定假（2025 国庆调休曾涉及 9/30，需按年数据判断）  
- 引擎逻辑：**边界日列表来自半配置**，不依赖放假表是否标记该日为假  
- 放假表用于：**大假窗口** + **小假提示** + **日历 UI 高亮**

---

## 7. 前端技术选型

### 7.1 框架对比

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **React + Vite** | 组件生态、TS 成熟、`vite-plugin-pwa` | 略重于 Preact | ✅ **推荐** |
| Vue 3 + Vite | 模板简洁 | 团队偏好未知 | 备选 |
| Preact + Vite | 极小 | 生态略小 | 超轻量备选 |
| Next.js | SSR | PWA 个人工具无必要、BFF 分离 | ❌ |

### 7.2 UI / Apple 极简实现

**不引入** Ant Design / shadcn（违反「纯系统极简」且增大包体）。

| 要素 | 实现 |
|------|------|
| 字体 | `font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif` |
| 颜色 | CSS 变量；浅色 `#F2F2F7` 背景 / 白色卡片；深色 `#000` / `#1C1C1E` |
| 强调色 | `#007AFF`（iOS 蓝） |
| 圆角 | 卡片 `12px`，按钮全宽 `12px` |
| 分割 | `0.5px` border 或 `separator` class |
| 深色模式 | `@media (prefers-color-scheme: dark)` |
| 安全区 | `padding: env(safe-area-inset-*)` |
| 动效 | `prefers-reduced-motion` 尊重；列表项 `opacity` 轻过渡 |
| 触控 | 最小点击区 44×44pt |

### 7.3 页面结构

| 路由 | 内容 |
|------|------|
| `/` | 横幅 + 日期表单 + 搜索按钮 |
| `/results` | 航班列表 + 筛选 + 策略标签 |
| `/settings` | 四季报销开关、边界日选择历史、安装说明 |
| `/install` | iOS 添加到主屏幕图文引导（首次访问可弹） |

### 7.4 状态管理

- **搜票**：URL search params（`dep`, `back`）可分享、可回退  
- **报销状态**：`localStorage` key `hzcd-reimbursement-v1`  
- **无需** Zustand/Redux（状态简单）

---

## 8. PWA / iOS 专项调研

### 8.1 必须配置

```json
// manifest.webmanifest
{
  "name": "杭蓉机票",
  "short_name": "杭蓉机票",
  "display": "standalone",
  "start_url": "/",
  "background_color": "#F2F2F7",
  "theme_color": "#F2F2F7",
  "orientation": "portrait"
}
```

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
```

使用 `vite-plugin-pwa` 生成 SW；v1 **在线优先**（SW 只缓存 shell + 放假表 JSON）。

### 8.2 iOS 限制与对策

| 限制 | 影响 | 对策 |
|------|------|------|
| 无 `beforeinstallprompt` | 不能自动弹安装 | 设置页 + 首次访问底部 sheet 图文引导 Safari 分享→主屏幕 |
| 仅 Safari 可完整安装 | 微信内打开无法加主屏 | 检测 in-app browser，提示「在 Safari 中打开」 |
| 7 天未打开可能清缓存 | 本地报销状态丢失风险低（localStorage 单独策略） | 重要状态存 localStorage；文档告知用户 |
| 欧盟 iOS 17.4+ 无 standalone | 非目标用户群 | 文档注明 |
| 无后台同步 | 无推送 | v1 不做提醒 |
| `viewport` 键盘 | 日期选择器遮挡 | `visualViewport` 或原生 `<input type="date">` |

### 8.3 安装检测

```typescript
const isStandalone =
  ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone) ||
  window.matchMedia('(display-mode: standalone)').matches
```

---

## 9. 部署与成本

| 组件 | 推荐 | 月成本 |
|------|------|--------|
| 前端 | Cloudflare Pages / Vercel 静态 | 免费 |
| BFF | Vercel Serverless / CF Workers（Node 兼容） | 免费档 |
| 域名 | 可选自定义域名 HTTPS | ~￥10/年起 |
| FlyAI | 体验模式免费；正式 Key 按平台计费 | 视用量 |

**Monorepo 结构（pnpm workspace）**：

```
flyai/
├── apps/web/
├── apps/bff/
├── packages/strategy/
├── packages/holidays/
├── docs/RESEARCH.md
└── package.json
```

---

## 10. 风险登记册

| ID | 风险 | 概率 | 影响 | 缓解 |
|----|------|------|------|------|
| R1 | FlyAI 体验模式结果不全 | 高 | 中 | 申请正式 API Key；UI 展示 systemMessage |
| R2 | 公司报销规则变更 | 中 | 高 | 半配置边界日；政策常量集中 `policy.ts` |
| R3 | 放假表国务院临时调整 | 低 | 中 | vendor 脚本 + 版本号；设置页显示数据年份 |
| R4 | 用户误解边界日计入季度 | 中 | 高 | 边界日强制二次确认；结果页双标签 |
| R5 | CLI 响应字段变更 | 低 | 中 | BFF 归一化层 + 契约测试 |
| R6 | 飞猪 jumpUrl 失效/地域限制 | 低 | 中 | 外链新窗口打开；失败提示复制链接 |
| R7 | 成都双流+天府双机场混淆 | 中 | 低 | 结果展示机场简称（双流/天府） |

---

## 11. 实施路线图

### Phase 0 — 脚手架（0.5d）

- pnpm monorepo、ESLint、TS strict  
- `packages/strategy` + Vitest 空套件  

### Phase 1 — 策略引擎（1.5–2d）

- vendor 2025–2027 放假表  
- 实现 `adviseTrip` / `getHomeBanner`  
- 单测 ≥7 条用例全绿  

### Phase 2 — BFF（0.5–1d）

- `/api/flight/search` 封装 CLI  
- 字段归一化 `ticketPrice` → `priceYuan`  
- 错误映射（非法日期、超时）

### Phase 3 — PWA 前端（2–3d）

- 首页 + 结果列表 + 设置  
- 策略标签/横幅接入  
- iOS 安装引导、深色模式  

### Phase 4 — 联调验收（1d）

- 真机 PWA + 飞猪跳转  
- 边界日交互走查  
- 体验模式 vs API Key 对比  

---

## 12. 待决事项（实现前 5 分钟可拍板）

| # | 问题 | 建议默认 |
|---|------|----------|
| 1 | 产品中文名 / 主屏短名 | 「杭蓉机票」 |
| 2 | 默认往返 vs 单程 | 默认 **往返** |
| 3 | 机场筛选（双流/天府统一「成都」） | v1 不筛，结果展示机场名 |
| 4 | BFF 与前端同域 vs 跨域 | 开发期 Vite proxy；生产同域 `/api` |
| 5 | 是否申请 FlyAI 正式 Key | 开发阶段可后补；上线前建议申请 |

---

## 附录 A. 需求共识摘要

（来自需求拷问会话）

- 范围：**A+B**，锁定杭↔蓉，结构化搜票，两阶段策略 UI  
- 平台：竖屏 **PWA**，纯系统极简，深色跟随系统  
- 规则：半配置边界日 + 手动季度报销标记；**国务院放假表**；小假 **简要提示**  
- 搜票：跳转飞猪 + 基础筛选；无 AI 聊天  
- 数据：仅本机  
- 验收：见 §2.3  

---

## 附录 B. FlyAI 响应归一化示例

```typescript
interface NormalizedFlightOffer {
  priceYuan: number
  totalDurationMin: number
  outbound: FlightLeg
  inbound?: FlightLeg
  jumpUrl: string
  advice?: TripAdvice  // 前端本地叠加
}

interface FlightLeg {
  depDateTime: string
  arrDateTime: string
  depAirport: string   // 萧山/双流/天府
  arrAirport: string
  airline: string
  flightNo: string
  direct: boolean
  stops?: string[]
}
```

---

## 附录 C. 参考资料

- FlyAI CLI：`npm i -g @fly-ai/flyai-cli`；`references/search-flight.md`  
- 放假数据：[cg-zhou/holiday-calendar](https://github.com/cg-zhou/holiday-calendar)  
- PWA iOS：[Apple 无自动安装提示](https://developer.apple.com/documentation/webkit/promoting_apps_with_smart_app_banners) — 需自建引导 UI  
- 飞猪 AI 开放平台：https://flyai.open.fliggy.com/

---

*文档结束。下一步：按 Phase 0 初始化 monorepo，或先评审 §12 待决事项。*
