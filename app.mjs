import { SAMPLE, parseList, getPool, pick, randomInt, csvCell } from './draw-core.mjs';
const $ = id => document.getElementById(id);
const STORAGE = 'haoqian.draw.v1';
let raw = SAMPLE, source = '示例名单', history = [], scope = 'roots', noRepeat = true, count = 1, busy = false;
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
  if (saved && typeof saved.raw === 'string' && saved.raw.length < 500000) {
    raw = saved.raw; source = typeof saved.source === 'string' ? saved.source : '已保存名单';
    history = Array.isArray(saved.history) ? saved.history.filter(r => Array.isArray(r.winners) && r.winners.every(w => typeof w.name === 'string' && typeof w.id === 'string' && Array.isArray(w.path)) && typeof r.time === 'string') : [];
    scope = typeof saved.scope === 'string' ? saved.scope : 'roots'; noRepeat = saved.noRepeat !== false;
    count = Number.isInteger(saved.count) && saved.count >= 1 && saved.count <= 50 ? saved.count : 1;
  }
} catch { storageAvailable = false; }
let entries = parseList(raw);
const selected = () => new Set(history.flatMap(r => r.winners.map(w => w.id)));
const pool = () => getPool(entries, scope, selected(), noRepeat);
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3200); }
function save() {
  try { localStorage.setItem(STORAGE, JSON.stringify({raw,source,history,scope,noRepeat,count})); }
  catch { if (storageAvailable) toast('浏览器存储已满或不可用，请导出结果保存'); storageAvailable = false; }
  if (!storageAvailable) document.querySelector('.local-tag').lastChild.textContent = ' 当前会话使用 · 请及时导出结果';
}
function element(tag, className, text) { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; }
function scopeName() { return $('scopeSelect').selectedOptions[0]?.textContent || '主名单'; }
function renderScopes() {
  const select = $('scopeSelect');
  while (select.options.length > 3) select.remove(3);
  entries.filter(e => e.children.length).forEach(e => { const option = new Option('分组：' + e.path.join(' / '), 'group:' + e.id); select.add(option); });
  if (![...select.options].some(o => o.value === scope)) scope = 'roots';
  select.value = scope;
}
function renderRoster() {
  const roots = entries.filter(e => e.parentId === null);
  $('totalBadge').textContent = entries.length;
  $('rosterMeta').textContent = `${roots.length} 位主名单 · ${entries.length - roots.length} 个子条目`;
  $('sourceLabel').textContent = source;
  const picked = selected(), fragment = document.createDocumentFragment();
  let rootIndex = 0;
  for (const item of entries) {
    const row = element('div', 'roster-row' + (item.depth ? ' child' : '') + (picked.has(item.id) ? ' picked' : ''));
    row.style.paddingLeft = `${6 + Math.min(item.depth, 8) * 19}px`;
    row.title = item.path.join(' / ');
    row.append(element('span','row-number', item.depth ? '' : String(++rootIndex).padStart(2,'0')), element('span','row-name',item.name));
    if (picked.has(item.id)) row.append(element('span','row-selected','已抽中'));
    else if (item.children.length) row.append(element('span','row-child-count',item.children.length + ' 个子项'));
    fragment.append(row);
  }
  if (!entries.length) fragment.append(element('div', 'empty-history', '名单还是空的，上传或粘贴一份吧'));
  $('rosterTree').replaceChildren(fragment);
}
function updateControls() {
  const available = pool().length;
  $('availableCount').textContent = available;
  $('ruleNote').textContent = noRepeat ? '等概率 · 不重复抽选' : '等概率 · 允许跨轮重复';
  $('drawCount').value = Number.isNaN(count) ? '' : count;
  $('noRepeat').checked = noRepeat;
  const valid = Number.isInteger(count) && count > 0 && count <= 50 && count <= available;
  $('drawBtn').disabled = busy || !valid;
  $('drawBtn').querySelector('span').textContent = busy ? '好运正在赶来…' : available === 0 ? '候选已抽完' : '开始抽选';
  $('roundHint').textContent = !valid && available > 0 ? `请输入 1–${Math.min(50,available)} 位` : history.length ? `已完成 ${history.length} 轮抽选` : '好运即将揭晓';
  for (const id of ['scopeSelect','drawCount','minusBtn','plusBtn','noRepeat','editBtn','pasteBtn','uploadBtn','applyBtn','resetBtn']) $(id).disabled = busy;
  $('minusBtn').disabled = busy || count <= 1;
  $('plusBtn').disabled = busy || count >= Math.min(50,available);
  $('resetBtn').disabled = busy || !history.length;
  $('exportBtn').disabled = !history.length;
  if (!busy) $('stageStatus').textContent = available ? '一切就绪，等你开始' : entries.length ? '本轮候选已抽完，可重置后继续' : '先导入一份名单吧';
}
function renderHistory() {
  $('historyCount').textContent = history.length;
  if (!history.length) { const empty = element('div','empty-history','✧  还没有抽选记录，第一个幸运名字正等着你。'); $('historyList').replaceChildren(empty); return; }
  const fragment = document.createDocumentFragment();
  history.slice().reverse().forEach((record, index) => {
    const row = element('div','history-row');
    row.append(element('span','history-round',`第 ${history.length-index} 轮`));
    const names = element('div','history-names');
    record.winners.forEach(w => { const chip = element('span','history-name',w.name); chip.title = w.path.join(' / '); names.append(chip); });
    const time = element('div','history-time');
    time.append(element('span','history-scope',record.scope || ''));
    time.append(document.createTextNode(new Date(record.time).toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit'})));
    row.append(names,time);fragment.append(row);
  });
  $('historyList').replaceChildren(fragment);
}
const initialStage = $('stageContent').innerHTML;
function showWinners(winners) {
  const content = $('stageContent'); content.replaceChildren(element('span','winner-kicker','A LITTLE LUCK, JUST FOR YOU'));
  if (winners.length === 1) {
    content.append(element('h2','winner-name',winners[0].name));
    content.append(element('p','winner-group',winners[0].path.length > 1 ? '来自 ' + winners[0].path.slice(0,-1).join(' / ') : '这一份好运，属于你'));
  } else {
    const grid = element('div','winner-grid'); winners.forEach(w => { const item = element('span','winner-card',w.name); item.title = w.path.join(' / '); grid.append(item); }); content.append(grid,element('p','winner-group',`本轮 ${winners.length} 位幸运名字，已全部揭晓`));
  }
}
function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e7a47e','#a6b78e','#d4ba79','#d9836c'];
  const fragment = document.createDocumentFragment();
  for (let i=0;i<28;i++) { const piece = element('i'); piece.style.left = randomInt(100)+'%'; piece.style.background = colors[i%4]; piece.style.animationDelay = (randomInt(500)/1000)+'s'; piece.style.setProperty('--drift',randomInt(150)-75+'px'); fragment.append(piece); }
  $('confetti').replaceChildren(fragment);setTimeout(() => $('confetti').replaceChildren(),3200);
}
async function draw() {
  if (busy || $('drawBtn').disabled || $('importDialog').open || $('helpDialog').open) return;
  const candidates = pool(); let winners;
  try { winners = pick(candidates,count); } catch (error) { toast(error.message); return; }
  busy = true; updateControls(); $('stageStatus').textContent = '随机抽选中，好运马上揭晓';
  $('drawPanel').classList.add('rolling'); $('stageContent').removeAttribute('aria-live');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const until = Date.now()+1550;
    while (Date.now() < until) {
      const rollingName = candidates[randomInt(candidates.length)];
      $('stageContent').replaceChildren(element('span','stage-kicker','A LITTLE MOMENT OF CHANCE'),element('h2','winner-name',rollingName.name),element('p','winner-group','每一个名字，都有可能'));
      await new Promise(resolve => setTimeout(resolve,85));
    }
  }
  history.push({time:new Date().toISOString(),scope:scopeName(),winners:winners.map(w => ({id:w.id,name:w.name,path:w.path}))});
  busy = false; $('drawPanel').classList.remove('rolling'); $('stageContent').setAttribute('aria-live','polite'); showWinners(winners);
  renderRoster();renderHistory();updateControls();save();celebrate();$('stageStatus').textContent = '好运已揭晓 · 第 '+history.length+' 轮';
}
$('drawBtn').addEventListener('click',draw);
document.addEventListener('keydown',e => {
  if (e.code === 'Space' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(e.target.tagName) && !e.target.isContentEditable && !document.querySelector('dialog[open]')) { e.preventDefault();draw(); }
});
$('scopeSelect').addEventListener('change',e => {scope=e.target.value;updateControls();save();});
$('noRepeat').addEventListener('change',e => {noRepeat=e.target.checked;updateControls();save();});
$('drawCount').addEventListener('input',e => { count = e.target.value === '' ? NaN : Number(e.target.value); updateControls();if (Number.isInteger(count)&&count>=1&&count<=50) save(); });
$('minusBtn').addEventListener('click',()=>{count=Math.max(1,(Number.isFinite(count)?count:1)-1);updateControls();save();});
$('plusBtn').addEventListener('click',()=>{count=Math.min(50,pool().length,(Number.isFinite(count)?count:0)+1);updateControls();save();});
function updateSummary() { const parsed=parseList($('listInput').value);const roots=parsed.filter(e=>e.parentId===null).length;$('importSummary').textContent=`已识别 ${parsed.length} 个条目 · ${roots} 位主名单 · ${parsed.length-roots} 个子条目`;$('applyBtn').disabled=!parsed.length; }
let importSource = '粘贴的名单';
function openImport(text, name) { if(busy)return; importSource=name;$('listInput').value=text;updateSummary();$('importDialog').showModal(); }
$('editBtn').addEventListener('click',()=>openImport(raw,source));
$('pasteBtn').addEventListener('click',()=>openImport('','粘贴的名单'));
$('listInput').addEventListener('input',updateSummary);
$('sampleBtn').addEventListener('click',()=>{importSource='示例名单';$('listInput').value=SAMPLE;updateSummary();});
$('applyBtn').addEventListener('click',()=>{
  const next=$('listInput').value;
  if(next.length>500000){toast('名单过大，请控制在 50 万字符以内');return;}
  const parsed=parseList(next);if(!parsed.length)return;
  if(parsed.length>10000){toast('每份名单最多支持 10,000 个条目');return;}
  if(history.length&&next!==raw&&!confirm('更换名单会清空抽选记录，并恢复所有候选。确定导入吗？'))return;
  if(next!==raw){raw=next;entries=parsed;history=[];scope='roots';count=1;$('stageContent').innerHTML=initialStage;}
  source=importSource;renderScopes();renderRoster();renderHistory();updateControls();save();$('importDialog').close();toast('名单已导入，准备好迎接好运');
});
$('uploadBtn').addEventListener('click',()=>{if(!busy)$('fileInput').click();});
async function readFile(file) {
  if(!file||busy)return;
  if(!/\.(txt|md)$/i.test(file.name)){toast('请上传 .txt 或 .md 文本名单');return;}
  if(file.size>2*1024*1024){toast('文件过大，请上传 2 MB 以内的文本');return;}
  try {
    const buffer=await file.arrayBuffer(),bytes=new Uint8Array(buffer);let text;
    if(bytes[0]===255&&bytes[1]===254)text=new TextDecoder('utf-16le').decode(buffer);
    else if(bytes[0]===254&&bytes[1]===255)text=new TextDecoder('utf-16be').decode(buffer);
    else {try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{text=new TextDecoder('gb18030',{fatal:true}).decode(buffer);}}
    if(/\u0000/.test(text)){toast('文件不是有效的文本名单，请另存为 UTF-8 文本');return;}
    if(text.length>500000){toast('名单过大，请控制在 50 万字符以内');return;}
    openImport(text,file.name);
  } catch {toast('文件读取失败，请另存为 UTF-8 文本后再试');}
}
$('fileInput').addEventListener('change',e=>{readFile(e.target.files[0]);e.target.value='';});
const zone=$('uploadBtn');
for(const event of ['dragenter','dragover'])zone.addEventListener(event,e=>{e.preventDefault();zone.classList.add('dragover');});
for(const event of ['dragleave','drop'])zone.addEventListener(event,e=>{e.preventDefault();zone.classList.remove('dragover');});
zone.addEventListener('drop',e=>readFile(e.dataTransfer.files[0]));
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>e.preventDefault());
$('helpBtn').addEventListener('click',()=>$('helpDialog').showModal());
document.querySelectorAll('.close-modal').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('resetBtn').addEventListener('click',()=>{
  if(busy||!confirm('重置将清空所有抽选记录，并让所有名字重新参与。确定重置吗？'))return;
  history=[];$('stageContent').innerHTML=initialStage;renderRoster();renderHistory();updateControls();save();toast('已重置，所有名字重新就位');
});
$('exportBtn').addEventListener('click',()=>{
  const rows=[['轮次','抽选时间','抽选范围','姓名','所属层级']];history.forEach((r,i)=>r.winners.forEach(w=>rows.push([i+1,new Date(r.time).toLocaleString('zh-CN',{hour12:false}),r.scope,w.name,w.path.slice(0,-1).join(' / ')])));
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);const d=new Date();link.download=`好签-抽选结果-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);toast('抽选结果已导出');
});
$('fullscreenBtn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('drawPanel').requestFullscreen();}catch{toast('此浏览器不支持全屏，可使用浏览器的全屏功能');}});
document.addEventListener('fullscreenchange',()=>{const full=!!document.fullscreenElement;$('fullscreenBtn').title=full?'退出全屏':'全屏抽选';$('fullscreenBtn').setAttribute('aria-label',full?'退出全屏':'全屏抽选');});
renderScopes();renderRoster();renderHistory();updateControls();if(history.length)showWinners(history.at(-1).winners);save();
