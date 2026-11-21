#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
产品工厂工作台 · 本地服务
- 静态站点服务 (index.html / app.js)
- GET  /api/data  读取项目内 data.json
- POST /api/data  写入项目内 data.json (原子写)

数据存于项目目录 data.json —— 多个浏览器/设备访问同一服务即看到同一份数据。
用法: python3 server.py [端口，默认 8210]
"""
import json
import os
import re
import sys
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(BASE, 'data.json')
AI_CONFIG = os.path.join(BASE, 'ai_config.json')   # 模型密钥独立存放，不进 data.json / 导出备份
LOCK = threading.Lock()

# AI 引擎预设（OpenAI 兼容接口）
AI_PRESETS = {
    'deepseek': {'baseUrl': 'https://api.deepseek.com/v1', 'model': 'deepseek-chat',
                 'label': 'DeepSeek', 'docs': 'https://platform.deepseek.com/api_keys'},
    'openai':   {'baseUrl': 'https://api.openai.com/v1', 'model': 'gpt-4o-mini',
                 'label': 'OpenAI', 'docs': 'https://platform.openai.com/api-keys'},
    'custom':   {'baseUrl': '', 'model': '', 'label': '自定义 / 兼容接口', 'docs': ''},
}

EMPTY = {
    "version": 1, "_rev": 0, "updatedAt": "", "settings": {"theme": "light", "recentSearches": []}, "contents": {},
    "products": [], "ideas": [], "okrs": [], "decisions": [], "warns": [],
    "checks": [], "tasks": [], "gate": [], "metrics": [], "channels": [],
    "experiments": [], "plays": [], "kb": [], "sops": [], "log": [],
    "skills": [], "agents": [], "rules": []
}

LISTS = ['products', 'ideas', 'okrs', 'decisions', 'warns', 'checks', 'tasks',
         'gate', 'metrics', 'channels', 'experiments', 'plays', 'kb', 'sops', 'log',
         'skills', 'agents', 'rules']


def normalize(d):
    if not isinstance(d, dict) or d.get('version') != 1:
        return dict(EMPTY)
    out = dict(d)
    try:
        out['_rev'] = int(out.get('_rev', 0) or 0)
    except Exception:
        out['_rev'] = 0
    for k in LISTS:
        if not isinstance(out.get(k), list):
            out[k] = []
    if not isinstance(out.get('contents'), dict):
        out['contents'] = {}
    if not isinstance(out.get('settings'), dict):
        out['settings'] = {"theme": "light", "recentSearches": []}
    if not isinstance(out['settings'].get('recentSearches'), list):
        out['settings']['recentSearches'] = []
    return out


def read_data():
    with LOCK:
        if not os.path.exists(DATA):
            return dict(EMPTY)
        try:
            with open(DATA, 'r', encoding='utf-8') as f:
                return normalize(json.load(f))
        except Exception:
            return dict(EMPTY)


def write_data(d):
    d = normalize(d)
    with LOCK:
        tmp = DATA + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(d, f, ensure_ascii=False, indent=2)
        os.replace(tmp, DATA)


# ---------------------------------------------------------------- AI engine config
DEFAULT_AI_CFG = {'provider': 'deepseek', 'baseUrl': 'https://api.deepseek.com/v1',
                  'model': 'deepseek-chat', 'apiKey': ''}


def read_ai_config():
    """读取模型配置；环境变量优先（向后兼容旧版 PF_AI_* 用法）。"""
    cfg = dict(DEFAULT_AI_CFG)
    if os.path.exists(AI_CONFIG):
        try:
            with open(AI_CONFIG, 'r', encoding='utf-8') as f:
                saved = json.load(f)
            if isinstance(saved, dict):
                for k in ('provider', 'baseUrl', 'model', 'apiKey'):
                    if k in saved and saved[k]:
                        cfg[k] = str(saved[k]).strip()
        except Exception:
            pass
    # 环境变量仍然是最高优先级，兼容此前只在启动脚本里设 key 的方式
    if os.environ.get('PF_AI_API_KEY', '').strip():
        cfg['apiKey'] = os.environ['PF_AI_API_KEY'].strip()
        if os.environ.get('PF_AI_BASE_URL', '').strip():
            cfg['baseUrl'] = os.environ['PF_AI_BASE_URL'].strip().rstrip('/')
        if os.environ.get('PF_AI_MODEL', '').strip():
            cfg['model'] = os.environ['PF_AI_MODEL'].strip()
    return cfg


def write_ai_config(cfg):
    """写模型配置。空 apiKey 表示保留原密钥（避免脱敏值覆盖）。"""
    with LOCK:
        old = {}
        if os.path.exists(AI_CONFIG):
            try:
                with open(AI_CONFIG, 'r', encoding='utf-8') as f:
                    old = json.load(f) or {}
            except Exception:
                old = {}
        out = {
            'provider': str(cfg.get('provider') or old.get('provider') or 'deepseek'),
            'baseUrl': str(cfg.get('baseUrl') or old.get('baseUrl') or DEFAULT_AI_CFG['baseUrl']).rstrip('/'),
            'model': str(cfg.get('model') or old.get('model') or DEFAULT_AI_CFG['model']),
            'apiKey': str(cfg.get('apiKey') or old.get('apiKey') or ''),
        }
        tmp = AI_CONFIG + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        os.replace(tmp, AI_CONFIG)
    return out


def ai_status():
    """给前端的脱敏状态，绝不返回明文密钥。"""
    cfg = read_ai_config()
    key = cfg['apiKey']
    masked = (key[:4] + '••••' + key[-4:]) if len(key) > 8 else ('••••' if key else '')
    return {'configured': bool(key), 'provider': cfg['provider'],
            'baseUrl': cfg['baseUrl'], 'model': cfg['model'],
            'keyMasked': masked, 'envKey': bool(os.environ.get('PF_AI_API_KEY', '').strip()),
            'presets': AI_PRESETS}


def _brief_context(d, scope, product_id):
    """构造喂给模型的工作台数据摘要（与生成草案一致，控制体量）。"""
    brief = {
        'products': _arr(d, 'products'), 'ideas': _arr(d, 'ideas')[:20],
        'okrs': _arr(d, 'okrs')[:20], 'decisions': _arr(d, 'decisions')[:20],
        'warns': _arr(d, 'warns')[:20], 'checks': _arr(d, 'checks')[:30],
        'tasks': _arr(d, 'tasks')[:30], 'gate': _arr(d, 'gate')[:20],
        'experiments': _arr(d, 'experiments')[:20], 'metrics': _arr(d, 'metrics')[:20],
        'plays': _arr(d, 'plays')[:20], 'log': _arr(d, 'log')[:30],
        'kb': _arr(d, 'kb')[:30], 'sops': _arr(d, 'sops')[:30],
        'skills': _arr(d, 'skills')[:30], 'rules': _arr(d, 'rules')[:30],
    }
    if product_id:
        brief['focusProduct'] = [p for p in _arr(d, 'products') if p.get('id') == product_id]
    return brief


def _chat_completion(base, model, key, system, user, max_tokens=1600):
    """统一的 OpenAI 兼容 /chat/completions 调用，返回文本或抛异常。"""
    payload = json.dumps({'model': model, 'temperature': 0.35, 'max_tokens': max_tokens,
                          'messages': [{'role': 'system', 'content': system},
                                       {'role': 'user', 'content': user}]}).encode('utf-8')
    req = urllib.request.Request(
        base.rstrip('/') + '/chat/completions', data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    with urllib.request.urlopen(req, timeout=60) as resp:
        obj = json.load(resp)
    return obj['choices'][0]['message']['content'].strip()


# ---------------------------------------------------------------- AI generation
STAGES = ['灵感', '产品规划', '战略决策', '产品设计', '产品开发',
          '产品落地', '产品上线', '推广运营', '动态调整']

STAGE_PLAYBOOK = {
    '灵感': ['收集用户原声与竞品信号，写清痛点、人群与发生频率',
             '用 RICE 快速打分，剔除低价值高成本的念头',
             '把通过的灵感转为产品卡片，填一句话定位'],
    '产品规划': ['明确目标用户与核心场景，列出必须解决的前三个问题',
                 '拆出关键结果指标与验收口径，避免只有功能清单',
                 '排出里程碑与依赖资源，确认负责人'],
    '战略决策': ['补齐 RICE、ARR 增量、回本周期与技术风险',
                 '列出关键假设和反对意见，准备评审材料',
                 '签批通过后记录决策依据；否决则归档原因'],
    '产品设计': ['基于核心场景画主流程，标出异常与空状态',
                 '输出交互稿与字段口径，和研发对齐实现方式',
                 '组织一次设计走查，确认可访问性与埋点方案'],
    '产品开发': ['拆分任务并认领负责人，标注进入门禁的依赖',
                 '每日同步阻塞项，超过一天的卡点升级处理',
                 '完成自测与代码评审，准备可验收版本'],
    '产品落地': ['执行走查清单，逐项确认通过或豁免原因',
                 '核对数据埋点、灰度开关与回滚预案',
                 '完成验收签字，进入发布候选状态'],
    '产品上线': ['按发布检查单确认配置、权限与监控告警',
                 '小流量灰度观察核心指标与错误率',
                 '确认无异常后全量发布，记录上线时间'],
    '推广运营': ['按渠道拆分获客目标、预算与负责人',
                 '上线 A/B 实验，记录对照组与实验组指标',
                 '每周复盘 CAC、转化与留存，保留有效策略'],
    '动态调整': ['汇总指标、实验结论与用户反馈',
                 '决定继续 / 转向 / 停止，并写清依据',
                 '把已验证的方法与踩过的坑沉淀进知识库'],
}


def _txt(v):
    if v is None:
        return ''
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    return str(v)


def _arr(d, key):
    v = d.get(key)
    return v if isinstance(v, list) else []


def _name(r):
    for k in ('title', '标题', '产品名称', 'name'):
        s = _txt(r.get(k)).strip() if isinstance(r, dict) else ''
        if s:
            return s
    return '未命名'


def _kb(title, cat, body, tags, source, level='待验证'):
    return {'type': 'kb', 'source': source,
            'data': {'title': title, 'cat': cat, 'level': level,
                     'tags': tags, 'body': body}}


def _sop(title, cat, owner, trigger, steps, source):
    return {'type': 'sop', 'source': source,
            'data': {'title': title, 'cat': cat, 'owner': owner,
                     'trigger': trigger, 'steps': '\n'.join(steps)}}


def _skill(title, cat, level, tags, body, source):
    return {'type': 'skill', 'source': source,
            'data': {'title': title, 'cat': cat, 'level': level,
                     'tags': tags, 'body': body}}


def _agent(title, cat, model, trigger, status, body, source):
    return {'type': 'agent', 'source': source,
            'data': {'title': title, 'cat': cat, 'model': model,
                     'trigger': trigger, 'status': status, 'body': body}}


def _rule(title, cat, scope, priority, status, body, source):
    return {'type': 'rule', 'source': source,
            'data': {'title': title, 'cat': cat, 'scope': scope,
                     'priority': priority, 'status': status, 'body': body}}


def _stage_of(product):
    s = _txt(product.get('当前阶段')).strip() or '灵感'
    return s if s in STAGES else '灵感'


def _related_records(d, name):
    out = []
    for key, label in (('warns', '卡点'), ('decisions', '立项'),
                       ('experiments', '实验'), ('plays', '复盘')):
        for r in _arr(d, key)[:8]:
            blob = _txt(r)
            summary = _name(r)
            detail = _txt(r.get('text') or r.get('note') or r.get('cs') or r.get('sol'))
            if detail:
                summary += '：' + detail[:80]
            out.append('%s · %s' % (label, summary))
    return out[:6]


def generate_local(d, scope, product_id, kinds):
    products = _arr(d, 'products')
    if scope == 'product' and product_id:
        products = [p for p in products if p.get('id') == product_id]
    seen_kb = set(_name(x) for x in _arr(d, 'kb'))
    seen_sop = set(_name(x) for x in _arr(d, 'sops'))
    items = []

    if kinds.get('kb', True):
        for p in products[:8]:
            name = _name(p)
            if name in seen_kb:
                continue
            stage = _stage_of(p)
            idx = STAGES.index(stage)
            nxt = STAGES[idx + 1] if idx + 1 < len(STAGES) else '动态调整'
            lines = [
                '产品定位：' + (_txt(p.get('一句话定位')).strip() or '待补充'),
                '当前阶段：%s（九阶段第 %d 步）；优先级：%s' % (
                    stage, idx + 1, _txt(p.get('优先级')).strip() or '未设置'),
                '最近更新：' + (_txt(p.get('最近更新')).strip() or '未填写'),
                '阶段要点：' + '；'.join(STAGE_PLAYBOOK[stage][:2]),
            ]
            if p.get('负责人'):
                lines.insert(2, '负责人：' + _txt(p.get('负责人')))
            related = _related_records(d, name)
            if related:
                lines.append('关联记录：' + ' | '.join(related))
            lines.append('下一步建议：完成本阶段要点后推进至「%s」，并在审计日志确认流转。' % nxt)
            items.append(_kb('「%s」阶段决策档案' % name, '方法总结', '\n'.join(lines),
                             '%s,%s,阶段档案' % (name, stage),
                             '归纳自产品卡片与工作台记录'))

        for r in _arr(d, 'warns')[:6]:
            title = _name(r)
            if title in seen_kb:
                continue
            body = ('现象：%s\n级别：%s · 状态：%s\n详情：%s\n'
                    '处理建议：先记录临时规避动作，解决后把根因与验证结果补回本条，并标记「已掌握」。') % (
                title, _txt(r.get('level')) or '未标注', _txt(r.get('status')) or '进行中',
                _txt(r.get('text'))[:300] or '待补充')
            items.append(_kb('踩坑 · ' + title, '踩坑记录', body, '卡点,复盘',
                             '归纳自瓶颈卡点记录'))

        for r in _arr(d, 'decisions')[:6]:
            title = _name(r)
            if title in seen_kb:
                continue
            body = ('立项案：%s（%s）\nRICE：%s · 预估 ARR：%s · 回本周期：%s 月 · 技术风险：%s\n'
                    '签批状态：%s\n决策说明：%s\n复用方式：下次同类立项可直接对照上述假设与评分口径。') % (
                title, _txt(r.get('rid')) or '无编号', _txt(r.get('rice')) or '待补',
                _txt(r.get('arr')) or '待补', _txt(r.get('cac')) or '待补',
                _txt(r.get('risk')) or '未评估', _txt(r.get('status')) or '评审中',
                _txt(r.get('note'))[:300] or '待补充')
            items.append(_kb('决策档案 · ' + title, '方法总结', body, '立项,RICE,决策',
                             '归纳自立项案'))

        for r in _arr(d, 'experiments')[:6]:
            if _txt(r.get('status')) != '显著胜出':
                continue
            title = _name(r)
            if title in seen_kb:
                continue
            body = ('实验结论：%s（%s）\n置信度：%s%% · 样本：%s\n'
                    '对照组：%s → 实验组：%s\n观测说明：%s\n'
                    '复用方式：把胜出策略固化进推广运营 SOP，并持续观察指标是否衰减。') % (
                title, _txt(r.get('eid')) or '无编号', _txt(r.get('confidence')) or '—',
                _txt(r.get('sample')) or '—', _txt(r.get('base')) or '—',
                _txt(r.get('variant')) or '—', _txt(r.get('cs'))[:200] or '待补充')
            items.append(_kb('实验结论 · ' + title, '方法总结', body, 'A/B 实验,增长',
                             '归纳自显著胜出的实验'))

        if not items:
            items.append(_kb('产品工厂九阶段速查手册', '参考资料',
                             '\n'.join('%d. %s：%s' % (i + 1, s, '；'.join(STAGE_PLAYBOOK[s][:2]))
                                       for i, s in enumerate(STAGES)),
                             '九阶段,产品工厂,入门', '基于工作台九阶段模型生成', '基本掌握'))

    if kinds.get('sop', True):
        targets = products[:8] if products else []
        if targets:
            for p in targets:
                name, stage = _name(p), _stage_of(p)
                title = '「%s」阶段推进 SOP' % name
                if title in seen_sop:
                    continue
                idx = STAGES.index(stage)
                nxt = STAGES[idx + 1] if idx + 1 < len(STAGES) else '动态调整'
                steps = list(STAGE_PLAYBOOK[stage])
                steps += ['把产品卡片阶段改为「%s」，更新最近更新日期' % nxt,
                          '在审计日志确认本次流转记录，必要时补充决策依据']
                items.append(_sop(title, '研发交付', _txt(p.get('负责人')) or '产品负责人',
                                  '产品「%s」当前处于「%s」，准备推进到下一阶段' % (name, stage),
                                  steps, '基于当前阶段与九阶段方法库生成'))
        else:
            title = '产品工厂九阶段标准推进 SOP'
            if title not in seen_sop:
                steps = ['【%s】%s' % (s, '；'.join(STAGE_PLAYBOOK[s])) for s in STAGES]
                items.append(_sop(title, '流程规范', '产品负责人',
                                  '有任何新想法进入产品工厂时', steps,
                                  '基于九阶段模型生成（当前暂无产品数据）'))

        title = '产品上线发布检查 SOP'
        if title not in seen_sop:
            checks = [r for r in _arr(d, 'checks') if r.get('gate')]
            tasks = [r for r in _arr(d, 'tasks') if r.get('gate')]
            steps = ['汇总进入上线门禁的走查项与攻坚任务，逐项确认 PASS 或豁免原因']
            steps += ['走查：%s（%s）' % (_name(r), _txt(r.get('desc')) or '待确认') for r in checks[:5]]
            steps += ['攻坚：%s（%s）' % (_name(r), _txt(r.get('desc')) or '待确认') for r in tasks[:5]]
            steps += ['确认监控告警、灰度比例与回滚预案已就绪',
                      '小流量灰度观察核心指标，无异常后全量发布并记录上线时间']
            items.append(_sop(title, '发布上线', '研发 / 产品',
                              '产品卡片进入「产品上线」阶段', steps,
                              '归纳自上线门禁清单与产品阶段'))

        title = '每周产品工厂复盘 SOP'
        if title not in seen_sop:
            metrics = [_name(r) + '：' + _txt(r.get('value')) for r in _arr(d, 'metrics')[:4]]
            steps = ['导出本周审计日志，列出新建、阶段推进与决策变更',
                      '核对指标：' + ('；'.join(metrics) if metrics else '（工作台暂未录入指标，先补充核心指标）'),
                      '查看 A/B 实验与渠道数据，保留有效策略、停止无效动作',
                      '把新踩的坑与验证过的方法写入知识库',
                      '确定下周 Top 3 行动，并指定负责人与截止日期']
            items.append(_sop(title, '质量验收', '产品负责人',
                              '每周固定复盘或一次上线结束后', steps,
                              '归纳自指标、实验与审计日志'))

    # ---- Skill / Agent / Rule 三个 Hub 的能力草案 ----
    # 说明：这三类生成的是「增量建议」，标题刻意区别于预置种子（核心通用能力），
    # 避免与已沉淀能力重复；基于当前产品/数据动态归纳，补充更贴合现状的条目。
    seen_skill = set(_name(x) for x in _arr(d, 'skills'))
    seen_agent = set(_name(x) for x in _arr(d, 'agents'))
    seen_rule = set(_name(x) for x in _arr(d, 'rules'))
    products = _arr(d, 'products')
    prod_targets = [p for p in products
                    if scope != 'product' or not product_id or p.get('id') == product_id][:5]

    if kinds.get('skill', True):
        def add_skill(title, cat, level, tags, body, source):
            if title not in seen_skill:
                items.append(_skill(title, cat, level, tags, body, source))
                seen_skill.add(title)

        for p in prod_targets:
            name, stage = _name(p), _stage_of(p)
            idx = STAGES.index(stage)
            nxt = STAGES[idx + 1] if idx + 1 < len(STAGES) else '动态调整'
            add_skill('「%s」阶段推进作战卡' % name, '领域技能', '可复用',
                      '%s,%s,产品作战卡' % (name, stage),
                      '适用产品：%s\n当前阶段：%s → 下一阶段：%s\n' % (name, stage, nxt) +
                      '本阶段关键动作：\n' + '\n'.join('· ' + s for s in STAGE_PLAYBOOK[stage]) +
                      '\n输出：可直接执行的推进清单与下一步建议。',
                      '基于当前产品与九阶段方法库归纳')
        add_skill('竞品动态扫描与对比', '分析技能', '实验中', '竞品,情报,分析',
                  '输入：竞品名单与关注维度（功能 / 定价 / 增长动作）。\n输出：差异对比矩阵与可借鉴点。\n' +
                  '说明：工作台不含外部抓取能力，竞品数据需手动录入或接入外部工具。',
                  '补充通用分析能力草案')
        add_skill('用户原声聚类分析', '分析技能', '实验中', '用户原声,聚类,洞察',
                  '输入：一批用户反馈或访谈记录。\n输出：按痛点主题聚类，标注频次与典型原声，导向灵感卡片。',
                  '补充通用分析能力草案')
        add_skill('埋点与指标口径梳理', '领域技能', '待沉淀', '埋点,指标,口径',
                  '输入：核心流程与关键结果指标。\n输出：需埋点的事件清单、指标定义与计算口径，避免上线后无数据。',
                  '补充通用领域能力草案')
        add_skill('设计走查清单生成', '工具技能', '可复用', '设计,走查,可访问性',
                  '输入：产品主流程与交互稿。\n输出：走查清单（异常态 / 空态 / 可访问性 / 埋点），供评审逐项确认。',
                  '补充通用工具能力草案')

    if kinds.get('agent', True):
        def add_agent(title, cat, model, trigger, status, body, source):
            if title not in seen_agent:
                items.append(_agent(title, cat, model, trigger, status, body, source))
                seen_agent.add(title)

        add_agent('竞品情报官', '知识', 'PF_AI_API_KEY（可选）/ 手动录入', '每周定时扫描', '规划中',
                  '能：汇总竞品功能、定价与增长动作，生成对比简报。\n不能：绕过授权抓取数据；编造竞品动态。\n需要上下文：竞品名单与关注维度。',
                  '补充执行体草案')
        add_agent('增长实验官', '增长', 'PF_AI_API_KEY（可选）/ 本地规则引擎', '周会前手动调用', '规划中',
                  '能：依据指标与实验记录，建议下一步 A/B 实验与观测口径。\n不能：承诺实验结果；无数据时给「先补指标」提示。\n需要上下文：metrics / experiments / channels。',
                  '补充执行体草案')
        add_agent('研发交付管家', '研发', '本地规则引擎', '每日站会前', '规划中',
                  '能：汇总攻坚卡片与卡点，输出阻塞项与风险提示。\n不能：代替研发评估工期或签字。\n需要上下文：tasks / warns 的 gate 与状态。',
                  '补充执行体草案')
        add_agent('周报速递员', '运营', 'PF_AI_API_KEY（可选）/ 本地归纳', '每周五自动汇总', '规划中',
                  '能：把一周日志、指标与变更整理成结构化周报。\n不能：对外发布前不经人工审阅。\n需要上下文：审计日志与指标。',
                  '补充执行体草案')

    if kinds.get('rule', True):
        def add_rule(title, cat, scope, priority, status, body, source):
            if title not in seen_rule:
                items.append(_rule(title, cat, scope, priority, status, body, source))
                seen_rule.add(title)

        add_rule('AI 生成内容须人工复核后入库', '硬约束', '知识库 / SOP / 三个 Hub', '高', '草稿',
                 '判定标准：AI 生成的草案必须先在预览中勾选、由你确认后才能写入工作台。\n例外：无（这是防止脏数据进入的唯一入口）。',
                 '补充治理规则草案')
        add_rule('RICE 低于阈值不进立项', '偏好口径', '立项案', '中', '草稿',
                 '判定标准：RICE 得分低于约定阈值时不进入立项评审，先补充依据或否决归档。\n' +
                 '注：阈值为示例口径，请按你的判断在正文改写后启用。',
                 '补充治理规则草案')
        add_rule('每周复盘必须定 Top 3 行动', '偏好口径', '周复盘 / 动态调整', '中', '草稿',
                 '判定标准：每次周复盘要收敛出至多 3 条行动，并指定负责人与截止日期。\n例外：重大事故复盘可另列专项行动。',
                 '补充治理规则草案')
    return items


def generate_llm(d, scope, product_id, kinds):
    """可选：配置 PF_AI_API_KEY 后调用 OpenAI 兼容接口；失败返回 None 走本地归纳。"""
    cfg = read_ai_config()
    key = cfg['apiKey']
    if not key:
        return None
    base = cfg['baseUrl'].rstrip('/')
    model = cfg['model']
    brief = {
        'products': _arr(d, 'products'), 'ideas': _arr(d, 'ideas')[:20],
        'warns': _arr(d, 'warns')[:20], 'decisions': _arr(d, 'decisions')[:20],
        'experiments': _arr(d, 'experiments')[:20], 'metrics': _arr(d, 'metrics')[:20],
        'plays': _arr(d, 'plays')[:20], 'log': _arr(d, 'log')[:20],
    }
    prompt = ('你是产品工厂的知识管理助手。只依据给定工作台数据，生成可复用的知识条目、SOP、Skill、Agent 与 Rule 草案。'
              '不要编造数据，缺失信息写“待补充”。输出严格 JSON：'
              '{"items":[{"type":"kb|sop|skill|agent|rule","source":"简短来源说明","data":{...}}]}。'
              'kb.data 需含 title,cat(踩坑记录/方法总结/工具手册/流程规范/参考资料),level(待验证),tags(逗号分隔),body；'
              'sop.data 需含 title,cat(研发交付/发布上线/质量验收/运营增长/问题排查/其他),owner,trigger,steps(每行一步的字符串)；'
              'skill.data 需含 title,cat(工具技能/领域技能/分析技能/模板技能/其他),level(可复用/实验中/待沉淀),tags,body；'
              'agent.data 需含 title,cat(产品/研发/增长/知识/运营/其他),model,trigger,status(规划中),body；'
              'rule.data 需含 title,cat(硬约束/偏好口径/安全边界/审批要求/其他),scope,priority(高/中/低),status(生效中),body。'
              '最多 12 条。工作台数据：' + json.dumps(brief, ensure_ascii=False)[:18000])
    payload = json.dumps({'model': model, 'temperature': 0.3,
                          'messages': [{'role': 'user', 'content': prompt}]}).encode('utf-8')
    req = urllib.request.Request(
        base + '/chat/completions', data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key})
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            obj = json.load(resp)
        content = obj['choices'][0]['message']['content']
        m = re.search(r'\{[\s\S]*\}', content)
        parsed = json.loads(m.group(0) if m else content)
        raw = parsed.get('items') if isinstance(parsed, dict) else None
        if not isinstance(raw, list):
            return None
        items = []
        for it in raw:
            if not isinstance(it, dict) or it.get('type') not in ('kb', 'sop', 'skill', 'agent', 'rule'):
                continue
            data = it.get('data')
            if not isinstance(data, dict) or not _txt(data.get('title')).strip():
                continue
            if not kinds.get(it['type'], True):
                continue
            items.append({'type': it['type'],
                          'source': _txt(it.get('source')) or '大模型生成',
                          'data': data})
        return items or None
    except Exception as exc:
        print('AI generation fallback to local:', exc, flush=True)
        return None


def generate(d, scope, product_id, kinds):
    llm = generate_llm(d, scope, product_id, kinds)
    if llm:
        return {'mode': 'llm', 'items': llm}
    return {'mode': 'local', 'items': generate_local(d, scope, product_id, kinds)}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=BASE, **kw)

    def log_message(self, fmt, *args):
        pass  # 静默

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/data':
            self._json(200, read_data())
            return
        if self.path.split('?')[0] == '/api/agent/status':
            self._json(200, ai_status())
            return
        return super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        if path == '/api/agent/config':
            try:
                n = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(n).decode('utf-8'))
                if not isinstance(body, dict):
                    body = {}
                saved = write_ai_config(body)
                self._json(200, {'ok': True, 'status': ai_status()})
            except Exception as e:
                self._json(400, {'ok': False, 'error': str(e)})
            return
        if path == '/api/agent/run':
            try:
                n = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(n).decode('utf-8'))
                if not isinstance(body, dict):
                    body = {}
                cfg = read_ai_config()
                if not cfg['apiKey']:
                    self._json(200, {'mode': 'nokey',
                                     'message': '尚未配置模型密钥。当前由 WorkBuddy 原生执行；如需服务端真推理，请在「设置 → AI 引擎」填入 API Key。'})
                    return
                agent = body.get('agent') if isinstance(body.get('agent'), dict) else {}
                task = str(body.get('task') or '').strip()
                if not task:
                    self._json(400, {'ok': False, 'error': '任务描述不能为空'})
                    return
                d = read_data()
                ctx = _brief_context(d, body.get('scope', 'all'), body.get('productId', ''))
                system = ('你是产品工厂里的执行型智能体「%s」。\n'
                          '场景：%s；触发方式：%s。\n'
                          '能力边界与职责说明：\n%s\n\n'
                          '严格遵守工作台中生效的规则（rules），不得编造数据；'
                          '数据缺失时写“待补充”。输出结构化、可执行的中文结论。') % (
                              _txt(agent.get('title')) or '智能体',
                              _txt(agent.get('cat')) or '通用',
                              _txt(agent.get('trigger')) or '手动调用',
                              _txt(agent.get('body')) or '依据工作台数据完成任务')
                user = ('【工作台数据摘要】\n' + json.dumps(ctx, ensure_ascii=False)[:16000] +
                        '\n\n【本次任务】\n' + task +
                        '\n\n请给出：结论、依据、下一步动作（含负责人建议）、风险提示。')
                result = _chat_completion(cfg['baseUrl'], cfg['model'], cfg['apiKey'], system, user)
                self._json(200, {'mode': 'llm', 'result': result, 'model': cfg['model'],
                                 'agent': _txt(agent.get('title'))})
            except Exception as e:
                self._json(200, {'mode': 'error', 'message': '模型调用失败：' + str(e)})
            return
        if path == '/api/ai/generate':
            try:
                n = int(self.headers.get('Content-Length', '0'))
                body = json.loads(self.rfile.read(n).decode('utf-8'))
                if not isinstance(body, dict):
                    body = {}
                kinds = body.get('kinds') if isinstance(body.get('kinds'), dict) else {}
                result = generate(read_data(), body.get('scope', 'all'),
                                  body.get('productId', ''), kinds)
                self._json(200, result)
            except Exception as e:
                self._json(400, {"ok": False, "error": str(e)})
            return
        if path != '/api/data':
            self.send_error(404)
            return
        try:
            n = int(self.headers.get('Content-Length', '0'))
            d = json.loads(self.rfile.read(n).decode('utf-8'))
            current = read_data()
            cur_rev = current.get('_rev', 0)
            has_in_rev = '_rev' in d and d.get('_rev') is not None
            try:
                in_rev = int(d.get('_rev', 0) or 0)
            except Exception:
                in_rev = 0
            # 陈旧快照保护：客户端显式带了版本且落后于服务端时拒绝，避免旧标签页覆盖新数据。
            # 未带 _rev 的写入（外部脚本/旧客户端）视为强制写入，放行。
            if has_in_rev and in_rev < cur_rev:
                self._json(409, {"ok": False, "conflict": True, "rev": cur_rev, "data": current})
                return
            d = dict(d)
            d['_rev'] = cur_rev + 1
            write_data(d)
            self._json(200, {"ok": True, "rev": d['_rev']})
        except Exception as e:
            self._json(400, {"ok": False, "error": str(e)})


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8210
    if not os.path.exists(DATA):
        write_data(dict(EMPTY))
    srv = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print('产品工厂工作台运行于 http://127.0.0.1:%d/' % port, flush=True)
    print('数据文件: %s' % DATA, flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        srv.shutdown()


if __name__ == '__main__':
    main()
