const DEFAULT_PLAYGROUNDS = {
  "Black Rock East": ["Main Structure", "Rope Structure", "Rock Climber", "Surfacing", "Signage"],
  "Black Rock West": ["Swings", "Zipline", "Main Structure", "Kids Structure", "Ninja Warrior Course", "Merry-Go-Rounds", "Rockers", "Activity Panels", "Musical Area", "Surfacing", "Signage"],
  "Anderson Farm Park": ["2–5 Structure", "5–12 Structure", "Rockers", "Rock Climber", "Surfacing", "Signage"],
  "MacFarlan Park": ["Swings", "Hand Glider", "Main Structure", "Surfacing", "Signage"]
};
const DEFAULT_INSPECTORS = ["Rob Evans", "Bryan", "Ben", "George", "Scott", "Joe", "Brett", "Dave", "Tanner", "Aiden"];
const ACTIONS = ["None Required", "Monitored", "Repaired On Site", "Scheduled for Repair", "Removed From Service", "Other"];
const $ = (id) => document.getElementById(id);
const app = $("app");
let currentView = "home";
let currentPlayground = null;
let currentOverall = "Open";
let signaturePad = null;
const store = {
  get inspections(){ return JSON.parse(localStorage.getItem("upt_inspections_v2") || localStorage.getItem("upt_inspections") || "[]"); },
  set inspections(v){ localStorage.setItem("upt_inspections_v2", JSON.stringify(v)); },
  get inspectors(){ return JSON.parse(localStorage.getItem("upt_inspectors") || JSON.stringify(DEFAULT_INSPECTORS)); },
  set inspectors(v){ localStorage.setItem("upt_inspectors", JSON.stringify(v)); },
  get playgrounds(){ return JSON.parse(localStorage.getItem("upt_playgrounds_v1") || JSON.stringify(DEFAULT_PLAYGROUNDS)); },
  set playgrounds(v){ localStorage.setItem("upt_playgrounds_v1", JSON.stringify(v)); }
};
function esc(s=""){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function today(){ return new Date().toISOString().slice(0,10); }
function nowTime(){ const d=new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function longDate(s){ if(!s) return "Not inspected"; const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}); }
function shortDate(s){ if(!s) return "Not inspected"; const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function time12(t){ if(!t) return ""; const [h,m]=t.split(":").map(Number); const d=new Date(); d.setHours(h,m); return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}); }
function generatedStamp(){ return new Date().toLocaleString("en-US",{month:"long",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}); }
function setNav(){ document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===currentView)); }
function playgroundNames(){ return Object.keys(store.playgrounds); }
function playgroundComponents(pg){ return store.playgrounds[pg] || DEFAULT_PLAYGROUNDS[pg] || []; }
function lastInspection(pg){ return store.inspections.filter(i=>i.playground===pg).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))[0]; }
function monthStatus(dateStr){ if(!dateStr) return {text:"Due", cls:"due"}; const d=new Date(dateStr+"T00:00:00"); const now=new Date(); if(d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth()) return {text:"Current", cls:"current"}; const days=(Date.now()-d.getTime())/86400000; return days>31?{text:"Overdue", cls:"overdue"}:{text:"Due", cls:"due"}; }
function renderHome(){ currentView="home"; currentPlayground=null; setNav(); const names=playgroundNames(); const done=names.filter(n=>monthStatus(lastInspection(n)?.date).text==="Current").length; app.innerHTML=`<section class="screen home-screen"><div class="compliance-card"><strong>Monthly Compliance</strong><span>${done} of ${names.length} playgrounds inspected this month</span></div><h2>Select Playground</h2><div class="card-grid"></div></section>`; const grid=document.querySelector(".card-grid"); names.forEach(pg=>{ const last=lastInspection(pg); const ms=monthStatus(last?.date); const btn=document.createElement("button"); btn.className="play-card"; btn.innerHTML=`<h3>${esc(pg)}</h3><div class="meta">Last: ${esc(shortDate(last?.date))}<br>Inspector: ${esc(last?.inspector || "—")}<br>Playground: ${esc(last?.overall || last?.status || "No record")}</div><span class="badge ${ms.cls}">${ms.text}</span>`; btn.onclick=()=>renderParkStart(pg); grid.appendChild(btn); }); }
function renderParkStart(pg){ currentView="home"; currentPlayground=pg; setNav(); const last=lastInspection(pg); app.innerHTML=`<section class="screen"><button class="back-btn" id="backHome">← Back</button><h2>${esc(pg)}</h2><div class="form-card park-start"><p><strong>Last Inspection:</strong> ${esc(longDate(last?.date))}</p><p><strong>Last Inspector:</strong> ${esc(last?.inspector || "—")}</p><p><strong>Status:</strong> ${esc(last?.overall || last?.status || "No record")}</p><button class="primary-btn" id="newInspection">Start New Inspection</button><button class="secondary-btn" id="parkHistory">View Previous Inspections</button></div></section>`; $("backHome").onclick=renderHome; $("newInspection").onclick=()=>renderInspection(pg); $("parkHistory").onclick=()=>renderHistory(pg); }
function renderInspection(pg){ currentView="inspection"; currentPlayground=pg; currentOverall="Open"; setNav(); app.innerHTML=`<section class="screen inspection-screen"><button class="back-btn" id="backHome">← Back</button><h2>${esc(pg)}</h2><div class="form-card meta-card"><label>Date<input type="date" id="inspectionDate" value="${today()}"></label><label>Time<input type="time" id="inspectionTime" value="${nowTime()}"></label><label>Inspector<select id="inspectorSelect"></select></label></div><div class="section-title">Playground Components</div><div id="componentItems"></div><div class="section-title">Overall Playground Status</div><div class="status-row overall-row"><button class="overall-btn selected" data-status="Open">Open</button><button class="overall-btn warn" data-status="Needs Maintenance">Needs Maintenance</button><button class="overall-btn danger" data-status="Closed">Closed</button></div><label class="full-note">Reason if maintenance/closed<textarea id="statusReason" rows="2"></textarea></label><div class="section-title">Inspector Certification</div><div class="signature-card"><p>I performed a visual operational inspection of this playground and documented any deficiencies observed.</p><canvas id="signatureCanvas" width="720" height="260"></canvas><div class="signature-actions"><span class="sig-hint">Sign with finger or Apple Pencil</span><button id="clearSig" class="small-btn" type="button">Clear Signature</button></div></div><div class="action-row"><button id="saveInspection" class="primary-btn">Save Inspection</button><button id="printInspection" class="secondary-btn">Official Report / PDF</button></div></section>`;
  const sel=$("inspectorSelect"); store.inspectors.forEach(n=>{ const o=document.createElement("option"); o.value=n; o.textContent=n; sel.appendChild(o); });
  const wrap=$("componentItems"); playgroundComponents(pg).forEach((name,idx)=>wrap.appendChild(componentCard(name,idx)));
  $("backHome").onclick=()=>renderParkStart(pg);
  document.querySelectorAll(".overall-btn").forEach(b=>b.onclick=()=>{ currentOverall=b.dataset.status; document.querySelectorAll(".overall-btn").forEach(x=>x.classList.remove("selected")); b.classList.add("selected"); });
  initSignature(); $("saveInspection").onclick=()=>{ try{ const rec=buildRecord(); saveRecord(rec); alert("Inspection saved."); renderHistory(pg); }catch(e){} }; $("printInspection").onclick=()=>printRecord(buildRecord(), false); }
function componentCard(name,idx){ const div=document.createElement("div"); div.className="component-card"; div.dataset.idx=idx; div.dataset.component=name; div.innerHTML=`<div class="item-title">${esc(name)}</div><div class="choice-row"><button class="choice-btn pass selected" data-status="Acceptable">Acceptable</button><button class="choice-btn repair" data-status="Needs Attention">Needs Attention</button><button class="choice-btn danger" data-status="Remove From Service">Remove From Service</button></div><div class="deficiency-fields hidden"><label>Issue Description<textarea class="issue" rows="2" placeholder="Describe the issue observed."></textarea></label><label>Action Taken<select class="action-select">${ACTIONS.map(a=>`<option>${esc(a)}</option>`).join("")}</select></label><label>Action Notes <span class="muted">(optional)</span><textarea class="action-notes" rows="2" placeholder="Additional details, repair notes, or follow-up."></textarea></label><label class="photo-label">Photo <span class="muted">(optional)</span><input type="file" class="photo-input" accept="image/*" capture="environment"></label><div class="photo-preview"></div></div>`; div.querySelectorAll(".choice-btn").forEach(b=>b.onclick=()=>{ div.querySelectorAll(".choice-btn").forEach(x=>x.classList.remove("selected")); b.classList.add("selected"); div.querySelector(".deficiency-fields").classList.toggle("hidden", b.dataset.status==="Acceptable"); }); div.querySelector(".photo-input").onchange=e=>loadPhoto(e.target, div.querySelector(".photo-preview")); return div; }
function loadPhoto(input, preview){
  const file=input.files?.[0];
  if(!file) return;
  preview.innerHTML='<div class="photo-loading">Processing photo...</div>';
  compressPhoto(file).then(dataUrl=>{
    preview.innerHTML=`<img src="${dataUrl}" alt="Inspection photo">`;
    preview.dataset.photo=dataUrl;
  }).catch(err=>{
    console.error(err);
    preview.innerHTML='<div class="photo-error">Photo could not be processed. Try taking a screenshot or use a smaller photo.</div>';
    delete preview.dataset.photo;
  });
}
function compressPhoto(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Unable to read photo.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Unable to load photo.'));
      img.onload=()=>{
        try{
          const maxDim=1200;
          let w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
          if(!w || !h) return resolve(reader.result);
          const scale=Math.min(1, maxDim/Math.max(w,h));
          w=Math.round(w*scale); h=Math.round(h*scale);
          const canvas=document.createElement('canvas');
          canvas.width=w; canvas.height=h;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,w,h);
          let out=canvas.toDataURL('image/jpeg',0.72);
          // If still large, try one smaller pass. This protects iPad Safari/localStorage.
          if(out.length>900000){
            const scale2=Math.sqrt(900000/out.length);
            const canvas2=document.createElement('canvas');
            canvas2.width=Math.max(1,Math.round(w*scale2));
            canvas2.height=Math.max(1,Math.round(h*scale2));
            canvas2.getContext('2d').drawImage(img,0,0,canvas2.width,canvas2.height);
            out=canvas2.toDataURL('image/jpeg',0.65);
          }
          resolve(out);
        }catch(e){ reject(e); }
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function initSignature(){ const canvas=$("signatureCanvas"), ctx=canvas.getContext("2d"); ctx.lineWidth=3; ctx.lineCap="round"; ctx.strokeStyle="#111"; let drawing=false, last=null; const pos=e=>{ const r=canvas.getBoundingClientRect(); const t=e.touches?e.touches[0]:e; return {x:(t.clientX-r.left)*(canvas.width/r.width), y:(t.clientY-r.top)*(canvas.height/r.height)}; }; const start=e=>{ e.preventDefault(); drawing=true; last=pos(e); }; const move=e=>{ if(!drawing) return; e.preventDefault(); const p=pos(e); ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke(); last=p; }; const end=()=>drawing=false; canvas.addEventListener("mousedown",start); canvas.addEventListener("mousemove",move); window.addEventListener("mouseup",end); canvas.addEventListener("touchstart",start,{passive:false}); canvas.addEventListener("touchmove",move,{passive:false}); canvas.addEventListener("touchend",end); $("clearSig").onclick=()=>ctx.clearRect(0,0,canvas.width,canvas.height); signaturePad=canvas; }
function collectComponents(){ return [...document.querySelectorAll(".component-card")].map(card=>({ component:card.dataset.component, status:card.querySelector(".choice-btn.selected").dataset.status, issue:card.querySelector(".issue").value.trim(), action:card.querySelector(".action-select").value, actionNotes:card.querySelector(".action-notes").value.trim(), photo:card.querySelector(".photo-preview").dataset.photo || "" })); }
function buildRecord(){ return { id:crypto.randomUUID(), playground:currentPlayground, date:$("inspectionDate").value, time:$("inspectionTime").value, inspector:$("inspectorSelect").value, components:collectComponents(), overall:currentOverall, statusReason:$("statusReason").value.trim(), signature:signaturePad?signaturePad.toDataURL("image/png"):"", savedAt:new Date().toISOString() }; }
function saveRecord(rec){
  try{
    const arr=store.inspections;
    arr.push(rec);
    store.inspections=arr;
  }catch(e){
    console.error(e);
    alert('This inspection could not be saved. The most common cause is a photo that is too large for this device. Try removing the photo or using a smaller photo, then save again.');
    throw e;
  }
}
function renderHistory(filter="All"){ currentView="history"; setNav(); const names=["All",...playgroundNames()]; app.innerHTML=`<section class="screen"><h2>Inspection History</h2><div class="history-actions"><select id="historyFilter">${names.map(n=>`<option ${n===filter?"selected":""}>${esc(n)}</option>`).join("")}</select><button id="exportJson" class="secondary-btn">Export Backup</button><button id="clearAll" class="danger-btn">Clear All</button></div><div id="historyList"></div></section>`; $("historyFilter").onchange=e=>renderHistory(e.target.value); const list=$("historyList"); let arr=store.inspections.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)); if(filter!=="All") arr=arr.filter(r=>r.playground===filter); if(!arr.length) list.innerHTML='<p class="meta">No inspections saved yet.</p>'; arr.forEach(rec=>{ const div=document.createElement("div"); div.className="history-card"; div.innerHTML=`<h3>${esc(rec.playground)}</h3><div class="meta">${esc(longDate(rec.date))} at ${esc(time12(rec.time))}<br>Inspector: ${esc(rec.inspector)}<br>Status: ${esc(rec.overall || rec.status || "Open")}</div><div class="history-buttons"><button class="small-btn view">View / Print</button><button class="danger-btn delete">Delete</button></div>`; div.querySelector(".view").onclick=()=>printRecord(rec, true); div.querySelector(".delete").onclick=()=>deleteRecord(rec.id, filter); list.appendChild(div); }); $("exportJson").onclick=exportJson; $("clearAll").onclick=()=>{ if(confirm("Delete all saved inspections from this device?")){ store.inspections=[]; renderHistory(filter); }}; }
function deleteRecord(id, filter){ if(!confirm("Delete this inspection report from this device? This cannot be undone.")) return; store.inspections=store.inspections.filter(r=>r.id!==id); renderHistory(filter); }
function deficiencies(r){ const comps=r.components || (r.items||[]).map(i=>({component:i.item,status:i.result==="Repair Needed"?"Needs Attention":"Acceptable",issue:i.notes||"",action:"",actionNotes:"",photo:""})); return comps.filter(c=>c.status && c.status!=="Acceptable"); }
function allComponents(r){ return r.components || (r.items||[]).map(i=>({component:i.item,status:i.result||"Not Marked",issue:i.notes||"",action:"",actionNotes:"",photo:""})); }
function statusClass(s){ return s==="Closed"||s==="Remove From Service"?"red":(s==="Needs Maintenance"||s==="Needs Attention"?"orange":"green"); }
function printRecord(r, openNow=true){
  const comps=allComponents(r);
  const defs=deficiencies(r);
  const photos=defs.filter(d=>d.photo);
  const reportId=`${(r.playground||'PG').replace(/[^A-Z]/gi,'').slice(0,3).toUpperCase()}-${r.date}-${(r.id||'local').slice(0,5)}`;
  const overall=esc(r.overall||r.status||"Open");
  const photoPages=photos.length?`<div class="photo-pages"><div class="photo-head"><div class="seal">UPT</div><div><h1>Inspection Photos</h1><h2>${esc(r.playground)} • ${esc(longDate(r.date))}</h2></div><div class="photo-meta">Report ID<br>${esc(reportId)}</div></div><div class="photo-grid">${photos.map((p,i)=>`<figure><img src="${p.photo}"><figcaption>${i+1}. ${esc(p.component)}${p.issue?` — ${esc(p.issue)}`:""}</figcaption></figure>`).join("")}</div></div>`:"";
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(r.playground)} Inspection</title><style>${printCss(photos.length>0)}</style></head><body><div class="report-page"><div class="report-head"><div class="seal">UPT</div><div><h1>Playground Inspection Report</h1><h2>Upper Providence Township • Monthly Operational Inspection</h2></div></div><div class="top-line"><div><b>Playground</b><span>${esc(r.playground)}</span></div><div><b>Date / Time</b><span>${esc(longDate(r.date))} • ${esc(time12(r.time))}</span></div><div><b>Inspector</b><span>${esc(r.inspector)}</span></div></div><h3>Equipment Summary</h3><table class="summary"><tbody>${comps.map(c=>`<tr><td>${esc(c.component)}</td><td><span class="pill ${statusClass(c.status)}">${esc(c.status||"Not Marked")}</span></td></tr>`).join("")}</tbody></table><h3>Deficiencies and Actions</h3>${defs.length?`<table class="def-table"><thead><tr><th>Component</th><th>Issue Description</th><th>Action Taken</th><th>Action Notes</th></tr></thead><tbody>${defs.map(d=>`<tr><td>${esc(d.component)}</td><td>${esc(d.issue||"No description entered")}</td><td>${esc(d.action||"No action selected")}</td><td>${esc(d.actionNotes||"")}</td></tr>`).join("")}</tbody></table>`:`<div class="none">No deficiencies observed during inspection.</div>`}<div class="overall-line"><strong>Overall Playground Status:</strong> <span class="pill ${statusClass(r.overall||r.status)}">${overall}</span>${r.statusReason?` <span class="reason"><strong>Reason:</strong> ${esc(r.statusReason)}</span>`:""}</div>${photos.length?`<div class="photo-note">Inspection photos are attached on following page(s).</div>`:""}<div class="cert"><div class="cert-text"><h3>Inspector Certification</h3><p>I performed a visual operational inspection of this playground and documented any deficiencies observed.</p><div class="printed-name"><strong>Inspector Name:</strong> ${esc(r.inspector)}</div></div><div class="sig-area"><div class="sig-label">Inspector Signature</div><div class="sigbox">${r.signature?`<img src="${r.signature}">`:""}</div></div></div><div class="footer">Generated ${esc(generatedStamp())} • Report ID: ${esc(reportId)} • Playground Safety Log</div></div>${photoPages}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`;
  const win=window.open("","_blank");
  if(!win){ alert("Pop-up blocked. Please allow pop-ups for this app, then try View / Print again."); return; }
  win.document.write(html);
  win.document.close();
}
function printCss(hasPhotos=false){ return `@page{size:letter;margin:.22in}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#1f2937;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report-page{position:relative;width:100%;min-height:10.55in;padding:0 0 .18in 0;break-after:${hasPhotos?'page':'auto'};page-break-after:${hasPhotos?'always':'auto'}}.report-head{display:flex;align-items:center;gap:8px;background:#6b2035;color:white;padding:7px 9px;border-radius:0}.seal{width:31px;height:31px;border-radius:7px;background:white;color:#6b2035;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;flex:0 0 auto}h1{font-size:16px;line-height:1;margin:0;color:inherit}h2{font-size:8.6px;line-height:1.1;margin:1px 0 0;color:inherit;font-weight:600;opacity:.95}.top-line{display:grid;grid-template-columns:1.25fr 1.45fr 1fr;gap:5px;margin:7px 0 5px}.top-line div{border:1px solid #c7c7c7;padding:4px 6px;min-height:30px}.top-line b{display:block;font-size:7px;text-transform:uppercase;color:#6b2035;letter-spacing:.04em;margin-bottom:1px}.top-line span{font-size:10px;font-weight:700;line-height:1.1}.green{background:#2f7d32}.orange{background:#d97706}.red{background:#b91c1c}h3{font-size:9.5px;margin:5px 0 2px;color:#6b2035;text-transform:uppercase;letter-spacing:.04em;border-bottom:1px solid #d1d5db;padding-bottom:1px}table{width:100%;border-collapse:collapse;font-size:7.6px;line-height:1.05;table-layout:fixed}th,td{border:1px solid #cfcfcf;padding:2px 3px;vertical-align:top;word-break:break-word}th{background:#eee9e3;color:#1f2937;text-align:left;font-weight:800}.summary tbody{display:grid;grid-template-columns:1fr 1fr;gap:0}.summary tr{display:grid;grid-template-columns:1fr auto}.summary td{min-height:15px}.pill{display:inline-block;border-radius:999px;color:white;padding:1.5px 5px;font-weight:800;font-size:6.8px;white-space:nowrap;vertical-align:middle}.def-table th:nth-child(1),.def-table td:nth-child(1){width:21%}.def-table th:nth-child(2),.def-table td:nth-child(2){width:35%}.def-table th:nth-child(3),.def-table td:nth-child(3){width:22%}.def-table th:nth-child(4),.def-table td:nth-child(4){width:22%}.none{border:1px solid #cfcfcf;padding:4px 5px;font-size:8px;min-height:17px}.overall-line{display:flex;align-items:center;gap:5px;margin-top:5px;border-top:1px solid #d1d5db;border-bottom:1px solid #d1d5db;padding:4px 0;font-size:8.4px}.overall-line strong{color:#6b2035}.reason{margin-left:6px;color:#374151}.photo-note{margin-top:4px;border:1px solid #d1d5db;background:#f9fafb;padding:3px 5px;font-size:7.6px;color:#374151}.cert{margin-top:5px;border:1px solid #cfcfcf;border-radius:3px;padding:5px 6px;display:grid;grid-template-columns:1.3fr 1fr;gap:8px;align-items:end;break-inside:avoid;page-break-inside:avoid}.cert h3{margin:0 0 3px;border:0;padding:0}.cert p{font-size:8px;line-height:1.15;margin:0 0 4px}.printed-name{font-size:8.2px}.sig-label{font-size:7px;text-transform:uppercase;color:#6b2035;font-weight:800;margin-bottom:2px}.sigbox{height:43px;border:1.2px solid #111;background:white}.sigbox img{width:100%;height:100%;object-fit:contain}.footer{position:absolute;left:0;right:0;bottom:0;border-top:1px solid #d1d5db;padding-top:3px;font-size:6.8px;color:#4b5563;text-align:center}.photo-pages{break-before:auto;page-break-before:auto}.photo-head{display:flex;align-items:center;gap:8px;background:#6b2035;color:white;padding:7px 9px;margin-bottom:8px}.photo-meta{margin-left:auto;text-align:right;font-size:8px;color:white}.photo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.photo-grid figure{margin:0;break-inside:avoid;border:1px solid #d1d5db;padding:5px}.photo-grid img{width:100%;height:3.55in;object-fit:contain;display:block}.photo-grid figcaption{font-size:8px;margin-top:4px;color:#374151}@media print{.report-page{break-after:${hasPhotos?'page':'auto'};page-break-after:${hasPhotos?'always':'auto'}}.photo-pages{break-before:auto;page-break-before:auto}}`; }
function exportJson(){ const blob=new Blob([JSON.stringify(store.inspections,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="playground-inspections-backup.json"; a.click(); URL.revokeObjectURL(a.href); }
function renderSettings(){
  currentView="settings"; setNav();
  const pgs=store.playgrounds;
  app.innerHTML=`<section class="screen"><h2>Settings</h2>
    <div class="form-card settings-card"><label>Inspector Names</label><textarea id="inspectorNames" rows="8">${esc(store.inspectors.join("\n"))}</textarea><button id="saveSettings" class="primary-btn">Save Inspector Names</button></div>
    <div class="section-title">Playground Components</div>
    <div class="small-note">Add or delete inspection components for each playground. Changes apply to new inspections only and do not change saved reports.</div>
    <div id="componentSettings"></div>
    <button id="resetComponents" class="danger-btn full-width">Reset Default Components</button>
    <div class="small-note">Records are saved on this device. Use Export Backup regularly if inspections need to be retained outside this iPhone/iPad.</div>
  </section>`;
  $("saveSettings").onclick=()=>{ const names=$("inspectorNames").value.split("\n").map(x=>x.trim()).filter(Boolean); store.inspectors=names.length?names:DEFAULT_INSPECTORS; alert("Inspector names saved."); };
  renderComponentSettings();
  $("resetComponents").onclick=()=>{ if(confirm("Reset all playground component lists to the app defaults?")){ store.playgrounds=DEFAULT_PLAYGROUNDS; renderSettings(); }};
}
function renderComponentSettings(){
  const wrap=$("componentSettings");
  const pgs=store.playgrounds;
  wrap.innerHTML="";
  Object.entries(pgs).forEach(([pg, comps])=>{
    const box=document.createElement("div");
    box.className="form-card component-settings-card";
    box.innerHTML=`<h3>${esc(pg)}</h3><div class="component-list">${comps.map((c,i)=>`<div class="component-setting-row"><span>${esc(c)}</span><button class="small-btn delete-component" data-pg="${esc(pg)}" data-index="${i}" type="button">Delete</button></div>`).join("")}</div><div class="add-component-row"><input type="text" placeholder="New component name" class="new-component-input"><button class="secondary-btn add-component" type="button">Add</button></div>`;
    box.querySelector(".add-component").onclick=()=>{
      const input=box.querySelector(".new-component-input");
      const val=input.value.trim();
      if(!val){ alert("Enter a component name first."); return; }
      const data=store.playgrounds;
      data[pg]=[...(data[pg]||[]), val];
      store.playgrounds=data;
      renderComponentSettings();
    };
    box.querySelectorAll(".delete-component").forEach(btn=>btn.onclick=()=>{
      const idx=Number(btn.dataset.index);
      const name=(store.playgrounds[pg]||[])[idx];
      if(!confirm(`Delete ${name} from ${pg}?`)) return;
      const data=store.playgrounds;
      data[pg]=(data[pg]||[]).filter((_,i)=>i!==idx);
      store.playgrounds=data;
      renderComponentSettings();
    });
    wrap.appendChild(box);
  });
}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.onclick=()=>{ if(btn.dataset.view==="home") renderHome(); if(btn.dataset.view==="history") renderHistory(); if(btn.dataset.view==="settings") renderSettings(); });
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{})); }
renderHome();
