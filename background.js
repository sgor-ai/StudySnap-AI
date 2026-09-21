// StudySnap AI Pro 2026 - MV3 service worker
const COMMANDS = {"capture-selection":"QSA_ACTIVATE_SELECTION","capture-fullscreen":"QSA_CAPTURE_FULLSCREEN"};
const DEFAULTS = {openai:"gpt-5", gemini:"gemini-2.5-flash", anthropic:"claude-sonnet-4-6", ollama:"llava", "local-openai":"local-model", local:"llava"};
const LANG = {it:"italiano",en:"inglese",es:"spagnolo",fr:"francese",de:"tedesco",pt:"portoghese",zh:"cinese mandarino",hi:"hindi",ar:"arabo",ru:"russo"};
const MAX_HISTORY = 80, MAX_CACHE = 30;
const REQUEST_TIMEOUT_MS = 10 * 60 * 1000;

async function togglePanicMode(){
  const d = await chrome.storage.local.get('panicMode');
  const panicMode = d.panicMode !== true;
  await chrome.storage.local.set({panicMode});
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.filter(tab => tab.id && !/^chrome:\/\//.test(tab.url || '')).map(tab =>
    chrome.tabs.sendMessage(tab.id, {type:'QSA_PANIC_MODE', enabled:panicMode}).catch(()=>{})
  ));
  return panicMode;
}

chrome.runtime.onInstalled.addListener(async()=>{
  if(chrome.sidePanel) await chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:false}).catch(()=>{});
  const d=await chrome.storage.local.get(["history","cache","profiles"]);
  if(!Array.isArray(d.history)) await chrome.storage.local.set({history:[]});
  if(!Array.isArray(d.cache)) await chrome.storage.local.set({cache:[]});
  if(d.profiles && !Array.isArray(d.profiles)){ const profiles=Object.entries(d.profiles).map(([id,p])=>({id,...p})); await chrome.storage.local.set({profiles}); }
});

chrome.commands.onCommand.addListener(async command=>{
  if(command === 'panic-mode'){
    await togglePanicMode();
    return;
  }
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id || /^chrome:\/\//.test(tab.url||'')) return;
  const type=COMMANDS[command]; if(!type) return;
  chrome.tabs.sendMessage(tab.id,{type}).catch(async()=>{
    try{await chrome.scripting.executeScript({target:{tabId:tab.id},files:["katex/katex.min.js","content.js"]});await chrome.scripting.insertCSS({target:{tabId:tab.id},files:["katex/katex.min.css","content.css"]});await chrome.tabs.sendMessage(tab.id,{type});}catch(e){console.warn(e)}
  });

});

chrome.runtime.onMessage.addListener((m,s,send)=>{
  if(m.type==='QSA_TOGGLE_PANIC'){
    togglePanicMode().then(panicMode=>send({ok:true,panicMode})).catch(error=>send({ok:false,error:error.message}));
    return true;
  }
  if(m.type==='QSA_CAPTURE_VISIBLE_TAB'){
    chrome.tabs.captureVisibleTab(s.tab?.windowId,{format:'png'},d=>send(chrome.runtime.lastError?{ok:false,error:chrome.runtime.lastError.message}:{ok:true,dataUrl:d})); return true;
  }

  if(m.type==='QSA_GET_HISTORY') { chrome.storage.local.get('history').then(d=>send({ok:true,history:d.history||[]})); return true; }
  if(m.type==='QSA_CLEAR_HISTORY') { chrome.storage.local.set({history:[]}).then(()=>send({ok:true})); return true; }
  if(m.type==='QSA_DELETE_HISTORY'){ deleteHistory(m.id).then(()=>send({ok:true})); return true; }
  if(m.type==='QSA_OPEN_SIDE_PANEL' && chrome.sidePanel && s.tab?.windowId) { chrome.sidePanel.open({windowId:s.tab.windowId}).then(()=>send({ok:true})).catch(e=>send({ok:false,error:e.message})); return true; }
  if(m.type==='QSA_CACHE_STATS') { chrome.storage.local.get('cache').then(d=>send({ok:true,count:(d.cache||[]).length})); return true; }
  if(m.type==='QSA_GET_CONFIG') { getConfig().then(c=>send({ok:true,config:{provider:c.provider,model:c.model,language:c.language}})); return true; }
});

async function fetchOpenAICompatible(endpoint,model,lang,text,port,apiKey='',signal){
  const headers={'content-type':'application/json'};
  if(apiKey) headers.Authorization=`Bearer ${apiKey}`;
  const r=await fetchWithRetry(`${endpoint}/chat/completions`,{method:'POST',headers,signal,body:JSON.stringify({model,stream:true,messages:[{role:'system',content:systemPrompt(lang)},{role:'user',content:text}]})});
  if(!r.ok) throw new Error(`Local AI ${r.status}${await readErrorResponse(r)}`); return consumeSSE(r,port,'openai');
}

async function streamOpenAICompatible(apiKey,model,lang,img,port,extra,endpoint,signal){
  const headers={'content-type':'application/json'};
  if(apiKey) headers.Authorization=`Bearer ${apiKey}`;
  const r=await fetchWithRetry(`${endpoint}/chat/completions`,{method:'POST',headers,signal,body:JSON.stringify({model,stream:true,messages:[{role:'system',content:systemPrompt(lang,extra)},{role:'user',content:[{type:'text',text:'Analizza questo screenshot e rispondi.'},{type:'image_url',image_url:{url:img}}]}]})});
  if(!r.ok) throw new Error(`Local AI ${r.status}${await readErrorResponse(r)}`); return consumeSSE(r,port,'openai');
}

chrome.runtime.onConnect.addListener(port=>{
  if(port.name==='qsa-chat'){
    port.onMessage.addListener(async m=>{if(m.type!=='QSA_CHAT')return; try{await streamTextChat(m.text,port)}catch(e){port.postMessage({type:'error',error:e.message||String(e)})}}); return;
  }

  if(port.name!=='qsa-ai-call') return;
  const keepAlive = setInterval(() => {
    try { port.postMessage({type:'keepalive'}); } catch (_) {}
  }, 20000);
  port.onDisconnect.addListener(() => clearInterval(keepAlive));
  port.onMessage.addListener(async m=>{
    if(m.type!=='QSA_CALL_AI') return;
    const controller = new AbortController();
    const abortRequest = () => controller.abort();
    port.onDisconnect.addListener(abortRequest);
    try { await streamAI(m.imageDataUrl,m.options||{},port,controller.signal); }
    catch(e){ try{port.postMessage({type:'error',ok:false,error:e.message||String(e)});}catch(_){} }
    finally { port.onDisconnect.removeListener(abortRequest); }
  });
});

async function streamTextChat(text,port){
  const c=await getConfig();
  const providers=buildProviderList(c);
  let last;
  for(let index=0; index<providers.length; index++){
    const p=providers[index];
    try{
      const key=getProviderKey(c,p), model=getProviderModel(c,p);
      port.postMessage({type:'start',provider:p,model,fallback:index>0,attempt:index+1,total:providers.length});
      const r=await fetchText(p,key,model,c.language,text,port,c);
      port.postMessage({type:'done',answer:r,provider:p,model}); return;
    }catch(e){last=e;port.postMessage({type:'provider_error',provider:p,error:e.message||String(e),willFallback:index<providers.length-1});}
  }
  throw last||new Error('Nessun provider disponibile');
}

async function fetchText(p,key,model,lang,text,port,cfg){
  if(p==='ollama'){const r=await fetchWithRetry('http://localhost:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},signal:cfg.signal,body:JSON.stringify({model,prompt:`${systemPrompt(lang)}\n\n${text}`,stream:true})});if(!r.ok)throw new Error(`Ollama ${r.status}${await readErrorResponse(r)}`);return consumeJSONLines(r,port)}
  if(p==='local') return cfg.localEngine === 'openai-compatible'
    ? fetchOpenAICompatible(getProviderEndpoint(cfg,p),model,lang,text,port,key,cfg.signal)
    : fetchText('ollama','',model,lang,text,port,cfg);
  if(p==='local-openai') return fetchOpenAICompatible(getProviderEndpoint(cfg,p),model,lang,text,port,key,cfg.signal);
  if(!key)throw new Error(`API key mancante per ${p}`);
  if(p==='openai'){const r=await fetchWithRetry('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,max_tokens:4000,stream:true,messages:[{role:'system',content:systemPrompt(lang)},{role:'user',content:text}]})});if(!r.ok)throw new Error(`OpenAI ${r.status}${await readErrorResponse(r)}`);return consumeSSE(r,port,'openai')}
  if(p==='gemini'){const r=await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({system_instruction:{parts:[{text:systemPrompt(lang)}]},contents:[{role:'user',parts:[{text}]}]})});if(!r.ok)throw new Error(`Gemini ${r.status}${await readErrorResponse(r)}`);return consumeSSE(r,port,'gemini');}
  const r=await fetchWithRetry('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model,max_tokens:4000,stream:true,system:systemPrompt(lang),messages:[{role:'user',content:text}]})});if(!r.ok)throw new Error(`Anthropic ${r.status}${await readErrorResponse(r)}`);return consumeSSE(r,port,'anthropic');
}

async function digest(dataUrl){
  const raw=atob(dataUrl.split(',')[1]||''); const buf=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++)buf[i]=raw.charCodeAt(i);
  const hash=await crypto.subtle.digest('SHA-256',buf); return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

async function getConfig(options={}){
  const d=await chrome.storage.local.get(['provider','apiKey','model','language','autoProvider','profiles','activeProfileId','apiKeys','keys','models','endpoints']);
  let c={provider:d.provider||'gemini',apiKey:d.apiKey||'',model:d.model||'',language:d.language||'it',autoProvider:d.autoProvider!==false,apiKeys:d.apiKeys||d.keys||{},models:d.models||{},endpoints:d.endpoints||{}};
  const profiles=normalizeProfiles(d.profiles); const p=profiles.find(x=>x.id===d.activeProfileId); if(p) c={...c,...p};
  c.apiKeys = c.apiKeys && typeof c.apiKeys === 'object' ? c.apiKeys : {};
  c.models = c.models && typeof c.models === 'object' ? c.models : {};
  const profileConfigs = profiles.filter(x => x.id !== d.activeProfileId);
  for (const profile of profileConfigs) {
    for (const [provider, key] of Object.entries(profile.apiKeys || {})) {
      if (key && !c.apiKeys[provider]) c.apiKeys[provider] = key;
    }
    for (const [provider, model] of Object.entries(profile.models || {})) {
      if (model && !c.models[provider]) c.models[provider] = model;
    }
    for (const [provider, endpoint] of Object.entries(profile.endpoints || {})) {
      if (endpoint && !c.endpoints[provider]) c.endpoints[provider] = endpoint;
    }
  }
  c.fallbackProviders = profiles
    .map(profile => profile.provider)
    .filter(provider => ['openai', 'gemini', 'anthropic', 'ollama', 'local-openai', 'local'].includes(provider));
  return {...c,...options};
}

function normalizeProfiles(value){
  if(Array.isArray(value)) return value.filter(Boolean);
  if(value && typeof value==='object') return Object.entries(value).map(([id,p])=>({id,...(p||{})}));
  return [];
}

function systemPrompt(language, extra=''){return `Sei StudySnap AI. Rispondi sempre in ${LANG[language]||'italiano'}.

REGOLE DI RISPOSTA:
- Esegui esattamente la consegna e rispondi solo a ciò che viene richiesto.
- Dai prima la risposta utile, senza introduzioni, saluti, riassunti della richiesta o commenti meta.
- Non aggiungere spiegazioni, esempi, consigli, avvertenze, opinioni o contesto se non sono richiesti o indispensabili.
- Sii breve e preciso: usa il numero minimo di parole necessario per una risposta completa.
- Se la consegna richiede più punti, rispondi nello stesso ordine e mantieni la numerazione.
- Mostra passaggi, motivazioni o codice solo quando sono richiesti o necessari per verificare la risposta.
- Non descrivere lo screenshot, il tuo ragionamento o il procedimento di analisi.
- Non inventare testo illeggibile: chiedi esclusivamente il chiarimento indispensabile.
- Evita formule come "la consegna chiede", "nell'immagine", "ecco la soluzione" o equivalenti.
- Usa Markdown e LaTeX solo quando migliorano direttamente la risposta.${extra?'\n\nContesto OCR aggiuntivo (usalo solo se pertinente alla consegna):\n'+extra:''}`}

async function streamAI(imageDataUrl, options, port, signal){
  const key=await digest(imageDataUrl); const cfg=await getConfig(options);
  if(options.ocrText) cfg.extraContext = options.ocrText;
  const cached=await readCache(key);
  if(cached){
    port.postMessage({type:'start',cached:true,provider:cached.provider});
    port.postMessage({type:'chunk',text:cached.answer}); 
    port.postMessage({type:'done',answer:cached.answer,cached:true,provider:cached.provider});
    return;
  }
  
  const providers=buildProviderList(cfg);
  let last;
  for(let index=0; index<providers.length; index++){
    const provider=providers[index];
    try{
      const model=getProviderModel(cfg,provider);
      const apiKey=getProviderKey(cfg,provider);
      port.postMessage({type:'start',provider,model,fallback:index>0,attempt:index+1,total:providers.length});
      
      cfg.signal = signal;
      const answer=await streamProvider(provider,apiKey,model,cfg.language,imageDataUrl,port,cfg.extraContext||'',cfg);
      
      await saveHistory({id:crypto.randomUUID(),timestamp:Date.now(),answer,provider,model,language:cfg.language,cacheKey:key});
      await saveCache({key,answer,provider,model});
      port.postMessage({type:'done',answer,provider,model}); 
      return;
    }catch(e){
      last=e; 
      port.postMessage({type:'provider_error',provider,error:e.message||String(e),willFallback:index<providers.length-1});
    }
  }
  throw last||new Error('Nessun provider AI disponibile.');
}

function buildProviderList(cfg){
  const configured = cfg.provider && cfg.provider !== 'auto' ? [cfg.provider] : [];
  const order = configured.concat(cfg.fallbackProviders || [], ['openai','gemini','anthropic','ollama','local']);
  const unique = [...new Set(order)];
  const withKey = unique.filter(p =>
    p === 'ollama' || p === 'local' ||
    (p === 'local-openai'
      ? cfg.provider === 'local-openai' || Object.values(cfg.endpoints || {}).some(Boolean)
      : Boolean(getProviderKey(cfg, p)))
  );
  if (cfg.autoProvider === false) return [configured[0] || withKey[0] || 'gemini'];
  return withKey.length?withKey:order;
}

function getProviderKey(cfg,provider){
  if(provider==='ollama') return '';
  const keys=cfg.apiKeys || cfg.keys || {};
  return keys[provider] || (cfg.provider===provider ? cfg.apiKey : '') || '';
}

function getProviderModel(cfg,provider){
  const models=cfg.models || {};
  return models[provider] || (cfg.provider===provider && cfg.model) ||
    (provider === 'local' && cfg.localEngine === 'openai-compatible' ? 'local-model' : DEFAULTS[provider]);
}

function getProviderEndpoint(cfg,provider){
  const endpoints=cfg.endpoints || {};
  return (endpoints[provider] || (cfg.provider===provider && cfg.endpoint) || 'http://localhost:1234/v1').replace(/\/+$/,'');
}

async function fetchWithRetry(url,options={},retries=1){
  let last;
  for(let i=0;i<=retries;i++){
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortExternal = () => controller.abort();
    if(options.signal) {
      if(options.signal.aborted) controller.abort();
      else options.signal.addEventListener('abort', abortExternal, {once:true});
    }
    const signal = controller.signal;
    try{return await fetch(url,{...options,signal,cache:'no-store'});}catch(e){
      last=e;
      if(options.signal?.aborted) throw new Error('Richiesta annullata.');
      if(e.name === 'AbortError') throw new Error('Il provider non ha risposto entro il tempo limite.');
      if(i<retries) await new Promise(r=>setTimeout(r,500));
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', abortExternal);
    }
  }
  throw new Error(`Connessione al provider non riuscita: ${last?.message||'Failed to fetch'}`);
}

async function readErrorResponse(r){
  try{const t=await r.text(); return t ? `: ${t.slice(0,300)}` : '';}catch(_){return '';}
}

async function streamProvider(provider,apiKey,model,language,imageDataUrl,port,extra,cfg){
  if(provider==='ollama') return streamOllama(apiKey,model,language,imageDataUrl,port,extra,cfg.signal);
  if(provider==='local' && cfg.localEngine === 'ollama') return streamOllama('',model,language,imageDataUrl,port,extra,cfg.signal);
  if(provider==='local' && cfg.localEngine === 'openai-compatible') return streamOpenAICompatible(apiKey,model,language,imageDataUrl,port,extra,getProviderEndpoint(cfg,provider),cfg.signal);
  if(provider==='local-openai') return streamOpenAICompatible(apiKey,model,language,imageDataUrl,port,extra,getProviderEndpoint(cfg,provider),cfg.signal);
  if(!apiKey) throw new Error(`API key mancante per ${provider}.`);
  if(provider==='gemini') return streamGemini(apiKey,model,language,imageDataUrl,port,extra,cfg.signal);
  if(provider==='anthropic') return streamAnthropic(apiKey,model,language,imageDataUrl,port,extra,cfg.signal);
  return streamOpenAI(apiKey,model,language,imageDataUrl,port,extra,cfg.signal);
}

function postChunk(port,text){if(text)port.postMessage({type:'chunk',text});}

async function streamOpenAI(key,model,lang,img,port,extra,signal){
  const r=await fetchWithRetry('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,max_tokens:4000,stream:true,messages:[{role:'system',content:systemPrompt(lang,extra)},{role:'user',content:[{type:'text',text:'Analizza questo screenshot e rispondi.'},{type:'image_url',image_url:{url:img}}]}]})});
  if(!r.ok) throw new Error(`OpenAI ${r.status}${await readErrorResponse(r)}`); return consumeSSE(r,port,'openai');
}

async function streamGemini(key,model,lang,img,port,extra,signal){
  const r=await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},signal,body:JSON.stringify({system_instruction:{parts:[{text:systemPrompt(lang,extra)}]},contents:[{role:'user',parts:[{text:'Analizza questo screenshot e rispondi.'},{inline_data:{mime_type:'image/png',data:img.split(',')[1]}}]}]})});
  if(!r.ok) throw new Error(`Gemini ${r.status}${await readErrorResponse(r)}`); return consumeSSE(r,port,'gemini');
}

async function streamAnthropic(key,model,lang,img,port,extra,signal){
  const r=await fetchWithRetry('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},signal,body:JSON.stringify({model,max_tokens:4000,stream:true,system:systemPrompt(lang,extra),messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/png',data:img.split(',')[1]}},{type:'text',text:'Esegui la consegna mostrata nello screenshot.'}]}]})});
  if(!r.ok) throw new Error(`Anthropic ${r.status}${await readErrorResponse(r)}`); return consumeSSE(r,port,'anthropic');
}

async function streamOllama(_,model,lang,img,port,extra,signal){
  const r=await fetchWithRetry('http://localhost:11434/api/generate',{method:'POST',headers:{'content-type':'application/json'},signal,body:JSON.stringify({model,prompt:`${systemPrompt(lang,extra)}\n\nAnalizza lo screenshot e rispondi.`,images:[img.split(',')[1]],stream:true,keep_alive:'30m',options:{temperature:.2,num_predict:4000}})});
  if(!r.ok) throw new Error(`Ollama ${r.status}${await readErrorResponse(r)}`); return consumeJSONLines(r,port);
}

async function consumeSSE(response,port,provider){
  const reader=response.body.getReader(), dec=new TextDecoder(); let full='',buf='';
  while(true){
    const {value,done}=await reader.read(); if(done) break;
    buf+=dec.decode(value,{stream:true}); const parts=buf.split(/\r?\n/); buf=parts.pop()||'';
    for(const line of parts){
      if(!line.startsWith('data:')) continue; const raw=line.slice(5).trim(); if(!raw||raw==='[DONE]') continue;
      try{const j=JSON.parse(raw); let t='';
        if(provider==='openai') t=j.choices?.[0]?.delta?.content||'';
        else if(provider==='anthropic') t=j.delta?.text||'';
        else t=j.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
        if(t){full+=t;postChunk(port,t);}
      }catch(_){}
    }
  }
  if(buf.trim() && buf.startsWith('data:')) {
    const raw=buf.slice(5).trim();
    if(raw && raw!=='[DONE]') {
      try{const j=JSON.parse(raw);let t=provider==='openai'?j.choices?.[0]?.delta?.content||'':provider==='anthropic'?j.delta?.text||'':j.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';if(t){full+=t;postChunk(port,t)}}catch(_){}
    }
  }
  return full||'Nessuna risposta ricevuta.';
}

async function consumeJSONLines(response,port){
  const reader=response.body.getReader(),dec=new TextDecoder();let buf='',full='';
  const consumeRow = row => {
    if(!row.trim()) return;
    try{const j=JSON.parse(row);const t=j.response||'';if(t){full+=t;postChunk(port,t)}}catch(_){}
  };
  while(true){
    const {value,done}=await reader.read();if(done)break;
    buf+=dec.decode(value,{stream:true});const rows=buf.split('\n');buf=rows.pop()||'';
    for(const row of rows) consumeRow(row);
  }
  consumeRow(buf);
  return full||'Nessuna risposta ricevuta.';
}

async function readCache(key){
  const d=await chrome.storage.local.get('cache');
  return (d.cache||[]).find(x=>x.key===key)||null;
}
async function saveCache(item){const d=await chrome.storage.local.get('cache');let a=(d.cache||[]).filter(x=>x.key!==item.key);a.unshift({...item,timestamp:Date.now()});await chrome.storage.local.set({cache:a.slice(0,MAX_CACHE)});}
async function saveHistory(item){const d=await chrome.storage.local.get('history');let a=(d.history||[]);a.unshift(item);await chrome.storage.local.set({history:a.slice(0,MAX_HISTORY)});chrome.runtime.sendMessage({type:'QSA_HISTORY_UPDATED',item}).catch(()=>{});}
async function deleteHistory(id){const d=await chrome.storage.local.get('history');await chrome.storage.local.set({history:(d.history||[]).filter(x=>x.id!==id)});}
