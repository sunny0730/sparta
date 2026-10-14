'use strict';
const $ = id => document.getElementById(id);
const KEY = 'chageun.tasks.v1';
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseDate = value => new Date(`${value}T12:00:00`);
const shift = (value, days) => { const date = parseDate(value); date.setDate(date.getDate()+days); return dateKey(date); };
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(+parseDate(value)) && dateKey(parseDate(value)) === value;
const validTime = value => typeof value === 'string' && (value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
let tasks = [], selectedDate = dateKey(new Date()), filter = 'all', editingId = null, deleted = null, toastTimer;
let view = 'day';
let storageProblem = false;
try {
 const saved = localStorage.getItem(KEY);
 if (saved) {
  const parsed = JSON.parse(saved);
  if (!Array.isArray(parsed) || parsed.some(t => !t || typeof t.id !== 'string' || typeof t.title !== 'string' || !t.title.trim() || !validDate(t.date) || !validTime(t.time) || typeof t.done !== 'boolean') || new Set(parsed.map(t => t.id)).size !== parsed.length) throw new Error('Invalid saved data');
  tasks = parsed;
 }
} catch { storageProblem = true; }
function notify(message, undo = false) {
 clearTimeout(toastTimer); $('toast-text').textContent = message; $('undo').hidden = !undo; $('toast').hidden = false;
 toastTimer = setTimeout(() => { $('toast').hidden = true; deleted = null; }, undo ? 10000 : 4500);
}
function update(next) {
 if(storageProblem){notify('기존 일정을 읽지 못해 저장을 멈췄어요. 브라우저의 원본 데이터를 먼저 확인해 주세요.');return false;}
 try { localStorage.setItem(KEY, JSON.stringify(next)); }
 catch { $('save-state').textContent = '저장 공간을 사용할 수 없어요'; notify('저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'); return false; }
 tasks = next; storageProblem = false; $('save-state').replaceChildren();
 const dot = document.createElement('i'); $('save-state').append(dot, ' 이 브라우저에 자동 저장'); render(); return true;
}
const WRITING_KEY='chageun.writing.v1';
let writing={diary:{},memos:[],draft:''},writingProblem=false,writingDirty=false;
function validWriting(data){
 return data&&typeof data==='object'&&!Array.isArray(data)&&data.diary&&typeof data.diary==='object'&&!Array.isArray(data.diary)&&Object.keys(data.diary).length<=10000&&Object.entries(data.diary).every(([date,text])=>validDate(date)&&typeof text==='string'&&text.length<=50000)&&Array.isArray(data.memos)&&data.memos.length<=1000&&data.memos.every(m=>m&&typeof m.id==='string'&&m.id&&typeof m.text==='string'&&m.text.length<=10000&&typeof m.createdAt==='string'&&!Number.isNaN(Date.parse(m.createdAt)))&&new Set(data.memos.map(m=>m.id)).size===data.memos.length&&typeof data.draft==='string'&&data.draft.length<=10000;
}
function normalizeWriting(data){return{diary:{...data.diary},memos:data.memos.map(m=>({id:m.id,text:m.text,createdAt:m.createdAt})),draft:data.draft};}
try{const raw=localStorage.getItem(WRITING_KEY);if(raw){const parsed=JSON.parse(raw);if(!validWriting(parsed))throw new Error('Invalid writing');writing=normalizeWriting(parsed);}}
catch{writingProblem=true;}
function writingStatus(){
 $('writing-status').textContent=writingProblem?'기존 기록을 읽지 못했어요':writingDirty?'아직 저장하지 못했어요':'이 PC에 자동 저장';
 $('writing-status').classList.toggle('save-error',writingProblem||writingDirty);$('retry-writing').hidden=!writingDirty||writingProblem;
 $('diary-input').disabled=writingProblem;$('memo-input').disabled=writingProblem;$('memo-form').querySelector('button').disabled=writingProblem;
}
function storeWriting(next){
 if(writingProblem){notify('기존 기록을 보호하기 위해 저장을 멈췄어요.');return false;}
 const previousFailure=writingDirty;writing=next;
 try{localStorage.setItem(WRITING_KEY,JSON.stringify(writing));writingDirty=false;writingStatus();return true;}
 catch{writingDirty=true;writingStatus();if(!previousFailure)notify('기록을 저장하지 못했어요. 창을 닫기 전에 전체 백업으로 보관해 주세요.');return false;}
}
function renderWriting(){
 const d=parseDate(selectedDate);$('diary-heading').textContent=selectedDate===dateKey(new Date())?'오늘의 일기':'이날의 일기';$('diary-date').textContent=`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
 const entry=writing.diary[selectedDate]||'';if($('diary-input').value!==entry)$('diary-input').value=entry;
 if($('memo-input').value!==writing.draft)$('memo-input').value=writing.draft;
 $('memo-list').replaceChildren();$('memo-empty').hidden=writing.memos.length>0;
 for(const memo of [...writing.memos].reverse()){
  const card=document.createElement('article');card.className='memo-card';
  const heading=document.createElement('div');heading.className='memo-card-heading';const time=document.createElement('time');time.dateTime=memo.createdAt;time.textContent=new Date(memo.createdAt).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.className='memo-delete';remove.setAttribute('aria-label','업무 메모 삭제');remove.disabled=writingProblem;
  remove.onclick=()=>{if(window.confirm('이 업무 메모를 삭제할까요?')){storeWriting({...writing,memos:writing.memos.filter(m=>m.id!==memo.id)});renderWriting();}};
  const input=document.createElement('textarea');input.maxLength=10000;input.value=memo.text;input.setAttribute('aria-label','저장한 업무 메모 수정');input.disabled=writingProblem;
  input.oninput=()=>storeWriting({...writing,memos:writing.memos.map(m=>m.id===memo.id?{...m,text:input.value}:m)});
  heading.append(time,remove);card.append(heading,input);$('memo-list').append(card);
 }
 writingStatus();
}
$('diary-input').oninput=()=>{const diary={...writing.diary};if($('diary-input').value)diary[selectedDate]=$('diary-input').value;else delete diary[selectedDate];storeWriting({...writing,diary});};
$('memo-input').oninput=()=>storeWriting({...writing,draft:$('memo-input').value});
$('memo-form').onsubmit=e=>{e.preventDefault();if(writingProblem)return;const text=$('memo-input').value.trim();if(!text){$('memo-input').focus();return;}if(writing.memos.length>=1000){notify('메모가 많아요. 백업 후 오래된 메모를 정리해 주세요.');return;}storeWriting({...writing,draft:'',memos:[...writing.memos,{id:crypto.randomUUID(),text,createdAt:new Date().toISOString()}]});renderWriting();};
$('retry-writing').onclick=()=>storeWriting(writing);
window.addEventListener('beforeunload',e=>{if(writingDirty){e.preventDefault();e.returnValue='';}});
function selectDate(value) { if (!validDate(value)) return; selectedDate = value; filter = 'all'; render(); }
function render() {
 renderWriting();
 const today = dateKey(new Date()), date = parseDate(selectedDate), days = ['일','월','화','수','목','금','토'];
 $('month-label').textContent = `${date.getFullYear()}년 ${date.getMonth()+1}월`;
 $('date-title').textContent = `${date.getMonth()+1}월 ${date.getDate()}일, ${days[date.getDay()]}요일`;
 $('calendar').value = selectedDate;
 const monday = shift(selectedDate, -((date.getDay()+6)%7)); $('week').replaceChildren();
 $('week').hidden=view==='month';
 document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('selected',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});
 renderOverview(monday);
 for (let i=0;i<7;i++) {
  const key = shift(monday,i), d = parseDate(key), button = document.createElement('button');
  button.className = `day${key === selectedDate ? ' active' : ''}${key === today ? ' is-today' : ''}${tasks.some(t=>t.date===key) ? ' has-tasks' : ''}`;
  button.type='button'; button.setAttribute('aria-pressed',String(key===selectedDate)); button.setAttribute('aria-label',`${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일${key===today?' 오늘':''}`);
  for (const [className,text] of [['day-name',days[d.getDay()]],['day-number',d.getDate()],['day-dot','']]) { const span=document.createElement('span'); span.className=className; span.textContent=text; button.append(span); }
  button.onclick=()=>selectDate(key); $('week').append(button);
 }
 const daily = tasks.filter(t=>t.date===selectedDate), done = daily.filter(t=>t.done).length;
 $('task-count').textContent=daily.length; $('remaining').textContent=daily.length ? `${daily.length-done}개 남았어요` : '';
 const percent = daily.length ? Math.round(done/daily.length*100) : 0;
 $('percent').replaceChildren(document.createTextNode(percent)); const pct=document.createElement('span'); pct.textContent='%'; $('percent').append(pct);
 $('progress-ring').style.setProperty('--progress',`${percent*3.6}deg`); $('progress-count').textContent=`${daily.length}개 중 ${done}개 완료`;
 document.querySelector('.progress-top h2').textContent=selectedDate===today?'오늘의 발걸음':'이날의 발걸음';
 $('progress-message').textContent=percent===100?'다 해냈어요! 이제 편하게 쉬어도 돼요.':done?'하나씩 해내고 있어요. 잘하고 있어요.':'작은 시작이 멋진 하루를 만들어요.';
 document.querySelector('.ring-caption').textContent=percent===100?'오늘의 계획 완료':'차근차근 채우는 중';
 document.querySelectorAll('[data-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
 const visible=daily.filter(t=>filter==='all'||(filter==='done'?t.done:!t.done)).sort((a,b)=>Number(a.done)-Number(b.done)||(a.time||'99:99').localeCompare(b.time||'99:99'));
 $('tasks').replaceChildren();
 for (const task of visible) {
  const li=document.createElement('li'); li.className=`task-item${task.done?' done':''}`;
  const check=document.createElement('input'); check.type='checkbox'; check.className='task-check'; check.checked=task.done; check.setAttribute('aria-label',`${task.title} 완료`);
  check.onchange=()=>{if (!update(tasks.map(t=>t.id===task.id?{...t,done:check.checked}:t)))check.checked=task.done;};
  const copy=document.createElement('button'); copy.className='task-copy'; copy.type='button'; copy.setAttribute('aria-label',`${task.title} 수정`);
  const name=document.createElement('span'); name.className='task-name'; name.textContent=task.title; copy.append(name);
  if(task.time){const time=document.createElement('span');time.className='task-time';time.textContent=`◷ ${task.time}`;copy.append(time);}
  copy.onclick=()=>openEdit(task); const hint=document.createElement('span'); hint.className='edit-hint';hint.textContent='↗';hint.setAttribute('aria-hidden','true');
  li.append(check,copy,hint); $('tasks').append(li);
 }
 $('empty').hidden=visible.length>0;
 $('empty-title').textContent=filter==='done'?'아직 완료한 일이 없어요':filter==='pending'&&daily.length?'오늘 할 일, 모두 끝!':'가벼운 하루의 시작';
 $('empty-text').textContent=filter==='done'?'할 일을 마치면 체크해 주세요.':filter==='pending'&&daily.length?'수고했어요. 잠깐 쉬어가도 좋아요.':'작은 할 일 하나부터 적어볼까요?';
 $('suggestions').hidden=daily.length>0||filter!=='all';
}
function addTask(title) {
 const clean=title.trim(); if(!clean){$('task-input').setCustomValidity('할 일을 적어 주세요.');$('task-input').reportValidity();return;}
 const task={id:crypto.randomUUID(),title:clean.slice(0,120),date:selectedDate,time:$('task-time').value,done:false};
 if(update([...tasks,task])){filter='all';$('task-input').value='';$('task-time').value='';$('time-row').hidden=true;$('time-toggle').setAttribute('aria-expanded','false');render();$('task-input').focus();}
}
function openEdit(task){editingId=task.id;$('edit-title').value=task.title;$('edit-date').value=task.date;$('edit-time').value=task.time;$('edit-dialog').showModal();}
$('add-form').onsubmit=e=>{e.preventDefault();addTask($('task-input').value);};
$('task-input').oninput=()=> $('task-input').setCustomValidity('');
$('time-toggle').onclick=()=>{const open=$('time-row').hidden;$('time-row').hidden=!open;$('time-toggle').setAttribute('aria-expanded',String(open));if(open)$('task-time').focus();};
$('clear-time').onclick=()=>{$('task-time').value='';};
$('today').onclick=$('home').onclick=()=>selectDate(dateKey(new Date()));
$('prev').onclick=()=>navigate(-1);$('next').onclick=()=>navigate(1);
$('calendar').onchange=e=>selectDate(e.target.value);
$('date-title').onclick=()=>{if($('calendar').showPicker)$('calendar').showPicker();else $('calendar').focus();};
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;render();};
for(const b of document.querySelectorAll('[data-suggestion]'))b.onclick=()=>addTask(b.dataset.suggestion);
$('close-edit').onclick=()=> $('edit-dialog').close();
$('edit-title').oninput=()=> $('edit-title').setCustomValidity('');
$('edit-form').onsubmit=e=>{
 e.preventDefault(); const title=$('edit-title').value.trim(),date=$('edit-date').value;
 if(!title){$('edit-title').setCustomValidity('할 일을 적어 주세요.');$('edit-title').reportValidity();return;}
 if(!validDate(date))return;
 if(update(tasks.map(t=>t.id===editingId?{...t,title,date,time:$('edit-time').value}:t))){selectDate(date);$('edit-dialog').close();notify('일정을 수정했어요.');}
};
$('delete-task').onclick=()=>{
 const task=tasks.find(t=>t.id===editingId),index=tasks.findIndex(t=>t.id===editingId); if(!task)return;
 if(update(tasks.filter(t=>t.id!==editingId))){deleted={task,index};$('edit-dialog').close();notify('일정을 삭제했어요.',true);}
};
$('undo').onclick=()=>{if(!deleted)return;const {task,index}=deleted,next=[...tasks];next.splice(index,0,task);if(update(next)){deleted=null;selectDate(task.date);notify('일정을 되돌렸어요.');}};
$('export').onclick=()=>{
 if(storageProblem||writingProblem){notify('저장된 데이터를 읽지 못했어요. 원본 보존을 위해 백업을 중단했어요.');return;}
 const blob=new Blob([JSON.stringify({app:'차근',version:1,tasks,writing},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`차근-전체백업-${dateKey(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('할 일·일기·메모를 백업 파일로 저장했어요.');
};
window.addEventListener('storage',e=>{if(e.key===KEY){try{const data=e.newValue?JSON.parse(e.newValue):[];if(Array.isArray(data)&&data.every(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&validDate(t.date)&&validTime(t.time)&&typeof t.done==='boolean')){tasks=data;render();}}catch{notify('다른 창의 저장 내용을 읽지 못했어요.');}}});
window.addEventListener('storage',e=>{if(e.key===WRITING_KEY&&!writingDirty){try{const data=e.newValue?JSON.parse(e.newValue):{diary:{},memos:[],draft:''};if(!validWriting(data))throw new Error('Invalid writing');writing=normalizeWriting(data);writingProblem=false;renderWriting();}catch{writingProblem=true;writingStatus();}}});
initializeBuddy();
render();
if(storageProblem){$('save-state').textContent='저장된 일정 확인이 필요해요';notify('저장된 일정을 읽지 못했어요. 새 일정 저장 전 브라우저 데이터를 확인해 주세요.');}

function navigate(direction){
 if(view!=='month'){selectDate(shift(selectedDate,direction*7));return;}
 const d=parseDate(selectedDate),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+direction);const end=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,end));selectDate(dateKey(d));
}
function renderOverview(monday){
 const grid=$('overview');grid.replaceChildren();grid.hidden=view==='day';
 $('prev').setAttribute('aria-label',view==='month'?'이전 달':'이전 주');$('next').setAttribute('aria-label',view==='month'?'다음 달':'다음 주');
 if(view==='day')return;
 const selected=parseDate(selectedDate),first=dateKey(new Date(selected.getFullYear(),selected.getMonth(),1));
 const start=view==='week'?monday:shift(first,-((parseDate(first).getDay()+6)%7));
 if(view==='month')for(const name of ['월','화','수','목','금','토','일']){const heading=document.createElement('span');heading.className='day-name';heading.style.textAlign='center';heading.textContent=name;grid.append(heading);}
 for(let i=0;i<(view==='month'?42:7);i++){
  const key=shift(start,i),d=parseDate(key),list=tasks.filter(t=>t.date===key).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99'));
  const cell=document.createElement('button');cell.type='button';cell.className='overview-cell'+(key===selectedDate?' active':'')+(d.getMonth()!==selected.getMonth()?' outside':'');
  cell.setAttribute('aria-label',`${d.getMonth()+1}월 ${d.getDate()}일, 일정 ${list.length}개`);cell.setAttribute('aria-pressed',String(key===selectedDate));
  const num=document.createElement('span');num.className='overview-date';num.textContent=view==='week'?`${d.getMonth()+1}/${d.getDate()}`:d.getDate();cell.append(num);
  for(const task of list.slice(0,2)){const text=document.createElement('span');text.className='overview-task'+(task.done?' done':'');text.textContent=(task.done?'✓ ':'')+task.title;cell.append(text);}
  const count=document.createElement('span');count.className=list.length?'overview-count':'overview-empty';count.textContent=list.length?(list.length>2?`+${list.length-2}개 더`:`${list.filter(t=>t.done).length}/${list.length} 완료`):'여유로운 날';cell.append(count);cell.onclick=()=>selectDate(key);grid.append(cell);
 }
}
for(const button of document.querySelectorAll('[data-view]'))button.onclick=()=>{view=button.dataset.view;render();};
let focusDeadline=null,focusTimer=null,awaitingPlan=false;
function say(text,user=false){const message=document.createElement('div');message.className='chat-message'+(user?' user':'');message.textContent=text;$('chat').append(message);while($('chat').children.length>30)$('chat').firstElementChild.remove();$('chat').scrollTop=$('chat').scrollHeight;}
function dailyContext(){const today=dateKey(new Date()),list=tasks.filter(t=>t.date===today);return{list,pending:list.filter(t=>!t.done).sort((a,b)=>(a.time||'99:99').localeCompare(b.time||'99:99')),done:list.filter(t=>t.done).length};}
function checkin(kind){
 const {list,pending,done}=dailyContext();
 if(kind==='plan'){awaitingPlan=!pending.length;selectDate(dateKey(new Date()));say(pending.length?`좋은 아침이에요 ☀ 오늘 할 일이 ${pending.length}개 있네요.\n먼저 “${pending[0].title}”부터 가볍게 시작해 볼까요? 꼭 해내고 싶은 일 하나만 정해도 좋아요.`:'좋은 아침이에요 ☀ 오늘 하루를 같이 시작해요.\n오늘 꼭 하고 싶은 일 하나를 여기 대화창에 적어 주세요. 제가 오늘 일정에 넣어둘게요. 작고 쉬운 일이어도 괜찮아요.');}
 if(kind!=='plan')awaitingPlan=false;
 if(kind==='check')say(list.length?`잠깐 같이 체크해 볼까요? ${list.length}개 중 ${done}개를 해냈어요.\n${pending.length?`다음은 “${pending[0].title}”이에요. 지금 할 수 있는 만큼만 해봐요.`:'오늘 적어둔 일을 모두 마쳤네요. 정말 수고했어요! 잠깐 쉬어가요.'}`:'오늘 할 일을 아직 적지 않았네요. 머릿속에 있는 작은 일 하나만 적어볼까요?');
 if(kind==='finish')say(list.length?`오늘 ${done}개의 일을 마쳤어요. 수고했어요 🌿\n${pending.length?`남은 ${pending.length}개는 일정을 눌러 내일로 옮겨도 괜찮아요. 오늘 잘한 작은 일 하나를 이야기해 줄래요?`:'오늘 계획을 모두 채웠네요! 이제 편하게 쉬어요. 오늘 가장 좋았던 순간은 뭐였나요?'}`:'오늘 기록이 없어도 괜찮아요. 하루를 보낸 것만으로 충분해요. 오늘 좋았던 순간 하나를 이야기해 주세요.');
 if(kind==='focus'){
  if(focusDeadline){say('이미 집중 시간을 함께 보내고 있어요. 한 번에 한 가지면 충분해요.');return;}
  if(!pending.length){say('집중할 일을 위에 하나 적어 주세요. 완료하지 않은 오늘의 일이 있으면 같이 15분을 시작할게요.');return;}
  focusDeadline=Date.now()+15*60*1000;$('focus-bar').hidden=false;say(`좋아요, “${pending[0].title}”에 15분만 집중해 봐요.\n이 시간에는 한 가지만! 끝나면 돌아와서 체크해 주세요. 타이머는 이 페이지를 열어둔 동안 작동해요.`);tickFocus();focusTimer=setInterval(tickFocus,1000);
 }
}
function tickFocus(){if(!focusDeadline)return;const seconds=Math.max(0,Math.ceil((focusDeadline-Date.now())/1000));$('focus-clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;if(seconds===0){clearInterval(focusTimer);focusDeadline=null;$('focus-bar').hidden=true;say('15분이 지났어요! 조금이라도 진전이 있었나요? 끝낸 일은 체크하고, 물 한 잔 마시며 쉬어가요.');}}
function initializeBuddy(){say('안녕하세요, 오늘도 같이 차근차근 해봐요 🌿\n아침에는 계획을 적고, 중간에는 진행 확인을 눌러 주세요. 하루를 혼자 정리하기 막막할 때 짧게 이야기해도 좋아요.');}
for(const b of document.querySelectorAll('[data-checkin]'))b.onclick=()=>{say(b.textContent.trim(),true);checkin(b.dataset.checkin);};
$('focus-stop').onclick=()=>{clearInterval(focusTimer);focusDeadline=null;$('focus-bar').hidden=true;say('집중 시간을 마쳤어요. 잠깐이라도 시작한 건 좋은 진전이에요. 마친 일은 체크하고, 아직 남았다면 작은 한 단계만 더 해봐요.');};
$('chat-form').onsubmit=e=>{
 e.preventDefault();const text=$('chat-input').value.trim();if(!text)return;say(text,true);$('chat-input').value='';
 const taskCommand=text.match(/^(?:할\s*일|일정)\s*[:：]\s*(.+)$/);
 if(taskCommand||(awaitingPlan&&!/힘들|피곤|지쳐|못하|어렵|귀찮|불안|아침|계획|집중|체크|마무리/.test(text))){
  const title=(taskCommand?taskCommand[1]:text).trim().slice(0,120);
  if(update([...tasks,{id:crypto.randomUUID(),title,date:dateKey(new Date()),time:'',done:false}])){awaitingPlan=false;selectDate(dateKey(new Date()));say(`좋아요, “${title}”을 오늘 할 일에 적어두었어요. 시작할 준비가 되면 ‘같이 집중하기’를 눌러 주세요.`);}
 }
 else if(/아침|계획|시작|뭐부터/.test(text))checkin('plan');
 else if(/집중|타이머/.test(text))checkin('focus');
 else if(/마무리|퇴근|끝났|잘했/.test(text))checkin('finish');
 else if(/진행|얼마|체크|완료|했어/.test(text))checkin('check');
 else if(/힘들|피곤|지쳐|못하|어렵|귀찮|불안/.test(text))say('오늘 조금 버거운가 봐요. 잠깐 쉬어도 괜찮아요. 물 한 잔 마시고, 할 일을 5분 안에 할 수 있는 작은 단계로 바꿔볼까요? 일정 제목을 누르면 바꿀 수 있어요.');
 else say('이야기해 줘서 고마워요 🌿 복잡한 답을 해주는 동료는 아니지만, 계획과 진행 확인은 함께할 수 있어요. 지금 할 수 있는 작은 일 하나를 정해볼까요? “할 일: 산책하기”처럼 말하면 오늘 일정에 넣어둘게요.');
};

$('import').onclick=()=> $('import-file').click();
$('import-file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw new Error('too large');
  const data=JSON.parse(await file.text());
  if(data.app!=='차근'||data.version!==1||!Array.isArray(data.tasks)||data.tasks.length>10000)throw new Error('invalid backup');
  const imported=data.tasks;
  if(imported.some(t=>!t||typeof t.id!=='string'||!t.id||typeof t.title!=='string'||!t.title.trim()||t.title.length>120||!validDate(t.date)||!validTime(t.time)||typeof t.done!=='boolean')||new Set(imported.map(t=>t.id)).size!==imported.length)throw new Error('invalid tasks');
  if(data.writing!==undefined&&!validWriting(data.writing))throw new Error('invalid writing');
  if(storageProblem||writingProblem){notify('현재 저장 데이터에 문제가 있어 원본을 보호하기 위해 복원을 멈췄어요.');return;}
  const incomingWriting=data.writing===undefined?null:normalizeWriting(data.writing);
  if(!imported.length&&(!incomingWriting||(!Object.keys(incomingWriting.diary).length&&!incomingWriting.memos.length&&!incomingWriting.draft))){notify('백업 파일에 기록이 없어요.');return;}
  if(!window.confirm('백업 내용을 불러올까요? 기존의 다른 기록은 유지됩니다. 같은 일정 ID·메모 ID·일기 날짜의 내용은 백업 내용으로 바뀝니다. 백업에 작성 중 메모가 있으면 현재 작성 중 메모도 바뀝니다.'))return;
  const incoming=new Map(imported.map(t=>[t.id,{id:t.id,title:t.title.trim(),date:t.date,time:t.time,done:t.done}])),existing=new Set(tasks.map(t=>t.id));
  const next=tasks.map(t=>incoming.has(t.id)?incoming.get(t.id):t);next.push(...[...incoming.values()].filter(t=>!existing.has(t.id)));
  let nextWriting=writing;
  if(incomingWriting){const memos=new Map(writing.memos.map(m=>[m.id,m]));for(const m of incomingWriting.memos)memos.set(m.id,m);nextWriting={diary:{...writing.diary,...incomingWriting.diary},memos:[...memos.values()],draft:incomingWriting.draft||writing.draft};if(!validWriting(nextWriting))throw new Error('merged writing too large');}
  if(next.length>10000)throw new Error('too many tasks');
  const oldTasks=localStorage.getItem(KEY),oldWriting=localStorage.getItem(WRITING_KEY);
  try{localStorage.setItem(WRITING_KEY,JSON.stringify(nextWriting));localStorage.setItem(KEY,JSON.stringify(next));}
  catch(error){try{if(oldWriting===null)localStorage.removeItem(WRITING_KEY);else localStorage.setItem(WRITING_KEY,oldWriting);if(oldTasks===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,oldTasks);}catch{notify('복원 중 저장에 실패했어요. 백업 파일을 보관하고 저장 공간을 확인해 주세요.');return;}notify('저장하지 못해 기존 기록으로 되돌렸어요.');return;}
  tasks=next;writing=nextWriting;writingDirty=false;selectDate(dateKey(new Date()));notify('할 일·일기·메모를 불러왔어요.');
 }catch{notify('차근에서 저장한 올바른 백업 파일을 선택해 주세요.');}
 finally{e.target.value='';}
};
