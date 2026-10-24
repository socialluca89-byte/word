/* Anonymous revision: no accounts, local storage, score queue or private API requests. */
(()=>{
 const topic=document.querySelector('#offlineTopic'),work=document.querySelector('#offlineWork'),feedback=document.querySelector('#offlineFeedback'),next=document.querySelector('#offlineNext');
 let bank=null,word=null,previous=null;
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function draw(){
  const pool=bank[topic.value];const choices=pool.filter(w=>w[0]!==previous);word=(choices.length?choices:pool)[Math.floor(Math.random()*(choices.length||pool.length))];previous=word[0];
  const options=[word,...pool.filter(w=>w[0]!==word[0]).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
  feedback.textContent='';next.hidden=true;
  work.innerHTML='<p class="offlinePicture" aria-hidden="true">'+escape(word[2]||'📚')+'</p><p class="offlineHint">Come si dice in inglese?</p><p class="offlinePrompt">'+escape(word[1])+'</p><button id="offlineAudio" type="button">🔊 Ascolta</button><div class="offlineOptions">'+options.map((w,i)=>'<button type="button" data-option="'+i+'">'+escape(w[0])+'</button>').join('')+'</div>';
  work.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>{
   if(options[Number(button.dataset.option)][0]===word[0]){button.classList.add('correct');feedback.textContent='Esatto! '+word[0]+' = '+word[1]+'.';next.hidden=false;work.querySelectorAll('[data-option]').forEach(b=>b.disabled=true);next.focus();}
   else{button.disabled=true;feedback.textContent='Un altro tentativo: prenditi il tuo tempo.';}
  });
  work.querySelector('#offlineAudio').onclick=()=>{
   if(!('speechSynthesis'in window)){feedback.textContent='La voce non è disponibile. Puoi leggere le parole e continuare.';return;}
   speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(word[0]);utterance.lang='en-GB';utterance.rate=.8;utterance.onerror=()=>{feedback.textContent='La voce non è disponibile offline. Puoi continuare leggendo.';};speechSynthesis.speak(utterance);
  };
 }
 topic.onchange=()=>{if(bank){if('speechSynthesis'in window)speechSynthesis.cancel();draw();}};next.onclick=draw;
 fetch('curriculum.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{bank=data;draw();}).catch(()=>{work.textContent='Il ripasso non è ancora scaricato. Apri WordyLand con Internet almeno una volta, poi riprova.';topic.disabled=true;});
})();
