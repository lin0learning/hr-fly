# 杭蓉机票

杭州 ↔ 成都报销导向机票 PWA，基于 [FlyAI](https://fly.ai) 实时搜票。

## 待决项（已确认）

| 项 | 选择 |
|----|------|
| 产品名 | 杭蓉机票 |
| 默认行程 | 往返 |
| 成都机场 | 双流（CTU） |
| API | BFF 同域 `/api`，Key 见 `.env` |
| FlyAI Key | `FLYAI_API_KEY`（仅服务端，勿提交） |

## 开发

```bash
pnpm install
pnpm dev          # BFF :3001 + Web :5173
pnpm test         # 策略引擎单测
pnpm build
```

1. 复制 `.env.example` 为 `.env`（可选 `.env.local` 覆盖本地配置）
2. 填入 `FLYAI_API_KEY`（**仅 BFF 使用**，不要用 `VITE_` 前缀暴露密钥）
3. `pnpm dev` — Web 读取根目录 `VITE_*`，BFF 读取 `FLYAI_API_KEY`

## 结构

- `apps/web` — PWA 前端
- `apps/bff` — FlyAI 搜票代理（双流过滤）
- `packages/strategy` — 报销策略引擎
- `packages/holidays` — 国务院放假表
- `docs/RESEARCH.md` — 调研文档
