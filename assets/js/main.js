/* ======= PRICING DATA ======= */
const PRICING = {
  thietke: {
    'nha-vuon':  { kientruc:200000, noithat:200000, tc:280000, nc:350000 },
    'nha-pho':   { kientruc:200000, noithat:200000, tc:280000, nc:350000 },
    'dich-vu':   { kientruc:180000, noithat:180000, tc:250000, nc:300000 },
    'biet-thu':  { kientruc:250000, noithat:250000, tc:350000, nc:450000 }
  },
  tho: {
    'nha-vuon':  { single: 4300000 },
    'nha-pho':   { single: 4500000 },
    'dich-vu':   { tc: 4600000, nc: 4800000 },
    'biet-thu':  { single: 4700000 }
  },
  hoanThien: {
    'nha-vuon':  { ranges:[{min:140, tc:3700000, nc:4800000}], bt:null },
    'nha-pho':   { ranges:[{min:300, tc:2600000, nc:3400000},{min:220, tc:2900000, nc:3700000},{min:180, tc:3300000, nc:4400000}], bt:null },
    'dich-vu':   { ranges:[{min:400, tc:2600000, nc:3400000}], bt:null },
    'biet-thu':  { ranges:[{min:360, tc:3800000, nc:5000000}], bt:null }
  }
};

/* ======= CONFIG ======= */
const EMAILJS_SERVICE_ID  = 'service_krktg9l';
const EMAILJS_TEMPLATE_ID = 'template_2vmxlph';
const EMAILJS_PUBLIC_KEY  = '8rtBuq7HHxnshoXOY';
const GOOGLE_SHEET_URL    = 'https://script.google.com/macros/s/AKfycbwTv2PmeKgVhmO7EdhhcamaGmm1CWQO_SKUV0TwS-1wv9OByu-h3zuaZJ_3i82LAGxq/exec';

/* ======= STATE ======= */
let blockOn = { tk:true, tho:false, ht:false };
let picked  = { tk:null, tho:null, ht:null };
let quoteUnlocked = false;

/* ======= UTILS ======= */
function fmtM(v){ return v.toLocaleString('vi-VN')+' đ'; }
function getS(){
  const As=parseFloat(document.getElementById('dt-san').value)||0;
  const n=parseInt(document.getElementById('so-tang').value)||0;
  const km=parseFloat(document.getElementById('loai-mong').value)||0;
  const kr=parseFloat(document.getElementById('loai-mai').value)||0;
  const St=As*n; const Sm=As*km; const Sr=As*kr;
  return {As,n,km,kr,St,Sm,Sr,S:St+Sm+Sr};
}
function getCT(){ const el=document.querySelector('input[name="loai_ct"]:checked'); return el?el.value:null; }

/* ======= THEME ======= */
function toggleTheme(){
  const t=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',t);
  document.querySelector('.theme-btn').textContent=t==='dark'?'☀️ Giao diện':'🌙 Giao diện';
}

/* ======= STEP INDICATOR ======= */
function updateSteps(){
  const ct=getCT(); const {As,n}=getS();
  const email=(document.getElementById('email')||{}).value||'';
  const hoten=document.getElementById('hoten').value.trim();
  const sdt=document.getElementById('sdt').value.trim();
  const s1=hoten&&sdt&&email.trim();
  ['1','2','3','4'].forEach(i=>document.getElementById('nav-'+i).classList.remove('active','done'));
  if(s1)document.getElementById('nav-1').classList.add('done');
  else  document.getElementById('nav-1').classList.add('active');
  if(ct){document.getElementById('nav-2').classList.add(s1?'done':'active');}
  else if(s1){document.getElementById('nav-2').classList.add('active');}
  if(As>0&&n>0){document.getElementById('nav-3').classList.add(ct?'done':'active');}
  else if(ct&&s1){document.getElementById('nav-3').classList.add('active');}
  const anySvc=Object.entries(blockOn).some(([k,v])=>{
    if(!v) return false;
    if(k==='tho' && ct!=='dich-vu') return true;
    return !!picked[k];
  });
  if(anySvc){document.getElementById('nav-4').classList.add((s1&&ct&&As>0&&n>0)?'done':'active');}
  else if(s1&&ct&&As>0&&n>0){document.getElementById('nav-4').classList.add('active');}
}

/* ======= UPDATE MONG OPTIONS (dynamic coefficient) ======= */
function updateMongOptions(n){
  const ct = getCT();
  const optDon = document.getElementById('opt-mong-don');
  const opt1p = document.getElementById('opt-mong-1p');
  const opt2p = document.getElementById('opt-mong-2p');
  const sel = document.getElementById('loai-mong');

  // Ẩn/hiện Móng đơn và Móng băng 1 phương nếu không an toàn
  const disableUnsafe = (ct === 'dich-vu') || (ct === 'nha-pho' && n >= 4);
  
  if (optDon) {
    optDon.disabled = disableUnsafe;
    optDon.style.display = disableUnsafe ? 'none' : '';
  }

  if(!opt1p || !opt2p) return;

  opt1p.disabled = disableUnsafe;
  opt1p.style.display = disableUnsafe ? 'none' : '';

  // Móng băng 1 phương: n ≥ 3 → 0.50 | n ≤ 2 → 0.45
  const k1p = n >= 3 ? 0.5 : 0.45;
  const prevVal1 = parseFloat(opt1p.value);
  opt1p.value = k1p;
  opt1p.textContent = 'Móng băng 1 phương (×' + k1p.toFixed(2) + ')';

  // Móng băng 2 phương: n ≥ 4 → 0.75 | n ≤ 3 → 0.70
  const k2p = n >= 4 ? 0.75 : 0.70;
  const prevVal2 = parseFloat(opt2p.value);
  opt2p.value = k2p;
  opt2p.textContent = 'Móng băng 2 phương (×' + k2p.toFixed(2) + ')';

  // Nếu option đang được chọn bị disable hoặc đổi giá trị, cập nhật lại giá trị select
  const curOption = sel.options[sel.selectedIndex];
  if (curOption && curOption.disabled) {
    sel.value = k2p; // Tự động chuyển sang Móng băng 2 phương nếu option cũ không khả dụng
  } else {
    const curVal = parseFloat(sel.value);
    if(curVal === prevVal1 && prevVal1 !== k1p){
      sel.value = k1p;
    }
    if(curVal === prevVal2 && prevVal2 !== k2p){
      sel.value = k2p;
    }
  }
}

/* ======= AUTO SWITCH CT (Nhà Phố → Nhà Dịch Vụ) ======= */
function checkCTAutoSwitch(){
  const ct = getCT();
  const As = parseFloat(document.getElementById('dt-san').value)||0;
  const n  = parseInt(document.getElementById('so-tang').value)||0;
  const St = As*n;
  const notice = document.getElementById('ct-switch-notice');

  if(ct === 'nha-pho' && n >= 4 && St >= 400){
    // Tự động chuyển sang Nhà Dịch Vụ
    const radioDV = document.getElementById('ct-dv');
    if(radioDV && !radioDV.checked){
      radioDV.checked = true;
    }
    if(notice){
      notice.classList.remove('hidden');
      notice.innerHTML = '🔄 <span>Hệ thống đã tự chuyển sang <strong>Nhà Dịch Vụ ≥ 4 tầng</strong> do công trình có <strong>'
        + n + ' tầng</strong> và tổng diện tích sàn <strong>'
        + St.toLocaleString('vi-VN') + ' m²</strong> (≥ 400 m²).</span>';
    }
    return true;
  } else if(ct === 'nha-pho' && n >= 4 && St < 400 && St > 0){
    // Giữ nguyên Nhà Phố, chỉ thông báo
    if(notice){
      notice.classList.remove('hidden');
      notice.innerHTML = 'ℹ️ <span>Công trình có <strong>'
        + n + ' tầng</strong> nhưng tổng diện tích sàn <strong>'
        + St.toLocaleString('vi-VN') + ' m²</strong> (< 400 m²) — vẫn giữ mô hình <strong>Nhà Phố</strong>.</span>';
    }
    return false;
  } else {
    if(notice) notice.classList.add('hidden');
    return false;
  }
}

/* ======= CT CHANGE ======= */
function onCTChange(){
  // Ẩn thông báo tự động khi người dùng chủ động đổi
  const notice = document.getElementById('ct-switch-notice');
  if(notice) notice.classList.add('hidden');
  onDimChange();
}

/* ======= DIM CHANGE ======= */
function onDimChange(){
  const n  = parseInt(document.getElementById('so-tang').value)||0;
  const As = parseFloat(document.getElementById('dt-san').value)||0;

  // 1. Cập nhật hệ số móng động
  updateMongOptions(n);

  // 2. Kiểm tra tự động chuyển loại công trình
  const switched = checkCTAutoSwitch();
  if(switched){ refreshPrices(); }

  const {As:_As,n:_n,km,kr,St,Sm,Sr,S}=getS();
  const box=document.getElementById('calc-box');
  if(_As>0&&_n>0){
    box.classList.remove('calc-hidden');
    document.getElementById('err-dim').classList.add('hidden');
    document.getElementById('r-st').textContent=St.toLocaleString('vi-VN')+' m²';
    const rowM=document.getElementById('r-row-m');
    const rowR=document.getElementById('r-row-r');
    if(km>0){rowM.style.display='flex';document.getElementById('r-sm').textContent=Sm.toLocaleString('vi-VN')+' m²';}
    else{rowM.style.display='none';}
    if(kr>0){rowR.style.display='flex';document.getElementById('r-sr').textContent=Sr.toLocaleString('vi-VN')+' m²';}
    else{rowR.style.display='none';}
    document.getElementById('r-total').textContent=S.toLocaleString('vi-VN')+' m²';
  } else {
    box.classList.add('calc-hidden');
  }
  refreshPrices();
  updateSummary();
}

/* ======= REFRESH PRICES ON PILLS ======= */
function refreshPrices(){
  const ct=getCT(); if(!ct) return;
  const {As,n}=getS(); const dtSD=As*n;
  const tk=PRICING.thietke[ct]||{};
  document.getElementById('px-tk-kt').textContent=tk.kientruc?fmtM(tk.kientruc)+'/m²':'—';
  document.getElementById('px-tk-nt').textContent=tk.noithat?fmtM(tk.noithat)+'/m²':'—';
  document.getElementById('px-tk-tgtc').textContent=tk.tc?fmtM(tk.tc)+'/m²':'—';
  document.getElementById('px-tk-tgnc').textContent=tk.nc?fmtM(tk.nc)+'/m²':'—';
  const tho=PRICING.tho[ct];
  if(ct==='dich-vu'){
    document.getElementById('tho-single').style.display='none';
    document.getElementById('tho-multi').style.display='flex';
    document.getElementById('px-tho-tc').textContent=fmtM(tho.tc)+'/m²';
    document.getElementById('px-tho-nc').textContent=fmtM(tho.nc)+'/m²';
  } else {
    document.getElementById('tho-single').style.display='flex';
    document.getElementById('tho-multi').style.display='none';
    document.getElementById('px-tho-single').textContent=fmtM(tho.single)+'/m²';
  }
  const ht=PRICING.hoanThien[ct];
  let htRange=null;
  if(ht&&ht.ranges){
    const sorted=[...ht.ranges].sort((a,b)=>b.min-a.min);
    for(const r of sorted){if(dtSD>=r.min){htRange=r;break;}}
    if(!htRange&&sorted.length) htRange=sorted[sorted.length-1];
  }
  document.getElementById('px-ht-tc').textContent=htRange?fmtM(htRange.tc)+'/m²':'—';
  document.getElementById('px-ht-nc').textContent=htRange?fmtM(htRange.nc)+'/m²':'—';
  const btPill=document.getElementById('pill-ht-bt');
  if(ht&&ht.bt){btPill.style.display='flex';document.getElementById('px-ht-bt').textContent=fmtM(ht.bt)+'/m²';}
  else{btPill.style.display='none';}
}

/* ======= TOGGLE BLOCK ======= */
function toggleBlock(key){
  blockOn[key]=!blockOn[key];
  const card=document.getElementById('svc-card-'+key);
  const tog=document.getElementById('toggle-'+key);
  card.classList.toggle('svc-on',blockOn[key]);
  card.classList.toggle('svc-off',!blockOn[key]);
  tog.classList.toggle('toggle-on',blockOn[key]);
  tog.querySelector('.toggle-label').textContent=blockOn[key]?'ON':'OFF';
  updateSummary();
}

/* ======= PICK PILL ======= */
function pickPill(btn){
  const svc=btn.getAttribute('data-svc');
  const opt=btn.getAttribute('data-opt');
  const wasActive=btn.classList.contains('active');
  document.querySelectorAll('.pill-btn[data-svc="'+svc+'"]').forEach(b=>b.classList.remove('active'));
  if(!wasActive){btn.classList.add('active');picked[svc]=opt;}
  else{picked[svc]=null;}
  updateSummary();
}

/* ======= COMPUTE QUOTE ======= */
function computeQuote(){
  const ct=getCT();
  const {As,n,S}=getS();
  const dtSD=As*n;
  const ctNames={'nha-vuon':'Nhà Vườn','nha-pho':'Nhà Phố ≤ 3 tầng','dich-vu':'Nhà Dịch Vụ ≥ 4 tầng','biet-thu':'Biệt Thự'};
  const optNamesTK={'kien-truc':'Kiến Trúc','noi-that':'Nội Thất','trong-goi-tc':'Trọn Gói Tiêu Chuẩn','trong-goi-nc':'Trọn Gói Nâng Cao'};
  const lines=[];
  let grand=0;

  if(blockOn.tk&&picked.tk&&ct){
    const tk=PRICING.thietke[ct]||{};
    const priceMap={'kien-truc':tk.kientruc,'noi-that':tk.noithat,'trong-goi-tc':tk.tc,'trong-goi-nc':tk.nc};
    const p=priceMap[picked.tk]||0; const total=p*As; grand+=total;
    lines.push({name:'Thiết Kế – '+optNamesTK[picked.tk],unit:fmtM(p)+'/m²',qty:As.toLocaleString('vi-VN')+' m² As',total:fmtM(total)});
  }
  if(blockOn.tho&&ct){
    const tho=PRICING.tho[ct];
    if(ct!=='dich-vu'){
      const p=tho.single||0;const total=p*S;grand+=total;
      lines.push({name:'Phần Thô',unit:fmtM(p)+'/m²',qty:S.toLocaleString('vi-VN')+' m² S',total:fmtM(total)});
    } else if(picked.tho){
      const p=tho[picked.tho]||0;const total=p*S;grand+=total;
      lines.push({name:'Phần Thô – '+(picked.tho==='tc'?'Tiêu Chuẩn':'Nâng Cao'),unit:fmtM(p)+'/m²',qty:S.toLocaleString('vi-VN')+' m² S',total:fmtM(total)});
    }
  }
  if(blockOn.ht&&picked.ht&&ct){
    const htData=PRICING.hoanThien[ct];let p=0;
    if(picked.ht==='bt'){p=htData.bt||0;}
    else{
      const sorted=[...htData.ranges].sort((a,b)=>b.min-a.min);
      let r=null;for(const x of sorted){if(dtSD>=x.min){r=x;break;}}if(!r&&sorted.length)r=sorted[sorted.length-1];
      p=r?r[picked.ht]||0:0;
    }
    const total=p*dtSD;grand+=total;
    const htNames={'tc':'Tiêu Chuẩn','nc':'Nâng Cao','bt':'Biệt Thự'};
    lines.push({name:'Hoàn Thiện – '+htNames[picked.ht],unit:fmtM(p)+'/m²',qty:dtSD.toLocaleString('vi-VN')+' m² sàn',total:fmtM(total)});
  }
  return {ct,ctName:ctNames[ct]||ct,As,n,S,dtSD,lines,grand};
}

/* ======= BUILD EMAIL HTML ======= */
function buildEmailHtml(hoten,sdt,email,q){
  const now=new Date();
  const dateStr=now.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'});
  const rows=q.lines.map(l=>`
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:14px;color:#1a2a42">${l.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#5a6a80;text-align:center">${l.unit}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:13px;color:#5a6a80;text-align:center">${l.qty}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e8ecf0;font-size:14px;font-weight:700;color:#d97706;text-align:right">${l.total}</td>
    </tr>`).join('');
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Báo Giá UNIDECO 2026</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)">
  <tr><td style="background:linear-gradient(135deg,#0d2137 0%,#1a3a5c 50%,#2563eb 100%);padding:32px 36px;text-align:center">
    <div style="font-size:28px;margin-bottom:8px">🏗️</div>
    <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:1px">UNIDECO</div>
    <div style="font-size:12px;color:rgba(255,255,255,.65);letter-spacing:2px;text-transform:uppercase;margin-top:4px">Thiết Kế & Xây Dựng</div>
    <div style="margin-top:16px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:6px 18px;font-size:13px;color:rgba(255,255,255,.9);font-weight:600;display:inline-block">📋 Báo Giá Xây Dựng 2026</div>
  </td></tr>
  <tr><td style="padding:28px 36px 8px">
    <p style="font-size:16px;color:#0d2137;font-weight:600;margin:0 0 6px">Kính gửi: <strong>${hoten}</strong></p>
    <p style="font-size:14px;color:#5a6a80;margin:0;line-height:1.6">Cảm ơn bạn đã quan tâm đến dịch vụ của UNIDECO. Dưới đây là bảng báo giá ước tính dựa trên thông tin bạn đã cung cấp ngày <strong>${dateStr}</strong>.</p>
  </td></tr>
  <tr><td style="padding:16px 36px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
      <tr><td colspan="2" style="padding:12px 16px;background:#eef2f7;font-size:11px;font-weight:800;color:#5a6a80;text-transform:uppercase;letter-spacing:1px">Thông Tin Khách Hàng</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#5a6a80;width:40%">👤 Họ và tên</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${hoten}</td></tr>
      <tr style="background:#f0f4f8"><td style="padding:10px 16px;font-size:13px;color:#5a6a80">📞 Số điện thoại</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${sdt}</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#5a6a80">✉️ Email</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${email}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:8px 36px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
      <tr><td colspan="2" style="padding:12px 16px;background:#eef2f7;font-size:11px;font-weight:800;color:#5a6a80;text-transform:uppercase;letter-spacing:1px">Thông Số Công Trình</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#5a6a80;width:50%">🏠 Loại công trình</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${q.ctName}</td></tr>
      <tr style="background:#f0f4f8"><td style="padding:10px 16px;font-size:13px;color:#5a6a80">📐 Diện tích sàn (As)</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${q.As.toLocaleString('vi-VN')} m²</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#5a6a80">🏢 Số tầng (n)</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${q.n} tầng</td></tr>
      <tr style="background:#f0f4f8"><td style="padding:10px 16px;font-size:13px;color:#5a6a80">📊 Tổng DT xây dựng (S)</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${q.S.toLocaleString('vi-VN')} m²</td></tr>
      <tr><td style="padding:10px 16px;font-size:13px;color:#5a6a80">🔲 DT sàn sử dụng (As×n)</td><td style="padding:10px 16px;font-size:13px;font-weight:700;color:#0d2137">${q.dtSD.toLocaleString('vi-VN')} m²</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 36px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
      <tr style="background:linear-gradient(90deg,#0d2137 0%,#1a3a5c 100%)">
        <th style="padding:12px 14px;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.8px;text-align:left">Hạng mục</th>
        <th style="padding:12px 14px;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.8px;text-align:center">Đơn giá</th>
        <th style="padding:12px 14px;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.8px;text-align:center">Khối lượng</th>
        <th style="padding:12px 14px;font-size:11px;font-weight:800;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.8px;text-align:right">Thành tiền</th>
      </tr>
      ${rows}
    </table>
  </td></tr>
  <tr><td style="padding:0 36px 28px">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border-radius:14px;border:2px solid #f59e0b;overflow:hidden">
      <tr>
        <td style="padding:18px 20px;font-size:15px;font-weight:800;color:#d97706">💰 Tổng tạm tính (chưa VAT)</td>
        <td style="padding:18px 20px;font-size:22px;font-weight:900;color:#d97706;text-align:right">${fmtM(q.grand)}</td>
      </tr>
    </table>
    <p style="font-size:12px;color:#9aa8bb;margin:10px 4px 0;line-height:1.5">⚠️ Báo giá mang tính tham khảo. Giá thực tế có thể thay đổi tùy thuộc vào khảo sát thực tế và yêu cầu cụ thể của công trình.</p>
  </td></tr>
  <tr><td style="background:#0d2137;padding:24px 36px;text-align:center">
    <p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 6px">UNIDECO – Thiết Kế & Xây Dựng</p>
    <p style="font-size:12px;color:rgba(255,255,255,.55);margin:0;line-height:1.6">Email này được gửi tự động từ hệ thống báo giá UNIDECO 2026</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/* ======= UPDATE SUMMARY ======= */
function updateSummary(){
  updateSteps();
  const summaryCard=document.querySelector('.summary-card');
  if(!quoteUnlocked){if(summaryCard)summaryCard.style.display='none';return;}
  else{if(summaryCard)summaryCard.style.display='block';}

  const ct=getCT();
  const {As,n,S}=getS();
  const dtSD=As*n;
  const hoten=document.getElementById('hoten').value.trim();
  const sdt=document.getElementById('sdt').value.trim();
  const email=(document.getElementById('email')||{}).value||'';
  const sb=document.getElementById('summary-body');
  if(!ct||As<=0||n<=0){
    sb.innerHTML='<p class="sum-row-empty" style="padding:1rem 0">Nhập đủ thông tin công trình và quy mô để xem ước tính.</p>';
    return;
  }
  const q=computeQuote();
  const ctNames={'nha-vuon':'Nhà Vườn','nha-pho':'Nhà Phố ≤ 3 tầng','dich-vu':'Nhà Dịch Vụ ≥ 4 tầng','biet-thu':'Biệt Thự'};
  let html='';
  if(hoten||sdt||email.trim()){
    html+='<div class="sum-section"><div class="sum-section-title">Khách hàng</div>';
    if(hoten) html+=row(hoten,'');
    if(sdt)   html+=row('📞 '+sdt,'');
    if(email.trim()) html+=row('✉️ '+email.trim(),'');
    html+='</div>';
  }
  html+='<div class="sum-section"><div class="sum-section-title">Thông số</div>';
  html+=row('Loại công trình',ctNames[ct]||ct);
  html+=row('Diện tích sàn (As)',As.toLocaleString('vi-VN')+' m²');
  html+=row('Số tầng (n)',n+' tầng');
  html+=row('Tổng DT xây dựng (S)',S.toLocaleString('vi-VN')+' m²');
  html+=row('DT sàn sử dụng (As×n)',dtSD.toLocaleString('vi-VN')+' m²');
  html+='</div>';
  html+='<hr class="sum-divider"><div class="sum-section"><div class="sum-section-title">Dịch vụ chọn</div>';

  if(blockOn.tk&&picked.tk){
    const tk=PRICING.thietke[ct]||{};
    const optNames={'kien-truc':'Kiến trúc','noi-that':'Nội thất','trong-goi-tc':'Trọn gói TC','trong-goi-nc':'Trọn gói NC'};
    const priceMap={'kien-truc':tk.kientruc,'noi-that':tk.noithat,'trong-goi-tc':tk.tc,'trong-goi-nc':tk.nc};
    const p=priceMap[picked.tk]||0;const total=p*As;
    html+=svcRow('🎨 Thiết kế – '+optNames[picked.tk],p,As,'m² As',total);
  } else if(!blockOn.tk){html+='<div class="sum-row-empty">Thiết kế: <em>đang tắt</em></div>';}
  else{html+='<div class="sum-row-empty">Thiết kế: <em>chưa chọn phương án</em></div>';}

  if(blockOn.tho){
    const tho=PRICING.tho[ct];
    if(ct!=='dich-vu'){const p=tho.single||0;const total=p*S;html+=svcRow('🏗️ Phần thô',p,S,'m² S',total);}
    else if(picked.tho){const p=tho[picked.tho]||0;const total=p*S;html+=svcRow('🏗️ Phần thô – '+(picked.tho==='tc'?'Tiêu chuẩn':'Nâng cao'),p,S,'m² S',total);}
    else{html+='<div class="sum-row-empty">Phần thô: <em>chưa chọn phương án</em></div>';}
  } else{html+='<div class="sum-row-empty">Phần thô: <em>đang tắt</em></div>';}

  if(blockOn.ht&&picked.ht){
    const htData=PRICING.hoanThien[ct];let p=0;
    if(picked.ht==='bt'){p=htData.bt||0;}
    else{const sorted=[...htData.ranges].sort((a,b)=>b.min-a.min);let r=null;for(const x of sorted){if(dtSD>=x.min){r=x;break;}}if(!r&&sorted.length)r=sorted[sorted.length-1];p=r?r[picked.ht]||0:0;}
    const total=p*dtSD;
    const htNames={'tc':'Tiêu chuẩn','nc':'Nâng cao','bt':'Biệt thự'};
    html+=svcRow('✨ Hoàn thiện – '+htNames[picked.ht],p,dtSD,'m² sàn',total);
  } else if(!blockOn.ht){html+='<div class="sum-row-empty">Hoàn thiện: <em>đang tắt</em></div>';}
  else{html+='<div class="sum-row-empty">Hoàn thiện: <em>chưa chọn phương án</em></div>';}

  html+='</div>';
  if(q.grand>0){
    html+='<div class="sum-total-row"><span class="sum-total-label">💰 Tổng tạm tính</span><span class="sum-total-val">'+fmtM(q.grand)+'</span></div>';
  }
  sb.innerHTML=html;
}

function row(label,val){
  if(!val) return '<div class="sum-row"><span class="sum-row-label">'+label+'</span></div>';
  return '<div class="sum-row"><span class="sum-row-label">'+label+'</span><span class="sum-row-val">'+val+'</span></div>';
}
function svcRow(name,unitPrice,qty,unit,total){
  return '<div style="margin-bottom:.65rem">'
    +'<div class="sum-row"><span class="sum-row-label">'+name+'</span></div>'
    +'<div class="sum-row" style="font-size:.72rem;color:var(--c-muted)"><span>'+fmtM(unitPrice)+'/m² × '+qty.toLocaleString('vi-VN')+' '+unit+'</span><span style="font-weight:800;color:var(--c-text)">'+fmtM(total)+'</span></div>'
    +'</div>';
}

/* ======= SUCCESS MODAL ======= */
function showSuccessModal(hoten,email,grand){
  const overlay=document.createElement('div');
  overlay.id='success-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(8,14,26,.7);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;animation:fadeIn .25s ease';
  overlay.innerHTML=`
    <div style="background:var(--c-surface);border-radius:24px;padding:2.5rem 2rem;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.3);border:1px solid var(--c-border);animation:slideUp .3s ease">
      <div style="width:72px;height:72px;background:linear-gradient(135deg,#059669,#10b981);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 1.25rem;box-shadow:0 8px 24px rgba(5,150,105,.35)">✅</div>
      <h2 style="font-size:1.3rem;font-weight:900;color:var(--c-text);margin:0 0 .5rem">Gửi thành công!</h2>
      <p style="font-size:.88rem;color:var(--c-muted);margin:0 0 1.2rem;line-height:1.6">Xin chào <strong style="color:var(--c-text)">${hoten}</strong>, báo giá đã được gửi về<br/><strong style="color:var(--c-brand-light)">${email}</strong></p>
      <div style="background:var(--c-accent-bg);border:1.5px solid var(--c-accent-border);border-radius:14px;padding:1rem 1.2rem;margin-bottom:1.5rem">
        <div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--c-accent);margin-bottom:.3rem">Tổng tạm tính</div>
        <div style="font-size:1.6rem;font-weight:900;color:var(--c-accent)">${fmtM(grand)}</div>
        <div style="font-size:.7rem;color:var(--c-muted);margin-top:.2rem">Chưa bao gồm VAT</div>
      </div>
      <button onclick="closeModal()" style="width:100%;padding:13px;border-radius:var(--radius-full);background:linear-gradient(135deg,var(--c-accent),var(--c-accent-light));color:#fff;font-family:var(--ff);font-size:.95rem;font-weight:800;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(217,119,6,.35);letter-spacing:.3px">Xem báo giá chi tiết →</button>
    </div>
    <style>
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    </style>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
}
function closeModal(){
  const o=document.getElementById('success-overlay');
  if(o){o.style.opacity='0';o.style.transition='opacity .2s';setTimeout(()=>o.remove(),200);}
  document.querySelector('.summary-sticky').scrollIntoView({behavior:'smooth',block:'start'});
}

/* ======= VALIDATE & SUBMIT ======= */
async function tinhBaoGia(){
  let ok=true;
  const hoten=document.getElementById('hoten').value.trim();
  const sdt=document.getElementById('sdt').value.trim();
  const emailEl=document.getElementById('email');
  const email=emailEl?emailEl.value.trim():'';
  const errKh=document.getElementById('err-khach');
  if(!hoten||!sdt||!email){errKh.classList.remove('hidden');ok=false;}else{errKh.classList.add('hidden');}
  const ct=getCT();
  const errCt=document.getElementById('err-ct');
  if(!ct){errCt.classList.remove('hidden');ok=false;}else{errCt.classList.add('hidden');}
  const {As,n,S}=getS();
  if(As>0&&n>0){document.getElementById('err-dim').classList.add('hidden');}else{document.getElementById('err-dim').classList.remove('hidden');ok=false;}
  
  let svcValid = false;
  let svcHasError = false;
  if(blockOn.tk){
    if(!picked.tk) svcHasError = true;
    else svcValid = true;
  }
  if(blockOn.tho){
    if(ct === 'dich-vu' && !picked.tho) svcHasError = true;
    else svcValid = true;
  }
  if(blockOn.ht){
    if(!picked.ht) svcHasError = true;
    else svcValid = true;
  }
  
  if(!svcValid || svcHasError){
    document.getElementById('err-svc').classList.remove('hidden');
    ok=false;
  }else{
    document.getElementById('err-svc').classList.add('hidden');
  }

  if(!ok) return;

  const btn=document.querySelector('.btn-calc');
  const origText=btn?btn.innerText:'TÍNH BÁO GIÁ';
  if(btn){btn.innerText='⏳ Đang xử lý...';btn.disabled=true;btn.style.opacity='.7';btn.style.cursor='wait';}

  const q=computeQuote();
  const emailHtml=buildEmailHtml(hoten,sdt,email,q);

  const ctNames={'nha-vuon':'Nhà Vườn','nha-pho':'Nhà Phố ≤ 3 tầng','dich-vu':'Nhà Dịch Vụ ≥ 4 tầng','biet-thu':'Biệt Thự'};
  const optNames = { 'kien-truc': 'Kiến Trúc', 'noi-that': 'Nội Thất', 'trong-goi-tc': 'Trọn gói Tiêu chuẩn', 'trong-goi-nc': 'Trọn gói Nâng cao', 'tc': 'Tiêu chuẩn', 'nc': 'Nâng cao', 'bt': 'Biệt thự' };
  const templateParams={
    hoten,sdt,email,
    loai_cong_trinh:ctNames[ct]||ct,
    dien_tich_san:As,
    so_tang:n,
    tong_dien_tich:S,
    tong_tien:fmtM(q.grand),
    dich_vu_tk:blockOn.tk ? (optNames[picked.tk] || 'Có, chưa chọn chi tiết') : 'Không',
    dich_vu_tho:blockOn.tho ? (optNames[picked.tho] || 'Có') : 'Không',
    dich_vu_ht:blockOn.ht ? (optNames[picked.ht] || 'Có, chưa chọn chi tiết') : 'Không',
    quote_html:emailHtml,
    quote_summary:q.lines.map(l=>`${l.name}: ${l.unit} × ${l.qty} = ${l.total}`).join('\n')+'\n\nTổng: '+fmtM(q.grand)
  };

  const sheetData=new FormData();
  for(const k in templateParams){if(k!=='quote_html')sheetData.append(k,templateParams[k]);}

  try{
    const sendEmail=emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,templateParams,EMAILJS_PUBLIC_KEY);
    const sendSheet=fetch(GOOGLE_SHEET_URL,{method:'POST', body:sheetData, mode:'no-cors'})
      .catch(err => console.warn('Lưu Google Sheet gặp lỗi (CORS/URL):', err));

    await Promise.all([sendEmail,sendSheet]);
    quoteUnlocked=true;
    updateSummary();
    showSuccessModal(hoten,email,q.grand);
  }catch(err){
    console.error('Lỗi:',err);
    alert('❌ Đã xảy ra lỗi khi gửi thông tin. Vui lòng thử lại!');
  }finally{
    if(btn){btn.innerText=origText;btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';}
  }
}
