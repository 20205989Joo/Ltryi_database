// ver1.1_26.02.22
(function(){
'use strict';

const EXCEL_FILE='LTRYI-herma-lesson-questions.xlsx';
const TARGET_LESSON=5;
const TARGET_EXERCISE='1b';
const UI={
  introTitle:'Herma L5-E1-b',
  introGuide:'\uAD00\uACC4\uC0AC \uC911\uC2EC \uD30C\uC0DD \uB808\uC2A8 (\uC784\uC2DC)',
  introDesc1:'\uC6D0\uBB38 \uB2E8\uC5B4\uB97C \uB20C\uB7EC \uC911\uAC04 \uD45C\uD604\uC744 \uB9CC\uB4E0 \uB4A4,',
  introDesc2:'\uC55E \uBA85\uC0AC\uAD6C\uB97C \uD0ED\uD574 \uAD00\uACC4 \uD45C\uD604\uC73C\uB85C \uBC14\uAFD4\uBD05\uC2DC\uB2E4.',
  start:'\uD83D\uDE80 \uC2DC\uC791', q:'Q.',
  inst:'\uBB38\uC7A5\uC744 \uB4A4\uC9D1\uC5B4 \uC911\uAC04 \uD45C\uD604\uC744 \uB9CC\uB4E4\uC5B4 \uBD05\uC2DC\uB2E4!',
  lOrig:'\uC6D0\uBB38', lMid:'\uC911\uAC04', lFlip:'\uB4A4\uC9D1\uAE30',
  tapGuide:'\uC55E \uBA85\uC0AC\uAD6C\uB97C \uD0ED\uD574 \uAD00\uACC4 \uD45C\uD604\uC73C\uB85C \uBC14\uAFD4\uBCF4\uC138\uC694.',
  stageOk:'\uC815\uB2F5!', stageNo:'\uB2E4\uC2DC \uD574\uBCF4\uC138\uC694!',
  assemble:'\uC815\uB9AC\uD574\uBD05\uC2DC\uB2E4!', tOrig:'\uC6D0\uBB38 \uD45C\uD604', tFlip:'\uB4A4\uC9D1\uAE34 \uD45C\uD604',
  ansPh:'\uC870\uAC01\uC744 \uACE8\uB77C \uBB38\uC7A5\uC744 \uC644\uC131\uD558\uC138\uC694.',
  h1:'\uC870\uAC01\uC744 \uB20C\uB7EC \uC21C\uC11C\uB300\uB85C \uCC44\uC6CC\uC8FC\uC138\uC694.', h2:'\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uC744 \uB204\uB974\uBA74 \uCDE8\uC18C\uB429\uB2C8\uB2E4.',
  submit:'\uC81C\uCD9C', next:'\uB2E4\uC74C', undo:'\uB9C8\uC9C0\uB9C9 \uC870\uAC01\uBD80\uD130 \uCDE8\uC18C\uD558\uC138\uC694.',
  done:'\uC644\uB8CC', doneDesc:'\uC784\uC2DC 5-1-b \uD504\uB85C\uD1A0\uD0C0\uC785\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4.', retry:'\uB2E4\uC2DC \uC2DC\uC791',
  loadErr:'\uC5D1\uC140 \uD30C\uC77C\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
};

let rawRows=[], questions=[];
let currentIndex=0, results=[];
let stage='transform';
let selectedMiddle='', plan=null, droppedWords=[], activeDropIndex=0, rewriteSolved=false, headConverted=false, hammering=false;
let hasFirstDragDone=false, stopDragTipArc=null;
let assembleTargetGroup='flip', assembleTargetText='', assembleBank={original:[],flip:[]}, assembleSelected=[], assembleSolved=false;
let quizTitle='quiz_Grammar_Basic_501b', userId='';

window.addEventListener('DOMContentLoaded', async function(){
  applyQueryParams(); wireBackButton(); injectStyles();
  try { rawRows=await loadExcelRows(EXCEL_FILE); buildQuestionsFromRows(); }
  catch(e){ console.error(e); alert(UI.loadErr+'\n'+EXCEL_FILE); return; }
  renderIntro();
});

function byId(id){ return document.getElementById(id); }
function qNow(){ return questions[currentIndex]||null; }
function applyQueryParams(){ try{ const p=new URLSearchParams(location.search); if(p.get('id')) userId=p.get('id'); if(p.get('key')) quizTitle=p.get('key'); }catch(_){} }
function wireBackButton(){ const b=byId('back-btn'); if(b) b.addEventListener('click', function(){ history.back(); }); }

function injectStyles(){
  const s=document.createElement('style');
  s.textContent=`
  .inst-simple{font-weight:900;color:#7e3106;line-height:1.6}
  .eng-line,.rewrite-line{line-height:1.9;font-size:15px;font-weight:900;color:#222;word-break:keep-all}
  .flip-sentence{background:linear-gradient(180deg,rgba(255,248,236,.98),rgba(247,233,214,.96));border:1px solid rgba(198,163,124,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.55)}
  .flip-guide{margin-top:8px;font-size:12px;color:#7e3106;font-weight:900}
  .head-hl,.head-group{display:inline-block;border-radius:10px;padding:1px 8px;background:rgba(255,208,90,.42);box-shadow:inset 0 0 0 1px rgba(160,110,0,.18);font-weight:900;white-space:nowrap}
  .head-hl{padding:0 5px;border-radius:8px}
  .drag-source-word{display:inline;border:none;padding:0;background:transparent;color:inherit;font-weight:inherit;cursor:grab;user-select:none;text-decoration:underline;text-decoration-thickness:1.5px;text-decoration-style:dashed;text-decoration-color:rgba(241,123,42,.78)}
  .drag-source-word.used-ghost{opacity:.22;color:rgba(0,0,0,.42);text-decoration-color:rgba(241,123,42,.30)}
  .drag-source-word.dragging{opacity:.42;cursor:grabbing}
  .drop-word-slot{display:inline-flex;align-items:center;justify-content:center;min-width:42px;min-height:30px;padding:0 10px;border-radius:12px;border:1.5px dashed rgba(70,140,255,.55);background:rgba(70,140,255,.08);color:#1f4fb8;vertical-align:middle;margin-right:4px}
  .drop-word-slot.empty{opacity:.8;font-weight:800}.drop-word-slot.active{border-color:rgba(70,140,255,.9);box-shadow:0 0 0 2px rgba(70,140,255,.18)}.drop-word-slot.over{background:rgba(70,140,255,.14)}.drop-word-slot.filled{border-style:solid;background:rgba(70,140,255,.16);color:#113a9a}
  .drag-tip-fly{position:fixed;left:0;top:0;font-size:11px;font-weight:900;color:#1f4fb8;background:rgba(70,140,255,.14);border:1px solid rgba(70,140,255,.42);border-radius:999px;padding:2px 7px;pointer-events:none;z-index:9999;opacity:.95;transform:translate3d(-9999px,-9999px,0)}
  .head-chip{display:inline-flex;align-items:center;justify-content:center;position:relative;margin-right:4px;padding:1px 8px;border-radius:10px;border:1px solid rgba(160,110,0,.18);background:rgba(255,208,90,.34);color:#222;font:inherit;line-height:1.25;white-space:nowrap}
  button.head-chip{cursor:pointer;appearance:none} button.head-chip:disabled{opacity:1;cursor:default}
  .head-chip.ready{animation:headPulse 1.1s ease-in-out infinite}.head-chip.hammer-hit{animation:headHit .28s cubic-bezier(.2,.9,.2,1) both}
  .head-chip.converted{border-color:rgba(241,186,85,.82);background:linear-gradient(180deg,rgba(255,245,214,.96),rgba(255,233,174,.62));box-shadow:0 0 0 2px rgba(241,186,85,.12),0 8px 18px rgba(241,186,85,.12)}
  .hammer-stage-wrap{position:relative}.hammer-pop{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:10}.hammer-pop>span{position:absolute;left:0;top:0;transform:translate(-50%,-50%);font-size:18px;animation:hammerDrop .34s cubic-bezier(.12,.9,.22,1) both}
  .answer-line{min-height:44px;padding:10px;border-radius:12px;border:1px solid rgba(0,0,0,.10);background:#fff;line-height:1.6;font-size:15px}.answer-line.empty{color:#666}
  .answer-token{display:inline-flex;align-items:center;justify-content:center;padding:6px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.14);background:#fff;font-weight:900;font-size:12px;line-height:1.2;margin:4px 6px 0 0}
  .hint-lines{margin-top:8px;font-size:12px;color:#7e3106;line-height:1.55;font-weight:900;white-space:pre-line}
  .dual-bank-wrap{display:flex;flex-direction:column;gap:8px;margin-top:8px}.dual-bank-row{display:flex;flex-wrap:wrap;gap:5px;min-height:34px;transition:opacity .15s ease}.dual-bank-row.dim{opacity:.35}.dual-bank-divider{height:1px;border-top:1px dashed rgba(0,0,0,.22);margin:1px 0}
  .dual-token{display:inline-flex;align-items:center;justify-content:center;padding:6px 8px;border-radius:999px;border:1px solid rgba(0,0,0,.14);background:#fff;font-weight:900;font-size:12px;cursor:pointer;user-select:none;line-height:1.2;font:inherit}.dual-token:disabled{opacity:.35;cursor:not-allowed}
  .dual-token.original{border-color:rgba(241,123,42,.82);background:rgba(241,123,42,.11);color:#7e3106}.dual-token.flip{border-color:rgba(70,140,255,.8);background:rgba(70,140,255,.10);color:#1f4fb8}.dual-token.last-picked{box-shadow:0 0 0 2px rgba(0,0,0,.10)}
  .target-pill{display:inline-block;font-size:12px;padding:5px 9px;border-radius:999px;font-weight:900;border:1px solid rgba(0,0,0,.12);background:#fff;margin-bottom:8px}
  .target-pill.original{color:#7e3106;border-color:rgba(241,123,42,.35);background:rgba(241,123,42,.08)}.target-pill.flip{color:#1f4fb8;border-color:rgba(70,140,255,.35);background:rgba(70,140,255,.08)}
  @keyframes headPulse{0%,100%{box-shadow:0 0 0 0 rgba(241,123,42,0)}50%{box-shadow:0 0 0 4px rgba(241,123,42,.10)}}
  @keyframes headHit{0%{transform:translateY(0) scale(1)}35%{transform:translateY(1px) scale(.92)}65%{transform:translateY(-1px) scale(1.06)}100%{transform:translateY(0) scale(1)}}
  @keyframes hammerDrop{0%{opacity:0;transform:translate(-50%,-18px) rotate(-28deg) scale(.92)}55%{opacity:1;transform:translate(-50%,-1px) rotate(-18deg) scale(1.02)}100%{opacity:0;transform:translate(-50%,6px) rotate(-8deg) scale(.96)}}`;
  document.head.appendChild(s);
}

async function loadExcelRows(filename){
  const bust='v='+Date.now(); const url=filename+(filename.includes('?')?'&':'?')+bust;
  const res=await fetch(url,{cache:'no-store'}); if(!res.ok) throw new Error('fetch failed: '+res.status);
  const buf=await res.arrayBuffer(); const wb=XLSX.read(buf,{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws,{defval:''}).filter(function(r){ return !Object.keys(r||{}).every(function(k){ return String(r[k]??'').trim()===''; }); });
}

function buildQuestionsFromRows(){
  const ex=String(TARGET_EXERCISE).trim().toLowerCase();
  questions=rawRows.filter(function(r){ return Number(r.Lesson)===TARGET_LESSON && String(r.Exercise??'').trim().toLowerCase()===ex; })
    .sort(function(a,b){ return (Number(a.QNumber)||0)-(Number(b.QNumber)||0); })
    .map(function(r,i){ const tf=parseTransforms(String(r.Transforms||'')); return { no:Number(r.QNumber)||i+1, source:stripTrailingPunct(String(r.Question||'').trim()), middleVariants:[tf.mid1,tf.mid2].map(function(x){return normalizeSpaces(x||'');}).filter(Boolean), flip:stripTrailingPunct(String(tf.flip||r.Answer||'').trim()) }; })
    .filter(function(q){ return q.source && q.flip && q.middleVariants.length; });
}

function parseTransforms(s){ const o={}; String(s||'').split(';').forEach(function(part){ const t=String(part||'').trim(); if(!t) return; const i=t.indexOf('='); if(i<0) return; o[t.slice(0,i).trim()]=t.slice(i+1).trim(); }); return o; }
function renderIntro(){
  const area=byId('quiz-area'); if(!area) return;
  area.innerHTML=`<div class="box">
    <div style="font-size:18px;font-weight:900;color:#7e3106;margin-bottom:10px;">📘 ${esc(UI.introTitle)}</div>
    <div style="margin-bottom:10px;"><span class="pill">Lesson ${TARGET_LESSON}</span><span class="pill">Exercise ${esc(TARGET_EXERCISE)}</span><span class="pill">Prototype</span></div>
    <div style="font-weight:900;margin-bottom:6px;color:#444;">${esc(UI.introGuide)}</div>
    <div style="margin-top:10px;font-size:13px;color:#7e3106;line-height:1.6;">${esc(UI.introDesc1)}<br/>${esc(UI.introDesc2)}</div>
    <div style="margin-top:8px;font-size:12px;color:#666;">Loaded: ${questions.length} items (Excel)</div>
    <button class="quiz-btn" style="width:100%;margin-top:12px;" onclick="startQuiz()">${esc(UI.start)}</button></div>`;
}

function startQuiz(){ if(!questions.length){ alert('No rows found for L5-E1b in Excel.'); return; } currentIndex=0; results=[]; resetQuestionState(); renderQuestion(); }
window.startQuiz=startQuiz;

function resetQuestionState(){
  stopDragTipArcHint(); stage='transform'; selectedMiddle=''; plan=null; droppedWords=[]; activeDropIndex=0; rewriteSolved=false; headConverted=false; hammering=false; hasFirstDragDone=false;
  assembleTargetGroup='flip'; assembleTargetText=''; assembleBank={original:[],flip:[]}; assembleSelected=[]; assembleSolved=false;
}

function renderQuestion(){ const q=qNow(); if(!q) return showResultPopup(); if(stage==='transform') return renderTransformStage(q); return renderAssembleStage(q); }

function pickMiddle(q){ const arr=(q.middleVariants||[]).filter(Boolean); return arr[Math.floor(Math.random()*arr.length)]||''; }

function renderTransformStage(q){
  const area=byId('quiz-area'); if(!area) return;
  if(!selectedMiddle) selectedMiddle=pickMiddle(q);
  if(!plan){ plan=buildPlan(q, selectedMiddle); droppedWords=new Array((plan.tailWords||[]).length).fill(''); activeDropIndex=0; }
  area.innerHTML=`
    <div class="q-label">${esc(UI.q)} ${currentIndex+1} / ${questions.length}</div>
    <div class="box"><div class="inst-simple">${esc(UI.inst)}</div></div>
    <div class="box">
      <div style="font-weight:900;color:#7e3106;margin-bottom:6px;">${esc(UI.lOrig)}</div>
      <div class="sentence"><div id="orig-line" class="rewrite-line"></div></div>
      <div style="font-weight:900;color:#7e3106;margin-top:10px;margin-bottom:6px;">${esc(UI.lMid)}</div>
      <div class="sentence flip-sentence hammer-stage-wrap"><div id="mid-line" class="rewrite-line"></div><div id="flip-guide" class="flip-guide" style="display:none;">${esc(UI.tapGuide)}</div></div>
      <div style="font-weight:900;color:#7e3106;margin-top:10px;margin-bottom:6px;">${esc(UI.lFlip)}</div>
      <div class="sentence"><div class="eng-line">${esc(q.flip)}</div></div>
    </div>`;
  renderStage1Lines(); wireStage1(); if(rewriteSolved&&!headConverted){ const g=byId('flip-guide'); if(g) g.style.display='block'; } else if(!rewriteSolved){ startDragTipArc(); }
}

function buildPlan(q, middleText){
  const srcRaw=tokenizeDisplay(q.source); const srcLower=srcRaw.map(cleanLower);
  const headSpan=findHeadSpan(srcLower); const flipHead=detectFlipHead(q.flip); const tailWords=splitWords(stripLeadingPhrase(q.flip, flipHead));
  const middleHead=deriveMiddleHead(middleText, tailWords) || middleText;
  const srcMov=[]; for(let i=0;i<srcRaw.length;i++){ if(headSpan&&i>=headSpan.start&&i<=headSpan.end) continue; const c=cleanWord(srcRaw[i]); if(c) srcMov.push(c); }
  return { srcRaw:srcRaw, headSpan:headSpan, srcMov:srcMov, tailWords:tailWords, middleHead:middleHead, flipHead:flipHead };
}

function renderStage1Lines(){
  const o=byId('orig-line'), m=byId('mid-line'); if(!o||!m||!plan) return;
  o.innerHTML=renderOrigLine(); m.innerHTML=renderMidLine();
}

function renderOrigLine(){
  const usedMask=getUsedMask(plan.srcMov, droppedWords); const out=[]; let cursor=0;
  for(let i=0;i<plan.srcRaw.length;i++){
    if(plan.headSpan && i===plan.headSpan.start){ out.push(`<span class="head-group">${esc(plan.srcRaw.slice(plan.headSpan.start, plan.headSpan.end+1).join(' '))}</span>`); i=plan.headSpan.end; continue; }
    const raw=plan.srcRaw[i], c=cleanWord(raw); if(!c){ out.push(esc(raw)); continue; }
    const usedCls=usedMask[cursor]?' used-ghost':'';
    if(!rewriteSolved&&!headConverted) out.push(`<span class="drag-source-word${usedCls}" data-source-index="${cursor}" data-word="${esc(c)}" draggable="true">${esc(c)}</span>`);
    else out.push(`<span class="${usedCls?'used-ghost':''}">${esc(c)}</span>`);
    cursor++;
  }
  return out.join(' ');
}

function renderMidLine(){
  if(rewriteSolved){
    const headText=headConverted?plan.flipHead:plan.middleHead; const cls=headConverted?'head-chip converted':'head-chip ready'; const dis=(headConverted||hammering)?'disabled':'';
    return `<button type="button" id="head-chip-btn" class="${cls}" ${dis}>${esc(headText)}</button> ${esc(plan.tailWords.join(' '))}`;
  }
  const slots=plan.tailWords.map(function(_,i){ const f=String(droppedWords[i]||'').trim(); const cls=`drop-word-slot${f?' filled':' empty'}${i===activeDropIndex?' active':''}`; return `<span class="${cls}" data-drop-index="${i}">${f?esc(f):'...'}</span>`; }).join(' ');
  return `<span class="head-group">${esc(plan.middleHead)}</span> ${slots}`;
}

function wireStage1(){
  if(!plan) return;
  if(!rewriteSolved&&!headConverted){
    Array.from(document.querySelectorAll('.drag-source-word[data-word]')).forEach(function(el){
      const w=String(el.getAttribute('data-word')||'').trim();
      el.addEventListener('dragstart', function(e){ if(rewriteSolved||headConverted) return; el.classList.add('dragging'); try{ e.dataTransfer.setData('text/plain',w);}catch(_){} });
      el.addEventListener('dragend', function(){ el.classList.remove('dragging'); });
      el.addEventListener('click', function(){ if(rewriteSolved||headConverted) return; fillDropWord(w); });
    });
    Array.from(document.querySelectorAll('.drop-word-slot')).forEach(function(slot){ const idx=Number(slot.getAttribute('data-drop-index')||0);
      slot.addEventListener('click', function(){ if(rewriteSolved||headConverted) return; activeDropIndex=idx; renderStage1Lines(); wireStage1(); startDragTipArc(); });
      slot.addEventListener('dragover', function(e){ if(rewriteSolved||headConverted) return; e.preventDefault(); slot.classList.add('over'); });
      slot.addEventListener('dragleave', function(){ slot.classList.remove('over'); });
      slot.addEventListener('drop', function(e){ if(rewriteSolved||headConverted) return; e.preventDefault(); slot.classList.remove('over'); const dt=String((e.dataTransfer&&e.dataTransfer.getData('text/plain'))||'').trim(); activeDropIndex=idx; fillDropWord(dt); });
    });
  }
  if(rewriteSolved&&!headConverted){ const b=byId('head-chip-btn'); if(b) b.addEventListener('click', onTapHead); }
}

function fillDropWord(word){
  const picked=normalizeSpaces(cleanWord(word)); if(!picked||!plan) return;
  let idx=Number(activeDropIndex)||0; if(idx<0||idx>=plan.tailWords.length) idx=0;
  droppedWords[idx]=normalizeClauseWordForIndex(picked,idx);
  if(!hasFirstDragDone){ hasFirstDragDone=true; stopDragTipArcHint(); }
  const next=droppedWords.findIndex(function(w){ return !String(w||'').trim(); }); activeDropIndex=next>=0?next:idx;
  renderStage1Lines(); wireStage1(); checkStage1Auto();
}

function checkStage1Auto(){
  if(!plan||rewriteSolved) return false; const exp=plan.tailWords||[]; if(!exp.length) return false;
  const user=exp.map(function(_,i){ return normalizeSpaces(droppedWords[i]||'').toLowerCase(); }); if(user.some(function(w){ return !w; })) return false;
  const ok=user.every(function(w,i){ return w===normalizeSpaces(exp[i]).toLowerCase(); });
  if(ok){ rewriteSolved=true; showToast('ok',UI.stageOk); renderTransformStage(qNow()); return true; }
  const bad=user.findIndex(function(w,i){ return w!==normalizeSpaces(exp[i]).toLowerCase(); }); if(bad>=0) activeDropIndex=bad;
  showToast('no',UI.stageNo); renderStage1Lines(); wireStage1(); startDragTipArc(); return false;
}
function onTapHead(){
  if(!rewriteSolved||hammering||headConverted) return; hammering=true; const b=byId('head-chip-btn'); if(b){ b.classList.add('hammer-hit'); spawnHammer(b); }
  setTimeout(function(){ headConverted=true; hammering=false; renderStage1Lines(); const g=byId('flip-guide'); if(g) g.style.display='none'; setTimeout(function(){ showToast('ok',UI.stageOk); prepareAssembleStage(); setTimeout(function(){ stage='assemble'; renderQuestion(); },220); },160); },260);
}

function spawnHammer(anchor){
  const host=anchor.closest('.hammer-stage-wrap')||anchor.parentElement; if(!host) return;
  const hr=host.getBoundingClientRect(), r=anchor.getBoundingClientRect(); const pop=document.createElement('div');
  pop.className='hammer-pop'; pop.innerHTML='<span>🔨</span>'; pop.style.left=((r.left-hr.left)+(r.width*.7))+'px'; pop.style.top=((r.top-hr.top)+4)+'px'; host.appendChild(pop);
  setTimeout(function(){ if(pop.parentNode) pop.parentNode.removeChild(pop); },420);
}

function prepareAssembleStage(){
  const q=qNow(); if(!q) return; stopDragTipArcHint(); assembleSolved=false; assembleSelected=[]; assembleTargetGroup=Math.random()<0.5?'original':'flip';
  assembleBank={ original: splitWordsKeepPunct(q.source).map(function(t,i){ return {id:'o-'+i+'-'+Math.random().toString(36).slice(2,7), text:t, group:'original'}; }),
                flip: splitWordsKeepPunct(q.flip).map(function(t,i){ return {id:'f-'+i+'-'+Math.random().toString(36).slice(2,7), text:t, group:'flip'}; }) };
  assembleTargetText=(assembleTargetGroup==='original')?q.source:q.flip;
}

function renderAssembleStage(q){
  const area=byId('quiz-area'); if(!area) return;
  const targetLabel=(assembleTargetGroup==='original')?UI.tOrig:UI.tFlip;
  area.innerHTML=`
    <div class="q-label">${esc(UI.q)} ${currentIndex+1} / ${questions.length}</div>
    <div class="box">
      <div style="font-weight:900;color:#7e3106;margin-bottom:6px;">${esc(UI.lOrig)}</div><div class="sentence"><div class="eng-line">${esc(q.source)}</div></div>
      <div style="font-weight:900;color:#7e3106;margin-top:10px;margin-bottom:6px;">${esc(UI.lMid)}</div><div class="sentence flip-sentence"><div class="eng-line">${esc(selectedMiddle)}</div></div>
      <div style="font-weight:900;color:#7e3106;margin-top:10px;margin-bottom:6px;">${esc(UI.lFlip)}</div><div class="sentence"><div class="eng-line">${esc(q.flip)}</div></div>
    </div>
    <div class="box">
      <div class="inst-simple">${esc(UI.assemble)}</div>
      <div class="target-pill ${assembleTargetGroup}">${esc(targetLabel)}</div>
      <div class="sentence"><div class="eng-line">${esc(assembleTargetText)}</div></div>
      <div id="answer-line" class="answer-line empty" style="margin-top:10px;"></div>
      <div class="hint-lines">${esc(UI.h1)}\n${esc(UI.h2)}</div>
      <div id="bank-wrap" class="dual-bank-wrap"></div>
      <div class="btn-row" style="margin-top:12px;"><button class="quiz-btn" id="submit-btn">${esc(UI.submit)}</button><button class="quiz-btn" id="next-btn" disabled>${esc(UI.next)}</button></div>
    </div>`;
  renderAssembleAnswer(); renderAssembleBank(); byId('submit-btn').addEventListener('click', submitAssemble); byId('next-btn').addEventListener('click', goNext);
}

function getActiveAssembleGroup(){ return assembleSelected.length ? (assembleSelected[0].group||'') : ''; }
function renderAssembleAnswer(){ const line=byId('answer-line'); if(!line) return; if(!assembleSelected.length){ line.classList.add('empty'); line.textContent=UI.ansPh; return; } line.classList.remove('empty'); line.innerHTML=assembleSelected.map(function(t){ return '<span class="answer-token">'+esc(t.text)+'</span>'; }).join(''); }
function renderAssembleBank(){
  const wrap=byId('bank-wrap'); if(!wrap) return; const active=getActiveAssembleGroup();
  function rowHtml(name){ const row=assembleBank[name]||[]; const dim=(active&&active!==name)?' dim':''; return '<div class="dual-bank-row'+dim+'" data-group="'+name+'">'+row.map(function(tok){
    const idx=assembleSelected.findIndex(function(x){ return x.id===tok.id; }); const isUsed=idx>=0; const locked=!!(active&&active!==tok.group); const isLast=isUsed&&idx===assembleSelected.length-1; const dis=isUsed?'':(locked?'disabled':''); const extra=isLast?' last-picked':'';
    return '<button type="button" class="dual-token '+tok.group+extra+'" data-token-id="'+esc(tok.id)+'" '+dis+'>'+esc(tok.text)+'</button>';
  }).join('')+'</div>'; }
  wrap.innerHTML=rowHtml('original')+'<div class="dual-bank-divider"></div>'+rowHtml('flip');
  Array.from(wrap.querySelectorAll('.dual-token')).forEach(function(btn){ btn.addEventListener('click', function(){ onClickAssembleToken(String(btn.getAttribute('data-token-id')||'')); }); });
}
function findAssembleToken(id){ return (assembleBank.original||[]).concat(assembleBank.flip||[]).find(function(t){ return t.id===id; })||null; }
function onClickAssembleToken(id){
  if(!id||assembleSolved) return; const exist=assembleSelected.findIndex(function(t){ return t.id===id; });
  if(exist>=0){ if(exist===assembleSelected.length-1){ assembleSelected.pop(); renderAssembleAnswer(); renderAssembleBank(); } else showToast('no',UI.undo); return; }
  const tok=findAssembleToken(id); if(!tok) return; const active=getActiveAssembleGroup(); if(active&&active!==tok.group) return;
  assembleSelected.push(tok); renderAssembleAnswer(); renderAssembleBank();
}
function submitAssemble(){
  if(assembleSolved) return; const joined=normalizeSpaces(assembleSelected.map(function(t){ return t.text; }).join(' '));
  if(joined!==normalizeSpaces(assembleTargetText)){ showToast('no',UI.stageNo); return; }
  assembleSolved=true; byId('submit-btn').disabled=true; byId('next-btn').disabled=false; showToast('ok',UI.stageOk);
}
function goNext(){
  if(!assembleSolved) return; const q=qNow(); if(q) results.push({no:q.no, source:q.source, middle:selectedMiddle, flip:q.flip, ok:true});
  currentIndex+=1; resetQuestionState(); renderQuestion();
}
window.goNext=goNext;

function showResultPopup(){
  const ov=byId('result-popup'), ct=byId('result-content'); if(!ov||!ct){ alert(UI.done); return; }
  const correct=results.filter(function(r){ return r.ok; }).length;
  ct.innerHTML='<div style="font-weight:900;font-size:18px;color:#7e3106;margin-bottom:10px;">'+esc(UI.done)+'</div>'+
               '<div style="font-weight:900;margin-bottom:8px;">'+correct+' / '+questions.length+'</div>'+
               '<div style="font-size:13px;color:#444;line-height:1.6;">'+esc(UI.doneDesc)+'</div>'+
               '<div style="margin-top:12px;"><button class="quiz-btn" style="width:100%;" id="retry-btn">'+esc(UI.retry)+'</button></div>';
  ov.style.display='flex'; byId('retry-btn').addEventListener('click', function(){ ov.style.display='none'; startQuiz(); });
}

function findHeadSpan(tokens){
  const phrases=[['something','strange'],['some','place'],['some','time'],['some','reason'],['some','way'],['one','color'],['something'],['someone']];
  let best=null; phrases.forEach(function(ph){ for(let i=0;i<=tokens.length-ph.length;i++){ let ok=true; for(let j=0;j<ph.length;j++){ if(tokens[i+j]!==ph[j]){ ok=false; break; } } if(ok&&(!best||ph.length>(best.end-best.start+1))) best={start:i,end:i+ph.length-1}; } });
  return best;
}
function detectFlipHead(text){ const s=normalizeSpaces(stripTrailingPunct(text)); if(/^which color\b/i.test(s)) return 'which color'; return splitWords(s)[0]||''; }
function deriveMiddleHead(middle, tailWords){ const m=splitWords(middle), t=(tailWords||[]).map(function(x){ return String(x||'').toLowerCase(); }); if(!t.length||m.length<t.length) return middle; for(let i=0;i<t.length;i++){ if(String(m[m.length-t.length+i]||'').toLowerCase()!==t[i]) return middle; } return normalizeSpaces(m.slice(0,m.length-t.length).join(' '))||middle; }
function stripLeadingPhrase(text, phrase){ const w=splitWords(text), p=splitWords(phrase); if(!p.length) return normalizeSpaces(text); for(let i=0;i<p.length;i++){ if((w[i]||'').toLowerCase()!==(p[i]||'').toLowerCase()) return normalizeSpaces(text); } return w.slice(p.length).join(' '); }
function tokenizeDisplay(text){ return String(text||'').trim().split(/\s+/).filter(Boolean).map(stripTrailingPunct); }
function splitWords(text){ return normalizeSpaces(stripTrailingPunct(text)).split(/\s+/).filter(Boolean); }
function splitWordsKeepPunct(text){ return normalizeSpaces(String(text||'')).split(/\s+/).filter(Boolean); }
function stripTrailingPunct(s){ return String(s||'').replace(/[.!?]+$/g,''); }
function cleanWord(s){ return String(s||'').replace(/^[^A-Za-z']+|[^A-Za-z']+$/g,''); }
function cleanLower(s){ return cleanWord(s).toLowerCase(); }
function normalizeSpaces(s){ return String(s||'').replace(/\s+/g,' ').trim(); }
function normalizeClauseWordForIndex(word, idx){ const w=normalizeSpaces(word); if(idx!==0) return w; const low=w.toLowerCase(); const set=new Set(['the','a','an','this','that','these','those','my','your','his','her','its','our','their','she','he','they','we','i','it','someone','many']); return set.has(low)?low:w; }
function getUsedMask(src, sel){ const cnt=new Map(); (sel||[]).forEach(function(w){ const k=normalizeSpaces(w).toLowerCase(); if(!k) return; cnt.set(k,(cnt.get(k)||0)+1); }); return (src||[]).map(function(w){ const k=normalizeSpaces(w).toLowerCase(); const c=cnt.get(k)||0; if(c<=0) return false; cnt.set(k,c-1); return true; }); }

function stopDragTipArcHint(){ if(typeof stopDragTipArc==='function'){ try{ stopDragTipArc(); }catch(_){} } stopDragTipArc=null; }
function startDragTipArc(){
  stopDragTipArcHint(); if(rewriteSolved||headConverted||hasFirstDragDone||!plan||!(plan.tailWords||[]).length) return;
  const source=document.querySelector('.drag-source-word[data-word]'); const target=document.querySelector('.drop-word-slot[data-drop-index="'+activeDropIndex+'"]')||document.querySelector('.drop-word-slot.empty')||document.querySelector('.drop-word-slot'); if(!source||!target) return;
  const tip=document.createElement('div'); tip.className='drag-tip-fly'; tip.textContent='drag'; document.body.appendChild(tip);
  let alive=true, rafId=0, cycleStart=0; const dur=1300,pause=220,lift=42; const ease=function(t){ return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2; };
  const frame=function(ts){ if(!alive) return; if(!document.body.contains(tip)){ alive=false; return; } if(!cycleStart) cycleStart=ts; let elapsed=ts-cycleStart; if(elapsed>dur+pause){ cycleStart=ts; elapsed=0; }
    const s=source.getBoundingClientRect(), t=target.getBoundingClientRect(); if(!s.width||!t.width){ rafId=requestAnimationFrame(frame); return; }
    const st={x:s.left+s.width/2,y:s.top+s.height/2}, en={x:t.left+t.width/2,y:t.top+t.height/2}, c={x:(st.x+en.x)/2,y:Math.min(st.y,en.y)-lift}; const moving=elapsed<=dur; const tt=ease(Math.max(0,Math.min(1,moving?elapsed/dur:1))); const omt=1-tt;
    const x=(omt*omt*st.x)+(2*omt*tt*c.x)+(tt*tt*en.x), y=(omt*omt*st.y)+(2*omt*tt*c.y)+(tt*tt*en.y); tip.style.opacity=moving?'.95':'0'; tip.style.transform='translate3d('+((x-tip.offsetWidth/2).toFixed(2))+'px,'+((y-tip.offsetHeight/2).toFixed(2))+'px,0)'; rafId=requestAnimationFrame(frame); };
  rafId=requestAnimationFrame(frame); stopDragTipArc=function(){ alive=false; cancelAnimationFrame(rafId); if(tip.parentNode) tip.parentNode.removeChild(tip); };
}

function showToast(type,msg){ if(window.HermaToastFX&&typeof window.HermaToastFX.show==='function'){ window.HermaToastFX.show(type,msg); return; } try{ console.log('[toast]',type,msg);}catch(_){} }
function esc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

})();
