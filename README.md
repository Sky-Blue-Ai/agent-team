# ProductForge · 产品工厂工作台

面向个人产品工作者的**全生命周期产品工作台**，覆盖从灵感、规划、战略决策、设计、开发、落地、上线、运营到动态调整的 9 个阶段。

纯前端单页应用：无需后端、无需登录、数据存在浏览器本地（localStorage），打开即用。

**在线访问**：https://sky-blue-ai.github.io/agent-team/

## 功能

四个视图，全部支持新增 / 编辑 / 删除，改动自动保存：

| 视图 | 能力 |
|---|---|
| 流水线看板 | 9 阶段泳道看板、产品卡片 CRUD、阶段流转、搜索、瓶颈卡点、矩阵健康度、审计日志 |
| 灵感与战略 | 灵感池（来源筛选 / 点赞 / RICE 四要素）、RICE 自动算分排序、OKR 对齐度、立项案签批 |
| 产研交付台 | 设计走查清单、研发攻坚卡片、上线门禁自动就绪率 |
| 增长与调优 | 增长指标卡、多渠道 ROI 归因表、A/B 实验、策略复盘闭环 |

**业务闭环**

- 灵感「推进为产品」→ 直接生成看板卡片
- 立项案「批准 → 流转至规划阶段」→ 自动生成产品卡片
- 走查项勾选「纳入上线门禁」→ 门禁就绪率自动重算
- 所有增删改写入审计日志，KPI 自动计算

RICE 按设计稿公式 `(Reach × Impact × Confidence) / Effort` 计算，刻度校准到 0–300 量级。

## 数据说明

数据保存在**访问者自己浏览器**的 localStorage 中（键名 `pf_workbench_v3`）：

- 换设备、清缓存会丢失 → 请用页面顶部的「导出备份 / 导入备份」
- 部署不会共享数据，每个人看到的是自己的空白工作台
- 「重置」会清空全部内容，操作前建议先导出

## 本地运行

直接双击打开 `product-factory/site/index.html` 即可，无需构建。

若要起本地服务：

```bash
cd product-factory/site
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 目录结构

```
product-factory/
├── site/                      # 站点本体（部署内容）
│   ├── index.html             # 结构与内联样式
│   └── app.js                 # 全部逻辑：存储层 / 渲染器 / CRUD / 备份
├── schema.json                # 早期数据表 schema（9 阶段 / 优先级枚举）
├── server_schema.json         # 数据表远端定义
├── workbench.html             # v1：简单看板（历史存档）
├── workbench_v2.html          # v2：按设计稿实现的高保真版（历史存档）
└── stitch_design/             # 设计输入（Stitch 4 页稿 + DESIGN.md 设计系统）
.workbuddy/memory/             # 开发日志
```

## 开发约定

改完后务必：

```bash
node --check product-factory/site/app.js
```

`app.js` 是外部脚本，不再需要同步回 `index.html`。

部署：推送到 `main` 后，把 `product-factory/site/` 的内容同步到 `gh-pages` 分支即可。

## 技术栈

原生 HTML + CSS + ES5 JavaScript，零依赖、零构建。设计遵循 Stitch 的 *Syntropic Workbench* 设计系统（见 `stitch_design/.../DESIGN.md`）。