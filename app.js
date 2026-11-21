(function(){
  'use strict';

  /* ==================== constants ==================== */
  var KEY='pf_workbench_v3';
  var VIEWS={overview:'主工厂流水线',strategy:'灵感与战略',delivery:'产研交付台',growth:'增长与调优',kb:'知识库',sop:'SOP 流程',skill:'Skill Hub',agent:'Agent Hub',rule:'Rule Hub',detail:'产品详情',audit:'审计日志与 SOP 流转动态',search:'搜索',settings:'设置'};
  var STAGES=[
    {t:'灵感',c:'#8b5cf6',bg:'#f5f3ff'},
    {t:'产品规划',c:'#0284c7',bg:'#f0f9ff'},
    {t:'战略决策',c:'#d97706',bg:'#fffbeb'},
    {t:'产品设计',c:'#e11d48',bg:'#fff1f2'},
    {t:'产品开发',c:'#059669',bg:'#ecfdf5'},
    {t:'产品落地',c:'#0d9488',bg:'#f0fdfa'},
    {t:'产品上线',c:'#4f46e5',bg:'#eef2ff'},
    {t:'推广运营',c:'#ea580c',bg:'#fff7ed'},
    {t:'动态调整',c:'#0891b2',bg:'#ecfeff'}
  ];
  var PRIOS=[{t:'高',c:'#e03131',bg:'#fff0f0'},{t:'中',c:'#e67700',bg:'#fff9e6'},{t:'低',c:'#2b8a3e',bg:'#ebfbee'}];

  /* ==================== helpers ==================== */
  function $(id){return document.getElementById(id);}
  function clear(node){while(node&&node.firstChild)node.removeChild(node.firstChild);}
  function txt(v){return v==null?'':String(v);}
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);return e;}
  function svgUse(id,cls){return '<svg class="ic '+(cls||'')+'"><use href="#'+id+'"/></svg>';}
  function uid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
  function today(){var t=new Date();return t.getFullYear()+'-'+('0'+(t.getMonth()+1)).slice(-2)+'-'+('0'+t.getDate()).slice(-2);}
  var toastTimer=null;
  function toast(m){var t=$('toast');if(!t)return;t.textContent=m;t.classList.add('show');if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},2200);}
  function avatarColor(name){var palette=['#4f46e5','#7048e8','#0891b2','#059669','#e67700','#c2255c'],h=0,s=txt(name);for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%palette.length;return palette[h];}
  function stageInfo(t){for(var i=0;i<STAGES.length;i++)if(STAGES[i].t===t)return STAGES[i];return STAGES[0];}
  function stageIndex(t){for(var i=0;i<STAGES.length;i++)if(STAGES[i].t===t)return i;return 0;}
  function prioInfo(t){for(var i=0;i<PRIOS.length;i++)if(PRIOS[i].t===t)return PRIOS[i];return null;}
  function shortStage(t){return {'产品规划':'规划','战略决策':'决策','产品设计':'设计','产品开发':'研发','产品落地':'落地','产品上线':'上线','推广运营':'运营','动态调整':'调优'}[t]||t;}
  function esc(s){return txt(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function pct(a,b){if(!b)return 0;return Math.round(a/b*100);}
  function money(n){
    var x=Number(n);if(!isFinite(x))return '—';
    if(Math.abs(x)>=1e6)return '¥'+(x/1e6).toFixed(2).replace(/\.?0+$/,'')+'M';
    if(Math.abs(x)>=1e3)return '¥'+(x/1e3).toFixed(1).replace(/\.0$/,'')+'K';
    return '¥'+x;
  }
  function daysAgo(ts){
    if(!ts)return '';
    var d=Math.round((Date.now()-new Date(ts).getTime())/86400000);
    if(d<=0)return '今天';
    if(d===1)return '昨天';
    if(d<30)return d+' 天前';
    return Math.round(d/30)+' 个月前';
  }
  function who(){return store.data.contents['meName']||'我';}
  function initialOf(s){s=txt(s).trim();return s?s.slice(0,1):'?';}

  /* ==================== persistent store (server JSON + localStorage fallback) ==================== */
  var saveTimer=null;
  var API='/api/data';
  var apiReady=false;          // 后端可用则走项目 data.json，否则降级 localStorage
  var serverRev=0;             // 服务端数据版本号，用于陈旧快照保护
  var store={
    data:null,
    load:function(cb){
      var self=this;
      function fallback(){
        var raw=null;try{raw=localStorage.getItem(KEY);}catch(e){}
        if(raw){try{var d=JSON.parse(raw);if(d&&d.version===1&&d.products&&d.contents){self.data=migrate(d);serverRev=parseInt(d._rev,10)||0;if(cb)cb();return;}}catch(e){}}
        self.data={version:1,_rev:0,updatedAt:'',settings:{theme:'light',recentSearches:[]},contents:{},products:[],ideas:[],okrs:[],decisions:[],warns:[],checks:[],tasks:[],gate:[],metrics:[],channels:[],experiments:[],plays:[],kb:[],sops:[],log:[],skills:[],agents:[],rules:[]};
        if(cb)cb();
      }
      if(typeof fetch!=='function'){fallback();return;}
      var xhr=new XMLHttpRequest();
      try{
        xhr.open('GET',API,true);
        xhr.onreadystatechange=function(){
          if(xhr.readyState!==4)return;
          if(xhr.status===200){
            try{
              var d=JSON.parse(xhr.responseText);
              if(d&&d.version===1){self.data=migrate(d);serverRev=parseInt(d._rev,10)||0;apiReady=true;if(cb)cb();return;}
            }catch(e){}
          }
          fallback();   // 后端不可用(如 file:// 直接打开)时降级
        };
        xhr.send();
      }catch(e){fallback();}
    },
    save:function(){
      this.data.updatedAt=new Date().toISOString();
      this.data._rev=serverRev;                          // 带上当前版本，供服务端做陈旧快照保护
      var self=this,payload=JSON.stringify(this.data);
      try{localStorage.setItem(KEY,payload);}catch(e){}   // 本地缓存兜底
      if(apiReady&&typeof fetch==='function'){
        try{
          var xhr=new XMLHttpRequest();
          xhr.open('POST',API,true);
          xhr.setRequestHeader('Content-Type','application/json');
          xhr.onreadystatechange=function(){
            if(xhr.readyState!==4)return;
            if(xhr.status===200){
              try{var res=JSON.parse(xhr.responseText);if(res&&res.rev)serverRev=res.rev;}catch(e){}
              markSaved();
            }else if(xhr.status===409){
              // 陈旧快照被拒：用服务端最新数据覆盖本地，重渲染，避免旧数据继续作祟
              self._adoptConflict(xhr.responseText);
            }else{apiReady=false;markSaved();}
          };
          xhr.send(payload);
        }catch(e){apiReady=false;markSaved();}
      }else{
        markSaved();
      }
    },
    _adoptConflict:function(text){
      try{
        var res=JSON.parse(text);
        if(res&&res.data&&res.data.version===1){
          this.data=migrate(res.data);
          serverRev=parseInt(res.rev,10)||parseInt(res.data._rev,10)||0;
          try{localStorage.setItem(KEY,JSON.stringify(this.data));}catch(e){}
          if(typeof renderAll==='function')renderAll();
          if(typeof toast==='function')toast('数据已在其它页面更新，已同步最新版本');
        }
      }catch(e){}
    },
    schedule:function(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){store.save();},350);}
  };
  // 静默同步：多标签页/多浏览器场景下，让陈旧页面自动追上服务端最新数据
  var syncing=false;
  function syncFromServer(silent){
    if(!apiReady||syncing||typeof fetch!=='function')return;
    syncing=true;
    fetch(API,{cache:'no-store'}).then(function(r){return r.json();}).then(function(d){
      syncing=false;
      if(!d||d.version!==1)return;
      var rv=parseInt(d._rev,10)||0;
      if(rv>serverRev){
        store.data=migrate(d);
        serverRev=rv;
        try{localStorage.setItem(KEY,JSON.stringify(store.data));}catch(e){}
        if(typeof renderAll==='function')renderAll();
        if(!silent&&typeof toast==='function')toast('已同步其它页面的最新数据');
      }else if(rv===serverRev){
        // 同版本：仅校准本地版本号，不做改动
        serverRev=rv;
      }
    }).catch(function(){syncing=false;});
  }
  var LISTS=['ideas','okrs','decisions','warns','checks','tasks','gate','metrics','channels','experiments','plays','kb','sops','log','products','skills','agents','rules'];
  function migrate(d){
    for(var i=0;i<LISTS.length;i++)if(!Array.isArray(d[LISTS[i]]))d[LISTS[i]]=[];
    if(!d.settings||typeof d.settings!=='object')d.settings={};
    if(d.settings.theme!=='dark'&&d.settings.theme!=='light')d.settings.theme='light';
    if(!Array.isArray(d.settings.recentSearches))d.settings.recentSearches=[];
    return d;
  }
  /* 记录类型 → 存储键（idea→ideas，check→checks） */
  var KEYS={'products':'products','log':'log','ideas':'ideas','okrs':'okrs','decisions':'decisions',
    'warns':'warns','checks':'checks','tasks':'tasks','metrics':'metrics','channels':'channels',
    'experiments':'experiments','plays':'plays',
    'idea':'ideas','okr':'okrs','decision':'decisions','warn':'warns','check':'checks','task':'tasks',
    'metric':'metrics','channel':'channels','experiment':'experiments','play':'plays','kb':'kb','sop':'sops',
    'skill':'skills','agent':'agents','rule':'rules','skills':'skills','agents':'agents','rules':'rules'};
  function storeKey(k){return KEYS[k]||String(k).replace(/s$/,'')+'s';}
  function list(k){
    var v=store.data[storeKey(k)];
    if(!Array.isArray(v)){v=[];store.data[storeKey(k)]=v;}
    return v;
  }
  function markSaved(){
    var s=$('saveState');
    if(s){
      var d=new Date();
      s.textContent='已保存 '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
      s.style.color=apiReady?'var(--emerald)':'#059669';
    }
    renderSettings();
  }

  /* ==================== audit log ==================== */
  function logAdd(text,kind){
    store.data.log.unshift({id:uid(),name:who(),text:text,kind:kind||'',at:Date.now()});
    if(store.data.log.length>200)store.data.log.length=200;
  }

  /* ==================== RULE ENGINE (L1 · 规则即闸门) ====================
     Rule Hub 中「生效中」的规则会被编译成前端可执行逻辑：
     - 标题含「门禁 / PASS / 发布」→ 进入「产品上线」阶段时校验门禁项
     - 标题含「审计日志 / 留痕」→ 阶段变更时强制写入审计日志
     - 标题含「最近更新」→ 阶段变更时自动同步最近更新日期
     规则纯数据驱动：停用/编辑标题即可开关，无需改代码。                       */
  function activeRules(){
    return (store.data.rules||[]).filter(function(r){return r&&r.status==='生效中';});
  }
  function ruleOn(words){
    var rs=activeRules();
    for(var i=0;i<rs.length;i++){
      var t=txt(rs[i].title);
      for(var j=0;j<words.length;j++)if(t.indexOf(words[j])>=0)return rs[i];
    }
    return null;
  }
  function gateItems(){
    var out=[];
    var srcs=[['走查',store.data.checks||[]],['攻坚',store.data.tasks||[]]];
    for(var s=0;s<srcs.length;s++){
      var arr=srcs[s][1];
      for(var i=0;i<arr.length;i++){
        var r=arr[i];if(!r||!r.gate)continue;
        var st=txt(r.st||'').toUpperCase();
        var passed=/PASS|通过|完成|DONE/.test(st)||!!r.done;
        out.push({label:srcs[s][0],name:_rname(r),passed:passed});
      }
    }
    return out;
  }
  function _rname(r){return txt(r.title||r.标题||'未命名');}
  // 规则当前被编译成什么可执行行为（用于 Rule Hub 展示，让用户看到规则是"活"的）
  function ruleDrive(r){
    var t=txt(r.title);
    if(!/门禁|PASS|发布|最近更新|同步最近|审计日志|留痕/.test(t))return '';
    if(!r||r.status!=='生效中')return '未启用';
    if(/门禁|PASS|发布/.test(t))return '闸门 · 拦截未过门禁的上线推进';
    if(/最近更新|同步最近/.test(t))return '自动 · 阶段变更时同步更新日期';
    if(/审计日志|留痕/.test(t))return '自动 · 阶段变更时写入审计日志';
    return '';
  }
  // 返回 null 表示放行；返回 {reason,items} 表示拦截
  function stageGuard(from,to){
    var gateRule=ruleOn(['门禁','PASS','发布']);
    if(gateRule&&to==='产品上线'){
      var items=gateItems();
      var blocked=items.filter(function(x){return !x.passed;});
      if(blocked.length){
        return {rule:gateRule,items:blocked,
          reason:'「'+(gateRule.title)+'」：还有 '+blocked.length+' 项门禁未通过，不能进入「产品上线」\n'+
            blocked.slice(0,6).map(function(x){return '· '+x.label+'：'+x.name;}).join('\n')+
            (blocked.length>6?'\n…等共 '+blocked.length+' 项':'')};
      }
    }
    return null;
  }
  // canStage：判断 + 拦截提示；afterStage：落实生效规则的副作用；applyStage：完整一次推进
  function canStage(from,to){
    var g=stageGuard(from,to);
    if(g){ruleBlocked(g);return false;}
    return true;
  }
  function afterStage(product,from,to){
    if(ruleOn(['最近更新','同步最近']))product.最近更新=today();
    if(ruleOn(['审计日志','留痕']))logAdd('将「'+product.产品名称+'」从「'+from+'」推进至「'+to+'」','阶段');
  }
  function applyStage(product,from,to,silent){
    if(!product||from===to)return false;
    if(!canStage(from,to))return false;
    product.当前阶段=to;
    afterStage(product,from,to);
    store.save();
    if(!silent)toast('已推进至「'+to+'」阶段');
    return true;
  }
  function ruleBlocked(g){
    var host=$('ruleBlockMask');
    if(host){
      var t=$('rblkTitle');if(t)t.textContent='规则拦截 · 阶段推进未允许';
      var b=$('rblkBody');if(b)b.textContent=g.reason||'该操作被规则阻止。';
      var tip=$('rblkTip');if(tip)tip.textContent='来源：Rule Hub · '+(g.rule?g.rule.title:'生效规则');
      showMask('ruleBlockMask');
    }else{
      toast('规则拦截：'+(g.reason||'未允许'));
    }
  }

  /* ==================== editable text layer ==================== */
  function domPath(node,root){
    var parts=[],cur=node;
    while(cur&&cur!==root&&cur.parentElement){
      var p=cur.parentElement,tag=cur.tagName.toLowerCase(),same=0,idx=0;
      for(var i=0;i<p.children.length;i++){
        var c=p.children[i];
        if(c.tagName===cur.tagName){if(c===cur)idx=same;same++;}
      }
      parts.unshift(tag+'['+idx+']');
      cur=p;
    }
    return root.id+'::'+parts.join('>');
  }
  var HARD={SVG:1,SCRIPT:1,STYLE:1,BUTTON:1,SELECT:1,INPUT:1,TEXTAREA:1,OPTION:1,TEMPLATE:1};
  var SKIP_IDS={board:1,ribbon:1,toast:1,mask:1,editbar:1,rmask:1,prodList:1,logList:1,healthList:1,sidebar:1,'view-settings':1,'view-search':1,auditList:1};
  /* 由渲染函数负责内容的「受控」元素：不进入正文可编辑层，避免值被缓存清空 */
  var CONTROLLED=['#kpiTotal','#kpiActive','#kpiDecision','#kpiDecisionSub','#kpiSprint','#kpiSprintBar',
    '#kpiSprintSub','#kpiMrr','#kpiGrowth','#kpiRetention','#ideaCount','#okrAvg','#decisionCount',
    '#checkStat','#taskStat','#gateStat','#logCount','#riceTop','#prodList','#board','#ribbon'];
  function isControlled(node){
    for(var i=0;i<CONTROLLED.length;i++){if(node===document.querySelector(CONTROLLED[i]))return true;}
    return false;
  }
  /* 动态渲染容器与界面骨架不参与「正文可编辑」层 */
  function excluded(node){
    var p=node;
    while(p&&p.tagName!=='BODY'){
      if(HARD[p.tagName])return true;
      if(SKIP_IDS[p.id])return true;
      var cl=(typeof p.className==='string')?p.className:'';
      if(p.hasAttribute&&p.hasAttribute('data-render'))return true;
      if(cl.indexOf('nav-')>=0||cl.indexOf('pcard')>=0||cl.indexOf('stagechips')>=0||cl.indexOf('tabs')>=0||cl.indexOf('modal')>=0||cl.indexOf('crumb')>=0||cl.indexOf('search-')>=0)return true;
      p=p.parentElement;
    }
    return false;
  }
  function isStructural(node){
    var tag=node.tagName,cl=(typeof node.className==='string')?node.className:'';
    if(tag==='TH')return true;
    if(tag==='H1'||tag==='H2'||tag==='H3')return true;
    if(/(^|\s)cap(\s|$)/.test(cl)){
      var tx=node.textContent||'';
      return (tx.length<=14 && !/\d/.test(tx) && tx.indexOf('·')<0);
    }
    if(/(^|\s)(h2|k|no|eid)(\s|$)/.test(cl))return true;
    var a=node;
    while(a&&a.tagName!=='BODY'){
      var ac=(typeof a.className==='string')?a.className:'';
      if(/(^|\s)(mini-head|sechead|eyebrow)(\s|$)/.test(ac))return true;
      a=a.parentElement;
    }
    return false;
  }
  function bindEditable(node,key,root){
    node.setAttribute('data-ek',key);
    node.setAttribute('contenteditable','true');
    node.setAttribute('spellcheck','false');
    node.classList.add('editable');
    if(store.data.contents[key]!=null){
      node.textContent=store.data.contents[key];
    }else if(store.data.contents.__cleaned!==true){
      store.data.contents[key]=isStructural(node)?node.textContent:'';
      node.textContent=store.data.contents[key];
    }
    if(node.textContent==='')node.setAttribute('data-blank','1');
    else node.removeAttribute('data-blank');
    node.addEventListener('input',function(){
      node.removeAttribute('data-blank');store.data.contents[key]=node.textContent;store.schedule();
      if(key==='meName'){var av=$('meAvatar');if(av&&!av.isContentEditable)av.textContent=initialOf(node.textContent);}
    });
    node.addEventListener('blur',function(){store.data.contents[key]=node.textContent;store.save();renderWelcome();});
    node.addEventListener('paste',function(e){
      e.preventDefault();
      var tx=(e.clipboardData||window.clipboardData).getData('text')||'';
      if(document.execCommand)document.execCommand('insertText',false,tx);
      else{var s=node.textContent;store.data.contents[key]=s+tx;node.textContent=s+tx;store.schedule();}
    });
    node.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();node.blur();}});
  }
  function initEditable(){
    var fresh=(store.data.contents.__cleaned!==true);
    /* 显式声明可编辑的区域（页头问候语、个人资料） */
    var marked=document.querySelectorAll('[data-editable]');
    for(var m=0;m<marked.length;m++){
      var mn=marked[m];
      if(mn.id)bindEditable(mn,mn.id,document.body);
    }
    var views=document.querySelectorAll('.view');
    for(var v=0;v<views.length;v++){
      var root=views[v],nodes=root.querySelectorAll('*');
      for(var i=0;i<nodes.length;i++){
        var node=nodes[i];
        if(node.hasAttribute('data-editable'))continue;
        if(excluded(node)||node.children.length>0)continue;
        if(isControlled(node))continue;
        if(!(node.textContent||'').trim())continue;
        bindEditable(node,domPath(node,root),root);
      }
    }
    if(fresh){store.data.contents.__cleaned=true;store.save();}
  }

  /* 清空混合节点里残留的示例文本（静态骨架里夹着的假数据） */
  function scrubResidualText(){
    var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false),t;
    while((t=walker.nextNode())){
      if(!t.nodeValue||!t.nodeValue.trim())continue;
      var par=t.parentElement;if(!par)continue;
      if(par.isContentEditable)continue;
      var hard=false,a=par;
      while(a&&a.tagName!=='BODY'){
        if(HARD[a.tagName]||SKIP_IDS[a.id]){hard=true;break;}
        var cl=(typeof a.className==='string')?a.className:'';
        if(cl.indexOf('nav-')>=0||cl.indexOf('crumb')>=0||cl.indexOf('search-')>=0||a.hasAttribute('data-render')||cl.indexOf('modal')>=0){hard=true;break;}
        a=a.parentElement;
      }
      if(hard)continue;
      if(isStructural(par))continue;
      t.nodeValue='';
    }
  }

  /* ==================== view switching ==================== */
  var navs=document.querySelectorAll('.nav-item[data-view]');
  function switchView(name){
    var vs=document.querySelectorAll('.view');
    for(var i=0;i<vs.length;i++)vs[i].classList.remove('active');
    var target=$('view-'+name);if(target)target.classList.add('active');
    for(var j=0;j<navs.length;j++)navs[j].classList.toggle('active',navs[j].getAttribute('data-view')===name);
    $('crumbCur').textContent=VIEWS[name]||'主工厂流水线';
    if(typeof renderProductsSide==='function')renderProductsSide();  // 只在详情页高亮当前产品，切走即消失
    var sb=$('sidebar');if(sb)sb.classList.remove('open');
    window.scrollTo(0,0);
  }
  for(var n=0;n<navs.length;n++){
    (function(elm){elm.addEventListener('click',function(e){e.preventDefault();switchView(elm.getAttribute('data-view'));});})(navs[n]);
  }
  document.addEventListener('click',function(e){
    var t=e.target;
    while(t&&t!==document&&!(t.getAttribute&&t.getAttribute('data-soon')))t=t.parentNode;
    if(t&&t!==document){e.preventDefault();toast('该模块尚未开放，可以先在「灵感与战略」里记录');}
  });
  var menuBtn=$('menuBtn');if(menuBtn)menuBtn.addEventListener('click',function(){$('sidebar').classList.toggle('open');});

  /* ==================== settings: theme / profile / navigation ==================== */
  function currentTheme(){return document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light';}
  function applyTheme(mode,persist){
    mode=(mode==='dark')?'dark':'light';
    document.documentElement.setAttribute('data-theme',mode);
    try{localStorage.setItem('pf_theme',mode);}catch(e){}
    var bs=document.querySelectorAll('.theme-opt');
    for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].getAttribute('data-theme')===mode);
    if(persist&&store.data){
      store.data.settings.theme=mode;
      logAdd('切换为'+(mode==='dark'?'深夜':'白天')+'模式');
      store.save();renderSettings();
      toast((mode==='dark'?'深夜':'白天')+'模式已启用');
    }
  }
  var SET_TABS={setProfile:'profile',setTheme:'theme',setAi:'ai',setData:'data',setHelp:'help',setAbout:'about'};
  function selectSettingsTab(tab){
    if(!SET_TABS[tab]&&['profile','theme','ai','data','help','about'].indexOf(tab)<0)tab='profile';
    if(tab==='ai'&&typeof loadAiStatus==='function')loadAiStatus();
    var tabs=document.querySelectorAll('.set-tab');
    for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('on',tabs[i].getAttribute('data-tab')===tab);
    var panels=document.querySelectorAll('.set-panel');
    var panelId='set'+tab.charAt(0).toUpperCase()+tab.slice(1);
    for(var j=0;j<panels.length;j++)panels[j].classList.toggle('on',panels[j].id===panelId);
  }
  function openSettings(tab){
    if(SET_TABS[tab])tab=SET_TABS[tab];
    switchView('settings');
    selectSettingsTab(tab||'profile');
  }
  var setBtn=$('settingsBtn');
  if(setBtn)setBtn.addEventListener('click',function(e){e.stopPropagation();openSettings('profile');});
  var meProfile=$('meProfile');
  if(meProfile)meProfile.addEventListener('click',function(e){
    if(e.target&&e.target.closest&&e.target.closest('[data-editable]'))return;
    openSettings('profile');
  });
  var setTabs=document.querySelectorAll('.set-tab');
  for(var st=0;st<setTabs.length;st++){
    (function(b){b.addEventListener('click',function(){selectSettingsTab(b.getAttribute('data-tab'));});})(setTabs[st]);
  }
  var themeOpts=document.querySelectorAll('.theme-opt');
  for(var ti=0;ti<themeOpts.length;ti++){
    (function(b){b.addEventListener('click',function(){applyTheme(b.getAttribute('data-theme'),true);});})(themeOpts[ti]);
  }
  function saveDisplayName(){
    var input=$('setName');if(!input)return;
    var name=input.value.trim();
    if(!name){toast('请输入名字');input.focus();return;}
    store.data.contents.meName=name;
    input.value=name;
    logAdd('把名字改为「'+name+'」');
    renderWelcome();store.save();renderSettings();
    toast('名字已更新');
  }
  if($('setNameSave'))$('setNameSave').addEventListener('click',saveDisplayName);
  if($('setName'))$('setName').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();saveDisplayName();}});

  /* ==================== product board ==================== */
  var editingId='',searchQ='';
  function all(){return store.data.products;}
  function find(id){var a=all();for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}

  function renderSelects(){
    var s1=$('f_stage'),s2=$('f_priority');
    clear(s1);clear(s2);
    var p=el('option','','请选择');p.value='';s1.appendChild(p);s2.appendChild(p.cloneNode(true));
    for(var i=0;i<STAGES.length;i++){var o=el('option','',STAGES[i].t);o.value=STAGES[i].t;s1.appendChild(o);}
    for(var j=0;j<PRIOS.length;j++){var q=el('option','',PRIOS[j].t);q.value=PRIOS[j].t;s2.appendChild(q);}
  }

  function filtered(){return all();}

  function renderRibbon(rows){
    var r=$('ribbon');clear(r);
    var counts={};for(var i=0;i<rows.length;i++)counts[rows[i].当前阶段]=(counts[rows[i].当前阶段]||0)+1;
    for(var s=0;s<STAGES.length;s++){
      var info=STAGES[s],c=counts[info.t]||0;
      var d=el('div','rb'+(s===0?' on':''));
      var dot=el('span','dot');dot.style.background=info.c;d.appendChild(dot);
      d.appendChild(el('span','',(s+1)+'. '+shortStage(info.t)+' ('+c+')'));
      r.appendChild(d);
    }
  }

  function renderCards(){
    var rows=filtered(),allRows=all();
    var l=$('boardLoading');if(l)l.style.display='none';
    var kpi=$('kpiTotal');
    if(kpi){clear(kpi);kpi.appendChild(document.createTextNode(allRows.length+' '));kpi.appendChild(el('small','','个主线产品'));}
    renderRibbon(allRows);
    var board=$('board');clear(board);
    var empty=$('boardEmpty');
    if(allRows.length===0){empty.classList.add('show');return;}else empty.classList.remove('show');
    if(rows.length===0){board.appendChild(el('div','card pad muted','没有匹配「'+searchQ+'」的产品卡片。'));return;}
    for(var s=0;s<STAGES.length;s++){
      var info=STAGES[s];
      var col=el('div','col');
      var ch=el('div','colhead'),nm=el('div','name'),dot=el('span','dot');dot.style.background=info.c;nm.appendChild(dot);nm.appendChild(el('span','',info.t));ch.appendChild(nm);
      var list=[];for(var i=0;i<rows.length;i++)if(rows[i].当前阶段===info.t)list.push(rows[i]);
      ch.appendChild(el('span','num',list.length));col.appendChild(ch);
      var cards=el('div','cards');
      if(list.length===0)cards.appendChild(el('div','col-empty','暂无'));
      else for(var k=0;k<list.length;k++)cards.appendChild(makeCard(list[k]));
      col.appendChild(cards);board.appendChild(col);
    }
  }

  function makeCard(row){
    var c=el('article','pcard');
    var tr=el('div','tagrow');
    var tag=row.当前阶段||'灵感',si=stageInfo(tag);
    var tg=el('span','tag');tg.style.background=si.bg;tg.style.color=si.c;tg.textContent=tag;tr.appendChild(tg);
    c.appendChild(tr);
    var ttl=el('div','ttl',row.产品名称||'未命名');ttl.classList.add('card-title');c.appendChild(ttl);
    var de=el('p','desc',row.一句话定位||'—');de.classList.add('card-desc');c.appendChild(de);
    var d=row.最近更新?txt(row.最近更新).slice(5,10):'';
    if(d){var meta=el('div','meta'),tm=el('span','time');tm.appendChild(el('span','',d));meta.appendChild(tm);c.appendChild(meta);}
    var pinfo=prioInfo(row.优先级);
    if(pinfo){
      var pw=el('div','progwrap'),lbl=el('div','lbl');
      lbl.appendChild(el('span','','优先级'));
      var pv=el('span','mono',pinfo.t);pv.style.color=pinfo.c;lbl.appendChild(pv);pw.appendChild(lbl);
      var bar=el('div','bar');bar.style.margin='0';var fill=el('i');fill.style.width={'高':'88%','中':'58%','低':'30%'}[pinfo.t]||'40%';fill.style.background=pinfo.c;bar.appendChild(fill);pw.appendChild(bar);
      c.appendChild(pw);
    }
    var sel=el('select','stage-sel');
    for(var i=0;i<STAGES.length;i++){var o=el('option','',STAGES[i].t);o.value=STAGES[i].t;if(STAGES[i].t===tag)o.selected=true;sel.appendChild(o);}
    (function(id,s){s.addEventListener('change',function(){moveStage(id,s.value);});})(row.id,sel);
    c.appendChild(sel);
    (function(r){c.addEventListener('click',function(e){if(e.target.tagName==='SELECT')return;openDetail(r);});})(row);
    return c;
  }

  /* ==================== product CRUD ==================== */
  function openNew(){
    editingId='';$('modalTitle').textContent='新建产品 / 灵感';$('form').reset();
    $('form').querySelector('[name="updated"]').value=today();
    var del=$('deleteBtn');if(del)del.style.display='none';
    refillDraft();showMask('mask');
  }
  function openEdit(row){
    editingId=row.id;$('modalTitle').textContent='编辑产品卡片';
    var del=$('deleteBtn');if(del)del.style.display='';
    function set(n,v){var e=$('form').querySelector('[name="'+n+'"]');if(e)e.value=v==null?'':v;}
    set('pname',row.产品名称);set('desc',row.一句话定位);
    set('updated',row.最近更新||'');set('stage',row.当前阶段);set('priority',row.优先级);
    showMask('mask');
  }
  function showMask(id){var m=$(id);if(m)m.classList.add('show');}
  function hideMask(id){var m=$(id);if(m)m.classList.remove('show');}

  /* ==================== product detail page ==================== */
  var detailId='';
  function openDetail(row){
    if(!row)return;
    detailId=row.id;
    var cur=row.当前阶段||'灵感';
    var si=stageIndex(cur);
    var pctVal=Math.round((si+1)/STAGES.length*100);

    function setText(id,v){var e=$(id);if(e)e.textContent=v==null?'':v;}
    setText('dName',row.产品名称||'未命名产品');
    setText('dDesc',row.一句话定位||'（暂无定位描述，点「编辑产品」补充）');
    setText('dUpdated',row.最近更新||'—');
    setText('dId',row.id||'—');

    // 阶段徽章
    var si0=stageInfo(cur);
    var st=$('dStage');if(st){st.textContent=cur;st.style.background=si0.bg;st.style.color=si0.c;}
    var pr=prioInfo(row.优先级);
    var pe=$('dPriority');if(pe){pe.textContent=(row.优先级||'未设')+'优先级';if(pr){pe.style.color=pr.c;pe.style.borderColor=pr.bg;}}

    // 生命周期环
    var fg=$('dRingFg');if(fg)fg.style.strokeDashoffset=String(327*(1-pctVal/100));
    setText('dRingPct',pctVal+'%');

    // 九阶段进度条
    var host=$('dStages');
    if(host){
      clear(host);
      for(var i=0;i<STAGES.length;i++)(function(s,idx){
        var d=el('div','dstage'+(idx<si?' done':'')+(idx===si?' cur':''));
        d.appendChild(el('div','no','STAGE '+('0'+(idx+1)).slice(-2)));
        d.appendChild(el('div','nm',s.t));
        d.appendChild(el('div','tick',idx<si?'✓ 已完成':(idx===si?'● 当前':'')));
        d.addEventListener('click',function(){
          if(row.当前阶段===s.t){toast('已处于「'+s.t+'」阶段');return;}
          if(!applyStage(row,row.当前阶段,s.t,true))return;
          renderAll();openDetail(row);
          toast('已推进至「'+s.t+'」阶段');
        });
        host.appendChild(d);
      })(STAGES[i],i);
    }

    // 产品档案字段
    var fh=$('dFields');
    if(fh){
      clear(fh);
      var f=[['产品名称',row.产品名称],['当前阶段',cur],['优先级',row.优先级],['最近更新',row.最近更新],['一句话定位',row.一句话定位]];
      for(var k=0;k<f.length;k++)(function(label,val){
        var box=el('div','dfield'+(label==='一句话定位'?' wide':''));
        box.appendChild(el('div','lab',label));
        box.appendChild(el('div','val',val||'—'));
        fh.appendChild(box);
      })(f[k][0],f[k][1]);
    }

    // 关联动态（从 log 里筛该产品名）
    var lh=$('dLog');
    if(lh){
      clear(lh);
      var name=row.产品名称||'';
      var logs=(store.data.log||[]).filter(function(r){return (JSON.stringify(r).indexOf(name)>=0);}).slice(-8);
      if(!logs.length){lh.appendChild(el('div','empty','暂无动态记录。推进阶段、编辑产品会自动记录。'));}
      else{
        for(var q=0;q<logs.length;q++)(function(r){
          var it=el('div','tl-item');
          var av=el('div','av',initialOf(who()));av.style.background=avatarColor(who());it.appendChild(av);
          var c=el('div','c');c.appendChild(el('b','',who()));
          c.appendChild(el('p','',txt(r.text||r.action||JSON.stringify(r)).slice(0,120)));
          it.appendChild(c);
          it.appendChild(el('div','tm',daysAgo(r.at||r.updatedAt)));
          lh.appendChild(it);
        })(logs[q]);
      }
    }
    switchView('detail');
  }
  function collect(){
    function g(n){var e=$('form').querySelector('[name="'+n+'"]');return e?e.value:'';}
    return {
      产品名称:g('pname'),当前阶段:g('stage'),一句话定位:g('desc'),
      优先级:g('priority'),最近更新:g('updated')
    };
  }
  function saveProduct(){
    var p=collect();
    if(!p.产品名称){toast('请填写产品名称');return;}
    if(!p.当前阶段)p.当前阶段='灵感';
    if(editingId){
      var r=find(editingId);if(!r){toast('未找到该产品');return;}
      var from=r.当前阶段;
      var stageChanged=from!==p.当前阶段;
      if(stageChanged&&!canStage(from,p.当前阶段)){hideMask('mask');return;}
      for(var k in p)if(Object.prototype.hasOwnProperty.call(p,k))r[k]=p[k];
      if(stageChanged)afterStage(r,from,p.当前阶段);
      logAdd('更新了产品「'+p.产品名称+'」'+(stageChanged?' · 阶段从「'+from+'」移至「'+p.当前阶段+'」':''));
    }else{
      if(!canStage('灵感',p.当前阶段))return;
      p.id=uid();store.data.products.push(p);
      if(ruleOn(['最近更新','同步最近']))p.最近更新=today();
      logAdd('新建产品「'+p.产品名称+'」，当前阶段「'+p.当前阶段+'」');
    }
    clearDraft();store.save();hideMask('mask');$('form').reset();renderAll();
    toast(editingId?'已保存修改':'已创建产品');
  }
  function moveStage(id,val){
    var r=find(id);if(!r)return;
    var from=r.当前阶段;if(from===val)return;
    if(!applyStage(r,from,val,true)){renderAll();return;}
    renderAll();toast('已移至「'+val+'」');
  }
  function deleteCurrent(){
    if(!editingId)return;
    if(!window.confirm('确定要删除这张产品卡片吗？此操作不可撤销。'))return;
    var a=store.data.products,idx=-1;
    for(var i=0;i<a.length;i++)if(a[i].id===editingId){idx=i;break;}
    if(idx>=0){logAdd('删除了产品「'+a[idx].产品名称+'」');a.splice(idx,1);}
    clearDraft();store.save();hideMask('mask');$('form').reset();renderAll();toast('已删除');
  }

  /* ---- form draft cache ---- */
  var DRAFT='pf_v3_draft';
  var NAMES=['pname','stage','desc','priority','updated'];
  function cacheDraft(){try{var d={};for(var i=0;i<NAMES.length;i++){var e=$('form').querySelector('[name="'+NAMES[i]+'"]');if(e)d[NAMES[i]]=e.value;}localStorage.setItem(DRAFT,JSON.stringify(d));}catch(e){}}
  function refillDraft(){try{var r=localStorage.getItem(DRAFT);if(!r)return;var d=JSON.parse(r);for(var i=0;i<NAMES.length;i++){if(d[NAMES[i]]==null)continue;var e=$('form').querySelector('[name="'+NAMES[i]+'"]');if(e)e.value=d[NAMES[i]];}}catch(e){}}
  function clearDraft(){try{localStorage.removeItem(DRAFT);}catch(e){}}

  /* ==================== record modal ==================== */
  var R={
    idea:{
      title:'灵感',label:'灵感',empty:'还没有灵感。点右上角「捕捉新灵感」记下第一条。',
      fields:[
        {n:'title',l:'灵感标题',t:'input',req:true,full:true,ph:'一句话说清这个机会'},
        {n:'src',l:'来源',t:'select',opts:['用户原声','竞品动态','技术洞察','其他']},
        {n:'status',l:'状态',t:'select',opts:['待评','已通过','已否决']},
        {n:'text',l:'详细描述',t:'textarea',full:true,ph:'痛点是什么？谁在痛？为什么现在做？'},
        {n:'R',l:'RICE · Reach 覆盖人数',t:'number'},
        {n:'I',l:'RICE · Impact 影响 (1-3)',t:'number'},
        {n:'C',l:'RICE · Confidence 置信度 %',t:'number'},
        {n:'E',l:'RICE · Effort 工期（周）',t:'number'}
      ],
      sub:function(r){return r.title+(r.src?' · '+r.src:'')+(r.text?' · '+r.text:'');}
    },
    okr:{
      title:'OKR / 指标',label:'OKR',empty:'还没有 OKR。点上方「新增 OKR」对齐你的战略目标。',
      fields:[
        {n:'title',l:'目标名称',t:'input',req:true,full:true,ph:'如：核心黏性 · 日常粘性提升 25%'},
        {n:'num',l:'当前值',t:'number'},
        {n:'target',l:'目标值',t:'number'},
        {n:'pct',l:'对齐度 %',t:'number',ph:'0-100，留空按当前/目标自动算'},
        {n:'desc',l:'关键结果',t:'textarea',full:true,ph:'衡量这一目标是否达成的结果'}
      ],
      sub:function(r){return r.title+' · 对齐 '+(okrPct(r))+'%';}
    },
    decision:{
      title:'立项案',label:'立项案',empty:'还没有立项案。点「新增立项案」发起第一次投决。',
      fields:[
        {n:'title',l:'立项案名称',t:'input',req:true,full:true},
        {n:'rid',l:'编号',t:'input',ph:'如 BIZ-202511'},
        {n:'rice',l:'RICE 得分',t:'number'},
        {n:'arr',l:'预估 ARR 增量',t:'number'},
        {n:'cac',l:'回本周期（月）',t:'number'},
        {n:'risk',l:'技术风险',t:'select',opts:['低','中','高']},
        {n:'status',l:'签批状态',t:'select',opts:['评审中','已批准','已否决']},
        {n:'note',l:'说明',t:'textarea',full:true,ph:'商业价值、关键假设、待补材料'}
      ],
      sub:function(r){return r.title+(r.rid?' · '+r.rid:'');}
    },
    warn:{
      title:'瓶颈卡点',label:'卡点',empty:'暂无卡点。点右上角「新增卡点」记录阻塞。',
      fields:[
        {n:'title',l:'卡点标题',t:'input',req:true,full:true},
        {n:'level',l:'级别',t:'select',opts:['紧急','重要','一般']},
        {n:'status',l:'状态',t:'select',opts:['进行中','已解决']},
        {n:'text',l:'详情与建议',t:'textarea',full:true,ph:'发生了什么？影响多大？建议怎么处理？'}
      ],
      sub:function(r){return r.title+(r.text?' · '+r.text:'');}
    },
    check:{
      title:'走查与验收项',label:'走查项',empty:'还没有走查项。点上方「新增走查项」补上第一项。',
      fields:[
        {n:'title',l:'检查项',t:'input',req:true,full:true},
        {n:'desc',l:'说明',t:'input',full:true,ph:'检查标准或验收方式'},
        {n:'gate',l:'纳入上线门禁',t:'check'},
        {n:'st',l:'状态标签',t:'input',ph:'如 PASS / 待签字 / 研发中'}
      ],
      sub:function(r){return r.title+(r.desc?' · '+r.desc:'');}
    },
    task:{
      title:'攻坚卡片',label:'攻坚卡片',empty:'还没有攻坚卡片。点「新增攻坚卡片」记录研发任务。',
      fields:[
        {n:'title',l:'任务名称',t:'input',req:true,full:true},
        {n:'desc',l:'进度备注',t:'input',full:true,ph:'如 经办人 张工 · 80%'},
        {n:'gate',l:'纳入上线门禁',t:'check'},
        {n:'st',l:'状态标签',t:'input',ph:'如 研发中 / QA 98%'}
      ],
      sub:function(r){return r.title+(r.desc?' · '+r.desc:'');}
    },
    metric:{
      title:'增长指标',label:'指标',empty:'还没有增长指标。点上方「新增指标」。',
      fields:[
        {n:'title',l:'指标名称',t:'input',req:true,full:true},
        {n:'value',l:'数值',t:'input',ph:'如 142.50 / 118.2%'},
        {n:'unit',l:'单位或口径',t:'input',ph:'如 / 付费用户成本'},
        {n:'delta',l:'变化',t:'input',ph:'如 +18.4% MoM（负值会标红）'},
        {n:'foot',l:'备注',t:'input',ph:'如 LTV/CAC 4.3x'}
      ],
      sub:function(r){return r.title+' · '+r.value;}
    },
    channel:{
      title:'获客渠道',label:'渠道',empty:'还没有渠道数据。点「新增渠道」录入第一组。',
      fields:[
        {n:'title',l:'渠道名称',t:'input',req:true,full:true},
        {n:'note',l:'渠道构成',t:'input',full:true,ph:'如 GitHub, Discord, Dev.to'},
        {n:'trial',l:'新增试用',t:'number'},
        {n:'conv',l:'付费转化率 %',t:'number'},
        {n:'cac',l:'综合 CAC',t:'number'},
        {n:'roi',l:'ROI 倍数',t:'number'}
      ],
      sub:function(r){return r.title+(r.trial?' · '+r.trial+' 试用':'');}
    },
    experiment:{
      title:'A/B 实验',label:'实验',empty:'还没有实验。点「新建实验」开始第一组 A/B 测试。',
      fields:[
        {n:'title',l:'实验名称',t:'input',req:true,full:true},
        {n:'eid',l:'实验编号',t:'input',ph:'如 EXP-204'},
        {n:'confidence',l:'置信度 %',t:'number'},
        {n:'sample',l:'样本量',t:'input',ph:'如 45,200 UV'},
        {n:'cs',l:'观测说明',t:'input',full:true,ph:'观测周期、收敛情况'},
        {n:'base',l:'对照组指标',t:'input',ph:'如 4.1%'},
        {n:'variant',l:'实验组指标',t:'input',ph:'如 5.8%'},
        {n:'status',l:'状态',t:'select',opts:['进行中','显著胜出','无显著差异','已归档']}
      ],
      sub:function(r){return r.title+' · '+(r.status||'进行中');}
    },
    kb:{
      title:'知识条目',label:'知识条目',empty:'还没有知识条目。点「新建知识条目」，把踩过的坑和方法沉淀下来。',
      fields:[
        {n:'title',l:'标题',t:'input',req:true,full:true,ph:'如：Puppeteer 无头浏览器报错排查清单'},
        {n:'cat',l:'分类',t:'select',opts:['踩坑记录','方法总结','工具手册','流程规范','参考资料','其他']},
        {n:'level',l:'掌握程度',t:'select',opts:['已掌握','基本掌握','待验证','不熟']},
        {n:'tags',l:'标签',t:'input',full:true,ph:'多个标签用逗号分隔，如：调试,Chrome,前端'},
        {n:'body',l:'正文',t:'textarea',full:true,ph:'尽量写清楚：现象 → 原因 → 解法。支持换行。'}
      ],
      sub:function(r){return r.title+(r.cat?' · '+r.cat:'');}
    },
    sop:{
      title:'SOP 流程',label:'SOP',empty:'还没有 SOP。点「新增 SOP 流程」，把重复操作固化成步骤。',
      fields:[
        {n:'title',l:'流程名称',t:'input',req:true,full:true,ph:'如：新版本发布上线检查流程'},
        {n:'cat',l:'适用场景',t:'select',opts:['研发交付','发布上线','质量验收','运营增长','问题排查','其他']},
        {n:'owner',l:'负责人',t:'input'},
        {n:'trigger',l:'触发条件',t:'input',full:true,ph:'什么时候该走这个流程？'},
        {n:'steps',l:'步骤（每行一步）',t:'textarea',full:true,ph:'第一步做什么\n第二步做什么\n第三步做什么'}
      ],
      sub:function(r){return r.title+(r.cat?' · '+r.cat:'');}
    },
    skill:{
      title:'Skill Hub 技能',label:'Skill',empty:'还没有 Skill。把可复用的能力（工具用法、分析方法、模板）沉淀到这里，供 Agent 调用。',
      fields:[
        {n:'title',l:'技能名称',t:'input',req:true,full:true,ph:'如：竞品数据抓取与对比'},
        {n:'cat',l:'类型',t:'select',opts:['工具技能','领域技能','分析技能','模板技能','其他']},
        {n:'level',l:'成熟度',t:'select',opts:['可复用','实验中','待沉淀']},
        {n:'tags',l:'标签',t:'input',full:true,ph:'多个标签用逗号分隔，如：数据,竞品,自动化'},
        {n:'body',l:'能力与调用方式',t:'textarea',full:true,ph:'这个技能解决什么？输入什么、输出什么？怎么调用？'}
      ],
      sub:function(r){return r.title+(r.cat?' · '+r.cat:'');}
    },
    agent:{
      title:'Agent Hub 智能体',label:'Agent',empty:'还没有 Agent。登记你的智能体：负责什么、由什么模型驱动、如何触发、能力边界在哪里。',
      fields:[
        {n:'title',l:'Agent 名称',t:'input',req:true,full:true,ph:'如：产品规划助手'},
        {n:'cat',l:'负责场景',t:'select',opts:['产品','研发','增长','知识','运营','其他']},
        {n:'model',l:'模型 / 引擎',t:'input',ph:'如 Claude / GPT / 本地规则引擎'},
        {n:'trigger',l:'触发方式',t:'input',full:true,ph:'如：新建灵感时自动评估 / 手动调用'},
        {n:'status',l:'状态',t:'select',opts:['规划中','可用','已下线']},
        {n:'body',l:'能力与边界',t:'textarea',full:true,ph:'能做什么、不能做什么、需要哪些上下文'}
      ],
      sub:function(r){return r.title+(r.cat?' · '+r.cat:'');}
    },
    rule:{
      title:'Rule Hub 规则',label:'规则',empty:'还没有规则。把硬约束、偏好口径与安全边界写在这里，让 Agent 执行时保持一致。',
      fields:[
        {n:'title',l:'规则名称',t:'input',req:true,full:true,ph:'如：对外文案必须经过法务确认'},
        {n:'cat',l:'类型',t:'select',opts:['硬约束','偏好口径','安全边界','审批要求','其他']},
        {n:'scope',l:'适用范围',t:'input',full:true,ph:'如：所有上线物料 / 产品详情页'},
        {n:'priority',l:'优先级',t:'select',opts:['高','中','低']},
        {n:'status',l:'生效状态',t:'select',opts:['生效中','草稿','已废止']},
        {n:'body',l:'规则内容',t:'textarea',full:true,ph:'明确写出判定标准与例外情况'}
      ],
      sub:function(r){return r.title+(r.cat?' · '+r.cat:'');}
    },
    play:{
      title:'策略复盘',label:'复盘',empty:'还没有复盘记录。把「问题 → 对策」沉淀在这里。',
      fields:[
        {n:'title',l:'问题 / 现象',t:'input',req:true,full:true},
        {n:'prob',l:'问题详情',t:'textarea',full:true,ph:'观察到什么？影响哪些客群？'},
        {n:'sol',l:'对策 / 立项',t:'textarea',full:true,ph:'要做什么？派给谁？预期什么结果？'},
        {n:'owner',l:'负责人',t:'input'},
        {n:'status',l:'状态',t:'select',opts:['待采纳','已采纳','已验证','已放弃']}
      ],
      sub:function(r){return r.title+' · '+(r.status||'待采纳');}
    }
  };
  var rType='',rId='';
  function optsOf(f){var o=f.opts||[];if(!o.length)return '';var h='';for(var i=0;i<o.length;i++)h+='<option value="'+esc(o[i])+'">'+esc(o[i])+'</option>';return h;}
  function openRec(type,rec){
    if(type&&typeof type==='object'){rec=type;type=rec._t||'';}
    var def=R[type];if(!def)return;
    rType=type;rId=rec?rec.id:'';
    $('rTitle').textContent=(rec?'编辑':'新增')+' · '+def.label;
    var box=$('rFields');box.innerHTML='';
    for(var i=0;i<def.fields.length;i++){
      (function(f){
        var wrap=el('div','field'+(f.full?' full':''));
        var lb=el('label','',f.l+(f.req?' *':''));wrap.appendChild(lb);
        var input;
        var val=rec&&rec[f.n]!=null?rec[f.n]:(f.t==='check'?false:'');
        if(f.t==='textarea'){input=el('textarea');input.value=txt(val);}
        else if(f.t==='select'){input=el('select');input.innerHTML='<option value="">请选择</option>'+optsOf(f);input.value=txt(val);}
        else if(f.t==='check'){
          input=el('input');input.type='checkbox';input.checked=!!val;
          input.style.width='16px';input.style.height='16px';input.style.accentColor='var(--primary-c)';
        }
        else{
          input=el('input');input.type=f.t==='number'?'number':'text';input.value=txt(val);
          if(f.ph)input.placeholder=f.ph;
          if(f.t==='number')input.step='any';
        }
        input.name=f.n;
        if(f.t==='check'){var row=el('div','');row.style.cssText='display:flex;align-items:center;gap:8px';row.appendChild(input);row.appendChild(el('span','t2',f.l));wrap.appendChild(row);lb.style.display='none';}
        else wrap.appendChild(input);
        box.appendChild(wrap);
      })(def.fields[i]);
    }
    $('rDeleteBtn').style.display=rec?'':'none';
    showMask('rmask');
    var first=box.querySelector('input:not([type=checkbox]),textarea,select');if(first)first.focus();
  }
  function closeRec(){hideMask('rmask');rType='';rId='';}
  function recTypeBox(){return $('rform');}
  function collectRec(){
    var def=R[rType],out={};
    for(var i=0;i<def.fields.length;i++){
      var f=def.fields[i],inp=recTypeBox().querySelector('[name="'+f.n+'"]');
      if(!inp)continue;
      if(f.t==='check')out[f.n]=inp.checked;
      else if(f.t==='number')out[f.n]=inp.value===''?'':Number(inp.value);
      else out[f.n]=inp.value.trim();
    }
    return out;
  }
  function saveRec(){
    var def=R[rType];if(!def)return;
    var v=collectRec();
    for(var i=0;i<def.fields.length;i++){
      var f=def.fields[i];
      if(f.req&&!txt(v[f.n])){toast('请填写「'+f.l+'」');return;}
    }
    var arr=list(rType),idx=-1;
    for(var j=0;j<arr.length;j++)if(arr[j].id===rId){idx=j;break;}
    if(idx>=0){
      for(var k in v)if(Object.prototype.hasOwnProperty.call(v,k))arr[idx][k]=v[k];
      arr[idx].updatedAt=Date.now();
      logAdd('修改了'+def.label+'「'+def.sub(v)+'」');
    }else{
      v.id=uid();v.createdAt=Date.now();
      arr.unshift(v);
      logAdd('新增'+def.label+'「'+def.sub(v)+'」');
    }
    store.save();closeRec();renderAll();toast('已保存');
  }
  function deleteRec(type,id){
    var def=R[type],arr=list(type);
    for(var i=0;i<arr.length;i++)if(arr[i].id===id){
      if(!window.confirm('删除这条'+def.label+'？此操作不可撤销。'))return;
      logAdd('删除了'+def.label+'「'+def.sub(arr[i])+'」');
      arr.splice(i,1);store.save();renderAll();toast('已删除');return;
    }
  }
  function findRec(type,id){var arr=list(type);for(var i=0;i<arr.length;i++)if(arr[i].id===id)return arr[i];return null;}

  /* 记录卡片尾部的小操作条 */
  function recActs(type,rec,extra){
    var d=el('div','rec-acts');
    var e=el('button','rec-btn','编辑');e.type='button';e.addEventListener('click',function(){rec._t=type;openRec(type,rec);});
    d.appendChild(e);
    var x=el('button','rec-btn danger','删除');x.type='button';x.addEventListener('click',function(){deleteRec(type,rec.id);});
    d.appendChild(x);
    if(extra)d.appendChild(extra);
    return d;
  }

  /* ==================== renderers ==================== */

  function emptyNote(host){
    var n=el('div','empty-note',host.getAttribute('data-empty')||'暂无内容');host.appendChild(n);
  }
  function hostOf(name){return document.querySelectorAll('[data-render="'+name+'"]');}

  function renderIdeas(){
    var hosts=hostOf('ideas');if(!hosts.length)return;
    var items=list('ideas').slice().sort(function(a,b){return (b.votes||0)-(a.votes||0);});
    var pending=0;for(var p=0;p<items.length;p++)if(!items[p].status||items[p].status==='待评')pending++;
    var cnt=$('ideaCount');if(cnt)cnt.textContent=pending+' 个待评';
    /* tabs 计数 */
    var tabs=$('ideaTabs');
    if(tabs){
      var bs=tabs.querySelectorAll('button');
      for(var t=0;t<bs.length;t++){
        var src=bs[t].getAttribute('data-src'),label=bs[t].textContent.replace(/\s*\(\d+\)$/,'');
        var c=src?items.filter(function(r){return r.src===src;}).length:items.length;
        bs[t].textContent=label+(c?' ('+c+')':'');
        bs[t].classList.toggle('on',bs[t].getAttribute('data-src')===(ideaSrcFilter||''));
      }
    }
    var shown=ideaSrcFilter?items.filter(function(r){return r.src===ideaSrcFilter;}):items;
    for(var h=0;h<hosts.length;h++){
      var host=hosts[h];clear(host);
      if(!shown.length){emptyNote(host);continue;}
      for(var i=0;i<shown.length;i++)host.appendChild(ideaCard(shown[i],i+1));
    }
    renderTop();
  }
  function ideaCard(r,rank){
    var c=el('div','idea');
    var top=el('div','top');
    var st=el('span','src',(r.src||'灵感')+(r.status?' · '+r.status:''));
    var si={'用户原声':['#e2dfff','#4f46e5'],'竞品动态':['#fff0f6','#c2255c'],'技术洞察':['#e6fcf5','#087f5b']}[r.src]||['#eef2ff','#4f46e5'];
    st.style.background=si[0];st.style.color=si[1];st.classList.add('tag');top.appendChild(st);
    var vote=el('span','vote mono','👍 '+(r.votes||0));vote.cursor='pointer';vote.title='点一下 +1 票';
    (function(rec,v){v.addEventListener('click',function(){rec.votes=(rec.votes||0)+1;store.save();renderAll();});})(r,vote);
    top.appendChild(vote);
    c.appendChild(top);
    c.appendChild(el('b','',r.title||'未命名灵感'));
    if(r.text)c.appendChild(el('p','',r.text));
    var extra=el('button','rec-btn ok','推进为产品');extra.type='button';
    extra.addEventListener('click',function(){
      if(!window.confirm('把灵感「'+(r.title||'未命名')+'」提升为产品，放入「灵感」阶段？'))return;
      promoteIdea(r.id);
    });
    c.appendChild(recActs('idea',r,extra));
    return c;
  }
  var ideaSrcFilter='';

  /* RICE：设计稿公式 得分 =(R×I×C)/E
     以「千人 Reach」为单位、C 取置信度小数，标定结果落在 0-300 量级（设计稿 TOP1 ≈ 162.0） */
  function riceScore(r){
    var R=Number(r.R)||0,I=Number(r.I)||0,C=Number(r.C)||0,E=Number(r.E)||0;
    if(!R||!I||!C||!E)return null;
    return Math.round((R/1000)*I*(C/100)/E*10)/10;
  }
  function renderTop(){
    var host=$('riceTop');if(!host)return;
    clear(host);
    var items=list('ideas').map(function(r){return {r:r,s:riceScore(r)};})
      .filter(function(x){return x.s!=null;})
      .sort(function(a,b){return b.s-a.s;});
    var tb=document.querySelector('[data-render="riceTable"]');
    if(!items.length){
      if(tb){tb.innerHTML='';}}
    else{
      var top1=items[0],r=top1.r;
      var box=el('div','top-card');
      box.style.cssText='background:var(--surface-low);border-radius:8px;padding:13px;margin-bottom:12px';
      var head=el('div','');head.style.cssText='display:flex;justify-content:space-between;align-items:center';
      var pill=el('span','pill','TOP 1');pill.style.cssText='background:#4f46e5;color:#fff';head.appendChild(pill);
      head.appendChild(el('span','cap',(r.status||'待评')+' · 共 '+items.length+' 项已评估'));
      box.appendChild(head);
      var b=el('b','',r.title||'未命名');b.style.cssText='display:block;font-size:12.5px;margin:9px 0;color:var(--t1)';
      box.appendChild(b);
      var row=el('div','');row.style.cssText='display:flex;align-items:end;justify-content:space-between;gap:10px';
      var left=el('div','');left.appendChild(el('div','cap','综合得分'));
      var sb=el('div','score-big',top1.s.toFixed(1));left.appendChild(sb);row.appendChild(left);
      var promote=el('button','chipbtn solid','一键提升至规划阶段 →');
      promote.style.cssText='background:#4f46e5;color:#fff;border-color:#4f46e5';
      promote.addEventListener('click',function(){promoteIdea(r.id);});
      row.appendChild(promote);
      box.appendChild(row);
      var rice=el('div','RICE g4');rice.style.marginTop='11px';
      [['Reach',r.R?(r.R/1000).toFixed(1):'—','K 人'],['Impact',r.I||'—',' 分'],['Confidence',r.C||'—','%'],['Effort',r.E||'—',' 周']].forEach(function(c){
        var d=el('div','cap');d.textContent=c[0];
        var bv=el('b','mono-val',' '+c[1]);d.appendChild(el('br'));d.appendChild(bv);d.appendChild(document.createTextNode(c[2]));
        rice.appendChild(d);
      });
      box.appendChild(rice);
      box.appendChild(recActs('idea',r));
      host.appendChild(box);
    }
    /* 表格 */
    var treg=tb;
    if(!treg)return;
    clear(treg);
    if(items.length<2){
      if(!items.length)emptyNote(treg);
      return;
    }
    var table=el('table'),thead=el('thead'),thr=el('tr');
    ['提案项名称','覆盖/影响','置信/工期','RICE'].forEach(function(h){thr.appendChild(el('th','',h));});
    thead.appendChild(thr);table.appendChild(thead);
    var tbody=el('tbody');
    for(var i=1;i<items.length;i++){
      (function(x,idx){
        var r=x.r,tr=el('tr');
        tr.style.cursor='pointer';
        tr.appendChild(el('td','','#'+(idx+1)+' '+(r.title||'未命名')));
        tr.appendChild(el('td','mono-val',(r.R?(r.R/1000).toFixed(1)+'K':'—')+' / '+(r.I||'—')));
        tr.appendChild(el('td','mono-val',(r.C||'—')+'% / '+(r.E||'—')+'w'));
        var td=el('td','mono-val',x.s.toFixed(1));td.style.color='#4f46e5';tr.appendChild(td);
        tr.addEventListener('click',function(){openRec('idea',r);});
        tbody.appendChild(tr);
      })(items[i],i);
    }
    table.appendChild(tbody);treg.appendChild(table);
  }
  function promoteIdea(id){
    var r=findRec('idea',id);if(!r)return;
    var p={id:uid(),产品名称:r.title||'未命名',当前阶段:'产品规划',一句话定位:r.text||'',
      优先级:'中',最近更新:today()};
    store.data.products.push(p);
    r.status='已通过';r.updatedAt=Date.now();
    logAdd('把灵感「'+(r.title||'未命名')+'」提升为产品「'+p.产品名称+'」，进入规划阶段');
    store.save();renderAll();switchView('overview');
    toast('已提升为产品，请在看板继续规划');
  }

  function okrPct(r){
    if(r.pct!==''&&r.pct!=null&&isFinite(Number(r.pct))&&Number(r.pct)>0)return Math.min(100,Math.round(Number(r.pct)));
    var c=Number(r.num),t=Number(r.target);
    if(t>0)return Math.min(100,Math.round(c/t*100));
    return 0;
  }
  function renderOKRs(){
    var hosts=hostOf('okrs');if(!hosts.length)return;
    var arr=list('okrs');
    var sum=0;for(var i=0;i<arr.length;i++)sum+=okrPct(arr[i]);
    var avg=$('okrAvg');if(avg)avg.textContent=arr.length?('平均对齐 '+Math.round(sum/arr.length)+'%'):'平均对齐 —';
    for(var h=0;h<hosts.length;h++){
      var host=hosts[h];clear(host);
      if(!arr.length){emptyNote(host);continue;}
      for(var k=0;k<arr.length;k++)(function(r){
        var p=okrPct(r),box=el('div','okr');
        var t=el('div','t');t.appendChild(el('b','',r.title||'未命名目标'));
        var sp=el('span','',p+'% 对齐');t.appendChild(sp);box.appendChild(t);
        var bar=el('div','bar');bar.style.margin='7px 0';
        var fill=el('i');fill.style.width=p+'%';fill.style.background='#4f46e5';bar.appendChild(fill);box.appendChild(bar);
        if(r.desc)box.appendChild(el('p','',r.desc));
        var meta=el('div','meta','当前 '+(r.num!==''&&r.num!=null?r.num:'—')+' · 目标 '+(r.target!==''&&r.target!=null?r.target:'—')+' · 更新于 '+daysAgo(r.updatedAt||r.createdAt));
        box.appendChild(meta);
        box.appendChild(recActs('okr',r));
        host.appendChild(box);
      })(arr[k]);
    }
  }

  function renderDecisions(){
    var host=document.querySelector('[data-render="decisions"]');if(!host)return;
    var arr=list('decisions');
    var open=0;for(var i=0;i<arr.length;i++)if((arr[i].status||'评审中')==='评审中')open++;
    var cnt=$('decisionCount');if(cnt)cnt.textContent=open+' 个评审中';
    clear(host);
    if(!arr.length){emptyNote(host);return;}
    for(var k=0;k<arr.length;k++)(function(r){
      var st=r.status||'评审中';
      var col={'评审中':['#fff3bf','#e67700'],'已批准':['#e6fcf5','#087f5b'],'已否决':['#ffe3e3','#c92a2a']}[st]||['#eef2ff','#4f46e5'];
      var box=el('div','approve');box.style.marginBottom='10px';
      var row1=el('div','row1');
      row1.appendChild(el('b','',r.title||'未命名立项案'));
      var right=el('div','');right.style.cssText='display:flex;gap:8px;align-items:center';
      if(r.rid)right.appendChild(el('span','rid mono',r.rid));
      var pill=el('span','pill',st);pill.style.background=col[0];pill.style.color=col[1];right.appendChild(pill);
      row1.appendChild(right);box.appendChild(row1);
      var sub='';
      if(r.rice)sub+='RICE 得分 '+r.rice+' · ';
      if(r.risk)sub+='技术风险 '+r.risk;
      if(sub)box.appendChild(el('div','cap',sub.replace(/ · $/,'')));
      if(r.note)box.appendChild(el('p','t2',r.note));
      var s3=el('div','stats3');
      [['预估 ARR 增量',r.arr?money(r.arr):'—'],['回本周期',r.cac?r.cac+' 个月':'—'],['RICE',r.rice||'—']].forEach(function(c){
        var st2=el('div','st');st2.appendChild(el('div','k',c[0]));
        var v=el('div','v'+(c[0]==='预估 ARR 增量'?' g':''),String(c[1]));st2.appendChild(v);s3.appendChild(st2);
      });
      box.appendChild(s3);
      var acts=el('div','decision-acts');
      if(st==='评审中'){
        var ok=el('button','chipbtn solid');ok.innerHTML=svgUse('i-check','sm')+'批准立项';ok.type='button';
        ok.addEventListener('click',function(){setDecision(r.id,'已批准');});
        var no=el('button','chipbtn','否决');no.type='button';no.addEventListener('click',function(){setDecision(r.id,'已否决');});
        acts.appendChild(ok);acts.appendChild(no);
      }
      if(st==='已批准'){
        var fr=el('button','chipbtn');fr.innerHTML=svgUse('i-arrow','sm')+'流转至规划阶段';fr.type='button';
        fr.addEventListener('click',function(){flowDecision(r.id);});
        acts.appendChild(fr);
      }
      box.appendChild(acts);
      box.appendChild(recActs('decision',r));
      host.appendChild(box);
    })(arr[k]);
  }
  function flowDecision(id){
    var rec=findRec('decision',id);if(!rec)return;
    var p={id:uid(),产品名称:rec.title||'未命名',当前阶段:'产品规划',一句话定位:rec.note||'',
      优先级:'高',最近更新:today()};
    store.data.products.push(p);
    logAdd('立项案「'+(rec.title||'未命名')+'」流转至产品规划阶段');
    store.save();renderAll();switchView('overview');toast('已生成产品卡片');
  }
  function setDecision(id,st){
    var arr=list('decisions'),r=null;
    for(var i=0;i<arr.length;i++)if(arr[i].id===id){r=arr[i];break;}
    if(!r)return;
    r.status=st;r.updatedAt=Date.now();
    logAdd('立项案「'+(r.title||'未命名')+'」'+st);
    store.save();renderAll();toast('已更新为「'+st+'」');
  }

  function renderWarns(){
    var host=document.querySelector('[data-render="warns"]');if(!host)return;
    var arr=list('warns');clear(host);
    if(!arr.length){emptyNote(host);return;}
    for(var i=0;i<arr.length;i++)(function(r){
      var done=(r.status||'进行中')==='已解决';
      var box=el('div','alertbox'+(done?' done':''));
      if(done){box.style.cssText='background:#f8fafc;border-color:var(--border)';}
      var hd=el('div','hd');
      hd.innerHTML=svgUse(done?'i-check':'i-warn','sm');
      hd.appendChild(document.createTextNode(r.title||'未命名卡点'));
      var tm=el('span','t',(r.level||'一般')+' · '+(r.status||'进行中'));
      hd.appendChild(tm);box.appendChild(hd);
      if(r.text)box.appendChild(el('div','bd',r.text));
      var acts=el('div','actions');
      var tog=el('button','chipbtn',done?'标记未解决':'标记已解决');tog.type='button';
      tog.addEventListener('click',function(){r.status=done?'进行中':'已解决';r.updatedAt=Date.now();store.save();renderAll();});
      acts.appendChild(tog);
      box.appendChild(acts);
      box.appendChild(recActs('warn',r));
      host.appendChild(box);
    })(arr[i]);
  }

  function renderChecks(){
    var themes={pass:['#e6fcf5','#087f5b','i-check'],warn:['#fff3bf','#e67700','i-warn'],block:['#ffe3e3','#c92a2a','i-warn'],todo:['#eef2ff','#4f46e5','i-code'],skip:['var(--canvas)','#94a3b8','i-clock']};
    function themeOf(r){
      if(r.st){
        var s=r.st.toLowerCase();
        if(/pass|✓|done|完成|达标/.test(s))return themes.pass;
        if(/待|warning|warn|pending|进行/.test(s))return themes.warn;
        if(/fail|驳回|block/.test(s)||r.done===false)return themes.block;
      }
      return r.done?themes.pass:themes.todo;
    }
    var hosts=hostOf('checks');
    for(var h=0;h<hosts.length;h++){
      var host=hosts[h];
      var isTask=host.getAttribute('data-name')==='task';
      var arr=list(isTask?'tasks':'checks');
      clear(host);
      if(!arr.length){emptyNote(host);continue;}
      for(var i=0;i<arr.length;i++){
        (function(r){
          var th=themeOf(r),done=!!r.done;
          var row=el('div','check'+(done?' done':''));
          var bx=el('div','bx');
          if(Array.isArray(th)){bx.style.background=th[0];bx.style.color=th[1];bx.innerHTML=svgUse(th[2],'sm');}
          bx.title=done?'点击标记未完成':'点击标记完成';
          bx.addEventListener('click',function(){r.done=!r.done;r.updatedAt=Date.now();store.save();renderAll();});
          row.appendChild(bx);
          var c=el('div','c');c.appendChild(el('b','',r.title||'未命名'));
          if(r.desc)c.appendChild(el('p','',r.desc));
          row.appendChild(c);
          if(r.st){var st=el('span','st',r.st);if(Array.isArray(th)){st.style.background=th[0];st.style.color=th[1];}row.appendChild(st);}
          row.appendChild(recActs(isTask?'task':'check',r));
          host.appendChild(row);
        })(arr[i]);
      }
    }
    /* 统计 */
    var cs=list('checks'),cd=0;for(var q=0;q<cs.length;q++)if(cs[q].done)cd++;
    var cstat=$('checkStat');if(cstat)cstat.textContent=cd+'/'+cs.length+' 完成';
    var ts=list('tasks');
    var tstat=$('taskStat');if(tstat)tstat.textContent=ts.length+' 项推进中';
    renderGate();
  }

  function renderGate(){
    var host=document.querySelector('[data-render="gate"]');
    if(!host)return;
    var items=[];
    list('checks').forEach(function(r){if(r.gate)items.push({r:r,kind:'check'});});
    list('tasks').forEach(function(r){if(r.gate)items.push({r:r,kind:'task'});});
    clear(host);
    var stat=$('gateStat');
    if(!items.length){emptyNote(host);if(stat){stat.textContent='门禁为空';stat.style.background='var(--surface-container)';stat.style.color='var(--primary)';}return;}
    var pass=0;
    for(var i=0;i<items.length;i++){
      (function(it){
        var r=it.r;
        var block=!!(r.st&&/fail|驳回|block/i.test(r.st));
        var warn=!(r.done||/pass|✓|达标/i.test(r.st||''))&&!block;
        var tone=r.done?['#e6fcf5','#087f5b','i-check']:(block?['#ffe3e3','#c92a2a','i-warn']:(warn?['#fff3bf','#e67700','i-warn']:['#e6fcf5','#087f5b','i-check']));
        if(r.done)pass++;
        var row=el('div','check'+(r.done?' done':''));
        var bx=el('div','bx');bx.style.background=tone[0];bx.style.color=tone[1];bx.innerHTML=svgUse(tone[2],'sm');row.appendChild(bx);
        var c=el('div','c');c.appendChild(el('b','',r.title||'未命名'));
        if(r.desc)c.appendChild(el('p','',r.desc));
        row.appendChild(c);
        var label=r.st||(r.done?'PASS':'PENDING');
        var st=el('span','st',label);st.style.background=tone[0];st.style.color=tone[1];row.appendChild(st);
        row.appendChild(recActs(it.kind,r));
        host.appendChild(row);
      })(items[i]);
    }
    if(stat){
      var p=Math.round(pass/items.length*100);
      stat.textContent='就绪 '+p+'%';
      stat.style.background=p>=100?'#e6fcf5':'var(--surface-container)';
      stat.style.color=p>=100?'#087f5b':'var(--primary)';
    }
  }

  function renderMetrics(){
    var hosts=hostOf('metrics');if(!hosts.length)return;
    var arr=list('metrics');
    for(var h=0;h<hosts.length;h++){
      var host=hosts[h];clear(host);
      if(!arr.length){
        var n=el('div','card pad empty-note','还没有增长指标。点上方「新增指标」记录 CAC、留存、转化等关键数。');
        n.style.gridColumn='1/-1';host.appendChild(n);continue;
      }
      for(var i=0;i<arr.length;i++)(function(r){
        var box=el('div','card kpi');
        var top=el('div','top');top.appendChild(el('span','cap',r.title||'指标'));
        box.appendChild(top);
        var big=el('div','big');
        if(r.value){big.appendChild(document.createTextNode(r.value));if(r.unit)big.appendChild(el('small','',r.unit));}
        else big.textContent='—';
        box.appendChild(big);
        var foot=el('div','foot');
        if(r.delta){var dl=el('span','good',r.delta);if(/^-/.test(r.delta)){dl.className='bad';}foot.appendChild(dl);}
        if(r.foot)foot.appendChild(el('span','muted',r.foot));
        box.appendChild(foot);
        box.appendChild(recActs('metric',r));
        host.appendChild(box);
      })(arr[i]);
    }
  }

  function renderChannels(){
    var host=document.querySelector('[data-render="channels"]');if(!host)return;
    var arr=list('channels');clear(host);
    if(!arr.length){emptyNote(host);return;}
    var table=el('table'),thead=el('thead'),thr=el('tr');
    ['获客渠道名称','新增试用','付费转化率','综合 CAC','投资回报 ROI','健康状态'].forEach(function(h){thr.appendChild(el('th','',h));});
    thead.appendChild(thr);table.appendChild(thead);
    var tb=el('tbody');
    for(var i=0;i<arr.length;i++)(function(r){
      var tr=el('tr');
      var td1=el('td','');
      var b=el('b','',r.title||'未命名渠道');b.style.color='var(--t1)';td1.appendChild(b);
      if(r.note){td1.appendChild(el('br'));var sp=el('span','muted',r.note);sp.style.fontSize='9.5px';td1.appendChild(sp);}
      tr.appendChild(td1);
      tr.appendChild(el('td','mono-val',r.trial?String(r.trial):'—'));
      tr.appendChild(el('td','mono-val',r.conv?r.conv+'%':'—'));
      tr.appendChild(el('td','mono-val',r.cac?'¥'+r.cac:'—'));
      var roi=Number(r.roi)||0;
      var tdr=el('td','mono-val',roi?roi+'x ROI':'—');
      tdr.style.color=roi>=4?'#059669':(roi>=3?'#e67700':'#e03131');
      tr.appendChild(tdr);
      var st=el('td','');
      var label=roi>=4?'高价值':(roi>=3?'稳健':'需优化');
      var bg=roi>=4?['#e6fcf5','#087f5b']:(roi>=3?['#fff3bf','#e67700']:['#fff0f6','#c2255c']);
      var pill=el('span','pill',label);pill.style.background=bg[0];pill.style.color=bg[1];st.appendChild(pill);
      st.appendChild(recActs('channel',r));
      tr.appendChild(st);
      tb.appendChild(tr);
    })(arr[i]);
    table.appendChild(tb);host.appendChild(table);
  }

  function renderExperiments(){
    var host=document.querySelector('[data-render="experiments"]');if(!host)return;
    var arr=list('experiments');clear(host);
    if(!arr.length){emptyNote(host);return;}
    for(var i=0;i<arr.length;i++)(function(r){
      var box=el('div','exp');
      var top=el('div','top');
      top.appendChild(el('span','eid mono',r.eid||'EXP'));
      var conf=Number(r.confidence)||0,st=r.status||'进行中';
      var badge;
      if(st==='显著胜出'||conf>=95){badge=el('span','win','✓ 置信度 '+(conf||'—')+'%');}
      else{var bd=el('span','pill','置信度 '+(conf||'—')+'%');bd.style.background='#fff3bf';bd.style.color='#e67700';badge=bd;}
      top.appendChild(badge);box.appendChild(top);
      box.appendChild(el('b','',r.title||'未命名实验'));
      var cs=[r.cs,r.sample?'样本量 '+r.sample:'',conf&&conf<95?'置信度未达 95%，继续观测':'已达收敛'].filter(Boolean).join(' · ');
      if(cs)box.appendChild(el('div','cs',cs));
      if(r.base||r.variant){
        var vars=el('div','vars');
        var va=el('div','var','Base A：'+(r.base||'—'));vars.appendChild(va);
        var vb=el('div','var','Variant B：'+(r.variant||'—'));vb.style.background='#ebfbee';
        var vc=el('span','vc',r.variant||'—');vc.style.color='#059669';vb.textContent='Variant B：';vb.appendChild(vc);
        vars.appendChild(vb);box.appendChild(vars);
      }
      box.appendChild(recActs('experiment',r));
      host.appendChild(box);
    })(arr[i]);
  }

  function renderPlays(){
    var host=document.querySelector('[data-render="plays"]');if(!host)return;
    var arr=list('plays');clear(host);
    if(!arr.length){emptyNote(host);return;}
    for(var i=0;i<arr.length;i++)(function(r){
      var wrap=el('div','');
      wrap.style.marginBottom='12px';
      var box=el('div','adapt');
      var prob=el('div','prob');
      var tag=el('span','pill tag',(r.status||'待采纳')+(r.owner?' · '+r.owner:''));
      prob.appendChild(tag);
      prob.appendChild(el('b','',r.title||'未命名问题'));
      if(r.prob)prob.appendChild(el('p','',r.prob));
      box.appendChild(prob);
      var ar=el('div','arrow');ar.innerHTML=svgUse('i-arrow','lg');box.appendChild(ar);
      var sol=el('div','solution');
      var s2=el('span','pill tag','对策');sol.appendChild(s2);
      sol.appendChild(el('b','',r.sol?r.sol.slice(0,40):'待补充对策'));
      if(r.sol)sol.appendChild(el('p','',r.sol));
      var meta=el('div','meta','更新于 '+daysAgo(r.updatedAt||r.createdAt));
      sol.appendChild(meta);
      box.appendChild(sol);
      wrap.appendChild(box);
      wrap.appendChild(recActs('play',r));
      host.appendChild(wrap);
    })(arr[i]);
  }

  function renderHealth(){
    var host=$('healthList');if(!host)return;
    clear(host);
    var arr=all();
    if(!arr.length){emptyNote(host);return;}
    for(var i=0;i<arr.length&&i<6;i++)(function(r){
      var si=stageInfo(r.当前阶段||'灵感'),idx=stageIndex(r.当前阶段||'灵感');
      var pr={'高':15,'中':8,'低':3}[r.优先级]||5;
      var h=Math.min(100,10+idx*10+pr);
      var row=el('div','hrow');
      var l=el('div','l');l.appendChild(el('b','',r.产品名称||'未命名'));
      var sp=el('span',h+'%');sp.className=h>=80?'good':(h>=50?'':'bad');sp.style.fontFamily='var(--mono)';
      if(h<50){sp.style.color='#e67700';}
      l.appendChild(sp);row.appendChild(l);
      var d=(r.当前阶段||'灵感')+' · 优先级 '+(r.优先级||'—')+(r.最近更新?' · 更新于 '+r.最近更新:'');
      row.appendChild(el('div','d',d));
      var bar=el('div','bar');bar.style.margin='0';
      var fill=el('i');fill.style.width=h+'%';fill.style.background=si.c;bar.appendChild(fill);row.appendChild(bar);
      host.appendChild(row);
    })(arr[i]);
  }

  /* total log count is shown on the compact summary card in the overview */
  function auditKind(rec){
    if(rec&&rec.kind)return rec.kind;
    var s=txt(rec&&rec.text);
    if(/主题|模式|名字|设置/.test(s))return '设置';
    if(/SOP|知识|生成/.test(s))return '知识';
    if(/阶段|推进/.test(s))return '阶段';
    if(/产品/.test(s))return '产品';
    return '其他';
  }
  var AUDIT_TONE={'产品':['#e2dfff','#4f46e5'],'阶段':['#dce9ff','#0284c7'],'设置':['#f1f5f9','#475569'],'知识':['#e6fcf5','#087f5b'],'其他':['#f1f5f9','#475569']};
  function logTime(ts){
    if(!ts)return '—';
    var d=new Date(ts);
    if(isNaN(d.getTime()))return '—';
    return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
  }
  function renderLog(){
    var host=$('logList');if(!host)return;
    clear(host);
    var arr=store.data.log.slice(0,3);
    var cnt=$('logCount');if(cnt)cnt.textContent=store.data.log.length;
    if(!arr.length){emptyNote(host);return;}
    for(var i=0;i<arr.length;i++)(function(rec){
      var row=el('div','tl-item');
      var av=el('div','av',initialOf(rec.name));av.style.background=avatarColor(rec.name);row.appendChild(av);
      var c=el('div','c');c.appendChild(el('b','',rec.name||'我'));
      var p=el('p','',rec.text);c.appendChild(p);row.appendChild(c);
      row.appendChild(el('div','tm',daysAgo(rec.at)));
      host.appendChild(row);
    })(arr[i]);
  }

  /* ==================== audit secondary page ==================== */
  var auditQuery='',auditKindFilter='',auditLimit=30;
  function renderAudit(){
    var host=$('auditList');if(!host)return;
    clear(host);
    var q=auditQuery.toLowerCase().trim();
    var all=store.data.log.filter(function(r){
      if(auditKindFilter&&auditKind(r)!==auditKindFilter)return false;
      if(!q)return true;
      return (txt(r.name)+' '+txt(r.text)).toLowerCase().indexOf(q)>=0;
    });
    var shown=all.slice(0,auditLimit);
    var more=$('auditMore');if(more)more.style.display=all.length>shown.length?'':'none';
    if(!shown.length){host.appendChild(el('div','audit-empty','没有匹配的日志。换个关键词或筛选条件试试。'));return;}
    var day='';
    for(var i=0;i<shown.length;i++)(function(rec){
      var d=rec.at?new Date(rec.at):null;
      var key=d&&!isNaN(d.getTime())?(d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)):'未知时间';
      if(key!==day){
        day=key;
        var label=key==='未知时间'?key:(daysAgo(rec.at)+' · '+key);
        host.appendChild(el('div','audit-day',label));
      }
      var row=el('div','audit-item');
      var k=auditKind(rec),tone=AUDIT_TONE[k]||AUDIT_TONE['其他'];
      var badge=el('div','ak',k.slice(0,1));badge.style.background=tone[0];badge.style.color=tone[1];row.appendChild(badge);
      var mid=el('div','');
      mid.appendChild(el('b','',(rec.name||'我')+' · '+k));
      mid.appendChild(el('p','',rec.text));
      row.appendChild(mid);
      row.appendChild(el('div','at',logTime(rec.at)));
      host.appendChild(row);
    })(shown[i]);
  }
  function bindAudit(){
    if(bindAudit.done)return;
    bindAudit.done=true;
    var open=function(){auditQuery='';auditKindFilter='';auditLimit=30;renderAudit();switchView('audit');};
    if($('auditOpen'))$('auditOpen').addEventListener('click',open);
    if($('auditOpen2'))$('auditOpen2').addEventListener('click',open);
    if($('auditBack'))$('auditBack').addEventListener('click',function(){switchView('overview');});
    var inp=$('auditSearch');
    if(inp&&!inp.__bound){
      inp.__bound=true;
      inp.addEventListener('input',function(){auditQuery=inp.value;auditLimit=30;renderAudit();});
    }
    var tabs=$('auditTabs');
    if(tabs&&!tabs.__bound){
      tabs.__bound=true;
      var kinds=['全部','产品','阶段','设置','知识','其他'];
      var html='';
      for(var i=0;i<kinds.length;i++)html+='<button data-kind="'+(i===0?'':kinds[i])+'"'+(i===0?' class="on"':'')+'>'+kinds[i]+'</button>';
      tabs.innerHTML=html;
      tabs.addEventListener('click',function(e){
        var b=e.target;
        while(b&&b!==tabs&&b.tagName!=='BUTTON')b=b.parentNode;
        if(!b||b===tabs)return;
        auditKindFilter=b.getAttribute('data-kind')||'';
        var bs=tabs.querySelectorAll('button');for(var j=0;j<bs.length;j++)bs[j].classList.toggle('on',bs[j]===b);
        auditLimit=30;renderAudit();
      });
    }
    if($('auditMore'))$('auditMore').addEventListener('click',function(){auditLimit+=30;renderAudit();});
    if($('auditExport'))$('auditExport').addEventListener('click',function(){
      try{
        var blob=new Blob([JSON.stringify(store.data.log,null,2)],{type:'application/json'});
        var a=document.createElement('a');a.href=URL.createObjectURL(blob);
        a.download='product-forge-audit-'+today()+'.json';
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
        toast('日志已导出');
      }catch(e){toast('导出失败');}
    });
  }

  function renderWelcome(){
    var t=$('welcomeTitle'),s=$('welcomeSub');
    if(!t)return;
    if(store.data.contents['welcomeTitle'])t.textContent=store.data.contents['welcomeTitle'];
    if(store.data.contents['welcomeSub'])s.textContent=store.data.contents['welcomeSub'];
    var name=store.data.contents['meName']||'我';
    var n=$('meName');if(n&&store.data.contents['meName'])n.textContent=name;
    var av=$('meAvatar');
    if(av&&!av.isContentEditable){
      av.textContent=initialOf(name);
      av.style.background=avatarColor(name);
    }
    var sa=$('setAvatar');
    if(sa){sa.textContent=initialOf(name);sa.style.background=avatarColor(name);}
    var sn=$('setName');
    if(sn&&document.activeElement!==sn&&store.data.contents['meName'])sn.value=name;
  }

  function renderProductsSide(){
    var host=$('prodList');if(!host)return;
    clear(host);
    var arr=all();
    if(!arr.length){host.appendChild(el('div','side-empty','暂无产品'));return;}
    var dv=$('view-detail');
    var inDetail=!!(dv&&dv.classList.contains('active'));  // 仅在详情页显示选中高亮
    for(var i=0;i<arr.length&&i<8;i++)(function(r){
      var d=el('div','prod-item'+((inDetail&&detailId&&r.id===detailId)?' sel':''));
      var dot=el('span','dot');dot.style.background=stageInfo(r.当前阶段||'灵感').c;d.appendChild(dot);
      d.appendChild(document.createTextNode(r.产品名称||'未命名'));
      d.addEventListener('click',function(){openDetail(r);});
      host.appendChild(d);
    })(arr[i]);
  }

  function renderKPIs(){
    var arr=all();
    var kt=$('kpiTotal');
    if(kt){clear(kt);kt.appendChild(document.createTextNode(arr.length));kt.appendChild(el('small','',' 个主线产品'));}
    var active=0,byStage={};
    for(var i=0;i<arr.length;i++){
      var s=arr[i].当前阶段||'灵感';byStage[s]=(byStage[s]||0)+1;
      if(stageIndex(s)<7)active++;
    }
    var a=$('kpiActive');if(a)a.textContent=active+' 个孵化中';
    var open=0;list('decisions').forEach(function(r){if((r.status||'评审中')==='评审中')open++;});
    var kd=$('kpiDecision');if(kd){clear(kd);kd.appendChild(document.createTextNode(open));kd.appendChild(el('small','','项待决断'));}
    var kds=$('kpiDecisionSub');if(kds)kds.textContent=open?'需 48h 内响应':'无待签批立项';
    var cs=list('checks');var done=0;for(var q=0;q<cs.length;q++)if(cs[q].done)done++;
    var p=pct(done,cs.length);
    var ks=$('kpiSprint');if(ks)ks.textContent=p+'%';
    var kb=$('kpiSprintBar');if(kb)kb.style.width=p+'%';
    var ksub=$('kpiSprintSub');if(ksub)ksub.textContent=done+'/'+cs.length+' Task';
    var mrr=0;list('metrics').forEach(function(r){var v=Number(txt(r.value).replace(/[^\d.]/g,''));if(isFinite(v)&&/MRR|ARR|收入/i.test(txt(r.title)))mrr+=v;});
    var km=$('kpiMrr');
    if(km){clear(km);
      if(mrr){km.appendChild(document.createTextNode(money(mrr)));}
      else{
        var nch=list('channels').length;
        km.appendChild(document.createTextNode(nch?nch+' 渠道':money(0)));
        km.appendChild(el('small','',nch?' 已录入':'MRR / ARR'));
      }
    }
    var kg=$('kpiGrowth');
    if(kg){var ds=list('metrics').filter(function(r){return r.delta;});kg.textContent=ds.length?ds[0].delta:'暂无数据';}
    var kr=$('kpiRetention');
    if(kr){var ex=list('experiments').filter(function(r){return Number(r.confidence)>=95;});kr.textContent=ex.length?ex.length+' 项实验显著':'实验数 0';}
    renderHealth();renderLog();
  }

  /* ==================== 知识库 & SOP ==================== */
  var KB_LEVEL_TONE={'已掌握':['#e6fcf5','#087f5b'],'基本掌握':['#eef2ff','#4f46e5'],'待验证':['#fff3bf','#e67700'],'不熟':['#f1f5f9','#64748b']};
  var KB_CAT_TONE={'踩坑记录':['#ffe3e3','#c92a2a'],'方法总结':['#e2dfff','#4f46e5'],'工具手册':['#ecfeff','#0891b2'],'流程规范':['#e6fcf5','#087f5b'],'参考资料':['#f1f5f9','#475569'],'其他':['#f1f5f9','#475569']};
  var kbFilter='';

  function parseSteps(t){
    return txt(t).split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
  }
  function kbTags(r){
    return txt(r.tags).split(/[,，、\s]+/).map(function(x){return x.trim();}).filter(Boolean);
  }

  function renderKbStats(){
    var items=list('kb'),sops=list('sops');
    var mastered=0;for(var i=0;i<items.length;i++)if(items[i].level==='已掌握')mastered++;
    var ste=0;for(var j=0;j<sops.length;j++)ste+=parseSteps(sops[j].steps).length;
    var t=$('kbTotal');if(t)t.textContent=items.length;
    var m=$('kbMastered');if(m)m.textContent=mastered+' 条已掌握';
    var st=$('sopTotal');if(st)st.textContent=sops.length;
    var ss=$('sopSteps');if(ss)ss.textContent=ste+' 个步骤';
    /* 最近更新 */
    var all=items.concat(sops).filter(function(r){return r.updatedAt||r.createdAt;});
    all.sort(function(a,b){return (b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt);});
    var rec=$('kbRecent'),recN=$('kbRecentName');
    if(rec)rec.textContent=all.length?daysAgo(all[0].updatedAt||all[0].createdAt):'—';
    if(recN)recN.textContent=all.length?(all[0].title||'未命名'):'暂无内容';
    /* 高频使用 */
    var used=items.filter(function(r){return (r.uses||0)>0;}).sort(function(a,b){return (b.uses||0)-(a.uses||0);});
    var tu=$('kbTopUsed'),tuN=$('kbTopUsedName');
    if(tu)tu.textContent=used.length?String(used[0].uses):'—';
    if(tuN)tuN.textContent=used.length?(used[0].title||'未命名'):'还没有使用记录';
    /* 分类 tab */
    var tabs=$('kbTabs');
    if(tabs){
      var cats=[],seen={};
      for(var k=0;k<items.length;k++){var c=items[k].cat||'其他';if(!seen[c]){seen[c]=1;cats.push(c);}}
      var html='<button class="'+(kbFilter?'':'on')+'" data-cat="">全部 ('+items.length+')</button>';
      for(var q=0;q<cats.length;q++){
        var n=0;for(var w=0;w<items.length;w++)if((items[w].cat||'其他')===cats[q])n++;
        html+='<button class="'+(kbFilter===cats[q]?'on':'')+'" data-cat="'+esc(cats[q])+'">'+esc(cats[q])+' ('+n+')</button>';
      }
      tabs.innerHTML=html;
    }
  }

  function setNum(id,val){var e=$(id);if(e)e.textContent=val;}
  function pct(a,b){return (b>0?Math.round(a/b*100):0)+'%';}
  function renderHubStats(){
    /* Skill Hub */
    var sk=list('skills');
    setNum('skillTotal',sk.length);
    var ready=0,analysis=0;
    for(var i=0;i<sk.length;i++){
      if(sk[i].level==='可复用')ready++;
      if(sk[i].cat==='分析技能')analysis++;
    }
    setNum('skillReusable',ready+' 个可复用');
    setNum('skillReady',ready);
    setNum('skillWip',sk.length-ready);
    setNum('skillAnalysis',analysis);
    setNum('skillAnalysisPct',pct(analysis,sk.length));
    /* Agent Hub */
    var ag=list('agents');
    setNum('agentTotal',ag.length);
    var aReady=0,aPlan=0,aProd=0;
    for(var j=0;j<ag.length;j++){
      var st=txt(ag[j].status);
      if(st==='可用')aReady++;
      if(st==='规划中')aPlan++;
      if(ag[j].cat==='产品')aProd++;
    }
    setNum('agentReady',aReady);
    setNum('agentPlanned',aPlan);
    setNum('agentProduct',aProd);
    setNum('agentProductPct',pct(aProd,ag.length));
    /* Rule Hub */
    var ru=list('rules');
    setNum('ruleTotal',ru.length);
    var rActive=0,rHard=0,rHigh=0;
    for(var k=0;k<ru.length;k++){
      if(ru[k].status==='生效中')rActive++;
      if(ru[k].cat==='硬约束'||ru[k].cat==='安全边界')rHard++;
      if(ru[k].priority==='高')rHigh++;
    }
    setNum('ruleActive',rActive);
    setNum('ruleHard',rHard);
    setNum('ruleHigh',rHigh);
    setNum('ruleHighPct',pct(rHigh,ru.length));
    /* SOP */
    var so=list('sops'),steps=0,sDev=0,sOps=0;
    for(var m=0;m<so.length;m++){
      steps+=parseSteps(so[m].steps).length;
      var c=txt(so[m].cat);
      if(c==='研发交付'||c==='发布上线'||c==='质量验收')sDev++;
      if(c==='运营增长')sOps++;
    }
    setNum('sopFlowTotal',so.length);
    setNum('sopStepTotal',steps);
    setNum('sopDev',sDev);
    setNum('sopOps',sOps);
  }

  function renderKb(){
    var host=document.querySelector('[data-render="kb"]');if(!host)return;
    renderKbStats();
    var items=list('kb').slice();
    var q=txt(kbQuery).toLowerCase().trim();
    var filtered=items.filter(function(r){
      if(kbFilter&&(r.cat||'其他')!==kbFilter)return false;
      if(!q)return true;
      var hay=(txt(r.title)+' '+txt(r.body)+' '+txt(r.tags)+' '+txt(r.cat)).toLowerCase();
      return hay.indexOf(q)>=0;
    });
    /* 已掌握靠前，其次按更新时间 */
    filtered.sort(function(a,b){
      var la=a.level==='已掌握'?0:1,lb=b.level==='已掌握'?0:1;
      if(la!==lb)return la-lb;
      return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);
    });
    clear(host);
    if(!filtered.length){emptyNote(host);return;}
    for(var i=0;i<filtered.length;i++)(function(r){
      var card=el('div','kb-card');
      var head=el('div','kb-head');
      head.appendChild(el('b','',r.title||'未命名'));
      var lv=r.level||'待验证',tone=KB_LEVEL_TONE[lv]||KB_LEVEL_TONE['待验证'];
      var pill=el('span','pill',lv);pill.style.background=tone[0];pill.style.color=tone[1];
      pill.style.cursor='pointer';pill.title='点击切换掌握程度';
      pill.addEventListener('click',function(){
        var order=['待验证','基本掌握','已掌握','不熟'],ix=order.indexOf(r.level);r.level=order[(ix+1)%order.length];
        r.updatedAt=Date.now();store.save();renderAll();toast('已标记为「'+r.level+'」');
      });
      head.appendChild(pill);
      card.appendChild(head);
      var meta=el('div','kb-meta');
      var ct=KB_CAT_TONE[r.cat||'其他']||KB_CAT_TONE['其他'];
      var cp=el('span','pill',r.cat||'其他');cp.style.background=ct[0];cp.style.color=ct[1];meta.appendChild(cp);
      var tags=kbTags(r);
      if(tags.length){
        var tw=el('div','kb-tags');
        for(var g=0;g<tags.length;g++)tw.appendChild(el('span','kb-tag',tags[g]));
        meta.appendChild(tw);
      }
      meta.appendChild(el('span','mono muted',(r.uses||0)+' 次使用'));
      meta.appendChild(el('span','muted',daysAgo(r.updatedAt||r.createdAt)));
      card.appendChild(meta);
      if(r.body){
        var body=el('p','kb-body',r.body);
        if((r.body||'').length>110){
          var box=el('details');
          box.appendChild(el('summary','','展开全文 ▾'));
          box.appendChild(body);
          box.addEventListener('toggle',function(){
            var sm=box.querySelector('summary');
            if(sm)sm.textContent=box.open?'收起 ▴':'展开全文 ▾';
          });
          card.appendChild(box);
        }else{
          card.appendChild(body);
        }
      }
      var acts=el('div','rec-acts');
      var use=el('button','rec-btn ok','+1 使用');use.type='button';
      use.addEventListener('click',function(){r.uses=(r.uses||0)+1;r.updatedAt=Date.now();store.save();renderAll();toast('已记一次使用');});
      acts.appendChild(use);
      acts.appendChild(recActs('kb',r));
      card.appendChild(acts);
      host.appendChild(card);
    })(filtered[i]);
  }

  function renderSops(){
    var host=document.querySelector('[data-render="sops"]');if(!host)return;
    var items=list('sops').slice().sort(function(a,b){return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
    clear(host);
    if(!items.length){emptyNote(host);return;}
    for(var i=0;i<items.length;i++)(function(r){
      var box=el('div','sop');
      var head=el('div','sop-head');
      head.appendChild(el('b','',r.title||'未命名流程'));
      var right=el('div','');
      right.style.cssText='display:flex;gap:7px;align-items:center';
      if(r.cat){var ct=KB_CAT_TONE[r.cat]||['#eef2ff','#4f46e5'];var p=el('span','pill',r.cat);p.style.background=ct[0];p.style.color=ct[1];right.appendChild(p);}
      head.appendChild(right);
      box.appendChild(head);
      var meta=[];
      if(r.owner)meta.push('负责人 '+r.owner);
      if(r.trigger)meta.push('触发：'+r.trigger);
      var steps=parseSteps(r.steps);
      meta.push(steps.length+' 个步骤');
      box.appendChild(el('div','sop-meta',meta.join(' · ')));
      if(steps.length){
        var ul=el('ul','steps');
        for(var k=0;k<steps.length;k++){
          var li=el('li','');
          var m=steps[k].match(/^(.{1,24}?)[：:]\s*(.+)$/);
          if(m){li.appendChild(el('span','sn',m[1]));li.appendChild(el('span','sd',m[2]));}
          else li.appendChild(el('span','sn',steps[k]));
          ul.appendChild(li);
        }
        box.appendChild(ul);
      }
      box.appendChild(recActs('sop',r));
      host.appendChild(box);
    })(items[i]);
  }

  function renderHub(type){
    var key=storeKey(type),host=document.querySelector('[data-render="'+key+'"]');if(!host)return;
    var items=list(type).slice().sort(function(a,b){return (b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0);});
    clear(host);
    if(!items.length){emptyNote(host);return;}
    for(var i=0;i<items.length;i++)(function(r){
      var box=el('div','kb-card');
      var head=el('div','kb-head');
      head.appendChild(el('b','',r.title||'未命名'));
      var status=r.status||r.level||r.priority||'';
      if(status){
        var sp=el('span','pill',status);
        sp.style.background='var(--primary-fixed)';sp.style.color='var(--primary)';
        head.appendChild(sp);
      }
      box.appendChild(head);
      var meta=el('div','kb-meta');
      if(r.cat){
        var tone=KB_CAT_TONE[r.cat]||['#eef2ff','#4f46e5'];
        var cp=el('span','pill',r.cat);cp.style.background=tone[0];cp.style.color=tone[1];meta.appendChild(cp);
      }
      if(r.model)meta.appendChild(el('span','muted','模型 '+r.model));
      if(r.trigger)meta.appendChild(el('span','muted','触发 '+r.trigger));
      if(r.scope)meta.appendChild(el('span','muted','范围 '+r.scope));
      var tags=kbTags(r);
      if(tags.length){
        var tw=el('div','kb-tags');
        for(var g=0;g<tags.length;g++)tw.appendChild(el('span','kb-tag',tags[g]));
        meta.appendChild(tw);
      }
      meta.appendChild(el('span','muted',daysAgo(r.updatedAt||r.createdAt)));
      box.appendChild(meta);
      var body=r.body||r.desc||'';
      if(body)box.appendChild(el('p','kb-body',body));
      if(type==='rule'){
        var drive=ruleDrive(r);
        if(drive){
          var dv=el('div','rule-drive'+(drive==='未启用'?' off':''));
          dv.appendChild(el('i',''));
          dv.appendChild(el('span','',drive));
          box.appendChild(dv);
        }
      }
      var extra=null;
      if(type==='agent'){
        var rb=el('button','rec-btn run-btn','运行');
        rb.type='button';
        rb.innerHTML='<svg class="ic"><use href="#i-play"/></svg>运行';
        rb.addEventListener('click',function(){openRunner(r);});
        extra=rb;
      }
      box.appendChild(recActs(type,r,extra));
      host.appendChild(box);
    })(items[i]);
  }

  var kbQuery='';
  function bindKbSearch(){
    var inp=$('kbSearch');
    if(inp&&!inp.__bound){
      inp.__bound=true;
      inp.addEventListener('input',function(){kbQuery=inp.value;renderKb();});
    }
  }
  function bindKbTabs(){
    var tabs=$('kbTabs');
    if(tabs&&!tabs.__bound){
      tabs.__bound=true;
      tabs.addEventListener('click',function(e){
        var t=e.target;
        while(t&&t!==tabs&&t.tagName!=='BUTTON')t=t.parentNode;
        if(!t||t===tabs||!t.hasAttribute('data-cat'))return;
        kbFilter=t.getAttribute('data-cat')||'';renderKb();
      });
    }
  }

  /* ==================== AI: knowledge / SOP generation ==================== */
  var aiItems=[];
  function aiOpen(anchor){
    var preset=(anchor&&anchor.getAttribute)?anchor.getAttribute('data-ai-gen'):'';
    var defaults={kb:['aiKb'],sop:['aiSop'],skill:['aiSkill'],agent:['aiAgent'],rule:['aiRule']};
    var checks=['aiKb','aiSop','aiSkill','aiAgent','aiRule'];
    var pick=preset&&defaults[preset]?defaults[preset]:['aiKb','aiSop'];
    for(var i=0;i<checks.length;i++){
      var cb=$(checks[i]);if(cb)cb.checked=pick.indexOf(checks[i])>=0;
    }
    syncAiKinds();
    var sel=$('aiProduct');
    if(sel){
      clear(sel);
      var opt0=el('option','','选择产品');opt0.value='';sel.appendChild(opt0);
      var ps=store.data.products||[];
      for(var i=0;i<ps.length;i++){
        var o=el('option','',ps[i].产品名称||'未命名');o.value=ps[i].id||'';sel.appendChild(o);
      }
      var checked=document.querySelector('input[name="aiScope"]:checked');
      sel.disabled=!checked||checked.value!=='product';
    }
    syncAiKinds();
    aiItems=[];
    var pv=$('aiPreview');if(pv)pv.innerHTML='<div class="ai-empty">点击「生成预览」查看 AI 建议。</div>';
    var st=$('aiStatus');if(st)st.textContent='基于当前工作台数据生成草案，结果可勾选后写入。';
    var cm=$('aiCommit');if(cm)cm.disabled=true;
    showMask('aiMask');
  }
  function syncAiKinds(){
    var pairs=[['aiKb','aiKbCard'],['aiSop','aiSopCard'],['aiSkill','aiSkillCard'],['aiAgent','aiAgentCard'],['aiRule','aiRuleCard']];
    for(var i=0;i<pairs.length;i++){
      var cb=$(pairs[i][0]),card=$(pairs[i][1]);
      if(cb&&card)card.classList.toggle('on',cb.checked);
    }
  }
  var AI_LABEL={kb:'知识',sop:'SOP',skill:'Skill',agent:'Agent',rule:'Rule'};
  var AI_VIEW={kb:'kb',sop:'sop',skill:'skill',agent:'agent',rule:'rule'};
  function renderAiPreview(){
    var host=$('aiPreview');if(!host)return;
    clear(host);
    if(!aiItems.length){host.appendChild(el('div','ai-empty','没有新的建议，可能已有同类内容。先补充一些产品、卡点或实验数据再试。'));return;}
    for(var i=0;i<aiItems.length;i++)(function(item,idx){
      var row=el('label','ai-pitem');
      var cb=el('input');cb.type='checkbox';cb.checked=true;cb.addEventListener('change',updateAiCommit);row.appendChild(cb);
      var body=el('div','pb');
      var top=el('div','pt');
      top.appendChild(el('b','',txt(item.data&&item.data.title)||'未命名'));
      top.appendChild(el('span','tagline',AI_LABEL[item.type]||'建议'));
      body.appendChild(top);
      body.appendChild(el('div','src',txt(item.source)||'智能归纳'));
      var d=item.type==='sop'?txt(item.data&&item.data.steps):txt(item.data&&item.data.body);
      if(!d&&item.type==='rule')d=(txt(item.data&&item.data.scope)||'')+' · '+(txt(item.data&&item.data.body)||'');
      if(!d&&item.type==='agent')d=(txt(item.data&&item.data.trigger)||'')+' · '+(txt(item.data&&item.data.body)||'');
      body.appendChild(el('div','pd',d.slice(0,260)+(d.length>260?' …':'')));
      row.appendChild(body);
      host.appendChild(row);
    })(aiItems[i],i);
  }
  function updateAiCommit(){
    var host=$('aiPreview');var cm=$('aiCommit');if(!cm||!host)return;
    var boxes=host.querySelectorAll('input[type="checkbox"]'),n=0;
    for(var i=0;i<boxes.length;i++)if(boxes[i].checked)n++;
    cm.disabled=!n;cm.textContent=n?('写入工作台 ('+n+')'):'写入工作台';
  }
  function aiPreview(){
    var btn=$('aiPreviewBtn'),st=$('aiStatus');
    if(btn)btn.disabled=true;
    if(st)st.textContent='正在读取工作台数据并归纳…';
    var radio=document.querySelector('input[name="aiScope"]:checked');
    var scope=radio?radio.value:'all';
    var pid=scope==='product'&&$('aiProduct')?$('aiProduct').value:'';
    if(scope==='product'&&!pid){
      if(btn)btn.disabled=false;
      if(st)st.textContent='请先在右侧选择一个产品。';
      toast('请先选择产品');return;
    }
    var kinds={kb:$('aiKb')?$('aiKb').checked:false,sop:$('aiSop')?$('aiSop').checked:false,
      skill:$('aiSkill')?$('aiSkill').checked:false,agent:$('aiAgent')?$('aiAgent').checked:false,
      rule:$('aiRule')?$('aiRule').checked:false};
    var any=false;for(var kt in kinds)if(kinds[kt])any=true;
    if(!any){
      if(btn)btn.disabled=false;
      if(st)st.textContent='至少选择一种生成内容。';return;
    }
    fetch('/api/ai/generate',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({scope:scope,productId:pid,kinds:kinds})
    }).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(res){
        aiItems=(res.items||[]).filter(function(it){return it&&AI_LABEL[it.type]&&it.data;});
        renderAiPreview();updateAiCommit();
        if(st)st.textContent=(res.mode==='llm'?'大模型生成':'本地智能归纳')+' · '+aiItems.length+' 条建议，勾选后写入。';
      })
      .catch(function(err){
        aiItems=[];renderAiPreview();updateAiCommit();
        if(st)st.textContent='生成失败：'+err.message+'（请确认本地服务已启动）';
      })
      .then(function(){if(btn)btn.disabled=false;});
  }
  function aiCommit(){
    var host=$('aiPreview');if(!host)return;
    var boxes=host.querySelectorAll('input[type="checkbox"]');
    var chosen=[];
    for(var i=0;i<boxes.length;i++)if(boxes[i].checked&&aiItems[i])chosen.push(aiItems[i]);
    if(!chosen.length){toast('请至少勾选一条');return;}
    var counts={kb:0,sop:0,skill:0,agent:0,rule:0},firstType='';
    for(var j=0;j<chosen.length;j++)(function(it){
      var rec=it.data;
      rec.id=uid();rec.createdAt=Date.now();rec.updatedAt=Date.now();
      var key=it.type==='sop'?'sops':it.type==='kb'?'kb':it.type==='skill'?'skills':it.type==='agent'?'agents':'rules';
      if(store.data[key]&&store.data[key].push){store.data[key].unshift(rec);counts[it.type]++;}
      if(!firstType)firstType=it.type;
    })(chosen[j]);
    var parts=[];
    if(counts.kb)parts.push(counts.kb+' 条知识');
    if(counts.sop)parts.push(counts.sop+' 个 SOP');
    if(counts.skill)parts.push(counts.skill+' 个 Skill');
    if(counts.agent)parts.push(counts.agent+' 个 Agent');
    if(counts.rule)parts.push(counts.rule+' 条 Rule');
    var summary=parts.join(' / ');
    logAdd('AI 自动生成并写入 '+summary,'知识');
    store.save();hideMask('aiMask');renderAll();switchView(AI_VIEW[firstType]||'kb');
    toast('已写入 '+summary);
  }
  function bindAi(){
    if(bindAi.done)return;
    bindAi.done=true;
    var aiBtns=document.querySelectorAll('[data-ai-gen]');
    for(var b=0;b<aiBtns.length;b++)aiBtns[b].addEventListener('click',function(){aiOpen(this);});
    if($('aiClose'))$('aiClose').addEventListener('click',function(){hideMask('aiMask');});
    if($('aiCancel'))$('aiCancel').addEventListener('click',function(){hideMask('aiMask');});
    var mask=$('aiMask');
    if(mask)mask.addEventListener('click',function(e){if(e.target===mask)hideMask('aiMask');});
    if($('aiPreviewBtn'))$('aiPreviewBtn').addEventListener('click',aiPreview);
    if($('aiCommit'))$('aiCommit').addEventListener('click',aiCommit);
    if($('aiKb'))$('aiKb').addEventListener('change',syncAiKinds);
    if($('aiSop'))$('aiSop').addEventListener('change',syncAiKinds);
    if($('aiSkill'))$('aiSkill').addEventListener('change',syncAiKinds);
    if($('aiAgent'))$('aiAgent').addEventListener('change',syncAiKinds);
    if($('aiRule'))$('aiRule').addEventListener('change',syncAiKinds);
    if($('rblkClose'))$('rblkClose').addEventListener('click',function(){hideMask('ruleBlockMask');});
    if($('rblkOk'))$('rblkOk').addEventListener('click',function(){hideMask('ruleBlockMask');});
    var rbm=$('ruleBlockMask');if(rbm)rbm.addEventListener('click',function(e){if(e.target===rbm)hideMask('ruleBlockMask');});
    var radios=document.querySelectorAll('input[name="aiScope"]');
    for(var i=0;i<radios.length;i++)radios[i].addEventListener('change',function(){
      var sel=$('aiProduct');if(sel)sel.disabled=this.value!=='product';
    });
  }

  /* ==================== L3: Agent Runner (dual backend) ====================
     默认 WorkBuddy 桥接：生成结构化执行简报，复制到 WorkBuddy 真正推理。
     预留服务端模型：填 key 后调 /api/agent/run 走 DeepSeek 等模型。 */
  var runAgent=null, runMode='workbuddy', aiEngineStatus=null;

  function openRunner(agent){
    runAgent=agent||{};
    runMode='workbuddy';
    var t=$('runAgentTitle');if(t)t.textContent=txt(runAgent.title)||'智能体';
    var m=$('runAgentMeta');if(m)m.textContent=[txt(runAgent.cat)||'通用场景',txt(runAgent.trigger)||'手动调用'].join(' · ');
    var task=$('runTask');if(task)task.value='';
    var out=$('runBrief');if(out)out.value='';
    var res=$('runResult');if(res){res.value='';res.classList.remove('show');}
    var hint=$('wbHint');if(hint)hint.className='run-msg info show';
    var nokey=$('mdNoKey');if(nokey)nokey.className='run-msg warn';
    // 产品下拉
    var sel=$('runProduct');
    if(sel){clear(sel);var o0=el('option','','选择产品');o0.value='';sel.appendChild(o0);
      var ps=store.data.products||[];for(var i=0;i<ps.length;i++){var o=el('option','',ps[i].产品名称||'未命名');o.value=ps[i].id||'';sel.appendChild(o);}sel.disabled=true;}
    var radios=document.querySelectorAll('input[name="runScope"]');for(var r=0;r<radios.length;r++)if(radios[r].value==='all')radios[r].checked=true;
    // 面板与按钮（初始隐藏复制/下载，生成简报后再显示）
    wbModeUI();
    if($('runCopy'))$('runCopy').style.display='none';
    if($('runDownload'))$('runDownload').style.display='none';
    showMask('runMask');
    loadAiStatus(function(){syncRunnerChips();});
  }
  function wbModeUI(){
    var w=$('runPaneWorkbuddy'),mo=$('runPaneModel');
    if(w)w.style.display='';if(mo)mo.style.display='none';
    var btns=document.querySelectorAll('#runMode button');for(var i=0;i<btns.length;i++)btns[i].classList.toggle('on',btns[i].getAttribute('data-mode')==='workbuddy');
    if($('runGo'))$('runGo').innerHTML='<svg class="ic sm"><use href="#i-spark"/></svg>生成执行简报';
    if($('runCopy'))$('runCopy').style.display='';
    if($('runDownload'))$('runDownload').style.display='';
    if($('runSaveKb'))$('runSaveKb').style.display='none';
  }
  function modelModeUI(){
    var w=$('runPaneWorkbuddy'),mo=$('runPaneModel');
    if(w)w.style.display='none';if(mo)mo.style.display='';
    var btns=document.querySelectorAll('#runMode button');for(var i=0;i<btns.length;i++)btns[i].classList.toggle('on',btns[i].getAttribute('data-mode')==='model');
    if($('runGo'))$('runGo').innerHTML='<svg class="ic sm"><use href="#i-cpu"/></svg>开始推理';
    if($('runCopy'))$('runCopy').style.display='none';
    if($('runDownload'))$('runDownload').style.display='none';
    var nokey=$('mdNoKey');
    if(nokey)nokey.className='run-msg '+((aiEngineStatus&&aiEngineStatus.configured)?'ok':'warn')+' show';
    if(nokey)nokey.textContent=(aiEngineStatus&&aiEngineStatus.configured)
      ?('服务端模型已连接：'+(aiEngineStatus.provider||'')+' · '+(aiEngineStatus.model||'')+'。点「开始推理」即可执行。')
      :'尚未配置模型密钥。请到「设置 → AI 引擎」填入 API Key；在此之前可用 WorkBuddy 原生执行。';
  }
  function syncRunnerChips(){
    var ok=!!(aiEngineStatus&&aiEngineStatus.configured);
    var mc=$('mdChip');if(mc){mc.textContent=ok?'已连接':'未配置';mc.className='rec-chip'+(ok?'':' off');}
    var wc=$('wbChip');if(wc){wc.textContent='无需配置';wc.className='rec-chip';}
  }
  function runScopeInfo(){
    var radio=document.querySelector('input[name="runScope"]:checked');
    var scope=radio?radio.value:'all';
    var pid=scope==='product'&&$('runProduct')?$('runProduct').value:'';
    if(scope==='product'&&!pid)return null;
    return {scope:scope,pid:pid};
  }
  function dataSnapshot(scope,pid){
    var d=store.data;
    function pick(k){return (d[k]||[]).slice(0,20);}
    var snap={
      '活跃产品':(d.products||[]).map(function(p){return p.产品名称+'（'+(p.当前阶段||'')+'）'+(p.一句话定位?'：'+p.一句话定位:'');}),
      '灵感':pick('ideas'),'战略决策':pick('decisions'),'风险卡点':pick('warns'),
      '走查与攻坚':pick('checks'),'上线门禁':pick('gate'),'核心指标':pick('metrics'),
      '增长实验':pick('experiments'),'策略打法':pick('plays'),
      '最近审计日志':(d.log||[]).slice(0,10).map(function(l){return (l.text||'')+(l.name?'（'+l.name+'）':'');})
    };
    if(pid){var p=find(pid);if(p)snap['本次聚焦产品']=p;}
    var lines=[];
    for(var k in snap){
      if(!snap[k]||!snap[k].length)continue;
      lines.push('【'+k+'】');
      var v=snap[k];
      for(var i=0;i<v.length;i++){
        var item=v[i];
        if(typeof item==='string')lines.push('- '+item);
        else lines.push('- '+JSON.stringify(item));
      }
    }
    return lines.join('\n')||'（工作台暂无数据，请在页面中先补充内容）';
  }
  function buildBrief(){
    var task=($('runTask')?$('runTask').value:'').trim();
    if(!task){toast('请先填写本次任务');return '';}
    var info=runScopeInfo();
    if(!info){toast('请选择一个产品');return '';}
    var name=txt(runAgent.title)||'智能体';
    var rules=(store.data.rules||[]).filter(function(r){return r.status==='生效中';}).map(function(r){return '- '+txt(r.title)+'：'+txt(r.body||r.scope||'');}).join('\n')||'（暂无生效中的规则）';
    var skills=(store.data.skills||[]).map(function(s){return '- '+txt(s.title)+(s.body?'：'+txt(s.body):'');}).join('\n')||'（暂无已登记技能）';
    var out=[];
    out.push('# 任务：请扮演「'+name+'」执行以下工作');
    out.push('');
    out.push('你现在扮演我产品工厂里的智能体「'+name+'」，请严格按下面的角色设定与边界完成任务。');
    out.push('');
    out.push('## 一、你的角色设定');
    out.push('- 场景：'+(txt(runAgent.cat)||'通用'));
    out.push('- 触发方式：'+(txt(runAgent.trigger)||'手动调用'));
    out.push('- 职责与边界：');
    out.push((txt(runAgent.body)||'依据工作台数据完成任务').split('\n').map(function(s){return '  '+s;}).join('\n'));
    out.push('');
    out.push('## 二、必须遵守的规则（Rule Hub 生效中）');
    out.push(rules);
    out.push('');
    out.push('## 三、可调用的技能（Skill Hub）');
    out.push(skills);
    out.push('');
    out.push('## 四、工作台数据快照（数据范围：'+(info.scope==='product'?'指定产品':'全工作台')+'）');
    out.push(dataSnapshot(info.scope,info.pid));
    out.push('');
    out.push('## 五、本次任务');
    out.push(task);
    out.push('');
    out.push('## 六、输出要求');
    out.push('请给出：1) 明确结论；2) 判断依据（引用上面的具体数据）；3) 下一步动作清单（含负责人建议）；4) 风险与例外提示。数据缺失处写“待补充”，不要编造。');
    return out.join('\n');
  }
  function runGo(){
    if(runMode==='workbuddy'){
      var brief=buildBrief();if(!brief)return;
      var out=$('runBrief');if(out)out.value=brief;
      if($('runCopy'))$('runCopy').style.display='';
      if($('runDownload'))$('runDownload').style.display='';
      var h=$('wbHint');if(h){h.textContent='已生成 '+brief.length+' 字的执行简报。点「复制简报」粘贴到 WorkBuddy 对话即可执行。';h.className='run-msg ok show';}
      logAdd('为 Agent「'+(txt(runAgent.title)||'智能体')+'」生成 WorkBuddy 执行简报','知识');store.save();
      toast('执行简报已生成');
    }else{
      var task=($('runTask')?$('runTask').value:'').trim();if(!task){toast('请先填写本次任务');return;}
      var info=runScopeInfo();if(!info){toast('请选择一个产品');return;}
      if(!(aiEngineStatus&&aiEngineStatus.configured)){toast('请先到「设置 → AI 引擎」配置 API Key');return;}
      var btn=$('runGo');if(btn)btn.disabled=true;
      var res=$('runResult');if(res){res.classList.remove('show');res.textContent='正在调用 '+(aiEngineStatus.model||'模型')+' 推理，请稍候…';res.classList.add('show');}
      fetch('/api/agent/run',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({agent:runAgent,task:task,scope:info.scope,productId:info.pid})})
        .then(function(r){return r.json();})
        .then(function(data){
          if(!res)return;
          if(data.mode==='llm'){
            res.textContent=data.result||'（模型未返回内容）';res.classList.add('show');
            if($('runSaveKb'))$('runSaveKb').style.display='';
            logAdd('Agent「'+(txt(runAgent.title)||'智能体')+'」经服务端模型「'+(data.model||'')+'」完成推理','知识');store.save();
          }else{
            res.textContent=data.message||data.error||'推理失败';res.classList.add('show');
            if($('runSaveKb'))$('runSaveKb').style.display='none';
          }
        })
        .catch(function(err){if(res){res.textContent='调用失败：'+err.message+'（请确认本地服务已启动）';res.classList.add('show');}})
        .then(function(){if(btn)btn.disabled=false;});
    }
  }
  function saveRunToKb(){
    var res=$('runResult');var body=res?res.textContent:'';
    if(!body){toast('暂无推理结果');return;}
    store.data.kb.unshift({id:uid(),title:(txt(runAgent.title)||'智能体')+' · 推理结论',cat:'方法总结',level:'待验证',
      tags:(txt(runAgent.cat)||'')+',Agent推理',body:body,createdAt:Date.now(),updatedAt:Date.now()});
    logAdd('将 Agent「'+(txt(runAgent.title)||'智能体')+'」的推理结论写入知识库','知识');
    store.save();hideMask('runMask');renderAll();switchView('kb');toast('已写入知识库（待验证）');
  }
  function copyBrief(){
    var out=$('runBrief');if(!out||!out.value){toast('请先生成简报');return;}
    var text=out.value;
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast('简报已复制，粘贴到 WorkBuddy 即可');},function(){fallbackCopy(out);});}
    else fallbackCopy(out);
  }
  function fallbackCopy(out){try{out.select();document.execCommand('copy');toast('简报已复制，粘贴到 WorkBuddy 即可');}catch(e){toast('复制失败，请手动选中复制');}}
  function downloadBrief(){
    var out=$('runBrief');if(!out||!out.value){toast('请先生成简报');return;}
    var blob=new Blob([out.value],{type:'text/markdown;charset=utf-8'});
    var url=URL.createObjectURL(blob);var a=document.createElement('a');
    a.href=url;a.download=(txt(runAgent.title)||'agent')+'-执行简报.md';document.body.appendChild(a);a.click();
    document.body.removeChild(a);URL.revokeObjectURL(url);toast('简报已下载');
  }

  /* ---- AI engine config (ai_config.json, key never in data.json) ---- */
  var aiPresetMeta={};
  function loadAiStatus(cb){
    if(!apiReady){aiEngineStatus={configured:false,provider:'deepseek',baseUrl:'',model:'',presets:{}};syncEngineUI();if(cb)cb();return;}
    fetch('/api/agent/status').then(function(r){return r.json();}).then(function(s){
      aiEngineStatus=s;aiPresetMeta=s.presets||{};syncEngineUI();if(cb)cb();
    }).catch(function(){if(cb)cb();});
  }
  function syncEngineUI(){
    var s=aiEngineStatus;if(!s)return;
    var ok=!!s.configured;
    var ico=$('engIco'),title=$('engTitle'),desc=$('engDesc');
    if(ico)ico.className='es-ico'+(ok?'':' off');
    if(title)title.textContent=ok?'服务端模型推理已就绪 · '+(s.model||''):'当前：WorkBuddy 原生执行（无需配置）';
    if(desc)desc.textContent=ok
      ?('密钥已保存'+(s.envKey?'（来自环境变量）':'')+' · '+(s.baseUrl||'')+' · '+((s.keyMasked)||'')+'。Agent 可直接真推理。')
      :'在 Agent Hub 点「运行」→ 生成简报 → 粘贴到 WorkBuddy 即可真执行。要切换为工作台自跑模型，在下面填 API Key。';
    var provider=s.provider||'deepseek';
    var ps=document.querySelectorAll('#engPreset button');for(var i=0;i<ps.length;i++)ps[i].classList.toggle('on',ps[i].getAttribute('data-provider')===provider);
    if($('engBaseUrl'))$('engBaseUrl').value=s.baseUrl||'';
    if($('engModel'))$('engModel').value=s.model||'';
    if($('engKey'))$('engKey').value='';
    syncRunnerChips();
  }
  function applyPreset(p){
    var meta=aiPresetMeta[p]||{};
    if($('engBaseUrl'))$('engBaseUrl').value=meta.baseUrl||'';
    if($('engModel'))$('engModel').value=meta.model||'';
    var ps=document.querySelectorAll('#engPreset button');for(var i=0;i<ps.length;i++)ps[i].classList.toggle('on',ps[i].getAttribute('data-provider')===p);
  }
  function saveEngine(){
    if(!apiReady){toast('请先启动本地服务再配置模型');return;}
    var provider='deepseek',ps=document.querySelectorAll('#engPreset button');
    for(var i=0;i<ps.length;i++)if(ps[i].classList.contains('on'))provider=ps[i].getAttribute('data-provider');
    var payload={provider:provider,baseUrl:($('engBaseUrl')?$('engBaseUrl').value:'').trim(),
      model:($('engModel')?$('engModel').value:'').trim(),apiKey:($('engKey')?$('engKey').value:'').trim()};
    var btn=$('engSave');if(btn)btn.disabled=true;
    fetch('/api/agent/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json();}).then(function(res){
        if(!res.ok)throw new Error(res.error||'保存失败');
        aiEngineStatus=res.status;syncEngineUI();
        if($('engKey'))$('engKey').value='';
        var tip=$('engTip');if(tip)tip.textContent='已保存到 ai_config.json（仅本机）';
        toast('AI 引擎配置已保存');logAdd('保存 AI 引擎配置（'+(res.status.configured?'已连接':'未配置密钥')+'）','设置');store.save();
      }).catch(function(err){toast('保存失败：'+err.message);})
      .then(function(){if(btn)btn.disabled=false;});
  }
  function testEngine(){
    if(!(aiEngineStatus&&aiEngineStatus.configured)){toast('请先填入并保存 API Key');return;}
    var btn=$('engTest');if(btn)btn.disabled=true;
    var tip=$('engTip');if(tip)tip.textContent='正在测试连接…';
    fetch('/api/agent/run',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({agent:{title:'连接测试',cat:'系统',trigger:'手动',body:'仅返回一句“连接正常”'},task:'请只回复：连接正常',scope:'all'})})
      .then(function(r){return r.json();}).then(function(res){
        if(tip)tip.textContent=(res.mode==='llm')?('连接成功 · '+(res.model||'')+' · '+txt(res.result).slice(0,40)):('连接未通过：'+(res.message||res.error||''));
        toast(res.mode==='llm'?'连接成功':'连接未通过');
      }).catch(function(err){if(tip)tip.textContent='测试失败：'+err.message;})
      .then(function(){if(btn)btn.disabled=false;});
  }
  function bindRunner(){
    if(bindRunner.done)return;bindRunner.done=true;
    if($('runClose'))$('runClose').addEventListener('click',function(){hideMask('runMask');});
    if($('runCancel'))$('runCancel').addEventListener('click',function(){hideMask('runMask');});
    var rm=$('runMask');if(rm)rm.addEventListener('click',function(e){if(e.target===rm)hideMask('runMask');});
    var mb=document.querySelectorAll('#runMode button');for(var i=0;i<mb.length;i++){
      (function(b){b.addEventListener('click',function(){runMode=b.getAttribute('data-mode');if(runMode==='workbuddy')wbModeUI();else modelModeUI();});})(mb[i]);
    }
    var rs=document.querySelectorAll('input[name="runScope"]');for(var j=0;j<rs.length;j++){
      (function(radio){radio.addEventListener('change',function(){var sel=$('runProduct');if(sel)sel.disabled=radio.value!=='product';});})(rs[j]);
    }
    if($('runGo'))$('runGo').addEventListener('click',runGo);
    if($('runCopy'))$('runCopy').addEventListener('click',copyBrief);
    if($('runDownload'))$('runDownload').addEventListener('click',downloadBrief);
    if($('runSaveKb'))$('runSaveKb').addEventListener('click',saveRunToKb);
    var ps=document.querySelectorAll('#engPreset button');for(var p=0;p<ps.length;p++){
      (function(b){b.addEventListener('click',function(){applyPreset(b.getAttribute('data-provider'));});})(ps[p]);
    }
    if($('engSave'))$('engSave').addEventListener('click',saveEngine);
    if($('engTest'))$('engTest').addEventListener('click',testEngine);
    loadAiStatus();
  }

  function renderSettings(){
    var m=$('setStorageMode');if(m)m.textContent=apiReady?'本地服务 data.json':'浏览器本地存储';
    var c=$('setStatCounts');
    if(c)c.textContent=(store.data.products||[]).length+' / '+(store.data.ideas||[]).length+' / '+(store.data.kb||[]).length;
    var u=$('setUpdated');
    if(u){
      var ts=store.data.updatedAt;
      u.textContent=ts?new Date(ts).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'尚未保存';
    }
    var bs=document.querySelectorAll('.theme-opt');
    for(var i=0;i<bs.length;i++)bs[i].classList.toggle('on',bs[i].getAttribute('data-theme')===currentTheme());
  }

  function renderAll(){
    renderCards();
    renderKPIs();
    renderIdeas();
    renderOKRs();
    renderDecisions();
    renderWarns();
    renderChecks();
    renderMetrics();
    renderChannels();
    renderExperiments();
    renderPlays();
    renderKb();
    renderSops();
    renderHubStats();
    renderHub('skill');
    renderHub('agent');
    renderHub('rule');
    renderAudit();
    bindKbSearch();
    bindKbTabs();
    bindAudit();
    bindAi();
    renderProductsSide();
    renderSettings();
  }

  /* ==================== global search page ==================== */
  var SEARCH_SOURCES=[
    {key:'products',label:'产品',icon:'i-kanban',view:'overview'},
    {key:'ideas',label:'灵感',icon:'i-bulb',view:'strategy'},
    {key:'okrs',label:'OKR',icon:'i-flag',view:'strategy'},
    {key:'decisions',label:'战略决策',icon:'i-balance',view:'strategy'},
    {key:'warns',label:'风险卡点',icon:'i-warn',view:'strategy'},
    {key:'checks',label:'走查与攻坚',icon:'i-checkdoc',view:'delivery'},
    {key:'gate',label:'上线门禁',icon:'i-shield',view:'delivery'},
    {key:'metrics',label:'核心指标',icon:'i-chart',view:'growth'},
    {key:'channels',label:'渠道',icon:'i-hub',view:'growth'},
    {key:'experiments',label:'A/B 实验',icon:'i-flask',view:'growth'},
    {key:'plays',label:'运营复盘',icon:'i-rocket',view:'growth'},
    {key:'kb',label:'知识条目',icon:'i-book',view:'kb'},
    {key:'sops',label:'SOP 流程',icon:'i-route',view:'sop'},
    {key:'skills',label:'Skill Hub',icon:'i-spark',view:'skill'},
    {key:'agents',label:'Agent Hub',icon:'i-hub',view:'agent'},
    {key:'rules',label:'Rule Hub',icon:'i-shield',view:'rule'},
    {key:'log',label:'审计日志',icon:'i-clock',view:'audit'}
  ];
  function recentSearches(){return (store.data.settings&&store.data.settings.recentSearches)||[];}
  function recText(r){
    if(r==null)return '';
    if(typeof r!=='object')return String(r);
    var out=[];
    for(var k in r){
      if(!Object.prototype.hasOwnProperty.call(r,k))continue;
      if(k==='id'||k==='at'||k==='updatedAt')continue;
      var v=r[k];
      if(typeof v==='string'||typeof v==='number')out.push(String(v));
      else if(Array.isArray(v))for(var i=0;i<v.length;i++)out.push(recText(v[i]));
    }
    return out.join(' ');
  }
  function recTitle(r,label){
    var keys=['产品名称','标题','名称','title','name','text','问题','内容','目标'];
    for(var i=0;i<keys.length;i++){
      var v=r&&r[keys[i]];
      if(v!=null&&String(v).trim())return String(v).trim().slice(0,90);
    }
    return label+'记录';
  }
  function renderRecent(){
    var host=$('recentList'),empty=$('recentEmpty');if(!host)return;
    clear(host);
    var arr=recentSearches();
    if(empty)empty.style.display=arr.length?'none':'';
    for(var i=0;i<arr.length;i++){
      (function(q){
        var b=el('button','recent-chip');b.type='button';
        b.innerHTML=svgUse('i-clock')+'<span></span>';
        b.querySelector('span').textContent=q;
        b.addEventListener('click',function(){var inp=$('searchInput');if(inp)inp.value=q;runSearch(q);});
        host.appendChild(b);
      })(arr[i]);
    }
  }
  function renderResults(q){
    var box=$('resultBlock'),host=$('searchResults'),count=$('searchCount');
    if(!box||!host)return;
    clear(host);
    var needle=String(q||'').trim().toLowerCase();
    if(!needle){box.style.display='none';return;}
    box.style.display='';
    var found=[];
    for(var s=0;s<SEARCH_SOURCES.length&&found.length<40;s++){
      var src=SEARCH_SOURCES[s],arr=store.data[src.key]||[];
      for(var i=0;i<arr.length&&found.length<40;i++){
        if(recText(arr[i]).toLowerCase().indexOf(needle)>=0)found.push({src:src,row:arr[i]});
      }
    }
    if(count)count.textContent=found.length+' 条';
    if(!found.length){host.appendChild(el('div','search-empty','没有找到与「'+q+'」相关的内容，换个关键词试试。'));return;}
    var groups={},order=[];
    for(var j=0;j<found.length;j++){
      var key=found[j].src.key;
      if(!groups[key]){groups[key]=[];order.push(key);}
      groups[key].push(found[j]);
    }
    for(var g=0;g<order.length;g++){
      var src2=null;
      for(var k2=0;k2<SEARCH_SOURCES.length;k2++)if(SEARCH_SOURCES[k2].key===order[g])src2=SEARCH_SOURCES[k2];
      if(!src2)continue;
      var wrap=el('div','search-group');
      wrap.appendChild(el('div','gt',src2.label));
      for(var m=0;m<groups[order[g]].length;m++){
        (function(item){
          var row=el('div','search-result');
          var ico=el('span');ico.innerHTML=svgUse(item.src.icon);
          row.appendChild(ico);
          var rb=el('div','rb');
          rb.appendChild(el('b','',recTitle(item.row,item.src.label)));
          rb.appendChild(el('p','',recText(item.row).slice(0,160)||'—'));
          row.appendChild(rb);
          row.appendChild(el('span','go','查看 ›'));
          row.addEventListener('click',function(){
            if(item.src.key==='products')openDetail(item.row);
            else switchView(item.src.view);
          });
          wrap.appendChild(row);
        })(groups[order[g]][m]);
      }
      host.appendChild(wrap);
    }
  }
  function runSearch(q){
    q=String(q||'').trim();
    if(!q){toast('请输入关键词');return;}
    searchQ=q;
    var inp=$('searchInput');if(inp)inp.value=q;
    var arr=recentSearches(),next=[];
    for(var i=0;i<arr.length;i++){
      if(String(arr[i]).toLowerCase()!==q.toLowerCase()&&next.indexOf(arr[i])<0)next.push(arr[i]);
    }
    next.unshift(q);
    if(next.length>8)next.length=8;
    if(!store.data.settings||typeof store.data.settings!=='object')store.data.settings={};
    store.data.settings.recentSearches=next;
    store.save();
    renderRecent();
    renderResults(q);
  }
  function openSearch(){
    switchView('search');
    renderRecent();
    var inp=$('searchInput');
    if(inp){if(searchQ)renderResults(searchQ);inp.focus();}
  }

  /* ==================== bindings ==================== */
  $('form').addEventListener('submit',function(e){e.preventDefault();saveProduct();});
  $('newBtn').addEventListener('click',openNew);
  $('createCardBtn').addEventListener('click',openNew);
  $('closeBtn').addEventListener('click',function(){hideMask('mask');});
  $('cancelBtn').addEventListener('click',function(){hideMask('mask');});
  $('mask').addEventListener('click',function(e){if(e.target===$('mask'))hideMask('mask');});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){hideMask('mask');hideMask('rmask');hideMask('aiMask');}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch();}
  });
  $('form').addEventListener('input',cacheDraft);$('form').addEventListener('change',cacheDraft);
  if($('deleteBtn'))$('deleteBtn').addEventListener('click',deleteCurrent);

  /* detail page bindings */
  if($('detailBack'))$('detailBack').addEventListener('click',function(){switchView('overview');});
  if($('detailEdit'))$('detailEdit').addEventListener('click',function(){
    var r=find(detailId);if(!r){toast('产品不存在');return;}
    openEdit(r);
  });
  if($('detailDelete'))$('detailDelete').addEventListener('click',function(){
    var r=find(detailId);if(!r)return;
    if(!window.confirm('确定要删除产品「'+r.产品名称+'」吗？此操作不可撤销。'))return;
    var a=store.data.products,idx=-1;
    for(var i=0;i<a.length;i++)if(a[i].id===detailId){idx=i;break;}
    if(idx>=0){logAdd('删除了产品「'+a[idx].产品名称+'」');a.splice(idx,1);}
    store.save();renderAll();switchView('overview');toast('已删除产品');
  });

  /* record modal bindings */
  $('rform').addEventListener('submit',function(e){e.preventDefault();saveRec();});
  $('rCloseBtn').addEventListener('click',closeRec);
  $('rCancelBtn').addEventListener('click',closeRec);
  $('rmask').addEventListener('click',function(e){if(e.target===$('rmask'))closeRec();});
  $('rDeleteBtn').addEventListener('click',function(){if(rId)deleteRec(rType,rId);closeRec();});

  /* 各视图的「新增」按钮 */
  var addBtns=document.querySelectorAll('[data-add]');
  for(var ab=0;ab<addBtns.length;ab++){
    (function(b){b.addEventListener('click',function(){var k=b.getAttribute('data-add');if(R[k])openRec(k,null);});})(addBtns[ab]);
  }
  /* 灵感来源筛选 */
  var tabs=$('ideaTabs');
  if(tabs)tabs.addEventListener('click',function(e){
    var b=e.target;
    while(b&&b!==tabs&&!(b.tagName==='BUTTON'))b=b.parentNode;
    if(!b||b===tabs||!b.hasAttribute||!b.hasAttribute('data-src'))return;
    ideaSrcFilter=b.getAttribute('data-src');renderIdeas();
  });
  /* 帮助 */
  var helpBtn=$('helpBtn');
  if(helpBtn)helpBtn.addEventListener('click',function(){openSettings('help');});

  /* ---- search page ---- */
  var searchBtn=$('searchBtn');
  if(searchBtn)searchBtn.addEventListener('click',openSearch);
  var searchGo=$('searchGo');
  if(searchGo)searchGo.addEventListener('click',function(){var inp=$('searchInput');runSearch(inp?inp.value:'');});
  var searchInput=$('searchInput');
  if(searchInput)searchInput.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();runSearch(searchInput.value);}});
  var recentClear=$('recentClear');
  if(recentClear)recentClear.addEventListener('click',function(){
    store.data.settings.recentSearches=[];
    store.save();renderRecent();toast('搜索记录已清空');
  });

  /* ---- backup / restore / reset ---- */
  function exportData(){
    try{
      var blob=new Blob([JSON.stringify(store.data,null,2)],{type:'application/json'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download='product-forge-backup-'+today()+'.json';
      document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(function(){URL.revokeObjectURL(a.href);},1000);
      toast('备份已导出');
    }catch(e){toast('导出失败');}
  }
  function importData(file){
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var d=JSON.parse(reader.result);
        if(!d||d.version!==1||!Array.isArray(d.products)||typeof d.contents!=='object')throw new Error('bad format');
        if(!window.confirm('导入将用备份内容覆盖当前所有数据，确定继续吗？'))return;
        store.data=migrate(d);
        store.save();
        toast('导入成功，正在刷新…');
        setTimeout(function(){location.reload();},600);
      }catch(e){toast('文件格式不正确，导入失败');}
    };
    reader.onerror=function(){toast('读取文件失败');};
    reader.readAsText(file);
  }
  function resetAll(){
    if(!window.confirm('确定要清空全部数据吗？所有产品卡片、灵感、OKR 与已填写内容都会被清除且不可恢复，建议先导出备份。'))return;
    try{localStorage.removeItem(DRAFT);}catch(e){}
    store.data={version:1,updatedAt:'',settings:{theme:(document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'),recentSearches:[]},contents:{},products:[],ideas:[],okrs:[],decisions:[],warns:[],checks:[],tasks:[],gate:[],metrics:[],channels:[],experiments:[],plays:[],kb:[],sops:[],log:[],skills:[],agents:[],rules:[]};
    store.save();
    toast('已重置，正在刷新…');setTimeout(function(){location.reload();},600);
  }
  if($('exportBtn'))$('exportBtn').addEventListener('click',exportData);
  if($('importBtn'))$('importBtn').addEventListener('click',function(){$('importFile').click();});
  if($('importFile'))$('importFile').addEventListener('change',function(e){var f=e.target.files[0];if(f)importData(f);e.target.value='';});
  if($('resetBtn'))$('resetBtn').addEventListener('click',resetAll);

  /* ==================== boot ==================== */
  store.load(function(){
    if(typeof window!=='undefined')window.__pfStore=store;  // 调试用：控制台可查看当前数据
    renderSelects();
    applyTheme(store.data.settings.theme||currentTheme(),false);   // 以 data.json 中的主题为准
    initEditable();
    scrubResidualText();
    renderWelcome();
    renderAll();                                            // 最后渲染，保证受控区域显示真实数据
    bindRunner();                                           // L3 Agent 执行器 + AI 引擎配置
    // 多标签页同步：聚焦时立即同步 + 定时静默同步，让陈旧页面自动追上服务端最新数据
    window.addEventListener('focus',function(){syncFromServer(true);});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)syncFromServer(true);});
    setInterval(function(){syncFromServer(true);},5000);
    if(typeof window!=='undefined')window.__pfReady=true;
  });
})();