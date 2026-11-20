(function(){
  'use strict';

  /* ==================== constants ==================== */
  var KEY='pf_workbench_v3';
  var VIEWS={overview:'主工厂流水线',strategy:'灵感与战略',delivery:'产研交付台',growth:'增长与调优',knowledge:'知识库与 SOP'};
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

  /* ==================== local persistent store ==================== */
  var saveTimer=null;
  var store={
    data:null,
    load:function(){
      var raw=null;try{raw=localStorage.getItem(KEY);}catch(e){}
      if(raw){
        try{
          var d=JSON.parse(raw);
          if(d&&d.version===1&&d.products&&d.contents){this.data=migrate(d);return;}
        }catch(e){}
      }
      this.data={version:1,updatedAt:'',contents:{},products:[],ideas:[],okrs:[],decisions:[],warns:[],checks:[],tasks:[],gate:[],metrics:[],channels:[],experiments:[],plays:[],kb:[],sops:[],log:[]};
      this.save();
    },
    save:function(){
      this.data.updatedAt=new Date().toISOString();
      try{localStorage.setItem(KEY,JSON.stringify(this.data));markSaved();}
      catch(e){toast('保存失败：浏览器存储空间可能已满');}
    },
    schedule:function(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){store.save();},350);}
  };
  var LISTS=['ideas','okrs','decisions','warns','checks','tasks','gate','metrics','channels','experiments','plays','kb','sops','log','products'];
  function migrate(d){
    for(var i=0;i<LISTS.length;i++)if(!Array.isArray(d[LISTS[i]]))d[LISTS[i]]=[];
    return d;
  }
  /* 记录类型 → 存储键（idea→ideas，check→checks） */
  var KEYS={'products':'products','log':'log','ideas':'ideas','okrs':'okrs','decisions':'decisions',
    'warns':'warns','checks':'checks','tasks':'tasks','metrics':'metrics','channels':'channels',
    'experiments':'experiments','plays':'plays',
    'idea':'ideas','okr':'okrs','decision':'decisions','warn':'warns','check':'checks','task':'tasks',
    'metric':'metrics','channel':'channels','experiment':'experiments','play':'plays','kb':'kb','sop':'sops'};
  function storeKey(k){return KEYS[k]||String(k).replace(/s$/,'')+'s';}
  function list(k){
    var v=store.data[storeKey(k)];
    if(!Array.isArray(v)){v=[];store.data[storeKey(k)]=v;}
    return v;
  }
  function markSaved(){
    var s=$('saveState');if(!s)return;
    var d=new Date();
    s.textContent='已保存 '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
    s.style.color='#059669';
  }

  /* ==================== audit log ==================== */
  function logAdd(text){
    store.data.log.unshift({id:uid(),name:who(),text:text,at:Date.now()});
    if(store.data.log.length>200)store.data.log.length=200;
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
  var SKIP_IDS={board:1,ribbon:1,toast:1,mask:1,editbar:1,rmask:1,prodList:1,logList:1,healthList:1};
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
      if(cl.indexOf('nav-')>=0||cl.indexOf('pcard')>=0||cl.indexOf('stagechips')>=0||cl.indexOf('tabs')>=0||cl.indexOf('modal')>=0)return true;
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
        if(cl.indexOf('nav-')>=0||a.hasAttribute('data-render')||cl.indexOf('modal')>=0){hard=true;break;}
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

  function filtered(){
    var a=all();if(!searchQ)return a;
    var q=searchQ.toLowerCase();
    return a.filter(function(r){
      var fields=['产品名称','一句话定位','当前阶段'];
      for(var i=0;i<fields.length;i++)if(txt(r[fields[i]]).toLowerCase().indexOf(q)>=0)return true;
      return false;
    });
  }

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
    (function(r){c.addEventListener('click',function(e){if(e.target.tagName==='SELECT')return;openEdit(r);});})(row);
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
      for(var k in p)if(Object.prototype.hasOwnProperty.call(p,k))r[k]=p[k];
      logAdd('更新了产品「'+p.产品名称+'」'+(from!==p.当前阶段?' · 阶段从「'+from+'」移至「'+p.当前阶段+'」':''));
    }else{
      p.id=uid();store.data.products.push(p);
      logAdd('新建产品「'+p.产品名称+'」，当前阶段「'+p.当前阶段+'」');
    }
    clearDraft();store.save();hideMask('mask');$('form').reset();renderAll();
    toast(editingId?'已保存修改':'已创建产品');
  }
  function moveStage(id,val){
    var r=find(id);if(!r)return;
    var from=r.当前阶段;if(from===val)return;
    r.当前阶段=val;r.最近更新=today();
    logAdd('将「'+r.产品名称+'」从「'+from+'」推进至「'+val+'」');
    store.save();renderAll();toast('已移至「'+val+'」');
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

  function renderLog(){
    var host=$('logList');if(!host)return;
    clear(host);
    var arr=store.data.log.slice(0,15);
    var cnt=$('logCount');if(cnt)cnt.textContent=store.data.log.length+' 条记录';
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

  function renderWelcome(){
    var t=$('welcomeTitle'),s=$('welcomeSub');
    if(!t)return;
    if(store.data.contents['welcomeTitle'])t.textContent=store.data.contents['welcomeTitle'];
    if(store.data.contents['welcomeSub'])s.textContent=store.data.contents['welcomeSub'];
    var n=$('meName');if(n&&store.data.contents['meName'])n.textContent=store.data.contents['meName'];
    var av=$('meAvatar');
    if(av&&!av.isContentEditable){av.textContent=initialOf(store.data.contents['meName']||'我');}
  }

  function renderProductsSide(){
    var host=$('prodList');if(!host)return;
    clear(host);
    var arr=all();
    if(!arr.length){host.appendChild(el('div','side-empty','暂无产品'));return;}
    for(var i=0;i<arr.length&&i<8;i++)(function(r){
      var d=el('div','prod-item'+(i===0?' sel':''));
      var dot=el('span','dot');dot.style.background=stageInfo(r.当前阶段||'灵感').c;d.appendChild(dot);
      d.appendChild(document.createTextNode(r.产品名称||'未命名'));
      d.addEventListener('click',function(){openEdit(r);});
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
    bindKbSearch();
    bindKbTabs();
    renderProductsSide();
  }

  /* ==================== bindings ==================== */
  $('form').addEventListener('submit',function(e){e.preventDefault();saveProduct();});
  $('newBtn').addEventListener('click',openNew);
  $('createCardBtn').addEventListener('click',openNew);
  $('closeBtn').addEventListener('click',function(){hideMask('mask');});
  $('cancelBtn').addEventListener('click',function(){hideMask('mask');});
  $('mask').addEventListener('click',function(e){if(e.target===$('mask'))hideMask('mask');});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){hideMask('mask');hideMask('rmask');}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();var s=$('topSearch');if(s)s.focus();}
  });
  $('form').addEventListener('input',cacheDraft);$('form').addEventListener('change',cacheDraft);
  if($('deleteBtn'))$('deleteBtn').addEventListener('click',deleteCurrent);

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
  if(helpBtn)helpBtn.addEventListener('click',function(){
    toast('点任意文字直接编辑；卡片「编辑 / 删除」管理记录；数据自动保存到本机浏览器');
  });

  /* ---- search ---- */
  var topSearch=$('topSearch');
  if(topSearch)topSearch.addEventListener('input',function(){searchQ=topSearch.value.trim();renderCards();});

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
        localStorage.setItem(KEY,JSON.stringify(migrate(d)));
        toast('导入成功，正在刷新…');
        setTimeout(function(){location.reload();},600);
      }catch(e){toast('文件格式不正确，导入失败');}
    };
    reader.onerror=function(){toast('读取文件失败');};
    reader.readAsText(file);
  }
  function resetAll(){
    if(!window.confirm('确定要清空全部数据吗？所有产品卡片、灵感、OKR 与已填写内容都会被清除且不可恢复，建议先导出备份。'))return;
    try{localStorage.removeItem(KEY);localStorage.removeItem(DRAFT);}catch(e){}
    toast('已重置，正在刷新…');setTimeout(function(){location.reload();},600);
  }
  if($('exportBtn'))$('exportBtn').addEventListener('click',exportData);
  if($('importBtn'))$('importBtn').addEventListener('click',function(){$('importFile').click();});
  if($('importFile'))$('importFile').addEventListener('change',function(e){var f=e.target.files[0];if(f)importData(f);e.target.value='';});
  if($('resetBtn'))$('resetBtn').addEventListener('click',resetAll);

  /* ==================== boot ==================== */
  store.load();
  if(typeof window!=='undefined')window.__pfStore=store;   // 调试用：控制台可查看当前数据
  renderSelects();
  initEditable();
  scrubResidualText();
  renderWelcome();
  renderAll();                                             // 最后渲染，保证受控区域显示真实数据
})();