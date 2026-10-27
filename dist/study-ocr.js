/* Pinned Tesseract.js 6.0.1 worker protocol; all components are same-origin. */
const workerURL='ocr-worker.min.js?v=386455990432';
const coreURL='ocr-core-775a35df6f2a.js';
const models=[['eng','ocr-eng-45b4cb346724.traineddata.gz'],['ita','ocr-ita-f702fcfad297.traineddata.gz']];
const aborted=()=>new DOMException('Lettura annullata','AbortError');

// Check dimensions before decoding; reject unknown headers rather than guess.
function dimensions(bytes){
 const b=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),ascii=(a,n)=>String.fromCharCode(...bytes.slice(a,a+n));
 if(bytes.length>=24&&ascii(1,3)==='PNG')return [b.getUint32(16),b.getUint32(20)];
 if(bytes.length>=30&&ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
  const type=ascii(12,4);
  if(type==='VP8X')return [1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)];
  if(type==='VP8L'&&bytes[20]===47){const n=b.getUint32(21,true);return [1+(n&16383),1+((n>>>14)&16383)];}
  if(type==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42)return [b.getUint16(26,true)&16383,b.getUint16(28,true)&16383];
 }
 if(bytes[0]===255&&bytes[1]===216){
  let i=2;
  while(i+8<bytes.length){if(bytes[i++]!==255)break;while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===218||marker===217)break;const size=b.getUint16(i);if(size<2||i+size>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return [b.getUint16(i+5),b.getUint16(i+3)];i+=size;}
 }
 throw Error('Non riesco a verificare le dimensioni: usa una foto JPEG, PNG o WebP semplice oppure il testo manuale.');
}

export async function inspectImage(file){
 if(!file||file.size>4000000||!file.size)throw Error('Usa un’immagine non vuota, massimo 4 MB.');
 const head=new Uint8Array(await file.slice(0,1048576).arrayBuffer());const [width,height]=dimensions(head);
 if(!width||!height||width>6000||height>6000||width*height>8000000)throw Error('Immagine troppo grande per anteprima/OCR: massimo 8 milioni di pixel e lato 6000. Riduci la foto o trascrivi il testo.');
 return {width,height};
}

export async function recognize(file,{signal,progress=()=>{}}={}){
 if(typeof Worker==='undefined'||typeof WebAssembly==='undefined'||typeof createImageBitmap==='undefined')throw Error('OCR locale non supportato da questo browser. Puoi trascrivere il testo a mano.');
 if(!file||file.size>4000000||!file.size)throw Error('Usa un’immagine non vuota, massimo 4 MB.');
 let port=null,bitmap=null,canvas=null,sequence=0,closed=false;
 const jobs=new Map();
 const stop=()=>{closed=true;port?.terminate();port=null;for(const job of jobs.values())job.reject(aborted());jobs.clear();bitmap?.close();bitmap=null;if(canvas){canvas.width=canvas.height=0;canvas=null;}};
 const check=()=>{if(signal?.aborted||closed)throw aborted();};
 signal?.addEventListener('abort',stop,{once:true});
 const send=(action,payload,transfer=[])=>{check();return new Promise((resolve,reject)=>{const jobId='ocr-'+(++sequence);jobs.set(jobId,{resolve,reject});port.postMessage({workerId:'local-material',jobId,action,payload},transfer);});};
 try{
  check();progress('Preparo l’immagine nel browser…');
  const {width,height}=await inspectImage(file);check();
  const scale=Math.min(1,2000/Math.max(width,height),Math.sqrt(2000000/(width*height)));
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});check();
  canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(bitmap.width*scale));canvas.height=Math.max(1,Math.floor(bitmap.height*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Il browser non riesce a preparare l’immagine. Usa il testo manuale.');
  context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();bitmap=null;
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));check();if(!blob)throw Error('Immagine non leggibile. Usa una foto diversa o il testo manuale.');
  const image=new Uint8Array(await blob.arrayBuffer());check();canvas.width=canvas.height=0;canvas=null;
  progress('Carico il motore locale inglese/italiano: circa 8,7 MB la prima volta…');
  port=new Worker(new URL(workerURL,import.meta.url));
  port.onerror=e=>{e.preventDefault();for(const job of jobs.values())job.reject(Error('Motore OCR non disponibile. Usa il testo manuale.'));jobs.clear();};
  port.onmessage=({data})=>{
   if(closed)return;const job=jobs.get(data.jobId);if(!job)return;
   if(data.status==='progress'){if(data.data?.status==='recognizing text')progress('Lettura locale… '+Math.round(Math.max(0,Math.min(1,Number(data.data.progress)||0))*100)+'%');return;}
   jobs.delete(data.jobId);if(data.status==='resolve')job.resolve(data.data);else job.reject(Error('Non riesco a leggere questa immagine. Prova testo stampato più nitido o trascrivi a mano.'));
  };
  await send('load',{options:{lstmOnly:true,corePath:new URL(coreURL,import.meta.url).href,logging:false}});check();
  const languages=await Promise.all(models.map(async([code,path])=>{const response=await fetch(new URL(path,import.meta.url),{signal,credentials:'omit'});if(!response.ok)throw Error('Modelli locali non disponibili. Riprova con rete o usa il testo manuale.');return {code,data:new Uint8Array(await response.arrayBuffer())};}));check();
  await send('loadLanguage',{langs:languages,options:{cacheMethod:'none',gzip:true,lstmOnly:true}},languages.map(l=>l.data.buffer));
  await send('initialize',{langs:'eng+ita',oem:1,config:{}});
  await send('setParameters',{params:{tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'}});
  const data=await send('recognize',{image,options:{},output:{text:true}},[image.buffer]);check();
  const text=typeof data?.text==='string'?data.text.trim():'';
  if(text.length>12000)throw Error('Testo OCR oltre 12.000 caratteri. Usa una porzione più piccola della scheda.');
  return {text,confidence:Number(data?.confidence)||0};
 }finally{signal?.removeEventListener('abort',stop);stop();}
}

// Components: Tesseract.js 6.0.1, tesseract.js-core 6.1.2, eng/ita model distribution 1.0.0.
// Original component bytes retained; provenance: docs/OCR_SOURCE.json.
// Apache-2.0 license and third-party worker notices follow.
//
// tesseract-js-LICENSE.md
//                                  Apache License
//                            Version 2.0, January 2004
//                         http://www.apache.org/licenses/
//
//    TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
//
//    1. Definitions.
//
//       "License" shall mean the terms and conditions for use, reproduction,
//       and distribution as defined by Sections 1 through 9 of this document.
//
//       "Licensor" shall mean the copyright owner or entity authorized by
//       the copyright owner that is granting the License.
//
//       "Legal Entity" shall mean the union of the acting entity and all
//       other entities that control, are controlled by, or are under common
//       control with that entity. For the purposes of this definition,
//       "control" means (i) the power, direct or indirect, to cause the
//       direction or management of such entity, whether by contract or
//       otherwise, or (ii) ownership of fifty percent (50%) or more of the
//       outstanding shares, or (iii) beneficial ownership of such entity.
//
//       "You" (or "Your") shall mean an individual or Legal Entity
//       exercising permissions granted by this License.
//
//       "Source" form shall mean the preferred form for making modifications,
//       including but not limited to software source code, documentation
//       source, and configuration files.
//
//       "Object" form shall mean any form resulting from mechanical
//       transformation or translation of a Source form, including but
//       not limited to compiled object code, generated documentation,
//       and conversions to other media types.
//
//       "Work" shall mean the work of authorship, whether in Source or
//       Object form, made available under the License, as indicated by a
//       copyright notice that is included in or attached to the work
//       (an example is provided in the Appendix below).
//
//       "Derivative Works" shall mean any work, whether in Source or Object
//       form, that is based on (or derived from) the Work and for which the
//       editorial revisions, annotations, elaborations, or other modifications
//       represent, as a whole, an original work of authorship. For the purposes
//       of this License, Derivative Works shall not include works that remain
//       separable from, or merely link (or bind by name) to the interfaces of,
//       the Work and Derivative Works thereof.
//
//       "Contribution" shall mean any work of authorship, including
//       the original version of the Work and any modifications or additions
//       to that Work or Derivative Works thereof, that is intentionally
//       submitted to Licensor for inclusion in the Work by the copyright owner
//       or by an individual or Legal Entity authorized to submit on behalf of
//       the copyright owner. For the purposes of this definition, "submitted"
//       means any form of electronic, verbal, or written communication sent
//       to the Licensor or its representatives, including but not limited to
//       communication on electronic mailing lists, source code control systems,
//       and issue tracking systems that are managed by, or on behalf of, the
//       Licensor for the purpose of discussing and improving the Work, but
//       excluding communication that is conspicuously marked or otherwise
//       designated in writing by the copyright owner as "Not a Contribution."
//
//       "Contributor" shall mean Licensor and any individual or Legal Entity
//       on behalf of whom a Contribution has been received by Licensor and
//       subsequently incorporated within the Work.
//
//    2. Grant of Copyright License. Subject to the terms and conditions of
//       this License, each Contributor hereby grants to You a perpetual,
//       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
//       copyright license to reproduce, prepare Derivative Works of,
//       publicly display, publicly perform, sublicense, and distribute the
//       Work and such Derivative Works in Source or Object form.
//
//    3. Grant of Patent License. Subject to the terms and conditions of
//       this License, each Contributor hereby grants to You a perpetual,
//       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
//       (except as stated in this section) patent license to make, have made,
//       use, offer to sell, sell, import, and otherwise transfer the Work,
//       where such license applies only to those patent claims licensable
//       by such Contributor that are necessarily infringed by their
//       Contribution(s) alone or by combination of their Contribution(s)
//       with the Work to which such Contribution(s) was submitted. If You
//       institute patent litigation against any entity (including a
//       cross-claim or counterclaim in a lawsuit) alleging that the Work
//       or a Contribution incorporated within the Work constitutes direct
//       or contributory patent infringement, then any patent licenses
//       granted to You under this License for that Work shall terminate
//       as of the date such litigation is filed.
//
//    4. Redistribution. You may reproduce and distribute copies of the
//       Work or Derivative Works thereof in any medium, with or without
//       modifications, and in Source or Object form, provided that You
//       meet the following conditions:
//
//       (a) You must give any other recipients of the Work or
//           Derivative Works a copy of this License; and
//
//       (b) You must cause any modified files to carry prominent notices
//           stating that You changed the files; and
//
//       (c) You must retain, in the Source form of any Derivative Works
//           that You distribute, all copyright, patent, trademark, and
//           attribution notices from the Source form of the Work,
//           excluding those notices that do not pertain to any part of
//           the Derivative Works; and
//
//       (d) If the Work includes a "NOTICE" text file as part of its
//           distribution, then any Derivative Works that You distribute must
//           include a readable copy of the attribution notices contained
//           within such NOTICE file, excluding those notices that do not
//           pertain to any part of the Derivative Works, in at least one
//           of the following places: within a NOTICE text file distributed
//           as part of the Derivative Works; within the Source form or
//           documentation, if provided along with the Derivative Works; or,
//           within a display generated by the Derivative Works, if and
//           wherever such third-party notices normally appear. The contents
//           of the NOTICE file are for informational purposes only and
//           do not modify the License. You may add Your own attribution
//           notices within Derivative Works that You distribute, alongside
//           or as an addendum to the NOTICE text from the Work, provided
//           that such additional attribution notices cannot be construed
//           as modifying the License.
//
//       You may add Your own copyright statement to Your modifications and
//       may provide additional or different license terms and conditions
//       for use, reproduction, or distribution of Your modifications, or
//       for any such Derivative Works as a whole, provided Your use,
//       reproduction, and distribution of the Work otherwise complies with
//       the conditions stated in this License.
//
//    5. Submission of Contributions. Unless You explicitly state otherwise,
//       any Contribution intentionally submitted for inclusion in the Work
//       by You to the Licensor shall be under the terms and conditions of
//       this License, without any additional terms or conditions.
//       Notwithstanding the above, nothing herein shall supersede or modify
//       the terms of any separate license agreement you may have executed
//       with Licensor regarding such Contributions.
//
//    6. Trademarks. This License does not grant permission to use the trade
//       names, trademarks, service marks, or product names of the Licensor,
//       except as required for reasonable and customary use in describing the
//       origin of the Work and reproducing the content of the NOTICE file.
//
//    7. Disclaimer of Warranty. Unless required by applicable law or
//       agreed to in writing, Licensor provides the Work (and each
//       Contributor provides its Contributions) on an "AS IS" BASIS,
//       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
//       implied, including, without limitation, any warranties or conditions
//       of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
//       PARTICULAR PURPOSE. You are solely responsible for determining the
//       appropriateness of using or redistributing the Work and assume any
//       risks associated with Your exercise of permissions under this License.
//
//    8. Limitation of Liability. In no event and under no legal theory,
//       whether in tort (including negligence), contract, or otherwise,
//       unless required by applicable law (such as deliberate and grossly
//       negligent acts) or agreed to in writing, shall any Contributor be
//       liable to You for damages, including any direct, indirect, special,
//       incidental, or consequential damages of any character arising as a
//       result of this License or out of the use or inability to use the
//       Work (including but not limited to damages for loss of goodwill,
//       work stoppage, computer failure or malfunction, or any and all
//       other commercial damages or losses), even if such Contributor
//       has been advised of the possibility of such damages.
//
//    9. Accepting Warranty or Additional Liability. While redistributing
//       the Work or Derivative Works thereof, You may choose to offer,
//       and charge a fee for, acceptance of support, warranty, indemnity,
//       or other liability obligations and/or rights consistent with this
//       License. However, in accepting such obligations, You may act only
//       on Your own behalf and on Your sole responsibility, not on behalf
//       of any other Contributor, and only if You agree to indemnify,
//       defend, and hold each Contributor harmless for any liability
//       incurred by, or claims asserted against, such Contributor by reason
//       of your accepting any such warranty or additional liability.
//
//    END OF TERMS AND CONDITIONS
//
//    APPENDIX: How to apply the Apache License to your work.
//
//       To apply the Apache License to your work, attach the following
//       boilerplate notice, with the fields enclosed by brackets "{}"
//       replaced with your own identifying information. (Don't include
//       the brackets!)  The text should be enclosed in the appropriate
//       comment syntax for the file format. We also recommend that a
//       file or class name and description of purpose be included on the
//       same "printed page" as the copyright notice for easier
//       identification within third-party archives.
//
//    Copyright {yyyy} {name of copyright owner}
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//
// tesseract-js-dist-worker.min.js.LICENSE.txt
// /*!
//  * The buffer module from node.js, for the browser.
//  *
//  * @author   Feross Aboukhadijeh <https://feross.org>
//  * @license  MIT
//  */
//
// /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
//
// /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */
//
// /** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */
//
// OCR_BUFFER_LICENSE.txt
// The MIT License (MIT)
//
// Copyright (c) Feross Aboukhadijeh, and other contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//
// OCR_IEEE754_LICENSE.txt
// Copyright 2008 Fair Oaks Labs, Inc.
//
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// OCR_REGENERATOR_LICENSE.txt
// MIT License
//
// Copyright (c) 2014-present, Facebook, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// OCR_ZLIB_LICENSE.txt
// /**
//  * @license
//  * zlib.js
//  * JavaScript Zlib Library
//  * https://github.com/imaya/zlib.js
//  *
//  * The MIT License
//  *
//  * Copyright (c) 2012 imaya
//  *
//  * Permission is hereby granted, free of charge, to any person obtaining a copy
//  * of this software and associated documentation files (the "Software"), to deal
//  * in the Software without restriction, including without limitation the rights
//  * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  * copies of the Software, and to permit persons to whom the Software is
//  * furnished to do so, subject to the following conditions:
//  *
//  * The above copyright notice and this permission notice shall be included in
//  * all copies or substantial portions of the Software.
//  *
//  * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  * THE SOFTWARE.
//  */
