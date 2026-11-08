'use strict';
/** Offline-friendly portfolio CMS. No backend or credentials: it edits only files you export or explicitly pick. */
const KEYS=['banners','videos','avatars','stickers'];
const LABELS={banners:'Баннеры',videos:'Видео-креативы',avatars:'AI / Липсинк',stickers:'Стикеры'};
const SHORT={banners:'BANNER',videos:'VIDEO',avatars:'AI VIDEO',stickers:'MOTION'};
const $=q=>document.querySelector(q), $$=q=>Array.from(document.querySelectorAll(q));
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const deep=x=>JSON.parse(JSON.stringify(x));
let state=deep(window.PORTFOLIO_DATA || {version:1,contact:{email:'',telegram:''},galleries:{}});
for(const key of KEYS) state.galleries[key] ||= [];
state.contact ||= {email:'',telegram:''};
state.cv ||= {path:'assets/cv/Lavrikov_CV.pdf',name:'Lavrikov_CV.pdf',revision:'initial'};
let baseline=deep(state),tab='banners',dirty=false,folderHandle=null,editing=null,dragged=null,busy=false;
// New and replacement files only. Existing assets stay in the user's site folder.
const pending=new Map(); // path -> {blob: Blob, url: objectURL}
let toastTimer;

function notify(message,error=false){const node=$('#toast');node.textContent=message;node.classList.toggle('error',error);node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),4000);}
function setDirty(value=true){dirty=value;$('#changesStatus').textContent=value?'● Есть несохранённые изменения':'✓ Без изменений';$('#changesStatus').classList.toggle('dirty',value);}
function displayName(item){return item.title?.ru||item.title?.en||item.id||'Новая работа';}
function getItem(group,id){return state.galleries[group]?.find(x=>x.id===id);}
function previewUrl(path){return pending.get(path)?.url || path || '';}
function iconBadge(item){return item.kind==='video'?'▶ MP4':'IMAGE';}
function validData(data){return data && typeof data==='object' && data.galleries && KEYS.every(k=>Array.isArray(data.galleries[k]));}
function safePath(path){return typeof path==='string' && !path.startsWith('/') && !path.includes('..') && /^assets\/(images|video|posters|previews|cv)\/[\w.\-]+$/.test(path);}
function newId(name){const stem=name.normalize('NFKD').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'work';let id=stem;let seq=2;while(KEYS.some(g=>state.galleries[g].some(x=>x.id===id))) id=`${stem}-${seq++}`;return id;}
function uniqueAssetPath(folder,name,ext){const stem=(name.normalize('NFKD').toLowerCase().replace(/\.[^.]+$/,'').replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'work');const suffix=Math.random().toString(36).slice(2,8);return `assets/${folder}/${stem}-${suffix}.${ext}`;}
function storeAsset(path,blob){if(!safePath(path))throw new Error('Некорректный путь файла');pending.set(path,{blob,url:URL.createObjectURL(blob)});return path;}
function cleanup(){for(const {url} of pending.values())URL.revokeObjectURL(url);pending.clear();}

function renderTabs(){for(const key of KEYS){const tabButton=$(`[data-tab="${key}"]`);tabButton.classList.toggle('active',key===tab);tabButton.setAttribute('aria-current',key===tab?'page':'false');$(`[data-qty="${key}"]`).textContent=String(state.galleries[key].length).padStart(2,'0');}}
function renderCards(){
  const items=state.galleries[tab]||[];
  const grid=$('#editorGrid');
  grid.innerHTML=items.length?items.map((item,index)=>{
    const poster=item.kind==='image'?item.src:(item.poster||'');
    const visual=poster?`<img src="${esc(previewUrl(poster))}" alt="" loading="lazy">`:`<video src="${esc(previewUrl(item.src))}" muted playsinline preload="metadata"></video>`;
    return `<article class="editor-card ${item.kind==='video'?'is-video':'is-image'} ${tab==='avatars'?'is-avatar':''} ${tab==='stickers'?'is-sticker':''}" draggable="true" data-id="${esc(item.id)}" data-index="${index}">
      <div class="editor-visual">${visual}<div class="editor-toolbar"><button class="drag-handle" type="button" title="Перетащить для сортировки" aria-label="Перетащить для сортировки">⠿</button><button class="edit-card-btn" type="button" data-edit="${esc(item.id)}" aria-label="Редактировать ${esc(displayName(item))}">✎</button></div><span class="media-type-badge">${iconBadge(item)}</span></div>
      <div class="editor-meta"><div class="editor-meta-text"><strong title="${esc(displayName(item))}">${esc(displayName(item))}</strong><small>${esc(item.tag||SHORT[tab])}</small></div><div class="move-buttons"><button type="button" data-move="-1" data-id="${esc(item.id)}" aria-label="Выше" ${index===0?'disabled':''}>↑</button><button type="button" data-move="1" data-id="${esc(item.id)}" aria-label="Ниже" ${index===items.length-1?'disabled':''}>↓</button></div></div>
    </article>`;
  }).join(''):`<div class="empty-gallery"><div><strong>Здесь пока пусто</strong>Добавь первое изображение или видео в эту галерею.</div></div>`;
  $$('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openEdit(tab,btn.dataset.edit)));
  $$('[data-move]').forEach(btn=>btn.addEventListener('click',()=>move(tab,btn.dataset.id,Number(btn.dataset.move))));
  $$('.editor-card').forEach(article=>{
    article.addEventListener('dragstart',event=>{if(event.target.closest('button') && !event.target.closest('.drag-handle')){event.preventDefault();return;}dragged={group:tab,id:article.dataset.id};event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',article.dataset.id);article.classList.add('is-dragging');});
    article.addEventListener('dragenter',()=>article.classList.add('is-drag-target'));
    article.addEventListener('dragleave',()=>article.classList.remove('is-drag-target'));
    article.addEventListener('dragover',event=>{if(dragged?.group===tab)event.preventDefault();});
    article.addEventListener('drop',event=>{event.preventDefault();article.classList.remove('is-drag-target');if(dragged?.group===tab)moveTo(tab,dragged.id,article.dataset.id);});
    article.addEventListener('dragend',()=>{$$('.editor-card').forEach(x=>x.classList.remove('is-dragging','is-drag-target'));dragged=null;});
  });
}
function render(){renderTabs();$('#sectionOverline').textContent=`${String(KEYS.indexOf(tab)+1).padStart(2,'0')} / 04 — GALLERY`;$('#collectionHeading').textContent=LABELS[tab];renderCards();}
function switchTab(next){if(!KEYS.includes(next))return;tab=next;render();}
function move(group,id,delta){const arr=state.galleries[group],from=arr.findIndex(x=>x.id===id),to=from+delta;if(from<0||to<0||to>=arr.length)return;arr.splice(to,0,...arr.splice(from,1));setDirty();render();}
function moveTo(group,id,targetId){const arr=state.galleries[group],from=arr.findIndex(x=>x.id===id),to=arr.findIndex(x=>x.id===targetId);if(from<0||to<0||from===to)return;arr.splice(to,0,...arr.splice(from,1));setDirty();render();}

function fileKind(file){const ext=file.name.split('.').pop().toLowerCase();if(['png','jpg','jpeg','webp','avif'].includes(ext))return'image';if(['mp4','webm'].includes(ext))return'video';return null;}
function ensureFile(file){const kind=fileKind(file);if(!kind)throw new Error(`Формат ${file.name} не поддерживается. Для видео используй MP4 или WebM.`);if(file.size>95*1024*1024)throw new Error(`Файл ${file.name} превышает 95 МБ. Сожми его перед публикацией на GitHub Pages.`);return kind;}
async function imageToWebp(file,maxSize=1800,quality=.88){
  try{
    const bitmap=await createImageBitmap(file);const scale=Math.min(1,maxSize/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
    if(!blob)throw new Error('Conversion failed');return blob;
  }catch(e){return file;}
}
function posterFromVideo(file){
  return new Promise(resolve=>{
    const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='auto';video.muted=true;video.playsInline=true;video.src=url;
    let done=false;const timer=setTimeout(()=>finish(null),9000);
    function finish(blob){if(done)return;done=true;clearTimeout(timer);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);resolve(blob);}
    function grab(){try{const w=video.videoWidth,h=video.videoHeight;if(!w||!h)throw Error();const scale=Math.min(1,560/Math.max(w,h));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>finish(blob),'image/webp',.82);}catch(e){finish(null);}}
    video.addEventListener('loadedmetadata',()=>{try{video.currentTime=video.duration>1?Math.min(1,video.duration*.25):0;}catch(e){grab();}},{once:true});
    video.addEventListener('seeked',grab,{once:true});video.addEventListener('error',()=>finish(null),{once:true});
  });
}
async function attachMedia(entry,file){
  const kind=ensureFile(file);entry.kind=kind;
  if(kind==='image'){
    const blob=await imageToWebp(file);const ext=blob.type==='image/webp'?'webp':file.name.split('.').pop().toLowerCase();
    entry.src=storeAsset(uniqueAssetPath('images',file.name,ext),blob);delete entry.poster;delete entry.preview;
  }else{
    const ext=file.name.split('.').pop().toLowerCase();entry.src=storeAsset(uniqueAssetPath('video',file.name,ext),file);delete entry.poster;delete entry.preview;
    const poster=await posterFromVideo(file);if(poster)entry.poster=storeAsset(uniqueAssetPath('posters',file.name,'webp'),poster);
  }
}
async function uploadFiles(files){
  const list=Array.from(files||[]);if(!list.length)return;
  if(busy)return;setBusy(true);
  let good=0,failed=[];
  for(const file of list){
    try{
      const kind=ensureFile(file),id=newId(file.name),name=file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').trim()||'New work';
      const entry={id,kind,src:'',title:{ru:name,en:name},tag:kind==='image'?'1:1':(tab==='avatars'?'AI VIDEO':tab==='stickers'?'ANIMATED':'9:16')};
      await attachMedia(entry,file);state.galleries[tab].push(entry);good++;
    }catch(e){failed.push(`${file.name}: ${e.message}`);}
  }
  setBusy(false);if(good){setDirty();render();notify(`Добавлено работ: ${good}. Не забудь сохранить изменения.`);}
  if(failed.length)notify(failed.slice(0,2).join('\n'),true);
}

function dialogPreview(entry){const src=previewUrl(entry.kind==='video'?(entry.poster||entry.src):entry.src);return entry.kind==='image'||entry.poster?`<img src="${esc(src)}" alt="">`:`<video src="${esc(src)}" muted playsinline controls preload="metadata"></video>`;}
function openEdit(group,id){const entry=getItem(group,id);if(!entry)return;editing={group,id};$('#editRu').value=entry.title?.ru||'';$('#editEn').value=entry.title?.en||'';$('#editGallery').value=group;$('#editTag').value=entry.tag||'';$('#editReplaceFile').value='';$('#editPosterFile').value='';$('#editPreviewFile').value='';$('#editPreview').innerHTML=dialogPreview(entry);$('#editDialog').showModal();}
function closeEdit(){$('#editDialog').close();editing=null;}
function deleteEntry(){if(!editing)return;const entry=getItem(editing.group,editing.id);if(!entry)return;if(!confirm(`Удалить «${displayName(entry)}» из галереи? Исходный файл останется в папке сайта.`))return;state.galleries[editing.group]=state.galleries[editing.group].filter(x=>x.id!==editing.id);setDirty();closeEdit();render();notify('Работа удалена из галереи.');}
async function saveEdit(event){
  event.preventDefault();if(!editing||busy)return;
  const oldGroup=editing.group,entry=getItem(oldGroup,editing.id);if(!entry)return;
  const ru=$('#editRu').value.trim(),en=$('#editEn').value.trim();if(!ru||!en){notify('Укажи названия RU и EN.',true);return;}
  const group=$('#editGallery').value,replace=$('#editReplaceFile').files[0],poster=$('#editPosterFile').files[0],preview=$('#editPreviewFile').files[0];
  if(!KEYS.includes(group))return;
  setBusy(true);
  try{
    if(replace)await attachMedia(entry,replace);
    if(poster){if(entry.kind!=='video')throw new Error('Обложку можно добавить только для видео.');const blob=await imageToWebp(poster,1000,.85);const ext=blob.type==='image/webp'?'webp':poster.name.split('.').pop().toLowerCase();entry.poster=storeAsset(uniqueAssetPath('posters',poster.name,ext),blob);}
    if(preview){if(entry.kind!=='video')throw new Error('Hover-превью можно добавить только для видео.');ensureFile(preview);if(fileKind(preview)!=='video')throw new Error('Превью должно быть видео MP4 или WebM.');entry.preview=storeAsset(uniqueAssetPath('previews',preview.name,preview.name.split('.').pop().toLowerCase()),preview);}
    entry.title={ru,en};entry.tag=$('#editTag').value.trim();
    if(group!==oldGroup){state.galleries[oldGroup]=state.galleries[oldGroup].filter(x=>x!==entry);state.galleries[group].push(entry);tab=group;}
    closeEdit();setDirty();render();notify('Изменения работы сохранены в редакторе.');
  }catch(e){notify(e.message,true);}finally{setBusy(false);}
}
function updateContact(){state.contact.email=$('#contactEmail').value.trim();state.contact.telegram=$('#contactTelegram').value.trim().replace(/^@/,'');setDirty();}
function hydrate(){
  state.contact ||= {email:'',telegram:''};
  state.cv ||= {path:'assets/cv/Lavrikov_CV.pdf',name:'Lavrikov_CV.pdf',revision:'initial'};
  render();
  $('#contactEmail').value=state.contact.email||'';
  $('#contactTelegram').value=state.contact.telegram||'';
  renderCV();
  setDirty(false);
}
function renderCV(){
  const info=state.cv||{};
  $('#cvFileName').textContent=info.name||'Lavrikov_CV.pdf';
  $('#cvFileStatus').textContent=pending.has(info.path)?'Новый PDF выбран — сохрани изменения':'PDF на сайте';
  $('#cvView').href=previewUrl(info.path||'assets/cv/Lavrikov_CV.pdf');
}
async function replaceCV(file){
  if(!file)return;
  if(busy)return;
  const validExt=/\.pdf$/i.test(file.name),validMime=!file.type || file.type==='application/pdf';
  if(!validExt||!validMime){notify('Выбери PDF-файл.',true);return;}
  if(file.size>25*1024*1024){notify('PDF превышает 25 МБ. Сожми его перед загрузкой.',true);return;}
  const signature=await file.slice(0,5).text();
  if(signature!=='%PDF-'){notify('Это не PDF-файл.',true);return;}
  const path='assets/cv/Lavrikov_CV.pdf';
  const old=pending.get(path);
  if(old) URL.revokeObjectURL(old.url);
  storeAsset(path,file);
  state.cv={path,name:file.name,revision:String(Date.now())};
  renderCV();setDirty();notify('Резюме заменено в редакторе. Нажми «Сохранить в папку» или «Экспорт ZIP».');
}

function setBusy(v){busy=v;$('#addMedia').disabled=v;$('#exportZip').disabled=v;$('#saveFolder').disabled=v||!folderHandle;$('#openFolder').disabled=v;$('#cvReplaceButton').disabled=v;}
function jsonText(){return JSON.stringify(state,null,2)+'\n';}
function scriptText(){// safe as external JS; never inject user text as HTML.
  return '/* Created in portfolio admin — '+new Date().toISOString()+' */\nwindow.PORTFOLIO_DATA = '+JSON.stringify(state,null,2).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n';
}
function updateEntries(){
  const entries=[{name:'projects-data.js',data:scriptText()},{name:'projects.json',data:jsonText()}];
  // Include only assets reachable from current published content, not replaced/deleted files.
  const used=new Set();for(const group of KEYS)for(const item of state.galleries[group])for(const k of ['src','poster','preview'])if(item[k])used.add(item[k]);
  if(state.cv?.path)used.add(state.cv.path);
  for(const [path,p] of pending)if(used.has(path))entries.push({name:path,data:p.blob});
  return entries;
}
async function exportZip(){if(busy)return;setBusy(true);notify('Собираю пакет обновления…');try{
  const instruction='PORTFOLIO UPDATE / ОБНОВЛЕНИЕ САЙТА\r\n\r\n1. Распакуй ZIP в корневую папку сайта (рядом с index.html).\r\n2. Согласись объединить папки assets и заменить projects-data.js / projects.json.\r\n3. Загрузи изменённые файлы в GitHub (commit + push через GitHub Desktop).\r\n4. Открой GitHub Pages и проверь результат.\r\n\r\nЭтот архив содержит ТОЛЬКО изменённые данные и новые медиафайлы. Старые файлы автоматически не удаляются.\r\n';
  const entries=updateEntries();entries.push({name:'README-UPDATE.txt',data:instruction});const blob=await ZipPack.zip(entries);
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='portfolio-update-'+new Date().toISOString().slice(0,10)+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  notify(`ZIP готов (${(blob.size/1048576).toFixed(1)} МБ). Распакуй его поверх папки сайта.`);
}catch(e){notify('Ошибка экспорта: '+e.message,true);}finally{setBusy(false);}}
async function readLocalData(handle){try{const f=await handle.getFileHandle('projects.json');const text=await(await f.getFile()).text();const result=JSON.parse(text);return validData(result)?result:null;}catch(e){return null;}}
async function selectFolder(){if(!('showDirectoryPicker' in window)){notify('Для прямого сохранения открой admin.html через localhost в Chrome/Edge. Или используй «Экспорт ZIP».',true);return;}try{
  const h=await window.showDirectoryPicker({mode:'readwrite'});await h.getFileHandle('index.html');
  const loaded=await readLocalData(h);
  if(loaded && !dirty){state=deep(loaded);baseline=deep(loaded);cleanup();hydrate();}
  else if(loaded && dirty){if(confirm('Загрузить содержимое выбранной папки? Текущие несохранённые изменения пропадут.')){state=deep(loaded);baseline=deep(loaded);cleanup();hydrate();}}
  folderHandle=h;$('#folderState').textContent=h.name;$('#saveFolder').disabled=false;notify('Папка сайта подключена. Можно сохранять напрямую.');
}catch(e){if(e.name!=='AbortError')notify('Не удалось открыть папку: '+e.message,true);}}
async function writeFile(directory,path,blob){const parts=path.split('/');let h=directory;for(let i=0;i<parts.length-1;i++)h=await h.getDirectoryHandle(parts[i],{create:true});const f=await h.getFileHandle(parts[parts.length-1],{create:true});const writer=await f.createWritable();await writer.write(blob);await writer.close();}
async function saveFolder(){if(!folderHandle){notify('Сначала выбери папку проекта.',true);return;}if(busy)return;setBusy(true);try{
  const files=updateEntries();for(const f of files)await writeFile(folderHandle,f.name,f.data instanceof Blob?f.data:new Blob([f.data]));
  baseline=deep(state);setDirty(false);notify(`Сохранено в папку ${folderHandle.name}. Теперь загрузи изменения на GitHub.`);
}catch(e){notify('Ошибка записи в папку: '+e.message,true);}finally{setBusy(false);}}
function resetChanges(){if(!dirty)return;if(!confirm('Отменить все несохранённые изменения?'))return;state=deep(baseline);cleanup();hydrate();notify('Несохранённые изменения отменены.');}
function init(){
  if(!validData(state)){notify('Не найден файл projects-data.js.',true);return;}
  $$('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  $('#filePicker').addEventListener('change',event=>{uploadFiles(event.target.files);event.target.value='';});
  $('#addMedia').addEventListener('click',()=>$('#filePicker').click());
  $('#editForm').addEventListener('submit',saveEdit);
  $('#closeEdit').addEventListener('click',closeEdit);$('#cancelEdit').addEventListener('click',closeEdit);
  $('#editDialog').addEventListener('click',event=>{if(event.target===$('#editDialog'))closeEdit();});
  $('#editDialog').addEventListener('close',()=>{editing=null;});
  $('#deleteEdit').addEventListener('click',deleteEntry);
  $('#contactEmail').addEventListener('input',updateContact);$('#contactTelegram').addEventListener('input',updateContact);
  $('#cvReplaceButton').addEventListener('click',()=>$('#cvFileInput').click());
  $('#cvFileInput').addEventListener('change',async e=>{await replaceCV(e.target.files?.[0]);e.target.value='';});
  $('#exportZip').addEventListener('click',exportZip);$('#openFolder').addEventListener('click',selectFolder);$('#saveFolder').addEventListener('click',saveFolder);$('#resetChanges').addEventListener('click',resetChanges);
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  hydrate();
}
document.addEventListener('DOMContentLoaded',init);
