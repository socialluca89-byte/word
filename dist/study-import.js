/* Local material review. Documents are never fetched, stored or uploaded here. */
(() => {
  const libraryURL='pdf.min.mjs?v=57456c8e0c81',workerURL='pdf.worker.min.mjs?v=9536359f1b83';
  const MAX_BYTES=4000000,MAX_PAGES=10,MAX_TEXT=12000;
  window.wordylandStudyImport={mount(form,{valid,invalidate}){
    const fileInput=form.querySelector('#studyFile'),text=form.querySelector('#studyText');
    const tools=document.createElement('section');tools.className='materialImport';
    tools.setAttribute('aria-label','Lettura locale dei materiali');
    tools.innerHTML='<p>Il documento resta in questo browser durante la lettura. PDF con testo: estrazione locale, fino a 10 pagine. Foto e scansioni: anteprima e trascrizione manuale; OCR non disponibile.</p><div id="studyLocalPreview"></div><button class="audio" type="button" id="extractStudyText" hidden>Leggi il testo del PDF</button> <button class="audio" type="button" id="cancelStudyImport" hidden>Annulla lettura</button> <button class="audio" type="button" id="clearStudyFile" hidden>Togli il file</button><p id="studyImportStatus" role="status" aria-live="polite"></p><label class="adultCheck"><input id="studyKeepAttachment" type="checkbox"> Salva anche il file come allegato privato sul sito alla conferma finale</label><p>Per creare esercizi, correggi il testo nel formato inglese = italiano. Nomi e altre informazioni personali non servono.</p><label class="adultCheck"><input id="studyReviewText" type="checkbox"> Ho controllato il testo, le traduzioni e le parole da usare negli esercizi</label>';
    fileInput.closest('label').after(tools);
    const preview=tools.querySelector('#studyLocalPreview'),status=tools.querySelector('#studyImportStatus'),extract=tools.querySelector('#extractStudyText'),cancel=tools.querySelector('#cancelStudyImport'),clear=tools.querySelector('#clearStudyFile'),review=tools.querySelector('#studyReviewText'),keep=tools.querySelector('#studyKeepAttachment');
    let revision=0;let disposed=false,epoch=0,selected=null,kind='',blobURL='',loading=null,activeWorker=null,timer=null,running=false;
    const alive=()=>!disposed&&form.isConnected&&valid();
    function invalidateReview(){revision++;review.checked=false;invalidate();}
    function stop(){epoch++;running=false;clearTimeout(timer);timer=null;const task=loading;loading=null;if(task)void task.destroy().catch(()=>{});activeWorker?.terminate();activeWorker=null;cancel.hidden=true;extract.disabled=false;text.readOnly=false;}
    function release(){if(blobURL){URL.revokeObjectURL(blobURL);blobURL='';}preview.replaceChildren();}
    const message=s=>{if(alive())status.textContent=s;};
    function reset(){stop();release();selected=null;kind='';keep.checked=false;extract.hidden=true;clear.hidden=true;invalidateReview();}
    async function choose(){
      reset();const file=fileInput.files[0];if(!file){message('Nessun file scelto. Puoi inserire il testo a mano.');return;}
      const attempt=epoch;
      try{
        if(file.size===0||file.size>MAX_BYTES)throw Error('Scegli un file non vuoto, massimo 4 MB.');
        const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
        if(!alive()||attempt!==epoch)return;
        const ascii=String.fromCharCode(...bytes);
        if(ascii.startsWith('%PDF-'))kind='pdf';
        else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)kind='image';
        else if(bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')kind='image';
        else if(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP')kind='image';
        else throw Error('Formato non supportato. Usa JPEG, PNG, WebP o PDF; puoi sempre inserire il testo a mano.');
        selected=file;clear.hidden=false;
        if(kind==='pdf'){extract.hidden=false;message('PDF pronto. La lettura non salva né allega il documento. Il testo scritto a mano potrebbe non essere leggibile.');return;}
        blobURL=URL.createObjectURL(file);const img=new Image();img.alt='Scheda scelta, anteprima locale da trascrivere';img.referrerPolicy='no-referrer';img.style.cssText='display:block;max-width:100%;max-height:360px;object-fit:contain';
        img.onload=()=>{if(!alive()||attempt!==epoch)return;if(img.naturalWidth*img.naturalHeight>24000000){release();message('Immagine troppo grande per l’anteprima. Riducila oppure trascrivi il testo a mano.');}else message('Anteprima locale: trascrivi le parole nel campo sotto. La foto non viene letta automaticamente.');};
        img.onerror=()=>{if(alive()&&attempt===epoch){release();message('Immagine non leggibile. Usa un’altra foto o inserisci il testo a mano.');}};
        img.src=blobURL;preview.append(img);
      }catch(error){if(alive()&&attempt===epoch){selected=null;kind='';fileInput.value='';message(error.message);}}
    }
    fileInput.addEventListener('change',choose);
    // The extraction limit must not truncate the existing manual text workflow.
    text.closest('label').after(review.closest('label'));
    const changed=()=>{if(running)stop();invalidateReview();};
    text.addEventListener('input',changed);
    const revised=()=>{revision++;};form.addEventListener('change',revised);keep.onchange=invalidate;review.onchange=invalidate;
    clear.onclick=()=>{reset();fileInput.value='';message('File tolto. Il testo già inserito resta modificabile: controllalo prima di confermare.');};
    cancel.onclick=()=>{stop();invalidateReview();message('Lettura annullata. Il testo precedente non è stato modificato.');};
    extract.onclick=async()=>{
      if(!alive()||running||!selected||kind!=='pdf')return;
      if(text.value.trim()&&!confirm('Sostituire il testo presente con il testo estratto? Se annulli, resta tutto come prima.'))return;
      if(typeof Worker==='undefined'){message('Questo browser non supporta la lettura PDF locale. Inserisci il testo a mano.');return;}
      stop();const attempt=epoch,file=selected;invalidateReview();running=true;text.readOnly=true;extract.disabled=true;cancel.hidden=false;
      message('Lettura locale del PDF… Puoi annullare.');
      timer=setTimeout(()=>{if(alive()&&epoch===attempt){stop();message('Lettura troppo lunga: annullata senza cambiare il testo. Prova meno pagine o inserisci le parole a mano.');}},20000);
      let task,port,pdfWorker;
      try{
        const pdfjs=await import('./'+libraryURL);
        if(!alive()||attempt!==epoch)return;
        port=new Worker(workerURL,{type:'module'});activeWorker=port;
        port.onerror=()=>{if(alive()&&attempt===epoch){stop();message('Il browser non riesce ad aprire il lettore PDF locale. Usa il testo manuale.');}};
        pdfWorker=new pdfjs.PDFWorker({port});
        const data=new Uint8Array(await file.arrayBuffer());
        if(!alive()||attempt!==epoch)return;
        // No URL, XFA, eval, fonts, WASM, CMaps or embedded resources are loaded.
        task=pdfjs.getDocument({data,worker:pdfWorker,isEvalSupported:false,enableXfa:false,useSystemFonts:false,disableFontFace:true,disableAutoFetch:true,useWasm:false,useWorkerFetch:false,stopAtErrors:true});loading=task;
        task.onPassword=()=>{if(alive()&&attempt===epoch){stop();message('PDF protetto da password: usa una copia non protetta o inserisci il testo a mano.');}};
        const pdf=await task.promise;
        if(pdf.numPages>MAX_PAGES)throw Error('Il PDF supera 10 pagine. Seleziona una scheda più breve o inserisci il testo a mano.');
        const pages=[];let length=0;
        for(let i=1;i<=pdf.numPages;i++){
          if(!alive()||attempt!==epoch)return;
          const page=await pdf.getPage(i),content=await page.getTextContent({disableNormalization:false});
          if(content.items.length>4000)throw Error('Pagina troppo complessa: usa una scheda più breve o il testo manuale.');
          let value='';for(const item of content.items){if(typeof item.str!=='string')continue;value+=item.str+(item.hasEOL?'\n':' ');if(value.length+length>MAX_TEXT)throw Error('Testo oltre 12.000 caratteri: dividi la scheda oppure trascrivi solo le parole utili.');}
          pages.push(value.trim());length+=value.length+1;page.cleanup();
        }
        const value=pages.join('\n').trim();
        if(!alive()||attempt!==epoch)return;
        if(!value){message('Non ho trovato testo selezionabile. Il PDF potrebbe essere una scansione: OCR non disponibile; inserisci le parole a mano.');return;}
        running=false;text.value=value;text.dispatchEvent(new Event('input',{bubbles:true}));
        message('Testo estratto localmente, non salvato. Controlla ordine, parole e traduzioni: il PDF può perdere colonne e righe. Poi spunta la revisione adulta.');text.focus({preventScroll:true});
      }catch(error){if(alive()&&attempt===epoch)message('Non riesco a estrarre il testo. '+(error?.name==='PasswordException'?'PDF protetto: usa il testo manuale.':/supera 10|12.000|complessa/.test(error?.message)?error.message:'Il PDF può essere danneggiato o non supportato; il testo precedente resta disponibile.'));}
      finally{if(task)await task.destroy().catch(()=>{});pdfWorker?.destroy();port?.terminate();if(activeWorker===port)activeWorker=null;if(alive()&&attempt===epoch){loading=null;running=false;clearTimeout(timer);timer=null;text.readOnly=false;cancel.hidden=true;extract.disabled=false;}}
    };
    return {
      revision(){return revision;},
      checked(){return alive()&&!running&&review.checked;},
      attachment(){return alive()&&keep.checked?selected:null;},
      dispose(){if(disposed)return;stop();release();disposed=true;selected=null;fileInput.value='';form.removeEventListener('change',revised);fileInput.removeEventListener('change',choose);text.removeEventListener('input',changed);}
    };
  }};
})();
