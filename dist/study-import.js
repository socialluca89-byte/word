/* Local material review. Documents are never fetched, stored or uploaded here. */
(() => {
  const libraryURL='pdf.min.js?v=57456c8e0c81',workerURL='pdf.worker.min.js?v=9536359f1b83';
  const ocrURL='study-ocr.js?v=a0d7b8dc26ce';
  const MAX_BYTES=4000000,MAX_PAGES=10,MAX_TEXT=12000;
  window.wordylandStudyImport={mount(form,{valid,invalidate}){
    const fileInput=form.querySelector('#studyFile'),text=form.querySelector('#studyText');
    const tools=document.createElement('section');tools.className='materialImport';
    tools.setAttribute('aria-label','Lettura locale dei materiali');
    tools.innerHTML='<p>Il documento resta in questo browser durante la lettura. PDF con testo: estrazione locale, fino a 10 pagine. Foto e scansioni come immagini: OCR locale sperimentale per testo stampato, sempre da correggere. La scrittura a mano non è garantita.</p><div id="studyLocalPreview"></div><button class="audio" type="button" id="extractStudyText" hidden>Leggi il testo del PDF</button> <label id="studyPDFPageLabel" hidden>Pagina scansionata da leggere · una alla volta<input id="studyPDFPage" type="number" min="1" max="10" step="1" value="1" inputmode="numeric"></label><button class="audio" type="button" id="extractStudyPDFScan" hidden>Leggi la pagina scansionata · OCR locale</button> <button class="audio" type="button" id="extractStudyOCR" hidden>Leggi il testo della foto · OCR locale</button> <button class="audio" type="button" id="cancelStudyImport" hidden>Annulla lettura</button> <button class="audio" type="button" id="clearStudyFile" hidden>Togli il file</button><p id="studyImportStatus" role="status" aria-live="polite"></p><label class="adultCheck"><input id="studyKeepAttachment" type="checkbox"> Salva anche il file come allegato privato sul sito alla conferma finale</label><p>Per creare esercizi, correggi il testo nel formato inglese = italiano. Nomi e altre informazioni personali non servono.</p><label class="adultCheck"><input id="studyReviewText" type="checkbox"> Ho controllato il testo, le traduzioni e le parole da usare negli esercizi</label>';
    fileInput.closest('label').after(tools);
    const preview=tools.querySelector('#studyLocalPreview'),status=tools.querySelector('#studyImportStatus'),extract=tools.querySelector('#extractStudyText'),scan=tools.querySelector('#extractStudyPDFScan'),pageInput=tools.querySelector('#studyPDFPage'),pageLabel=tools.querySelector('#studyPDFPageLabel'),ocr=tools.querySelector('#extractStudyOCR'),cancel=tools.querySelector('#cancelStudyImport'),clear=tools.querySelector('#clearStudyFile'),review=tools.querySelector('#studyReviewText'),keep=tools.querySelector('#studyKeepAttachment');
    let revision=0;let disposed=false,epoch=0,selected=null,kind='',blobURL='',loading=null,activeOCR=null,activeWorker=null,activeRender=null,scanCanvas=null,timer=null,running=false;
    const alive=()=>!disposed&&form.isConnected&&valid();
    function invalidateReview(){revision++;review.checked=false;invalidate();}
    function stop(){epoch++;running=false;clearTimeout(timer);timer=null;const task=loading;loading=null;if(task)void task.destroy().catch(()=>{});activeRender?.cancel();activeRender=null;if(scanCanvas){scanCanvas.width=scanCanvas.height=0;scanCanvas=null;}activeWorker?.terminate();activeWorker=null;activeOCR?.abort();activeOCR=null;cancel.hidden=true;extract.disabled=false;scan.disabled=false;pageInput.disabled=false;ocr.disabled=false;text.readOnly=false;}
    function release(){if(blobURL){URL.revokeObjectURL(blobURL);blobURL='';}preview.replaceChildren();}
    const message=s=>{if(alive())status.textContent=s;};
    function reset(){stop();release();selected=null;kind='';keep.checked=false;extract.hidden=true;scan.hidden=true;pageLabel.hidden=true;pageInput.value=1;ocr.hidden=true;clear.hidden=true;invalidateReview();}
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
        if(kind==='pdf'){extract.hidden=false;scan.hidden=false;pageLabel.hidden=false;message('PDF pronto. Usa il testo selezionabile oppure OCR della sola pagina scelta (PDF massimo 10 pagine). Il documento non viene allegato senza la tua conferma; la calligrafia non è garantita.');return;}
        try{const imageTools=await import('./'+ocrURL);await imageTools.inspectImage(file);}catch(error){if(alive()&&attempt===epoch)message((error?.message||'Anteprima/OCR non disponibile.')+' Puoi trascrivere il testo; l’allegato privato resta facoltativo.');return;}if(!alive()||attempt!==epoch)return;
        blobURL=URL.createObjectURL(file);const img=new Image();img.alt='Scheda scelta, anteprima locale da trascrivere';img.referrerPolicy='no-referrer';img.style.cssText='display:block;max-width:100%;max-height:360px;object-fit:contain';
        img.onload=()=>{if(!alive()||attempt!==epoch)return;if(img.naturalWidth*img.naturalHeight>8000000){release();message('Immagine troppo grande per l’anteprima. Riducila oppure trascrivi il testo a mano.');}else{ocr.hidden=false;message('Anteprima locale: scegli OCR sperimentale per testo stampato, oppure trascrivi le parole nel campo sotto. Nulla viene letto prima del tuo comando.');}};
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
      stop();const attempt=epoch,file=selected;invalidateReview();running=true;text.readOnly=true;extract.disabled=true;scan.disabled=true;pageInput.disabled=true;cancel.hidden=false;
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
        if(!value){message('Non ho trovato testo selezionabile. Il PDF potrebbe essere una scansione: scegli la pagina e premi Leggi la pagina scansionata, oppure inserisci le parole a mano.');return;}
        running=false;text.value=value;text.dispatchEvent(new Event('input',{bubbles:true}));
        message('Testo estratto localmente, non salvato. Controlla ordine, parole e traduzioni: il PDF può perdere colonne e righe. Poi spunta la revisione adulta.');text.focus({preventScroll:true});
      }catch(error){if(alive()&&attempt===epoch)message('Non riesco a estrarre il testo. '+(error?.name==='PasswordException'?'PDF protetto: usa il testo manuale.':/supera 10|12.000|complessa/.test(error?.message)?error.message:'Il PDF può essere danneggiato o non supportato; il testo precedente resta disponibile.'));}
      finally{if(task)await task.destroy().catch(()=>{});pdfWorker?.destroy();port?.terminate();if(activeWorker===port)activeWorker=null;if(alive()&&attempt===epoch){loading=null;running=false;clearTimeout(timer);timer=null;text.readOnly=false;cancel.hidden=true;extract.disabled=false;scan.disabled=false;pageInput.disabled=false;}}
    };
    ocr.onclick=async()=>{
      if(!alive()||running||!selected||kind!=='image')return;
      if(text.value.trim()&&!confirm('Sostituire il testo presente con una bozza OCR da correggere? Se annulli, resta tutto come prima.'))return;
      stop();const attempt=epoch,file=selected,controller=new AbortController();activeOCR=controller;invalidateReview();running=true;text.readOnly=true;ocr.disabled=true;cancel.hidden=false;
      message('Preparo OCR locale… Puoi annullare. Non è adatto a ogni foto o alla scrittura a mano.');
      timer=setTimeout(()=>{if(alive()&&attempt===epoch){stop();message('OCR troppo lento: annullato senza cambiare il testo. Riduci la foto oppure trascrivi le parole.');}},45000);
      try{
        const engine=await import('./'+ocrURL);if(!alive()||attempt!==epoch)return;
        const result=await engine.recognize(file,{signal:controller.signal,progress:note=>{if(alive()&&attempt===epoch)message(note);}});
        if(!alive()||attempt!==epoch)return;
        if(!result.text||result.confidence<20){message('Non trovo testo stampato abbastanza chiaro. Il testo precedente resta: prova una foto nitida e diritta oppure trascrivi a mano.');return;}
        running=false;text.value=result.text;text.dispatchEvent(new Event('input',{bubbles:true}));
        message('Bozza OCR fallibile, non salvata: controlla ogni parola, ordine e traduzione. Correggi nel formato inglese = italiano e conferma la revisione adulta.');text.focus({preventScroll:true});
      }catch(error){if(alive()&&attempt===epoch)message('OCR non completato. '+(error?.message||'Usa una foto diversa o il testo manuale.'));}
      finally{controller.abort();if(alive()&&attempt===epoch){activeOCR=null;running=false;clearTimeout(timer);timer=null;text.readOnly=false;cancel.hidden=true;ocr.disabled=false;}}
    };
    const pageChanged=()=>{if(running)stop();invalidateReview();message('Pagina selezionata. Il testo attuale resta finché non avvii e confermi una nuova lettura.');};
    pageInput.addEventListener('input',pageChanged);
    scan.onclick=async()=>{
      if(!alive()||running||!selected||kind!=='pdf')return;
      const number=Number(pageInput.value);
      if(!Number.isInteger(number)||number<1||number>MAX_PAGES){message('Scegli un numero intero di pagina da 1 a 10.');return;}
      if(text.value.trim()&&!confirm('Sostituire il testo presente con la bozza OCR della sola pagina '+number+'? Se annulli, resta tutto come prima.'))return;
      if(typeof Worker==='undefined'||typeof WebAssembly==='undefined'){message('Questo browser non supporta OCR PDF locale. Puoi usare il testo selezionabile o trascrivere a mano.');return;}
      stop();const attempt=epoch,file=selected,controller=new AbortController();activeOCR=controller;invalidateReview();running=true;text.readOnly=true;scan.disabled=true;extract.disabled=true;ocr.disabled=true;pageInput.disabled=true;cancel.hidden=false;
      message('Preparo la sola pagina '+number+' nel browser… Puoi annullare.');
      timer=setTimeout(()=>{if(alive()&&attempt===epoch){stop();message('OCR PDF troppo lento: annullato senza cambiare il testo. Usa una scheda più semplice o trascrivi a mano.');}},60000);
      let task,port,pdfWorker,renderTask,canvas,page;
      try{
        const pdfjs=await import('./'+libraryURL);if(!alive()||attempt!==epoch)return;
        port=new Worker(workerURL,{type:'module'});activeWorker=port;
        port.onerror=()=>{if(alive()&&attempt===epoch){stop();message('Lettore PDF non disponibile. Il testo precedente resta: puoi trascrivere a mano.');}};
        pdfWorker=new pdfjs.PDFWorker({port});const data=new Uint8Array(await file.arrayBuffer());if(!alive()||attempt!==epoch)return;
        task=pdfjs.getDocument({data,worker:pdfWorker,isEvalSupported:false,enableXfa:false,useSystemFonts:false,disableFontFace:true,disableAutoFetch:true,useWasm:false,useWorkerFetch:false,stopAtErrors:true,maxImageSize:8000000,canvasMaxAreaInBytes:8000000});loading=task;
        task.onPassword=()=>{if(alive()&&attempt===epoch){stop();message('PDF protetto da password: usa una copia non protetta o il testo manuale.');}};
        const pdf=await task.promise;if(!alive()||attempt!==epoch)return;
        if(pdf.numPages>MAX_PAGES)throw Error('Il PDF supera 10 pagine. Usa una scheda più breve.');
        if(number>pdf.numPages)throw Error('Il PDF ha solo '+pdf.numPages+' pagine. Scegli una pagina presente.');
        page=await pdf.getPage(number);if(!alive()||attempt!==epoch)return;const original=page.getViewport({scale:1});
        if(!Number.isFinite(original.width)||!Number.isFinite(original.height)||original.width<=0||original.height<=0||original.width>20000||original.height>20000)throw Error('Dimensioni della pagina non supportate. Usa una scheda più semplice.');
        const scale=Math.min(2,2000/Math.max(original.width,original.height),Math.sqrt(2000000/(original.width*original.height))),viewport=page.getViewport({scale});
        canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(viewport.width));canvas.height=Math.max(1,Math.floor(viewport.height));scanCanvas=canvas;
        const ctx=canvas.getContext('2d');if(!ctx)throw Error('Il browser non riesce a preparare la pagina. Usa il testo manuale.');
        renderTask=page.render({canvas,canvasContext:ctx,viewport,background:'rgb(255,255,255)',annotationMode:pdfjs.AnnotationMode.DISABLE});activeRender=renderTask;await renderTask.promise;if(activeRender===renderTask)activeRender=null;
        if(!alive()||attempt!==epoch)return;
        let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!alive()||attempt!==epoch)return;
        if(blob?.size>MAX_BYTES)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!alive()||attempt!==epoch)return;
        if(!blob||blob.size>MAX_BYTES)throw Error('Pagina troppo complessa per OCR locale. Riduci la scheda o trascrivi a mano.');
        const total=pdf.numPages;canvas.width=canvas.height=0;canvas=null;scanCanvas=null;page.cleanup();page=null;
        // Release the PDF worker before the OCR worker is initialized.
        const completedTask=task;await completedTask.destroy();if(loading===completedTask)loading=null;task=null;pdfWorker.destroy();pdfWorker=null;port.terminate();if(activeWorker===port)activeWorker=null;port=null;
        if(!alive()||attempt!==epoch)return;
        const engine=await import('./'+ocrURL);if(!alive()||attempt!==epoch)return;
        const result=await engine.recognize(new File([blob],'pagina.png',{type:blob.type}),{signal:controller.signal,progress:note=>{if(alive()&&attempt===epoch)message('Pagina '+number+' di '+total+' · '+note);}});
        if(!alive()||attempt!==epoch)return;
        if(!result.text||result.confidence<20){message('Non trovo testo stampato chiaro nella pagina '+number+'. Il testo precedente resta: prova una scheda più nitida o trascrivi a mano.');return;}
        running=false;text.value=result.text;text.dispatchEvent(new Event('input',{bubbles:true}));
        message('Bozza OCR fallibile della sola pagina '+number+' di '+total+', non salvata. Le altre pagine non sono incluse. Correggi parole e traduzioni, poi conferma la revisione adulta.');text.focus({preventScroll:true});
      }catch(error){if(alive()&&attempt===epoch)message('OCR PDF non completato. '+(/10 pagine|ha solo|Dimensioni|complessa|preparare/.test(error?.message)?error.message:'PDF danneggiato, immagine o formato non supportato: il testo precedente resta. Puoi trascrivere a mano.'));}
      finally{controller.abort();if(canvas){canvas.width=canvas.height=0;}if(task)await task.destroy().catch(()=>{});pdfWorker?.destroy();port?.terminate();if(activeWorker===port)activeWorker=null;if(alive()&&attempt===epoch){loading=null;activeRender=null;scanCanvas=null;activeOCR=null;running=false;clearTimeout(timer);timer=null;text.readOnly=false;cancel.hidden=true;scan.disabled=false;extract.disabled=false;ocr.disabled=false;pageInput.disabled=false;}}
    };
    return {
      revision(){return revision;},
      checked(){return alive()&&!running&&review.checked;},
      attachment(){return alive()&&keep.checked?selected:null;},
      dispose(){if(disposed)return;stop();release();disposed=true;selected=null;fileInput.value='';form.removeEventListener('change',revised);fileInput.removeEventListener('change',choose);text.removeEventListener('input',changed);pageInput.removeEventListener('input',pageChanged);}
    };
  }};
})();
