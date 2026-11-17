(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const storage={get(key,fallback){try {return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}};
  const defaults={wallet:0,best:0,runs:0,owned:['mint','classic'],skin:'mint',trail:'classic',lang:'ru',theme:null};
  let profile={...defaults,...storage.get('parkour.profile',{})};
  if(!['ru','en'].includes(profile.lang))profile.lang='ru';
  if(!Array.isArray(profile.owned))profile.owned=defaults.owned;
  for(const k of ['wallet','best','runs'])if(!Number.isFinite(profile[k])||profile[k]<0)profile[k]=0;
  let dictionary=ParkourData.i18n[profile.lang],topic='mix',custom=null,builtins=[],busy=false,shopPaused=false;
  const t=key=>dictionary[key]||key;
  const items=[{id:'mint',name:'mint',color:'#355944',price:0,type:'skin'},{id:'blue',name:'blue',color:'#397cb7',price:80,type:'skin'},{id:'rose',name:'rose',color:'#d46655',price:100,type:'skin'},{id:'classic',name:'defaultTrail',color:'#9db48c',price:0,type:'trail'},{id:'gold',name:'gold',color:'#d5b34d',price:150,type:'trail'}];
  const skin=()=>{const item=items.find(i=>i.id===profile.skin);const dark=getComputedStyle(document.body).colorScheme==='dark';return profile.skin==='mint'&&dark?'#b6d593':item?.color||'#355944';};
  function announce(message){$('live').textContent=message;}
  let storageWarning=false;
  function persistProfile(){if(!storage.set('parkour.profile',profile)&&!storageWarning){storageWarning=true;announce(t('savedWarning'));}updateProfile();}
  function updateProfile(){$('best').textContent=profile.best;$('wallet').textContent=profile.wallet;$('shopWallet').textContent=profile.wallet;$('totalRuns').textContent=profile.runs;}
  function applyTranslations(){document.documentElement.lang=profile.lang;document.title=`${t('brand')} · Open source playground`;document.querySelectorAll('[data-i18n]').forEach(el=>{const value=t(el.dataset.i18n);el.replaceChildren(...value.split('<br>').flatMap((part,i)=>i?[document.createElement('br'),document.createTextNode(' '+part)]:[document.createTextNode(part)]));});$('lang').textContent=profile.lang==='ru'?'EN':'RU';}
  function lock(value){['start','timerEnabled','runLength','lang','importFile','importUrl'].forEach(id=>$(id).disabled=value);document.querySelectorAll('.topic,#importForm button').forEach(el=>el.disabled=value);$('pause').hidden=!value;}
  function hud(s){$('hearts').textContent='♥ '.repeat(s.lives)+'♡ '.repeat(3-s.lives);$('hearts').setAttribute('aria-label',`${s.lives} / 3`);$('score').textContent=s.score;$('runCoins').textContent=s.coins;$('distance').textContent=String(s.index*12+s.finalJump*5).padStart(3,'0');$('sceneLevel').textContent=String(Math.min(3,Math.floor(s.index/4)+1)).padStart(2,'0');}
  const renderer=new Parkour.Renderer($('game'));
  function locationFor(selected){
    const location=['basics','dpg','community','github'].includes(selected)?selected:'mix';
    document.body.dataset.location=location;renderer.location=location;
    $('modeLabel').textContent=location==='mix'?t('training'):t(location);
  }
  function selectTopic(selected){
    topic=selected;document.querySelectorAll('.topic').forEach(b=>{const active=b.dataset.topic===topic;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});locationFor(topic);
  }
  function button(text,cls){const b=document.createElement('button');b.className=cls;b.textContent=text;return b;}
  const game=new Parkour.Game(renderer,{
    t,skin,trail:()=>profile.trail,coins:n=>{profile.wallet+=n;persistProfile();},hud,
    timer(s){if(s.phase==='idle'||s.phase==='finished')return;$('timerBar').style.width=`${s.timer&&s.phase==='question'?s.remaining/20*100:100}%`;$('timerText').textContent=s.phase==='final'||s.phase==='finalAnimating'?'3 ↗':s.timer?`${Math.ceil(s.remaining)} ${t('seconds')}`:'∞';},
    question(s){lock(true);hud(s);$('feedback').hidden=true;$('finalControls').hidden=true;$('questionCount').textContent=`${t('question')} ${s.index+1} / ${game.questions.length} · ${t(s.current.topic)}`;$('questionTitle').textContent=s.current.question;$('questionSub').textContent=`${'●'.repeat(s.current.difficulty)}${'○'.repeat(3-s.current.difficulty)}${game.streak>1?' · '+t('streak')+' ×'+game.streak:''}`;$('sceneHint').textContent=s.checkpoint>0?`⚑ ${t('checkpoint')} · ${s.checkpoint} / ${game.questions.length}`:t('sceneHint');locationFor(s.current.topic);$('answers').replaceChildren();
      s.current.answers.forEach((answer,i)=>{const b=button('','answer');const k=document.createElement('kbd');k.textContent=String.fromCharCode(65+i);const span=document.createElement('span');span.textContent=answer;b.append(k,span);b.setAttribute('aria-keyshortcuts',`${i+1} ${String.fromCharCode(65+i)}`);b.addEventListener('click',()=>game.answer(i));$('answers').append(b);});announce(s.current.question);
    },
    answer(ok,index,s){document.querySelectorAll('.answer').forEach((b,i)=>{b.disabled=true;b.classList.toggle('correct',i===s.current.correct);b.classList.toggle('wrong',i===index&&!ok);});hud(s);},
    feedback(ok,index,s){$('feedback').hidden=false;$('feedbackTitle').textContent=t(ok?'correct':index===-1?'timeout':'incorrect');$('feedbackText').textContent=`${t('correctAnswer')} ${s.current.answers[s.current.correct]}. ${s.current.explanation}${!ok&&s.lives>0?' '+t('backCheckpoint')+': '+(s.checkpoint+1)+'.':''}`;$('feedbackSource').href=s.current.source;$('next').textContent=t(ok&&s.index===game.questions.length-1?'finishCourse':'continue');announce($('feedbackTitle').textContent+' '+$('feedbackText').textContent);$('next').focus({preventScroll:true});},
    checkpoint(saved,s){$('sceneHint').textContent=`⚑ ${t(saved?'checkpoint':'backCheckpoint')} · ${s.checkpoint}`;announce($('sceneHint').textContent);},
    final(s){lock(true);hud(s);$('answers').replaceChildren();$('feedback').hidden=true;$('finalControls').hidden=false;$('questionCount').textContent=t('final');$('modeLabel').textContent=t('final');$('questionTitle').textContent=t('finalTitle');$('questionSub').textContent=t('finalSub');$('sceneHint').textContent='⚑ 1 / 3';$('jump').focus({preventScroll:true});announce(t('finalTitle')+' '+t('finalSub'));},
    finalResult(ok,s){hud(s);$('sceneHint').textContent=`${t(ok?'finalSuccess':'finalFail')} ${Math.min(s.finalJump+1,3)} / 3`;announce($('sceneHint').textContent);},
    finish(result){const {won,state,accuracy,mistakes}=result;lock(false);hud(state);profile.best=Math.max(profile.best,state.score);profile.runs++;persistProfile();$('resultTitle').textContent=t(won?'finished':'gameOver');$('resultStats').replaceChildren();for(const [n,label] of [[state.score,'points'],[accuracy+'%','accuracy'],[state.coins,'coins']]){const div=document.createElement('div'),b=document.createElement('b'),span=document.createElement('span');b.textContent=n;span.textContent=t(label);div.append(b,span);$('resultStats').append(div);}
      $('mistakes').replaceChildren();if(!mistakes.length){const p=document.createElement('p');p.textContent=t('noMistakes');$('mistakes').append(p);}for(const m of mistakes){const div=document.createElement('div');div.className='mistake';const title=document.createElement('strong');title.textContent=m.question;const a=document.createElement('p');a.textContent=`${t('yourAnswer')} ${m.chosen<0?t('noAnswer'):m.answers[m.chosen]}`;const right=document.createElement('p');right.textContent=`${t('correctAnswer')} ${m.answers[m.correct]}. ${m.explanation}`;const link=document.createElement('a');link.href=m.source;link.textContent=t('source');link.target='_blank';link.rel='noopener noreferrer';div.append(title,a,right,link);$('mistakes').append(div);}
      $('resultDialog').showModal();announce($('resultTitle').textContent);},
    persist(data){storage.set('parkour.run',data?{...data,lang:profile.lang}:null);}
  });
  function idle(){game.state={phase:'idle',paused:false,current:null,index:0,lives:3,score:0,coins:0,checkpoint:0,remaining:20,gauge:0,finalJump:0};game.renderer.animation=null;hud(game.state);lock(false);$('feedback').hidden=true;$('finalControls').hidden=true;$('answers').replaceChildren();$('questionTitle').textContent=t('readyTitle');$('questionSub').textContent=t('readySub');$('questionCount').textContent=t('ready');$('modeLabel').textContent=t('training');$('sceneHint').textContent=t('sceneHint');$('timerText').textContent='20 '+t('seconds');$('timerBar').style.width='100%';locationFor(topic);}
  async function start(){if(busy)return;busy=true;$('start').disabled=true;try{if(!builtins.length)builtins=await Parkour.Questions.builtin(profile.lang);const data=topic==='custom'?custom:builtins;const questions=Parkour.Questions.prepare(data,topic,$('runLength').value);if(!questions.length)throw Error(t('invalid'));game.start(questions,{timer:$('timerEnabled').checked,topic,length:$('runLength').value});$('game').scrollIntoView({block:'center',behavior:renderer.reduced?'instant':'smooth'});$('answers').firstElementChild?.focus({preventScroll:true});}catch(e){announce(e.message);$('importStatus').textContent=e.message;lock(false);}finally{busy=false;}}
  $('start').onclick=start;$('next').onclick=()=>game.next();$('jump').onclick=()=>game.finalJump();$('retry').onclick=()=>{$('resultDialog').close();start();};
  document.querySelectorAll('.topic').forEach(b=>b.addEventListener('click',()=>selectTopic(b.dataset.topic)));
  document.querySelectorAll('.topic').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic==='mix')));
  $('lang').onclick=async()=>{profile.lang=profile.lang==='ru'?'en':'ru';dictionary=ParkourData.i18n[profile.lang];builtins=[];applyTranslations();persistProfile();idle();};
  if(['light','dark'].includes(profile.theme))document.body.dataset.theme=profile.theme;
  $('theme').onclick=()=>{const dark=document.body.dataset.theme?document.body.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;profile.theme=dark?'light':'dark';document.body.dataset.theme=profile.theme;persistProfile();};
  function pause(){if(['idle','finished'].includes(game.state.phase))return;game.pause(true);if(!$('pauseDialog').open)$('pauseDialog').showModal();}
  function resume(){game.pause(false);$('pauseDialog').close();}
  $('pause').onclick=pause;$('resume').onclick=resume;$('pauseDialog').addEventListener('cancel',e=>{e.preventDefault();resume();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  $('shopOpen').onclick=()=>{shopPaused=!['idle','finished'].includes(game.state.phase)&&!game.state.paused;if(shopPaused)game.pause(true);renderShop();$('shopDialog').showModal();};
  $('shopDialog').addEventListener('close',()=>{if(shopPaused)game.pause(false);shopPaused=false;});
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  function renderShop(){updateProfile();$('shopItems').replaceChildren();$('shopStatus').textContent='';items.forEach(item=>{const row=document.createElement('div');row.className='shop-item';const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=item.color;const label=document.createElement('span');label.textContent=t(item.name);const owned=profile.owned.includes(item.id),equipped=profile[item.type]===item.id;const b=button(equipped?t('equipped'):owned?t('owned'):`◈ ${item.price} · ${t('buy')}`,'outline');b.disabled=equipped;b.onclick=()=>{if(!owned){if(profile.wallet<item.price){$('shopStatus').textContent=t('notEnough');return;}profile.wallet-=item.price;profile.owned.push(item.id);}profile[item.type]=item.id;persistProfile();renderShop();$('shopStatus').textContent=t('equippedMsg');};row.append(swatch,label,b);$('shopItems').append(row);});}
  function imported(data){custom=data;$('customTopic').hidden=false;$('customCount').textContent=String(data.length);$('importStatus').textContent=t('importOk');$('customTopic').click();}
  $('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2*1024*1024)throw Error('Maximum size is 2 MB');imported(Parkour.Questions.parse(await file.text()));}catch(err){$('importStatus').textContent=t('importError')+' '+err.message;}e.target.value='';};
  $('importForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;$('importStatus').textContent=t('loading');try{imported(await Parkour.Questions.fromURL($('importUrl').value));}catch(err){$('importStatus').textContent=t('importError')+' '+err.message;}finally{b.disabled=!['idle','finished'].includes(game.state.phase);}};
  document.addEventListener('keydown',e=>{if(e.repeat||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){pause();return;}if(game.state.phase==='final'&&(e.code==='Space'||e.code==='Enter')){e.preventDefault();game.finalJump();return;}const key=e.key.toLowerCase();let index='1234'.indexOf(key);if(index<0)index='abcd'.indexOf(key);if(index>=0){e.preventDefault();game.answer(index);}});
  $('game').addEventListener('pointerup',e=>{const r=$('game').getBoundingClientRect();const index=renderer.hit(e.clientX-r.left,e.clientY-r.top);if(index>=0){if(game.state.phase==='final')game.finalJump();else game.answer(index);}});
  applyTranslations();updateProfile();const saved=storage.get('parkour.run',null);const builtinIds=new Set(ParkourData.questions[profile.lang].map(q=>q.id));const compatible=saved?.options?.topic==='custom'||(Array.isArray(saved?.questions)&&saved.questions.every(q=>builtinIds.has(q.id)));if(saved&&!compatible)storage.set('parkour.run',null);if(saved&&compatible&&saved.lang===profile.lang&&game.restore(saved)){if(game.state.phase!=='finished'){selectTopic(game.options?.topic||'mix');locationFor(game.state.current?.topic||game.options?.topic);$('pauseDialog').showModal();announce(t('restored'));}}else idle();
  // Exposed for deterministic integration tests and contributor debugging.
  window.Parkour.app={game,renderer,storage};
})();
