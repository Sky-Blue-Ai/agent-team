# ProductForge · 产品工厂工作台

面向个人产品工作者的**全生命周期产品工作台**，覆盖从灵感、规划、战略决策、设计、开发、落地、上线、运营到动态调整的 9 个阶段。

**在线访问**：https://sky-blue-ai.github.io/agent-team/

## 两种运行模式

| 模式 | 启动方式 | 数据存放 | AI 功能 |
|---|---|---|---|
| **本地全栈（推荐）** | 双击 `product-factory/site/启动工作台.command` | 项目内 `data.json`，多设备共享 | 可用（需配 API Key） |
| **纯静态（GitHub Pages）** | 直接访问上面的在线地址 | 浏览器 localStorage | 不可用 |

关键区别：`server.py` 提供数据持久化与 AI 代理接口，**GitHub Pages 只能托管静态文件、跑不了 Python**。所以线上版本自动降级为 localStorage 模式，每个人看到的是自己的独立数据。

## 功能

九个视图，全部支持新增 / 编辑 / 删除，改动自动保存：

| 视图 | 能力 |
|---|---|
| 流水线看板 | 9 阶段等高泳道看板、产品卡片 CRUD、阶段流转、搜索、瓶颈卡点、矩阵健康度、审计日志 |
| 灵感与战略 | 灵感池（来源筛选 / 点赞 / RICE 四要素）、RICE 自动算分排序、OKR 对齐度、立项案签批 |
| 产研交付台 | 设计走查清单、研发攻坚卡片、上线门禁自动就绪率 |
| 增长与调优 | 增长指标卡、多渠道 ROI 归因表、A/B 实验、策略复盘闭环 |
| 知识库 | 条目 CRUD、分类 tab、全文搜索、掌握程度切换、使用次数统计、等高网格布局 |
| SOP 流程 | 步骤化流程编辑，支持触发条件与负责人，编号时间线渲染 |
| Skill Hub | 技能沉淀与可复用标记 |
| Agent Hub | 智能体定义与运行状态 |
| Rule Hub | 规则与约束管理 |

**业务闭环**

- 灵感「推进为产品」→ 直接生成看板卡片
- 立项案「批准 → 流转至规划阶段」→ 自动生成产品卡片
- 走查项勾选「纳入上线门禁」→ 门禁就绪率自动重算
- 所有增删改写入审计日志，KPI 与 Hub 统计自动计算

RICE 按设计稿公式 `(Reach × Impact × Confidence) / Effort` 计算，刻度校准到 0–300 量级。

## 本地运行

```bash
cd product-factory/site
python3 server.py 8210      # 默认端口 8210
# 打开 http://127.0.0.1:8210/index.html
```

macOS 上直接双击 `启动工作台.command` 即可。

### AI 引擎配置

在页面「设置 → AI 引擎」填入 API Key，或设置环境变量：

```bash
export PF_AI_API_KEY=sk-xxx
export PF_AI_BASE_URL=https://api.deepseek.com/v1   # 可选
export PF_AI_MODEL=deepseek-chat                    # 可选
```

密钥存放在 `ai_config.json`，已在 `.gitignore` 中排除，不会进仓库也不会进导出备份。

## 数据说明

**本地全栈模式**：数据存在 `product-factory/site/data.json`。服务端用 `_rev` 单调递增版本号做乐观锁——旧标签页的陈旧快照写入时会收到 409 冲突并自动采用服务端最新数据，避免多标签页互相覆盖。

**静态模式**：数据存在浏览器 localStorage（键名 `pf_workbench_v3`），换设备或清缓存会丢失，请用顶部的「导出备份 / 导入备份」。

## 目录结构

```
product-factory/
├── site/                      # 站点本体
│   ├── index.html             # 结构与样式
│   ├── app.js                 # 全部前端逻辑：存储层 / 渲染器 / CRUD / 备份
│   ├── server.py              # 本地后端：静态服务 + /api/data + AI 代理
│   ├── data.json              # 数据文件（本地全栈模式）
│   ├── seed_kb.py             # 知识库种子数据导入脚本
│   └── 启动工作台.command      # macOS 一键启动
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
python3 -c "import ast;ast.parse(open('product-factory/site/server.py',encoding='utf-8').read())"
```

部署：推送到 `main` 后，把 `product-factory/site/` 的静态文件同步到 `gh-pages` 分支。

## 技术栈

前端原生 HTML + CSS + ES5 JavaScript，零构建。后端 Python 3 标准库（`http.server`），零第三方依赖。设计遵循 Stitch 的 *Syntropic Workbench* 设计系统（见 `stitch_design/.../DESIGN.md`）。