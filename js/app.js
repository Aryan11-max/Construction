// App logic: state, stock calculation, views and actions.
/* ---------- state ---------- */
const KEY='sitestock-demo-v1';
let S; try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){} if(!S) S=seed();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const num=n=>Number(n).toLocaleString('en-IN');
const mat=c=>S.mats.find(m=>m.code===c)||{code:c,name:c,unit:'',rate:0};
const loc=id=>id==='VENDOR'?{id,name:'Vendor',type:'Vendor'}:id==='TRANSIT'?{id,name:'In transit',type:'Transit'}:id==='CONSUMED'?{id,name:'Consumed at site',type:'Used'}:(S.locs.find(l=>l.id===id)||{id,name:id,type:''});
const fdate=iso=>new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
const ftime=iso=>new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
const real=id=>!['VENDOR','CONSUMED'].includes(id);
function stock(){ // {loc:{code:qty}}
  const s={};
  for(const m of S.moves){
    if(real(m.from)){(s[m.from]??={})[m.code]=(s[m.from][m.code]||0)-m.qty}
    if(real(m.to)){(s[m.to]??={})[m.code]=(s[m.to][m.code]||0)+m.qty}
  } return s;
}
const qtyAt=(st,l,c)=>(st[l]||{})[c]||0;
const status=r=>r.history[r.history.length-1].status;
const flow=r=>r.source==='Warehouse'?['Requested','Approved','Dispatched','Delivered']:['Requested','Approved','PO Raised','Delivered'];
const nextStep=r=>{const f=flow(r),i=f.indexOf(status(r));return status(r)==='Rejected'?null:f[i+1]||null};
const pill=s=>`<span class="pill s-${s.split(' ')[0]}">${esc(s)}</span>`;
const reqValue=r=>r.items.reduce((a,i)=>a+i.qty*mat(i.code).rate,0);
function addMove(o){o.id='MV-'+String(S.seq.mv++).padStart(4,'0');o.date=o.date||new Date().toISOString();S.moves.push(o)}
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2400)}

/* ---------- tabs ---------- */
const TABS=[['dash','Dashboard'],['req','Requests'],['inv','Inventory'],['move','Transfers & ledger'],['jcr','Job cost (JCR)'],['setup','Materials & locations']];
let tab='dash', invLoc='ALL', reqFilter='Open', ledLoc='ALL';
try{const h=location.hash.slice(1);if(TABS.some(t=>t[0]===h))tab=h}catch(e){}
function renderTabs(){
  const open=S.reqs.filter(r=>!['Delivered','Rejected'].includes(status(r))).length;
  $('#tabs').innerHTML=TABS.map(([k,l])=>`<button role="tab" aria-selected="${k===tab}" data-tab="${k}">${l}${k==='req'?`<span class="n">${open}</span>`:''}</button>`).join('');
}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(!b)return;tab=b.dataset.tab;render();window.scrollTo(0,0)});
function render(){renderTabs();$('#app').innerHTML=VIEWS[tab]();bind[tab]?.()}

/* ---------- views ---------- */
const VIEWS={
dash(){
  const st=stock(), open=S.reqs.filter(r=>!['Delivered','Rejected'].includes(status(r)));
  const pending=open.filter(r=>status(r)==='Requested');
  const transit=Object.entries(st.TRANSIT||{}).filter(([,q])=>q>0);
  const low=S.mats.filter(m=>m.reorder>0 && (qtyAt(st,'WH-01',m.code)+qtyAt(st,'WH-02',m.code))<m.reorder);
  const vals=S.locs.map(l=>({l,v:Object.entries(st[l.id]||{}).reduce((a,[c,q])=>a+q*mat(c).rate,0)}));
  const max=Math.max(...vals.map(x=>x.v),1);
  return `
  <div><h1>Good morning, Arjun</h1><p class="sub">Saturday, 24 Oct 2026 · ${S.locs.filter(l=>l.type==='Site').length} active sites · ${S.locs.filter(l=>l.type==='Warehouse').length} warehouses</p></div>
  <div class="kpis">
    <div class="kpi"><span>Open requests</span><b>${open.length}</b></div>
    <div class="kpi ${pending.length?'alert':''}"><span>Awaiting approval</span><b>${pending.length}</b></div>
    <div class="kpi"><span>Lines in transit</span><b>${transit.length}</b></div>
    <div class="kpi ${low.length?'alert':''}"><span>Below reorder level</span><b>${low.length}</b></div>
  </div>
  <div class="grid2">
    <section class="panel"><div class="row between"><h2>Needs action</h2><button class="btn sm" data-go="req">All requests</button></div>
      ${open.length?`<div class="scroll"><table><tr><th>Request</th><th>Site</th><th>Status</th><th>Need by</th></tr>
      ${open.map(r=>`<tr class="click" data-req="${r.id}"><td><span class="code">${r.id}</span><br>${esc(r.items.map(i=>mat(i.code).name).join(', '))}</td><td>${esc(loc(r.site).name)}</td><td>${pill(status(r))}</td><td class="num ${new Date(r.needBy)<=TODAY?'low':''}">${fdate(r.needBy)}</td></tr>`).join('')}</table></div>`:'<p class="empty">Nothing waiting. New site requests will appear here.</p>'}
    </section>
    <section class="panel"><h2>Stock value by location</h2>
      <div class="locbars">${vals.map(({l,v})=>`<div class="r"><span>${esc(l.name)} <span class="tag">${l.type}</span></span><div class="bar"><i style="width:${v/max*100}%"></i></div><span class="num code">${inr(v)}</span></div>`).join('')}</div>
    </section>
  </div>
  <div class="grid2">
    <section class="panel"><h2>Below reorder level (warehouses)</h2>
      ${low.length?`<div class="scroll"><table><tr><th>Material</th><th class="num">In stock</th><th class="num">Reorder at</th></tr>${low.map(m=>`<tr><td><span class="code">${m.code}</span> ${esc(m.name)}</td><td class="num low">${num(qtyAt(st,'WH-01',m.code)+qtyAt(st,'WH-02',m.code))} ${m.unit}</td><td class="num">${num(m.reorder)}</td></tr>`).join('')}</table></div>`:'<p class="empty">All warehouse items are above their reorder level.</p>'}
    </section>
    <section class="panel"><div class="row between"><h2>Latest movements</h2><button class="btn sm" data-go="move">Full ledger</button></div>
      ${ledgerTable(S.moves.slice(-6).reverse())}
    </section>
  </div>`;
},
req(){
  const F={Open:r=>!['Delivered','Rejected'].includes(status(r)),Requested:r=>status(r)==='Requested',Delivered:r=>status(r)==='Delivered',All:()=>true};
  const list=S.reqs.filter(F[reqFilter]).sort((a,b)=>b.id.localeCompare(a.id));
  return `
  <div class="row between"><div><h1>Material requests</h1><p class="sub">One place for every site request instead of WhatsApp. Everyone sees the same status.</p></div><button class="btn pri" id="newReq">+ New request</button></div>
  <div class="chips">${Object.keys(F).map(k=>`<button class="chip" data-rf="${k}" aria-pressed="${k===reqFilter}">${k}<span class="t">${S.reqs.filter(F[k]).length}</span></button>`).join('')}</div>
  <section class="panel"><div class="scroll"><table>
    <tr><th>Request</th><th>Site · activity</th><th>Items</th><th>Source</th><th class="num">Value</th><th>Status</th><th>Need by</th><th></th></tr>
    ${list.map(r=>{const n=nextStep(r);return `<tr class="click" data-req="${r.id}">
      <td><span class="code">${r.id}</span><br><span class="sub">${esc(r.by)}</span></td>
      <td>${esc(loc(r.site).name)}<br><span class="sub">${esc(r.act)}</span></td>
      <td>${r.items.map(i=>`${num(i.qty)} ${mat(i.code).unit} ${esc(mat(i.code).name)}`).join('<br>')}</td>
      <td><span class="tag">${r.source==='Warehouse'?'From '+r.from:'Vendor → site'}</span></td>
      <td class="num">${inr(reqValue(r))}</td><td>${pill(status(r))}</td>
      <td class="num ${status(r)!=='Delivered'&&new Date(r.needBy)<=TODAY?'low':''}">${fdate(r.needBy)}</td>
      <td>${n?`<button class="btn sm pri" data-adv="${r.id}">Mark ${n}</button>`:''}</td></tr>`}).join('')||`<tr><td colspan="8" class="empty">No requests in this view.</td></tr>`}
  </table></div></section>`;
},
inv(){
  const st=stock(); const cols=invLoc==='ALL'?[...S.locs,{id:'TRANSIT',name:'In transit',type:'Transit'}]:[loc(invLoc)];
  return `
  <div><h1>Inventory</h1><p class="sub">Live balances. Every inward, transfer and consumption updates these automatically.</p></div>
  <div class="chips"><button class="chip" data-il="ALL" aria-pressed="${invLoc==='ALL'}">All locations</button>
    ${S.locs.map(l=>`<button class="chip" data-il="${l.id}" aria-pressed="${invLoc===l.id}">${esc(l.name)}<span class="t">${l.type}</span></button>`).join('')}</div>
  <section class="panel"><div class="scroll"><table>
    <tr><th>Code</th><th>Material</th>${cols.map(c=>`<th class="num" title="${esc(c.name)}">${c.id==='TRANSIT'?'Transit':c.id}</th>`).join('')}${invLoc==='ALL'?'<th class="num">Total</th><th class="num">Value</th>':''}</tr>
    ${S.mats.map(m=>{const qs=cols.map(c=>qtyAt(st,c.id,m.code));const tot=qs.reduce((a,b)=>a+b,0);
      if(invLoc!=='ALL'&&!tot)return '';
      const whTot=qtyAt(st,'WH-01',m.code)+qtyAt(st,'WH-02',m.code);
      return `<tr><td class="code">${m.code}</td><td>${esc(m.name)} <span class="sub">(${m.unit})</span>${m.reorder&&whTot<m.reorder?' <span class="tag low">Low</span>':''}</td>
      ${qs.map(q=>`<td class="num ${q?'':'zero'}">${q?num(q):'·'}</td>`).join('')}
      ${invLoc==='ALL'?`<td class="num"><b>${num(tot)}</b></td><td class="num">${inr(tot*m.rate)}</td>`:''}</tr>`}).join('')}
  </table></div></section>`;
},
move(){
  const list=S.moves.filter(m=>ledLoc==='ALL'||m.from===ledLoc||m.to===ledLoc).slice().reverse();
  const opts=S.locs.map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('');
  const mopts=S.mats.map(m=>`<option value="${m.code}">${m.code} · ${esc(m.name)} (${m.unit})</option>`).join('');
  return `
  <div><h1>Transfers &amp; movement ledger</h1><p class="sub">Move anything between any two locations, or log what a site used. Balances adjust on save.</p></div>
  <div class="grid2">
    <form class="panel" id="trForm"><h2>Transfer between locations</h2>
      <div class="form">
        <label>From<select id="trFrom">${opts}</select></label>
        <label>To<select id="trTo">${opts.replace('value="S-101"','value="S-101" selected')}</select></label>
        <label style="grid-column:1/-1">Material<select id="trMat">${mopts}</select></label>
        <label>Quantity<input id="trQty" type="number" min="1" value="10"></label>
        <label>Charge to activity<select id="trAct">${ACTS.map(a=>`<option>${a}</option>`).join('')}</select></label>
      </div><p class="err" id="trErr"></p><div><button class="btn pri">Save transfer</button></div></form>
    <form class="panel" id="usForm"><h2>Log consumption at site</h2>
      <div class="form">
        <label>Site<select id="usSite">${S.locs.filter(l=>l.type==='Site').map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>
        <label>Activity<select id="usAct">${ACTS.map(a=>`<option>${a}</option>`).join('')}</select></label>
        <label style="grid-column:1/-1">Material<select id="usMat">${mopts}</select></label>
        <label>Quantity used<input id="usQty" type="number" min="1" value="10"></label>
      </div><p class="err" id="usErr"></p><div><button class="btn pri">Save usage</button></div></form>
  </div>
  <section class="panel"><div class="row between"><h2>Ledger</h2>
    <select id="ledLoc" style="width:auto"><option value="ALL">All locations</option>${S.locs.map(l=>`<option value="${l.id}" ${ledLoc===l.id?'selected':''}>${esc(l.name)}</option>`).join('')}</select></div>
    ${ledgerTable(list)}</section>`;
},
jcr(){
  const sites=S.locs.filter(l=>l.type==='Site');
  const sel=window._jsite||sites[0].id; const J=S.jcr[sel]||{client:'—',acts:{}};
  const matCost={}; let outCredit=0;
  for(const m of S.moves){const v=m.qty*mat(m.code).rate;
    if(m.to===sel&&m.act)matCost[m.act]=(matCost[m.act]||0)+v;
    if(m.from===sel&&m.to!=='CONSUMED')outCredit+=v;}
  let T={b:0,bu:0,o:0,m:0};
  const rows=ACTS.map(a=>{const [billed,budget,other]=J.acts[a]||[0,0,0];const mc=matCost[a]||0;const act=other+mc;
    if(!billed&&!budget&&!act)return '';
    T.b+=billed;T.bu+=budget;T.o+=other;T.m+=mc;const pct=budget?act/budget:0;const margin=billed-act;
    return `<tr><td>${a}</td><td class="num">${inr(billed)}</td><td class="num">${inr(budget)}</td><td class="num">${inr(other)}</td><td class="num"><b>${inr(mc)}</b></td><td class="num">${inr(act)}</td>
    <td style="min-width:110px"><div class="bar ${pct>1?'over':''}"><i style="width:${Math.min(pct,1)*100}%"></i></div><span class="code">${Math.round(pct*100)}% of budget</span></td>
    <td class="num ${margin<0?'low':''}">${inr(margin)}</td></tr>`}).join('');
  const actual=T.o+T.m-outCredit;
  return `
  <div><h1>Job cost report</h1><p class="sub">The JCR sheet, but material cost fills in live from deliveries and transfers charged to each activity.</p></div>
  <div class="chips">${sites.map(s=>`<button class="chip" data-js="${s.id}" aria-pressed="${s.id===sel}">${esc(s.name)}</button>`).join('')}</div>
  <div class="kpis">
    <div class="kpi"><span>Client value (BOQ)</span><b>${inr(T.b)}</b></div>
    <div class="kpi"><span>Budget cost</span><b>${inr(T.bu)}</b></div>
    <div class="kpi"><span>Actual cost to date</span><b>${inr(actual)}</b></div>
    <div class="kpi ${T.b-T.bu<0?'alert':''}"><span>Planned margin</span><b>${T.b?Math.round((T.b-T.bu)/T.b*100):0}%</b></div>
  </div>
  <section class="panel"><div class="row between"><h2>${esc(loc(sel).name)} <span class="sub">· ${esc(J.client)}</span></h2></div>
    <div class="scroll"><table>
      <tr><th>Activity</th><th class="num">Client value</th><th class="num">Budget</th><th class="num">Labour / subcon</th><th class="num">Material (live)</th><th class="num">Actual</th><th>Burn</th><th class="num">Margin</th></tr>
      ${rows}
      ${outCredit?`<tr><td colspan="5">Material sent out of this site (credit)</td><td class="num">−${inr(outCredit)}</td><td></td><td></td></tr>`:''}
      <tr><td><b>Total</b></td><td class="num"><b>${inr(T.b)}</b></td><td class="num"><b>${inr(T.bu)}</b></td><td class="num">${inr(T.o)}</td><td class="num">${inr(T.m)}</td><td class="num"><b>${inr(actual)}</b></td><td></td><td class="num"><b>${inr(T.b-actual)}</b></td></tr>
    </table></div>
    <p class="note">Labour / subcontract figures are sample values standing in for the real JCR Excel. Pile foundation is subcontracted, so its RMC and steel arrive vendor-direct and post straight to this site.</p>
  </section>`;
},
setup(){
  return `
  <div><h1>Materials &amp; locations</h1><p class="sub">Standard codes so every request names the same item. 20 of the planned ~50 are loaded.</p></div>
  <div class="grid2">
    <section class="panel"><h2>Locations</h2>
      <div class="scroll"><table><tr><th>Code</th><th>Name</th><th>Type</th></tr>${S.locs.map(l=>`<tr><td class="code">${l.id}</td><td>${esc(l.name)}</td><td><span class="tag">${l.type}</span></td></tr>`).join('')}</table></div>
      <form id="locForm" class="form"><label>Name<input id="locName" placeholder="e.g. Kengeri Apartments"></label>
        <label>Type<select id="locType"><option>Site</option><option>Warehouse</option></select></label>
        <div style="align-self:end"><button class="btn pri">Add location</button></div></form>
      <p class="note">Locations are dynamic: a new site appears in requests, transfers, inventory and JCR straight away.</p>
    </section>
    <section class="panel"><h2>Material master</h2>
      <div class="scroll"><table><tr><th>Code</th><th>Material</th><th>Unit</th><th class="num">Rate</th><th class="num">Reorder</th></tr>
      ${S.mats.map(m=>`<tr><td class="code">${m.code}</td><td>${esc(m.name)}</td><td>${m.unit}</td><td class="num">${inr(m.rate)}</td><td class="num">${m.reorder?num(m.reorder):'—'}</td></tr>`).join('')}</table></div>
    </section>
  </div>`;
}};

function ledgerTable(list){
  if(!list.length)return '<p class="empty">No movements for this location yet.</p>';
  return `<div class="scroll"><table><tr><th>Date</th><th>Material</th><th class="num">Qty</th><th>From → To</th><th>Type</th><th>Ref</th></tr>
  ${list.map(m=>`<tr><td class="num">${fdate(m.date)}</td><td><span class="code">${m.code}</span> ${esc(mat(m.code).name)}</td><td class="num">${num(m.qty)} ${mat(m.code).unit}</td>
  <td>${esc(loc(m.from).name)} → ${esc(loc(m.to).name)}</td><td><span class="tag">${m.type}</span></td><td class="sub">${esc(m.ref)}${m.act?' · '+esc(m.act):''}</td></tr>`).join('')}</table></div>`;
}

/* ---------- actions ---------- */
function advance(id){
  const r=S.reqs.find(x=>x.id===id); const n=nextStep(r); if(!n)return;
  const st=stock();
  if(n==='Dispatched'){
    const short=r.items.filter(i=>qtyAt(st,r.from,i.code)<i.qty);
    if(short.length){toast(`Not enough at ${r.from}: ${short.map(i=>mat(i.code).name).join(', ')}`);return}
    r.items.forEach(i=>addMove({code:i.code,qty:i.qty,from:r.from,to:'TRANSIT',type:'Transfer',ref:r.id+' dispatched',act:r.act}));
  }
  if(n==='Delivered'){
    r.items.forEach(i=>addMove({code:i.code,qty:i.qty,from:r.source==='Warehouse'?'TRANSIT':'VENDOR',to:r.site,type:r.source==='Warehouse'?'Transfer':'Inward',ref:r.id,act:r.act}));
  }
  const who={Approved:'Arjun (Office)','PO Raised':'Purchase',Dispatched:'Warehouse',Delivered:r.by}[n];
  const note=n==='PO Raised'?`PO-${2230+S.seq.pr%100} · ${inr(reqValue(r))}`:'';
  r.history.push({status:n,at:new Date().toISOString(),by:who,note});
  save(); toast(`${r.id} marked ${n}`); render(); if($('.drawer'))openReq(id);
}
function reject(id){const r=S.reqs.find(x=>x.id===id);r.history.push({status:'Rejected',at:new Date().toISOString(),by:'Arjun (Office)',note:'Not approved'});save();toast(`${id} rejected`);closeLayer();render()}

function openReq(id){
  const r=S.reqs.find(x=>x.id===id); const f=flow(r); const done=r.history.map(h=>h.status); const n=nextStep(r);
  const steps=f.map(s=>{const h=r.history.find(x=>x.status===s);
    return `<li class="${h?'done':s===n?'next':''}"><span class="dot"></span><div><b>${s}</b>${h?`<div class="meta">${ftime(h.at)} · ${esc(h.by)}${h.note?' · '+esc(h.note):''}</div>`:s===n?'<div class="meta">Next step</div>':''}</div></li>`}).join('');
  $('#layer').innerHTML=`<div class="ov" id="ov"><aside class="drawer" role="dialog" aria-label="${r.id}">
    <div class="row between"><div><span class="code">${r.id}</span><h1>${esc(loc(r.site).name)}</h1><p class="sub">${esc(r.act)} · raised by ${esc(r.by)} · need by ${fdate(r.needBy)}</p></div><button class="btn sm" id="closeD">Close</button></div>
    <div class="row">${pill(status(r))}<span class="tag">${r.source==='Warehouse'?'From '+esc(loc(r.from).name):'Vendor direct to site'}</span></div>
    <div class="scroll"><table><tr><th>Material</th><th class="num">Qty</th><th class="num">Value</th></tr>
      ${r.items.map(i=>`<tr><td><span class="code">${i.code}</span> ${esc(mat(i.code).name)}</td><td class="num">${num(i.qty)} ${mat(i.code).unit}</td><td class="num">${inr(i.qty*mat(i.code).rate)}</td></tr>`).join('')}
      <tr><td><b>Total</b></td><td></td><td class="num"><b>${inr(reqValue(r))}</b></td></tr></table></div>
    <h2>Tracker</h2><ol class="tl">${status(r)==='Rejected'?r.history.map(h=>`<li class="done"><span class="dot"></span><div><b>${h.status}</b><div class="meta">${ftime(h.at)} · ${esc(h.by)}</div></div></li>`).join(''):steps}</ol>
    ${n?`<div class="row"><button class="btn pri" data-adv="${r.id}">Mark ${n}</button>${status(r)==='Requested'?`<button class="btn" data-rej="${r.id}">Reject</button>`:''}</div>`:''}
    ${status(r)==='Delivered'?'<p class="note">Delivered stock is now in the site balance and its cost is posted to this activity in the JCR.</p>':''}
  </aside></div>`;
}
function closeLayer(){$('#layer').innerHTML=''}

function openNewReq(){
  const mopts=S.mats.map(m=>`<option value="${m.code}">${m.code} · ${esc(m.name)} (${m.unit})</option>`).join('');
  const line=()=>`<div class="line"><label>Material<select class="lnMat">${mopts}</select></label><label>Qty<input class="lnQty" type="number" min="1" value="10"></label><button type="button" class="btn sm rmLine" aria-label="Remove line">✕</button></div>`;
  $('#layer').innerHTML=`<div class="ov" id="ov"><form class="drawer" id="nrForm">
    <div class="row between"><h1>New material request</h1><button type="button" class="btn sm" id="closeD">Cancel</button></div>
    <div class="form">
      <label>Site<select id="nrSite">${S.locs.filter(l=>l.type==='Site').map(l=>`<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>
      <label>Activity<select id="nrAct">${ACTS.map(a=>`<option ${a==='Superstructure'?'selected':''}>${a}</option>`).join('')}</select></label>
      <label>Supply from<select id="nrSrc">${S.locs.filter(l=>l.type==='Warehouse').map(l=>`<option value="W:${l.id}">${esc(l.name)}</option>`).join('')}<option value="V">Vendor direct to site</option></select></label>
      <label>Need by<input id="nrNeed" type="date" value="2026-10-27"></label>
      <label style="grid-column:1/-1">Raised by<input id="nrBy" value="Ravi (Site Eng.)"></label>
    </div>
    <h2>Items</h2><div class="lines" id="nrLines">${line()}</div>
    <div><button type="button" class="btn sm" id="addLine">+ Add item</button></div>
    <p class="err" id="nrErr"></p>
    <div><button class="btn pri">Submit request</button></div>
  </form></div>`;
  $('#addLine').onclick=()=>$('#nrLines').insertAdjacentHTML('beforeend',line());
  $('#nrLines').onclick=e=>{if(e.target.closest('.rmLine')&&$('#nrLines').children.length>1)e.target.closest('.line').remove()};
  $('#nrForm').onsubmit=e=>{e.preventDefault();
    const items=[...document.querySelectorAll('#nrLines .line')].map(l=>({code:l.querySelector('.lnMat').value,qty:+l.querySelector('.lnQty').value})).filter(i=>i.qty>0);
    if(!items.length){$('#nrErr').textContent='Add at least one item with a quantity.';return}
    const src=$('#nrSrc').value; const id='PR-'+String(S.seq.pr++).padStart(4,'0');
    S.reqs.push({id,site:$('#nrSite').value,act:$('#nrAct').value,source:src==='V'?'Vendor':'Warehouse',from:src==='V'?undefined:src.slice(2),items,
      needBy:new Date($('#nrNeed').value+'T10:00:00+05:30').toISOString(),by:$('#nrBy').value||'Site',history:[{status:'Requested',at:new Date().toISOString(),by:$('#nrBy').value||'Site',note:''}]});
    save();closeLayer();tab='req';reqFilter='Open';render();toast(`${id} submitted. Office can approve it now.`);
  };
}

/* ---------- binding ---------- */
document.addEventListener('click',e=>{
  const t=e.target;
  if(t.closest('[data-adv]')){e.stopPropagation();advance(t.closest('[data-adv]').dataset.adv);return}
  if(t.closest('[data-rej]')){reject(t.closest('[data-rej]').dataset.rej);return}
  if(t.closest('[data-req]')){openReq(t.closest('[data-req]').dataset.req);return}
  if(t.closest('[data-go]')){tab=t.closest('[data-go]').dataset.go;render();return}
  if(t.id==='closeD'||t.id==='ov'){closeLayer();return}
  if(t.closest('[data-rf]')){reqFilter=t.closest('[data-rf]').dataset.rf;render();return}
  if(t.closest('[data-il]')){invLoc=t.closest('[data-il]').dataset.il;render();return}
  if(t.closest('[data-js]')){window._jsite=t.closest('[data-js]').dataset.js;render();return}
  if(t.id==='newReq'){openNewReq();return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLayer()});
$('#resetBtn').onclick=()=>{S=seed();save();closeLayer();render();toast('Demo data reset')};
const bind={
  move(){
    $('#ledLoc').onchange=e=>{ledLoc=e.target.value;render()};
    $('#trForm').onsubmit=e=>{e.preventDefault();const from=$('#trFrom').value,to=$('#trTo').value,code=$('#trMat').value,qty=+$('#trQty').value;
      if(from===to)return $('#trErr').textContent='Pick two different locations.';
      if(!(qty>0))return $('#trErr').textContent='Enter a quantity above zero.';
      const have=qtyAt(stock(),from,code); if(have<qty)return $('#trErr').textContent=`${loc(from).name} has only ${num(have)} ${mat(code).unit} of ${mat(code).name}.`;
      addMove({code,qty,from,to,type:'Transfer',ref:'Manual transfer',act:loc(to).type==='Site'?$('#trAct').value:''});save();render();toast(`Moved ${num(qty)} ${mat(code).unit} to ${loc(to).name}`)};
    $('#usForm').onsubmit=e=>{e.preventDefault();const site=$('#usSite').value,code=$('#usMat').value,qty=+$('#usQty').value;
      if(!(qty>0))return $('#usErr').textContent='Enter a quantity above zero.';
      const have=qtyAt(stock(),site,code); if(have<qty)return $('#usErr').textContent=`${loc(site).name} has only ${num(have)} ${mat(code).unit} of ${mat(code).name} on record.`;
      addMove({code,qty,from:site,to:'CONSUMED',type:'Consumed',ref:'Daily log',act:$('#usAct').value});save();render();toast('Usage logged')};
  },
  setup(){
    $('#locForm').onsubmit=e=>{e.preventDefault();const name=$('#locName').value.trim();if(!name)return;const type=$('#locType').value;
      const pre=type==='Site'?'S-':'WH-';const n=S.locs.filter(l=>l.type===type).length;
      const id=type==='Site'?'S-'+(101+n):'WH-'+String(n+1).padStart(2,'0');
      S.locs.push({id,name,type});if(type==='Site')S.jcr[id]={client:'New client',acts:{}};save();render();toast(`${name} added as ${id}`)};
  }
};
render();
