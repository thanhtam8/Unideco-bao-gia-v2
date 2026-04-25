emailjs.init('QfqHd-vdgybLxunMa');
// ── SEND QUOTE ───────────────────────────────────────────
async function sendQuote() {
  const data = window._quoteData;
  if(!data){alert('Vui lòng tính báo giá trước!');return;}
  const btn = document.getElementById('btnSend');
  const btnTxt = document.getElementById('sendBtnTxt');
  const status = document.getElementById('sendStatus');
  btn.disabled = true;
  btnTxt.textContent = '⏳ Đang gửi...';
  status.style.display = 'none';
  status.className = '';

  let sheetsOk = false, emailOk = false;

  // ── Google Sheets ──
  try {
    const resp = await fetch('https://script.google.com/macros/s/AKfycbygX2oxNZydIz-ej683tZmdBls4qleir8SRI7EOnyplaEDV7vEUYFZ866JzZNBA9gmWCw/exec', {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    sheetsOk = true;
  } catch(e) {
    console.error('Sheets error:', e);
  }

  // ── EmailJS ──
  try {
    await emailjs.send('service_jl1tqdp', 'template_yteijdl', {
      from_name:  data.name,
      phone:      data.phone,
      model:      data.model,
      area:       data.area,
      services:   data.services,
      thietke:    data.thietke,
      tho:        data.tho,
      hoanthien:  data.hoanthien,
      total:      data.total,
      time:       data.time
    });
    emailOk = true;
  } catch(e) {
    console.error('EmailJS error:', e);
  }

  // ── Show result ──
  status.style.display = 'block';
  if(sheetsOk && emailOk) {
    status.textContent = '✅ Gửi thành công! Dữ liệu đã lưu vào Google Sheets và email thông báo đã được gửi.';
    status.classList.add('send-ok');
    btnTxt.textContent = '✅ Đã gửi';
  } else if(sheetsOk) {
    status.textContent = '⚠ Đã lưu Google Sheets nhưng email gặp lỗi. Vui lòng kiểm tra cấu hình EmailJS.';
    status.classList.add('send-err');
    btn.disabled = false;
    btnTxt.textContent = '📤 Thử lại';
  } else if(emailOk) {
    status.textContent = '⚠ Email đã gửi nhưng Google Sheets gặp lỗi. Vui lòng kiểm tra Apps Script.';
    status.classList.add('send-err');
    btn.disabled = false;
    btnTxt.textContent = '📤 Thử lại';
  } else {
    status.textContent = '❌ Gửi thất bại cả 2 kênh. Vui lòng kiểm tra kết nối internet và thử lại.';
    status.classList.add('send-err');
    btn.disabled = false;
    btnTxt.textContent = '📤 Thử lại';
  }
  status.scrollIntoView({behavior:'smooth',block:'center'});
}

emailjs.init("QfqHd-vdgybLxunMa");

// ── THEME ──────────────────────────────────────────────
(function(){
  const btn=document.getElementById('themeBtn'),icon=document.getElementById('themeIcon'),html=document.documentElement;
  const SUN='<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
  const MOON='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  let dark=matchMedia('(prefers-color-scheme:dark)').matches;
  function apply(){html.setAttribute('data-theme',dark?'dark':'light');icon.innerHTML=dark?SUN:MOON;}
  apply();btn.addEventListener('click',()=>{dark=!dark;apply();});
})();

// ── PRICE TABLE ─────────────────────────────────────────
// model: nha-pho | biet-thu | can-ho
// keys: kt, nt, tg-tc, tg-cc
const DESIGN_PRICES = {
  'nha-pho':  { kt:200000, nt:200000, tgTc:280000, tgCc:350000 },
  'biet-thu': { kt:250000, nt:250000, tgTc:350000, tgCc:450000 },
  'can-ho':   { kt:180000, nt:180000, tgTc:250000, tgCc:300000 },
};
const THO_PRICES = { coban:3800000, caocap:4000000 };
const HT_PRICES  = { coban:2800000, caocap:3400000 };

// ── STATE ───────────────────────────────────────────────
const svcOff={thietke:false,tho:false,hoanthien:false};
let tkState={kt:false,nt:false,tg:false,tgSub:null}; // tgSub: 'tc'|'cc'|null

// ── HELPERS ─────────────────────────────────────────────
function fmt(n){return new Intl.NumberFormat('vi-VN').format(Math.round(n));}
function fmtCur(n){return new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(Math.round(n));}
function getModel(){const r=document.querySelector('input[name="model"]:checked');return r?r.value:'nha-pho';}
function getTotalArea(){
  const a=parseFloat(document.getElementById('area').value);
  const f=parseInt(document.getElementById('floors').value);
  return(!a||!f||a<=0||f<=0)?0:a*f*1.2;
}
function getCoef(total){return total>0&&total<160?1.4:1.0;}

// ── MODEL SELECT ────────────────────────────────────────
document.querySelectorAll('.model-card').forEach(card=>{
  card.addEventListener('click',()=>{
    document.querySelectorAll('.model-card').forEach(c=>c.classList.remove('active'));
    card.classList.add('active');card.querySelector('input').checked=true;
    refreshDesignPrices();updateArea();
  });
});

// ── AREA ────────────────────────────────────────────────
document.getElementById('area').addEventListener('input',updateArea);
document.getElementById('floors').addEventListener('input',updateArea);

function updateArea(){
  const a=parseFloat(document.getElementById('area').value);
  const f=parseInt(document.getElementById('floors').value);
  if(!a||!f||a<=0||f<=0){
    document.getElementById('totalAreaVal').textContent='— m²';
    document.getElementById('formulaVal').textContent='Nhập diện tích & số tầng để tính';
    document.getElementById('condNote').textContent='';
    document.getElementById('coef-note').classList.remove('show');
    return;
  }
  const total=a*f*1.2;
  document.getElementById('totalAreaVal').textContent=fmt(total)+' m²';
  document.getElementById('formulaVal').textContent=`${fmt(a)} m² × ${f} tầng × 1,2 = ${fmt(total)} m²`;
  const notes=[];
  // if(total<350)notes.push('⚠ Gói thô yêu cầu ≥ 350m²');
  // if(a<85)notes.push('⚠ Mỗi sàn ≥ 85m²');
  // if(total<200)notes.push('⚠ Gói hoàn thiện yêu cầu ≥ 200m²');
  document.getElementById('condNote').textContent=notes.join(' | ');
  document.getElementById('coef-note').classList.toggle('show',total<160&&!svcOff.thietke);
  refreshDesignPrices();
}

// ── DESIGN PRICES REFRESH ───────────────────────────────
function refreshDesignPrices(){
  const model=getModel();
  const p=DESIGN_PRICES[model]||DESIGN_PRICES['nha-pho'];
  const total=getTotalArea();
  const coef=getCoef(total);
  const coefLabel=coef>1?` ×${coef}`:'';
  document.getElementById('price-kt').textContent=fmt(p.kt*coef)+' đ/m²'+coefLabel;
  document.getElementById('price-nt').textContent=fmt(p.nt*coef)+' đ/m²'+coefLabel;
  document.getElementById('tg-tc-price').textContent=fmt(p.tgTc*coef)+' đ/m²'+coefLabel;
  document.getElementById('tg-cc-price').textContent=fmt(p.tgCc*coef)+' đ/m²'+coefLabel;
  document.getElementById('coef-note').classList.toggle('show',total>0&&total<160&&!svcOff.thietke);
}

// ── THIẾT KẾ CARD SELECT ─────────────────────────────────
function selectTK(type){
  if(type==='tg'){
    const wasActive=tkState.tg;
    // toggle TG
    tkState.tg=!wasActive;
    if(tkState.tg){
      // deactivate KT+NT
      tkState.kt=false;tkState.nt=false;
      document.getElementById('tk-kt').classList.add('dim');
      document.getElementById('tk-nt').classList.add('dim');
      document.getElementById('tg-sub').classList.add('show');
    } else {
      tkState.tgSub=null;
      document.getElementById('tk-kt').classList.remove('dim');
      document.getElementById('tk-nt').classList.remove('dim');
      document.getElementById('tg-sub').classList.remove('show');
      document.querySelectorAll('.tg-opt').forEach(o=>o.classList.remove('active'));
    }
  } else {
    // checkbox KT or NT — only allowed when TG is off
    if(tkState.tg) return;
    tkState[type]=!tkState[type];
  }
  renderTKState();
}

function selectTGSub(sub){
  tkState.tgSub=sub;
  document.querySelectorAll('.tg-opt').forEach(o=>o.classList.remove('active'));
  document.getElementById('tg-'+sub).classList.add('active');
}

function renderTKState(){
  ['kt','nt','tg'].forEach(t=>{
    document.getElementById('tk-'+t).classList.toggle('active',tkState[t]);
  });
}

// ── PKG SELECT ───────────────────────────────────────────
function selectPkg(card,group){
  document.querySelectorAll(`#svc-${group} .pkg-card`).forEach(c=>c.classList.remove('active'));
  card.classList.add('active');
}

// ── TOGGLE SERVICE ───────────────────────────────────────
function toggleService(group,enabled){
  svcOff[group]=!enabled;
  updateStatus(group,enabled);
  const content=document.getElementById('svc-'+group);
  if(!enabled){
    content.classList.add('disabled');
    if(group==='thietke'){
      tkState={kt:false,nt:false,tg:false,tgSub:null};
      renderTKState();
      document.getElementById('tg-sub').classList.remove('show');
      document.querySelectorAll('.tg-opt').forEach(o=>o.classList.remove('active'));
      ['tk-kt','tk-nt'].forEach(id=>document.getElementById(id).classList.remove('dim'));
      document.getElementById('coef-note').classList.remove('show');
    }
  } else {
    content.classList.remove('disabled');
    if(group==='thietke') refreshDesignPrices();
  }
}
function updateStatus(group,enabled){
  const el=document.getElementById('status-'+group);
  if(!el)return;
  el.textContent=enabled?'Bật':'Tắt';
  el.classList.toggle('on',enabled);
}

// ── COMPUTE ──────────────────────────────────────────────
function computeQuote(){
  const errors=[];
  const name=document.getElementById('fullname').value.trim();
  const phone=document.getElementById('phone').value.trim();
  const model=document.querySelector('input[name="model"]:checked');
  const a=parseFloat(document.getElementById('area').value);
  const f=parseInt(document.getElementById('floors').value);
  const thoCard=document.querySelector('#svc-tho .pkg-card.active');
  const htCard=document.querySelector('#svc-hoanthien .pkg-card.active');

  if(!name)errors.push('Vui lòng nhập họ và tên');
  if(!phone)errors.push('Vui lòng nhập số điện thoại');
  if(!model)errors.push('Vui lòng chọn mô hình công trình');
  if(!a||a<=0)errors.push('Vui lòng nhập diện tích sàn hợp lệ');
  if(!f||f<=0)errors.push('Vui lòng nhập số tầng hợp lệ');
  if(!svcOff.thietke){
    if(tkState.tg&&!tkState.tgSub) errors.push('Vui lòng chọn mức gói Trọn gói (Tiêu chuẩn / Cao cấp)');
    if(!tkState.kt&&!tkState.nt&&!tkState.tg) errors.push('Vui lòng chọn gói thiết kế hoặc tắt dịch vụ Thiết kế');
  }
  if(!svcOff.tho&&!thoCard) errors.push('Vui lòng chọn gói thi công thô');
  if(!svcOff.hoanthien&&!htCard) errors.push('Vui lòng chọn gói hoàn thiện');
  if(svcOff.thietke&&svcOff.tho&&svcOff.hoanthien) errors.push('Vui lòng bật ít nhất 1 dịch vụ');

  const errEl=document.getElementById('errMsg');
  if(errors.length>0){
    document.getElementById('errList').innerHTML=errors.map(e=>`<li>${e}</li>`).join('');
    errEl.classList.add('show');errEl.scrollIntoView({behavior:'smooth',block:'center'});return;
  }
  errEl.classList.remove('show');

  const modelVal=model.value;
  const p=DESIGN_PRICES[modelVal]||DESIGN_PRICES['nha-pho'];
  const total=a*f*1.2;
  const coef=getCoef(total);
  const rows=[];let grand=0;
  const coefTxt=coef>1?` (×${coef} vì S<160m²)`:'';

  if(!svcOff.thietke){
    if(tkState.tg){
      const price=(tkState.tgSub==='tc'?p.tgTc:p.tgCc)*coef;
      const subLabel=tkState.tgSub==='tc'?'Tiêu chuẩn':'Cao cấp';
      const amount=price*total;grand+=amount;
      rows.push({name:'Thiết kế Trọn gói – '+subLabel+coefTxt,tag:'Trọn gói',uprice:fmt(price)+' đ/m²',area:fmt(total)+' m²',amount});
    } else {
      if(tkState.kt){
        const price=p.kt*coef;const amount=price*total;grand+=amount;
        rows.push({name:'Thiết kế Kiến trúc'+coefTxt,tag:'Kiến trúc',uprice:fmt(price)+' đ/m²',area:fmt(total)+' m²',amount});
      }
      if(tkState.nt){
        const price=p.nt*coef;const amount=price*total;grand+=amount;
        rows.push({name:'Thiết kế Nội thất'+coefTxt,tag:'Nội thất',uprice:fmt(price)+' đ/m²',area:fmt(total)+' m²',amount});
      }
    }
  }
  if(!svcOff.tho&&thoCard){
    const val=thoCard.querySelector('input').value;
    const price=THO_PRICES[val];const amount=price*total;grand+=amount;
    const lbl=val==='coban'?'Gói Chuẩn UNI':'Gói Nâng Cao';
    rows.push({name:'Thi công Thô – '+lbl,tag:'Phần thô',uprice:fmt(price)+' đ/m²',area:fmt(total)+' m²',amount});
  }
  if(!svcOff.hoanthien&&htCard){
    const val=htCard.querySelector('input').value;
    const price=HT_PRICES[val];const amount=price*total;grand+=amount;
    const lbl=val==='coban'?'Gói Chuẩn UNI':'Gói Nâng Cao';
    rows.push({name:'Hoàn thiện – '+lbl,tag:'Hoàn thiện',uprice:fmt(price)+' đ/m²',area:fmt(total)+' m²',amount});
  }

  const mNames={'nha-pho':'Nhà phố / Nhà vườn','biet-thu':'Biệt thự / Villa','can-ho':'Căn hộ / Khách sạn'};
  const now=new Date();
  document.getElementById('resultDate').textContent='Ngày '+now.getDate()+'/'+(now.getMonth()+1)+'/'+now.getFullYear()+' – '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  document.getElementById('resultCustomer').innerHTML=`
    <div class="r-cust-item"><div class="lbl">Khách hàng</div><div class="val">${name}</div></div>
    <div class="r-cust-item"><div class="lbl">Điện thoại</div><div class="val">${phone}</div></div>
    <div class="r-cust-item"><div class="lbl">Loại công trình</div><div class="val">${mNames[modelVal]}</div></div>
    <div class="r-cust-item"><div class="lbl">Tổng diện tích</div><div class="val">${fmt(total)} m²</div></div>`;
  document.getElementById('resultBody').innerHTML=rows.map(r=>`
    <tr>
      <td><strong>${r.name}</strong><br><span class="r-pkg-lbl">${r.tag}</span></td>
      <td>${r.uprice}</td><td>${r.area}</td>
      <td class="r-amount">${fmt(r.amount)} đ</td>
    </tr>`).join('');
  document.getElementById('resultTotalCell').innerHTML=`<strong>${fmt(grand)} đ</strong>`;
  document.getElementById('resultGrand').textContent=fmtCur(grand);
  const panel=document.getElementById('resultPanel');
  panel.classList.add('show');
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),100);

  // Store for sending
  window._quoteData = {
    time: new Date().toLocaleString('vi-VN'),
    name: name,
    phone: phone,
    model: mNames[modelVal],
    area: fmt(total)+' m²',
    thietke: rows.filter(r=>['Trọn gói','Kiến trúc','Nội thất'].includes(r.tag)).map(r=>r.name).join(', ') || 'Không',
    tho: rows.find(r=>r.tag==='Phần thô')?rows.find(r=>r.tag==='Phần thô').name:'Không',
    hoanthien: rows.find(r=>r.tag==='Hoàn thiện')?rows.find(r=>r.tag==='Hoàn thiện').name:'Không',
    total: fmtCur(grand),
    services: rows.map(r=>r.name+': '+fmt(r.amount)+' đ').join(' | '),
    from_name: name
  };
  // Reset send button state
  const sb=document.getElementById('btnSend');
  if(sb){sb.disabled=false;document.getElementById('sendBtnTxt').textContent='📤 Gửi báo giá chi tiết';}
  document.getElementById('sendStatus').style.display='none';
}

// ── RESET ────────────────────────────────────────────────
function resetForm(){
  ['fullname','phone','area','floors'].forEach(id=>document.getElementById(id).value='');
  document.querySelectorAll('.model-card').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('input[name=model]').forEach(r=>r.checked=false);
  // reset thiết kế
  tkState={kt:false,nt:false,tg:false,tgSub:null};
  renderTKState();
  document.getElementById('tg-sub').classList.remove('show');
  document.querySelectorAll('.tg-opt').forEach(o=>o.classList.remove('active'));
  ['tk-kt','tk-nt'].forEach(id=>document.getElementById(id).classList.remove('dim'));
  // reset pkgs
  document.querySelectorAll('.pkg-card').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.pkg-card input').forEach(r=>r.checked=false);
  // reset toggles
  ['thietke','tho','hoanthien'].forEach(g=>{
    svcOff[g]=false;
    document.getElementById('toggle-'+g).checked=true;
    updateStatus(g,true);
    document.getElementById('svc-'+g).classList.remove('disabled');
  });
  document.getElementById('totalAreaVal').textContent='— m²';
  document.getElementById('formulaVal').textContent='Nhập diện tích & số tầng để tính';
  document.getElementById('condNote').textContent='';
  document.getElementById('coef-note').classList.remove('show');
  document.getElementById('promo-note').classList.remove('show');
  document.getElementById('resultPanel').classList.remove('show');
  document.getElementById('errMsg').classList.remove('show');
  window.scrollTo({top:0,behavior:'smooth'});
  window._quoteData=null;
  const ss=document.getElementById('sendStatus');if(ss){ss.style.display='none';ss.className='';}
  const sb2=document.getElementById('btnSend');if(sb2){sb2.disabled=false;document.getElementById('sendBtnTxt').textContent='📤 Gửi báo giá chi tiết';}
}

// ── SEND QUOTE ───────────────────────────────────────────
async function sendQuote() {
  const data = window._quoteData;
  if(!data){alert('Vui lòng tính báo giá trước!');return;}
  const btn = document.getElementById('btnSend');
  const btnTxt = document.getElementById('sendBtnTxt');
  const status = document.getElementById('sendStatus');
  btn.disabled = true;
  btnTxt.textContent = '⏳ Đang gửi...';
  status.style.display = 'none';
  status.className = '';

  let sheetsOk = false, emailOk = false;

  // ── Google Sheets ──
  try {
    const resp = await fetch('https://script.google.com/macros/s/AKfycbygX2oxNZydIz-ej683tZmdBls4qleir8SRI7EOnyplaEDV7vEUYFZ866JzZNBA9gmWCw/exec', {
      method: 'POST',
      mode: 'no-cors',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    sheetsOk = true;
  } catch(e) {
    console.error('Sheets error:', e);
  }

  // ── EmailJS ──
  try {
    await emailjs.send('service_jl1tqdp', 'template_yteijdl', {
      from_name:  data.name,
      phone:      data.phone,
      model:      data.model,
      area:       data.area,
      services:   data.services,
      thietke:    data.thietke,
      tho:        data.tho,
      hoanthien:  data.hoanthien,
      total:      data.total,
      time:       data.time
    });
    emailOk = true;
  } catch(e) {
    console.error('EmailJS error:', e);
  }

  // ── Show result ──
  status.style.display = 'block';
  if(sheetsOk && emailOk) {
    status.textContent = '✅ Gửi thành công! Dữ liệu đã lưu vào Google Sheets và email thông báo đã được gửi.';
    status.classList.add('send-ok');
    btnTxt.textContent = '✅ Đã gửi';
  } else if(sheetsOk) {
    status.textContent = '⚠ Đã lưu Google Sheets nhưng email gặp lỗi. Vui lòng kiểm tra cấu hình EmailJS.';
    status.classList.add('send-err');
    btn.disabled = false;
    btnTxt.textContent = '📤 Thử lại';
  } else if(emailOk) {
    status.textContent = '⚠ Email đã gửi nhưng Google Sheets gặp lỗi. Vui lòng kiểm tra Apps Script.';
    status.classList.add('send-err');
    btn.disabled = false;
    btnTxt.textContent = '📤 Thử lại';
  } else {
    status.textContent = '❌ Gửi thất bại cả 2 kênh. Vui lòng kiểm tra kết nối internet và thử lại.';
    status.classList.add('send-err');
    btn.disabled = false;
    btnTxt.textContent = '📤 Thử lại';
  }
  status.scrollIntoView({behavior:'smooth',block:'center'});
}

// ── GOOGLE SHEETS + EMAILJS INTEGRATION ─────────────────
const SHEETS_URL = "https://script.google.com/macros/s/AKfycbygX2oxNZydIz-ej683tZmdBls4qleir8SRI7EOnyplaEDV7vEUYFZ866JzZNBA9gmWCw/exec";
const EMAILJS_SERVICE  = "service_jl1tqdp";
const EMAILJS_TEMPLATE = "template_yteijdl";

function showOverlay(icon, title, msg, showClose=false){
  document.getElementById('sendOverlay').style.display='flex';
  document.getElementById('overlayIcon').textContent=icon;
  document.getElementById('overlayTitle').textContent=title;
  document.getElementById('overlayMsg').textContent=msg;
  document.getElementById('overlayClose').style.display=showClose?'inline-flex':'none';
}
function closeOverlay(){
  document.getElementById('sendOverlay').style.display='none';
}

async function sendQuote(){
  // Run the existing compute logic first to validate & render result
  computeQuote();
  // If result panel didn't show (validation failed), stop
  if(!document.getElementById('resultPanel').classList.contains('show')) return;

  // Collect data
  const name   = document.getElementById('fullname').value.trim();
  const phone  = document.getElementById('phone').value.trim();
  const model  = document.querySelector('input[name="model"]:checked')?.value||'';
  const a      = parseFloat(document.getElementById('area').value)||0;
  const f      = parseInt(document.getElementById('floors').value)||0;
  const total  = a*f*1.2;
  const mNames = {'nha-pho':'Nhà phố / Nhà vườn','biet-thu':'Biệt thự / Villa','can-ho':'Căn hộ / Khách sạn'};

  // Build services summary
  const svcLines=[];
  if(!svcOff.thietke){
    if(tkState.tg){
      const sub=tkState.tgSub==='tc'?'Tiêu chuẩn':'Cao cấp';
      svcLines.push('Thiết kế Trọn gói – '+sub);
    } else {
      if(tkState.kt) svcLines.push('Thiết kế Kiến trúc');
      if(tkState.nt) svcLines.push('Thiết kế Nội thất');
    }
  }
  const thoCard=document.querySelector('#svc-tho .pkg-card.active');
  if(!svcOff.tho&&thoCard) svcLines.push('Thi công Thô – '+(thoCard.querySelector('.pkg-name').textContent));
  const htCard=document.querySelector('#svc-hoanthien .pkg-card.active');
  if(!svcOff.hoanthien&&htCard) svcLines.push('Hoàn thiện – '+(htCard.querySelector('.pkg-name').textContent));

  const grandVal = document.getElementById('resultGrand').textContent;
  const now = new Date();
  const timeStr = now.toLocaleString('vi-VN');

  const payload = {
    time:       timeStr,
    name:       name,
    phone:      phone,
    model:      mNames[model]||model,
    area:       total.toFixed(1)+' m²',
    thietke:    svcLines.filter(s=>s.startsWith('Thiết')).join(', ')||'Không',
    tho:        svcLines.filter(s=>s.startsWith('Thi công')).join(', ')||'Không',
    hoanthien:  svcLines.filter(s=>s.startsWith('Hoàn')).join(', ')||'Không',
    services:   svcLines.join(' | ')||'Không có',
    total:      grandVal,
    from_name:  name,
  };

  showOverlay('⏳','Đang gửi báo giá...','Vui lòng chờ trong giây lát');

  let sheetsOk=false, emailOk=false;

  // ── GOOGLE SHEETS ──
  try{
    const r = await fetch(SHEETS_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      mode:'no-cors'
    });
    sheetsOk=true;
  } catch(err){
    console.warn('Sheets error:',err);
  }

  // ── EMAILJS ──
  try{
    await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, payload);
    emailOk=true;
  } catch(err){
    console.warn('EmailJS error:',err);
  }

  // ── RESULT OVERLAY ──
  if(sheetsOk||emailOk){
    let icon='✅', title='Gửi thành công!';
    let msg='';
    if(sheetsOk&&emailOk) msg='KTS UNIDECO đã nhận được yêu cầu của bạn và sẽ liên hệ trong thời gian sớm nhất. Cảm ơn bạn đã quan tâm đến dịch vụ của chúng tôi!';
    else if(sheetsOk)     msg='UNIDECO đã nhận được yêu cầu của bạn. Chúng tôi sẽ liên hệ sớm nhất có thể.';
    else                  msg='UNIDECO đã nhận được thông tin của bạn. Chúng tôi sẽ liên hệ sớm nhất có thể.';
    showOverlay(icon, title, msg, true);
  } else {
    showOverlay('❌','Gửi thất bại','Vui lòng kiểm tra kết nối và thử lại.',true);
  }
}