/* Child-friendly feedback shared by practice, missions, duels and offline revision. */
(()=>{
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normal=value=>String(value??'').toLowerCase().replace(/[’‘]/g,"'").trim().replace(/[?!.,]+$/,'').replace(/\s+/g,' ');
 const positions={'in front of':'davanti','next to':'accanto',between:'tra due cose',behind:'dietro',under:'sotto',on:'sopra',in:'dentro',by:'accanto'};
 const quantities=['one','two','three','four','five','six','seven','eight','nine','ten'],italian=['uno','due','tre','quattro','cinque','sei','sette','otto','nove','dieci'];
 const position=value=>normal(value).match(/(?:^| )(in front of|next to|between|behind|under|on|in|by)(?= |$)/)?.[1];
 const quote=value=>'«'+String(value??'').slice(0,100)+'»';
 function expected(question){const word=String(question.word||'');if(['missing','gap'].includes(question.kind)&&question.mask){const start=question.mask.indexOf('_');if(start>=0){let end=start;while(question.mask[end]==='_')end++;return word.slice(start,end);}}return question.answer||word;}
 function explain(context){
  const target=normal(context.expected),answer=normal(context.answer),word=normal(context.word||context.expected),kind=context.kind,translation=context.translation||'';
  if(!target)return 'Riascolta e guarda bene. Puoi provare ancora.';
  if(kind==='gap'&&answer===word&&target!==word)return 'Nello spazio serve solo la parte mancante: '+quote(context.expected)+'. La frase intera è già scritta.';
  const count=quantities.indexOf(target.split(' ')[0]),chosen=quantities.indexOf(answer.split(' ')[0]);
  if(count>=0){
   if(/^\d+$/.test(answer))return 'Il numero è '+(count+1)+'. Qui scrivilo in inglese: '+quote(quantities[count])+'.';
   if(chosen>=0&&chosen!==count)return 'Hai scelto '+(chosen+1)+'. Conta le figure: sono '+(count+1)+'. '+quote(quantities[count])+' vuol dire '+italian[count]+'.';
   if(kind==='count')return count===0?'Quando è uno solo, il nome non vuole la s finale. Guarda: '+quote(context.expected)+'.':'Sono più di uno. Guarda come si scrive: '+quote(context.expected)+'.';
  }
  const wantedPosition=position(target),chosenPosition=position(answer);
  if(wantedPosition&&chosenPosition&&wantedPosition!==chosenPosition)return 'Hai scelto '+quote(positions[chosenPosition])+'. Guarda la scena: qui è '+quote(positions[wantedPosition])+'. In inglese si dice '+quote(wantedPosition)+'.';
  if(kind==='dialogue'){
   const prompt=normal(context.prompt);
   if(/your name/.test(prompt))return 'La domanda chiede il nome. Si risponde con '+quote(context.expected)+'.';
   if(/how old/.test(prompt))return 'La domanda chiede quanti anni hai. Si risponde con '+quote(context.expected)+'.';
   if(/how are/.test(prompt))return 'La domanda chiede come stai. La risposta è '+quote(context.expected)+'.';
   return 'Ascolta la domanda: '+quote(context.prompt)+'. La risposta che va insieme è '+quote(context.expected)+'.';
  }
  if(kind==='missing')return 'Qui manca la lettera '+quote(context.expected)+'. Guarda la parola completa: '+quote(context.word)+'.';
  if(kind==='choice'||kind==='match')return 'Hai scelto '+quote(context.chosenTranslation||context.answer)+'. Per dire '+quote(translation||'questa parola')+' serve '+quote(context.expected)+'.';
  let index=0;while(index<Math.min(target.length,answer.length)&&target[index]===answer[index])index++;
  if(index===answer.length&&answer.length<target.length)return 'Hai scritto '+quote(context.answer)+'. Manca ancora '+quote(target.slice(index))+'. Completiamo la parola!';
  if(index===target.length&&answer.length>target.length)return 'Hai aggiunto '+quote(answer.slice(index))+' in più. La risposta finisce qui: '+quote(context.expected)+'.';
  const prefix=target.slice(0,index);
  return (prefix?'Dopo '+quote(prefix)+' serve ': 'La prima lettera è ')+quote(target[index]===' '?'uno spazio':target[index])+'. Tu hai scritto '+quote(answer[index]===' '?'uno spazio':answer[index]||'')+'. Guarda e riprova.';
 }
 function mark(element,correct){
  if(!element)return;element.classList.remove('answerWrong','answerCorrect');element.classList.add(correct?'answerCorrect':'answerWrong');
  if(element.matches('input'))element.setAttribute('aria-invalid',String(!correct));
  else if(element.matches('button')){element.querySelector('.answerMark')?.remove();const symbol=document.createElement('span');symbol.className='answerMark';symbol.setAttribute('aria-hidden','true');symbol.textContent=correct?'✓':'✕';element.append(symbol);}
 }
 function show(container,correct,context={}){
  if(!container)return;
  const explanation=correct?(context.message||'Hai trovato la risposta. Un’altra scoperta per te!'):explain(context);
  const sample=context.word||context.expected||'',display=correct?sample:context.expected||sample;
  const animate=correct&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.animations!=='paused';
  container.setAttribute('aria-live','polite');container.setAttribute('aria-atomic','true');
  container.innerHTML='<div class="learningFeedback '+(correct?'feedbackSuccess':'feedbackRetry')+(animate?' feedbackAnimated':'')+'"><div class="feedbackMark" aria-hidden="true">'+(correct?'✓':'✕')+'</div><div class="feedbackCopy"><h4>'+(correct?'Esatto! Ben fatto!':context.retry===false?'Guardiamo insieme!':'Un altro tentativo, insieme!')+'</h4><p class="learningExplanation">'+escape(explanation)+'</p>'+(display?'<div class="feedbackModel"><small>'+(correct?'La tua scoperta':'Guarda bene la risposta')+'</small><strong>'+escape(display)+'</strong></div>':'')+(correct?'<div class="feedbackStars" aria-hidden="true"><span>⭐</span><span>🌟</span><span>⭐</span></div>':'')+('speechSynthesis'in window?'<div class="feedbackAudio">'+(!correct?'<button type="button" data-explain-audio>🔊 Ascolta la spiegazione</button>':'')+'<button type="button" data-word-audio>🔊 Ascolta in inglese</button></div><small class="feedbackVoiceNote" role="status"></small>':'')+'</div></div>';
  mark(context.button,correct);mark(context.input,correct);
  if(context.input&&container.id)context.input.setAttribute('aria-describedby',container.id);
  function speak(message,lang){speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(message);utterance.lang=lang;utterance.rate=.8;utterance.onerror=()=>{const note=container.querySelector('.feedbackVoiceNote');if(note)note.textContent='La voce non è disponibile. Puoi leggere la spiegazione.';};speechSynthesis.speak(utterance);}
  container.querySelector('[data-explain-audio]')?.addEventListener('click',()=>speak(explanation,'it-IT'));
  container.querySelector('[data-word-audio]')?.addEventListener('click',()=>speak(sample,'en-GB'));
  requestAnimationFrame(()=>{if(!container.isConnected)return;const box=container.getBoundingClientRect();if(box.bottom>innerHeight||box.top<0)container.scrollIntoView({block:'nearest',behavior:animate?'smooth':'instant'});});
 }
 window.wordylandLearning={expected,explain,show,mark};
})();
