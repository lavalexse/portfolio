'use strict';
// Portfolio content is loaded from projects-data.js. Open admin.html to edit.
const GALLERY_KEYS=['banners','videos','avatars','stickers'];
const GALLERIES=window.PORTFOLIO_DATA?.galleries || {banners:[],videos:[],avatars:[],stickers:[]};
const COPY = {
  ru: {
    headerLabel:'ВИЗУАЛЬНОЕ ПОРТФОЛИО / 2026',
    introTop:'ПОРТФОЛИО / 2026',
    introTitle:'Избранные работы<span class="title-dot">.</span>',
    introSecond:'',
    heroRole:'GRAPHIC / DIGITAL DESIGNER · AI CREATOR',
    heroName:'Александр Лавриков',
    heroSummary1:'Graphic / Digital-дизайнер и AI Creator. Делаю баннеры, презентации, лендинги и AI-креативы для digital-кампаний.',
    heroSummary2:'Работаю на стыке коммерческой графики, motion и генеративного ИИ — от визуальной концепции до финального рекламного креатива.',
    heroClientsLabel:'Ключевые проекты',
    heroClients:'Т-Банк · СберСити · Водоробот',
    heroStatOne:'лет в коммерческом дизайне',
    heroStatTwo:'AI & design tools',
    heroStatThree:'ключевых направления',
    tabBanners:'Баннеры', tabVideos:'Видео-креативы', tabStickers:'Стикеры', tabAvatars:'AI / Липсинк',
    bannersSub:'ГРАФИЧЕСКИЕ КРЕАТИВЫ · 1:1',
    videosSub:'ВЕРТИКАЛЬНАЯ ВИДЕОРЕКЛАМА · 9:16',
    stickersSub:'АНИМИРОВАННЫЕ БРЕНДОВЫЕ АССЕТЫ',
    avatarsSub:'AI-АВАТАРЫ · ЛИПСИНК · МОНТАЖ',
    footerHello:'Есть проект? Давай обсудим.',
    backTop:'НАВЕРХ ↑', close:'Закрыть',viewCV:'CV ↗',downloadCV:'СКАЧАТЬ CV ↓',
    placeholder:'Контакты добавим перед публикацией',
    open:'Открыть',
    itemImage:'БАННЕР', itemVideo:'ВИДЕО', itemSticker:'СТИКЕР',itemAvatar:'AI-ВИДЕО',
    previous:'Предыдущая работа',next:'Следующая работа',
    label:'Выбор языка',empty:'Скоро здесь появятся работы.'
  },
  en: {
    headerLabel:'VISUAL PORTFOLIO / 2026',
    introTop:'PORTFOLIO / 2026',
    introTitle:'Selected work<span class="title-dot">.</span>',
    introSecond:'',
    heroRole:'GRAPHIC / DIGITAL DESIGNER · AI CREATOR',
    heroName:'Alexander Lavrikov',
    heroSummary1:'Graphic / Digital designer and AI Creator creating banners, presentations, landing assets and AI creatives for digital campaigns.',
    heroSummary2:'I work across commercial design, motion and generative AI — from visual concept to final ad creative.',
    heroClientsLabel:'Selected projects',
    heroClients:'T-Bank · SberCity · Vodorobot',
    heroStatOne:'years in commercial design',
    heroStatTwo:'AI & design tools',
    heroStatThree:'core directions',
    tabBanners:'Banners',tabVideos:'Video creatives',tabStickers:'Stickers',tabAvatars:'AI / Lip Sync',
    bannersSub:'CAMPAIGN VISUALS · 1:1',
    videosSub:'VERTICAL VIDEO ADS · 9:16',
    stickersSub:'ANIMATED BRAND ASSETS',
    avatarsSub:'AI AVATARS · LIP SYNC · VIDEO EDITING',
    footerHello:'Have a project? Let’s talk.',
    backTop:'BACK TO TOP ↑',close:'Close',viewCV:'CV ↗',downloadCV:'DOWNLOAD CV ↓',
    placeholder:'Contact details coming before launch',
    open:'Open',
    itemImage:'BANNER',itemVideo:'VIDEO',itemSticker:'STICKER',itemAvatar:'AI VIDEO',
    previous:'Previous work',next:'Next work',
    label:'Choose language',empty:'New work coming soon.'
  }
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const escapeHTML = x => String(x).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let language='ru';
let opened = null;
let focusBefore = null;
let mobilePlaying = null;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function copy(key){return COPY[language][key] || key;}
function groupName(group){return ({banners:'tabBanners',videos:'tabVideos',avatars:'tabAvatars',stickers:'tabStickers'})[group];}
function cardTitle(item){return (item.title && (item.title[language] || item.title.en || item.title.ru)) || item.id || 'Untitled';}

function card(item,group,index){
  const title=escapeHTML(cardTitle(item));
  const format=group==='stickers' ? 'MOTION' : (item.tag || '');
  const badge=group==='banners'?'':`<span class="visual-badge">${group==='stickers'?'↻ LOOP':'▶ PLAY'}</span>`;
  return `<button class="media-card ${group==='banners'?'banner-card':group==='videos'?'video-card':group==='avatars'?'avatar-card':'sticker-card'}" type="button" data-gallery="${group}" data-index="${index}" aria-label="${escapeHTML(copy('open'))} ${title}">
    <span class="visual">
      ${item.kind==='image' ? `<img src="${item.src}" alt="${title}" loading="lazy" decoding="async">` : `<video class="hover-video" src="${item.preview || item.src}" ${item.poster ? `poster="${item.poster}"` : ''} muted loop playsinline preload="none" aria-label="${title}"></video>`}
      ${badge}
      <span class="card-action" aria-hidden="true">↗</span>
    </span>
    <span class="card-meta"><span class="card-name">${title}</span><span class="card-format">${escapeHTML(format)}</span></span>
  </button>`;
}
function renderCards(){
  for(const group of Object.keys(GALLERIES)){
    const id=({banners:'#bannerGrid',videos:'#videoGrid',avatars:'#avatarGrid',stickers:'#stickerGrid'})[group];
    $(id).innerHTML=GALLERIES[group].length ? GALLERIES[group].map((item,index)=>card(item,group,index)).join('') : `<p class="gallery-empty">${escapeHTML(copy('empty'))}</p>`;
    const qty = document.querySelector(`[data-nav="${group}"] .collection-qty`);
    if(qty) qty.textContent=String(GALLERIES[group].length).padStart(2,'0');
  }
  $$('.media-card').forEach(el=>el.addEventListener('click',()=>openMedia(el.dataset.gallery,Number(el.dataset.index))));
  initHover();
}

function pausePreviews(){
  $$('.hover-video').forEach(video=>{
    if(!video.paused)video.pause();
  });
  mobilePlaying=null;
}

function initHover(){
  const desktop=window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  $$('.hover-video').forEach(video=>{
    const card=video.closest('.media-card');
    if(desktop && !reducedMotion.matches){
      card.addEventListener('mouseenter',()=>{if(!opened)video.play().catch(()=>{});});
      card.addEventListener('mouseleave',()=>{video.pause();video.currentTime=0;});
    }
  });
  if(!desktop && !reducedMotion.matches && 'IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      if(opened)return;
      let candidate=entries.filter(x=>x.isIntersecting && x.intersectionRatio>.65).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!candidate)return;
      let video=candidate.target;
      if(video===mobilePlaying)return;
      if(mobilePlaying)mobilePlaying.pause();
      mobilePlaying=video;
      video.play().catch(()=>{});
    },{threshold:[0,.65,.9]});
    // Full-length AI films have short hover teasers; do not autoplay them on mobile data.
    $$('.hover-video').filter(v=>v.closest('.media-card').dataset.gallery!=='avatars').forEach(v=>io.observe(v));
  }
}

function cvHref(){
  const data=window.PORTFOLIO_DATA?.cv || {};
  const path=/^assets\/cv\/[a-zA-Z0-9_.-]+\.pdf$/i.test(data.path || '') ? data.path : 'assets/cv/Lavrikov_CV.pdf';
  return path + (data.revision ? '?v='+encodeURIComponent(data.revision) : '');
}
function contact(){
  const config=window.PORTFOLIO_DATA?.contact || {};
  const email=(config.email||'').trim();
  const username=(config.telegram||'').trim().replace(/^@/,'');
  const links=[];
  const headerLinks=[];
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    links.push(`<a href="mailto:${encodeURIComponent(email)}" class="contact-email">${escapeHTML(email)} <span aria-hidden="true">↗</span></a>`);
    headerLinks.push(`<a href="mailto:${encodeURIComponent(email)}" class="header-chip header-email">${escapeHTML(email)}</a>`);
  }
  if(/^[a-zA-Z0-9_]{5,32}$/.test(username)){
    links.push(`<a href="https://t.me/${username}" target="_blank" rel="noopener noreferrer" class="contact-telegram">@${escapeHTML(username)} <span aria-hidden="true">↗</span></a>`);
    headerLinks.push(`<a href="https://t.me/${username}" target="_blank" rel="noopener noreferrer" class="header-chip header-telegram">@${escapeHTML(username)}</a>`);
  }
  const href=escapeHTML(cvHref());
  $('#contactLinks').innerHTML=links.join('')+`<a class="footer-cv" href="${href}" download data-cv-download>${escapeHTML(copy('downloadCV'))}</a>`;
  const header=$('#headerCv');
  if(header) header.href=cvHref();
  const headerBox=$('#headerContacts');
  if(headerBox) headerBox.innerHTML=headerLinks.join('');
}
function translate(lang){
  if(!COPY[lang])return;
  const locationY=window.scrollY;
  language=lang;
  document.documentElement.lang=lang;
  try{localStorage.setItem('al-gallery-lang',lang);}catch(e){}
  $$('[data-i18n]').forEach(el=>el.innerHTML=COPY[lang][el.dataset.i18n]||'');
  $$('[data-lang]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.lang===lang)));
  $('.language-select').setAttribute('aria-label',copy('label'));
  $('#prevMedia').setAttribute('aria-label',copy('previous'));
  $('#nextMedia').setAttribute('aria-label',copy('next'));
  $('#closeLightbox').setAttribute('aria-label',copy('close'));
  renderCards();contact();
  if(opened)drawLightbox();
  if(window.scrollY!==locationY)window.scrollTo({top:locationY,behavior:'instant'});
}

function drawLightbox(){
  if(!opened)return;
  const {group,index}=opened;
  const entry=GALLERIES[group][index];
  const container=$('#lightboxView');
  container.querySelectorAll('video').forEach(x=>x.pause());
  if(entry.kind==='image'){
    container.innerHTML=`<img src="${entry.src}" alt="${escapeHTML(cardTitle(entry))}">`;
  }else{
    container.innerHTML=`<video src="${entry.src}" ${entry.poster ? `poster="${entry.poster}"` : ''} controls playsinline preload="metadata" aria-label="${escapeHTML(cardTitle(entry))}"></video>`;
    const vid=container.querySelector('video');
    vid.volume=.7;
    vid.play().catch(()=>{});
  }
  $('#lightboxCounter').textContent=`${String(index+1).padStart(2,'0')} / ${String(GALLERIES[group].length).padStart(2,'0')}`;
  $('#lightboxTitle').textContent=cardTitle(entry);
  $('#lightboxCategory').textContent=group==='avatars'?copy('avatarsSub'):copy(groupName(group));
}
function openMedia(group,index){
  if(!GALLERIES[group] || !GALLERIES[group][index])return;
  focusBefore=document.activeElement;
  opened={group,index};
  pausePreviews();
  $('#lightbox').hidden=false;
  document.body.classList.add('overlay-open');
  drawLightbox();
  $('#closeLightbox').focus({preventScroll:true});
}
function stepMedia(delta){
  if(!opened)return;
  const len=GALLERIES[opened.group].length;
  opened.index=(opened.index+delta+len)%len;
  drawLightbox();
}
function closeMedia(){
  if(!opened)return;
  $('#lightboxView').querySelectorAll('video').forEach(v=>v.pause());
  $('#lightboxView').innerHTML='';
  $('#lightbox').hidden=true;
  document.body.classList.remove('overlay-open');
  opened=null;
  if(focusBefore && document.contains(focusBefore))focusBefore.focus({preventScroll:true});
}

function syncHeaderHeight(){
  const header = $('.site-header');
  if(!header) return;
  document.documentElement.style.setProperty('--header', `${header.offsetHeight}px`);
}

function installNav(){
  const buttons=$$('[data-nav]');
  function update(){
    const y=window.scrollY+window.innerHeight*.25+110;
    let current='banners';
    for(const key of Object.keys(GALLERIES)){
      if(document.getElementById(key).offsetTop<=y)current=key;
    }
    buttons.forEach(link=>link.classList.toggle('is-active',link.dataset.nav===current));
  }
  window.addEventListener('scroll',update,{passive:true});
  window.addEventListener('resize',update,{passive:true});
  buttons.forEach(link=>link.addEventListener('click',()=>{
    buttons.forEach(x=>x.classList.toggle('is-active',x===link));
  }));
  update();
}

function init(){
  $('#year').textContent=new Date().getFullYear();
  $$('[data-lang]').forEach(el=>el.addEventListener('click',()=>translate(el.dataset.lang)));
  $('#closeLightbox').addEventListener('click',closeMedia);
  $('#prevMedia').addEventListener('click',()=>stepMedia(-1));
  $('#nextMedia').addEventListener('click',()=>stepMedia(1));
  $('#lightbox').addEventListener('click',event=>{if(event.target.id==='lightbox')closeMedia();});
  document.addEventListener('keydown',event=>{
    if(!opened)return;
    if(event.key==='Escape'){closeMedia();return;}
    if(event.key==='ArrowLeft'){stepMedia(-1);return;}
    if(event.key==='ArrowRight'){stepMedia(1);return;}
    if(event.key==='Tab'){
      const order=[$('#closeLightbox'),$('#prevMedia'),$('#nextMedia'),...$$('#lightboxView video[controls]')];
      const i=order.indexOf(document.activeElement);
      if(event.shiftKey && i===0){event.preventDefault();order[order.length-1].focus();}
      if(!event.shiftKey && i===order.length-1){event.preventDefault();order[0].focus();}
    }
  });
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight, {passive:true});
  let stored='ru';
  try{stored=localStorage.getItem('al-gallery-lang')||'ru';}catch(e){}
  translate(COPY[stored]?stored:'ru');
  installNav();
}

document.addEventListener('DOMContentLoaded',init);
