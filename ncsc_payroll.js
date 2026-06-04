// ════════════════════════════════════════
//  GLOBALS
// ════════════════════════════════════════
let db;
let currentCatFilter = '';
const STORAGE_KEY = 'ncsc_payroll_db_v2';
const SETTINGS_KEY = 'ncsc_settings_v2';
const PAYOUT_KEY   = 'ncsc_payout_cfg';
const DEF_S = {
  preparer:'JUAN DELA CRUZ', approver:'JUAN DELA CRUZ',
  sdo:'JUAN DELA CRUZ', officer1:'JUAN DELA CRUZ', officer2:'JUAN DELA CRUZ'
};

// ════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════
function getSettings(){ try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY))||DEF_S; }catch{ return DEF_S; } }
function saveSettings(){
  const s={
    preparer:fv('s-preparer')||DEF_S.preparer,
    approver:fv('s-approver')||DEF_S.approver,
    sdo:fv('s-sdo')||DEF_S.sdo,
    officer1:fv('s-officer1')||DEF_S.officer1,
    officer2:fv('s-officer2')||DEF_S.officer2
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  toast('Settings saved!','success');
}
function loadSettingsUI(){
  const s=getSettings();
  ['preparer','approver','sdo','officer1','officer2'].forEach(k=>{ document.getElementById('s-'+k).value=s[k]; });
}

// Payout config persistence
function savePayoutCfg(){
  const c={region:fv('p-region'),province:fv('p-province'),city:fv('p-city'),amount:fv('p-amount'),batch:fv('p-batch'),cat:document.getElementById('p-cat-filter').value};
  localStorage.setItem(PAYOUT_KEY,JSON.stringify(c));
}
function loadPayoutCfg(){
  try{
    const c=JSON.parse(localStorage.getItem(PAYOUT_KEY));
    if(!c)return;
    if(c.region)document.getElementById('p-region').value=c.region;
    if(c.province)document.getElementById('p-province').value=c.province;
    if(c.city)document.getElementById('p-city').value=c.city;
    if(c.amount)document.getElementById('p-amount').value=c.amount;
    if(c.cat)document.getElementById('p-cat-filter').value=c.cat;
  }catch{}
}
['p-region','p-province','p-city','p-amount','p-batch','p-cat-filter'].forEach(id=>{
  document.addEventListener('DOMContentLoaded',()=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener('change',savePayoutCfg);
    if(el)el.addEventListener('input',savePayoutCfg);
  });
});

// ════════════════════════════════════════
//  DB INIT
// ════════════════════════════════════════
async function initSQL(){
  const SQL = await initSqlJs({ locateFile: f=>`https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}` });
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){
    const arr = Uint8Array.from(atob(saved), c=>c.charCodeAt(0));
    db = new SQL.Database(arr);
  } else {
    db = new SQL.Database();
    db.run(`CREATE TABLE IF NOT EXISTS beneficiaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_code TEXT, last_name TEXT NOT NULL, first_name TEXT NOT NULL,
      middle_name TEXT, extension TEXT, birthdate TEXT, sex TEXT,
      category TEXT, status TEXT DEFAULT 'Active',
      date_of_death TEXT, remarks TEXT
    )`);
    // Seed samples
    const samples=[
      ['NCR-2025-01','Santos','Maria','Reyes','','1935-04-12','Female','Active'],
      ['NCR-2025-01','Reyes','Jose','Cruz','Sr.','1930-07-22','Male','Active'],
      ['NCR-2025-01','Garcia','Lourdes','','','1924-01-05','Female','Active'],
      ['NCR-2025-01','Dela Cruz','Antonio','Bautista','Jr.','1932-11-30','Male','Active'],
      ['NCR-2025-01','Mendoza','Felicidad','Lopez','','1928-08-15','Female','Active'],
      ['NCR-2025-02','Reyes','Carmen','Santos','','1938-03-10','Female','Active'],
      ['NCR-2025-02','Bautista','Rodrigo','Flores','','1942-06-25','Male','Deceased'],
    ];
    samples.forEach(s=>{
      db.run(`INSERT INTO beneficiaries(batch_code,last_name,first_name,middle_name,extension,birthdate,sex,category,status)VALUES(?,?,?,?,?,?,?,?,?)`,
        [s[0],s[1],s[2],s[3],s[4],s[5],s[6],autoCategory(calcAge(s[5])),s[7]]);
    });
    saveDB();
  }
  renderStats();
  renderTable();
  loadSettingsUI();
  loadPayoutCfg();
  populateBatchFilter();
}
function saveDB(){
  const data=db.export();
  localStorage.setItem(STORAGE_KEY, btoa(String.fromCharCode(...data)));
}

// ════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════
function fv(id){ return (document.getElementById(id)||{}).value||''; }
function calcAge(b){
  if(!b)return 0;
  const bd=new Date(b),n=new Date();
  let a=n.getFullYear()-bd.getFullYear();
  if(n<new Date(n.getFullYear(),bd.getMonth(),bd.getDate()))a--;
  return a;
}
function autoCategory(a){ return a>=100?'Centenarian':a>=90?'Nonagenarian':a>=80?'Octogenarian':'—'; }
function fmtDate(d){
  if(!d)return'';const p=d.split('-');
  return p.length===3?`${p[1]}/${p[2]}/${p[0]}`:d;
}
function pesoFmt(n){ return'PHP '+Number(n).toLocaleString('en-PH',{minimumFractionDigits:2}); }
function toast(msg,type='info'){
  const t=document.getElementById('toast');
  t.innerHTML=`${type==='success'?'✓':type==='error'?'✕':'ℹ'} ${msg}`;
  t.style.background=type==='success'?'#15803d':type==='error'?'#b91c1c':'#0d1b3e';
  t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);
}

// ════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════
function switchPage(p){
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el=>el.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(el=>{
    if(el.textContent.trim().toLowerCase().startsWith(p.slice(0,3))) el.classList.add('active');
  });
  if(p==='payout'){ populateBatchFilter(); loadPayoutCfg(); }
  if(p==='settings') loadSettingsUI();
}

// ════════════════════════════════════════
//  MODAL
// ════════════════════════════════════════
function openModal(editId){
  const overlay=document.getElementById('modal-overlay');
  overlay.classList.add('open');
  if(!editId){ clearForm(); document.getElementById('modal-title').textContent='＋ Add Beneficiary'; }
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
}
// Prevent click-outside from closing (user's request)
document.getElementById('modal-overlay').addEventListener('click',function(e){
  // Only close if clicking directly on overlay background AND not inside modal
  // Per user request: keep modal open — so we do NOT close on backdrop click
  e.stopPropagation();
});
document.getElementById('modal').addEventListener('click',e=>e.stopPropagation());

// ════════════════════════════════════════
//  CATEGORY FILTER (stat cards)
// ════════════════════════════════════════
function filterByCategory(cat){
  currentCatFilter = cat;
  document.querySelectorAll('.stat-card').forEach(el=>el.classList.remove('active-filter'));
  const chip=document.getElementById('filter-chip');
  if(cat){
    const card=document.querySelector(`.stat-card[data-cat="${cat}"]`);
    if(card)card.classList.add('active-filter');
    chip.style.display='inline-flex';
    document.getElementById('filter-chip-label').textContent=cat+'s';
    document.getElementById('table-title').textContent=cat+'s';
  } else {
    chip.style.display='none';
    document.getElementById('table-title').textContent='All Beneficiaries';
    const card=document.querySelector('.stat-card[data-cat="all"]');
    if(card)card.classList.add('active-filter');
  }
  renderTable();
}
function clearCategoryFilter(){ filterByCategory(''); }

// ════════════════════════════════════════
//  STATS
// ════════════════════════════════════════
function renderStats(){
  const res=db.exec(`SELECT COUNT(*),
    SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END),
    SUM(CASE WHEN category='Centenarian' THEN 1 ELSE 0 END),
    SUM(CASE WHEN category='Nonagenarian' THEN 1 ELSE 0 END),
    SUM(CASE WHEN category='Octogenarian' THEN 1 ELSE 0 END)
    FROM beneficiaries`);
  const r=res[0]?.values[0]||[0,0,0,0,0];
  document.getElementById('stats-row').innerHTML=`
    <div class="stat-card total-card" onclick="filterByCategory('')" data-cat="">
      <div class="stat-label">Total Beneficiaries</div>
      <div class="stat-value">${r[0]}</div>
      <div class="stat-hint">${r[1]} active</div>
    </div>
    <div class="stat-card all-card" onclick="filterByCategory('')" data-cat="all">
      <div class="stat-label">Show All</div>
      <div class="stat-value" style="font-size:18px;margin-top:4px">All</div>
      <div class="stat-hint">Clear filter</div>
    </div>
    <div class="stat-card octo-card" onclick="filterByCategory('Octogenarian')" data-cat="Octogenarian">
      <div class="stat-label">Octogenarians</div>
      <div class="stat-value">${r[4]}</div>
      <div class="stat-hint">80–89 yrs old · click to filter</div>
    </div>
    <div class="stat-card nona-card" onclick="filterByCategory('Nonagenarian')" data-cat="Nonagenarian">
      <div class="stat-label">Nonagenarians</div>
      <div class="stat-value">${r[3]}</div>
      <div class="stat-hint">90–99 yrs old · click to filter</div>
    </div>
    <div class="stat-card cent-card" onclick="filterByCategory('Centenarian')" data-cat="Centenarian">
      <div class="stat-label">Centenarians</div>
      <div class="stat-value">${r[2]}</div>
      <div class="stat-hint">100+ yrs old · click to filter</div>
    </div>
  `;
}

// ════════════════════════════════════════
//  TABLE
// ════════════════════════════════════════
function renderTable(){
  const q=(fv('search-input')).toLowerCase();
  let sql=`SELECT * FROM beneficiaries WHERE 1=1`;
  if(currentCatFilter) sql+=` AND category='${currentCatFilter}'`;
  sql+=` ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`;
  const res=db.exec(sql);
  const tbody=document.getElementById('tbl-body');
  let rows=[];
  if(res.length){
    const cols=res[0].columns;
    rows=res[0].values.map(v=>{const o={};cols.forEach((c,i)=>o[c]=v[i]);return o;});
  }
  if(q) rows=rows.filter(r=>`${r.last_name} ${r.first_name} ${r.batch_code||''} ${r.status||''}`.toLowerCase().includes(q));
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="12"><div class="tbl-empty"><div class="tbl-empty-icon">📋</div><div>No beneficiaries found.</div></div></td></tr>`;
    return;
  }
  const catBadge=c=>({Octogenarian:'<span class="badge badge-octo">Octogenarian</span>',Nonagenarian:'<span class="badge badge-nona">Nonagenarian</span>',Centenarian:'<span class="badge badge-cent">Centenarian</span>'})[c]||`<span class="badge">${c||'—'}</span>`;
  const stBadge=s=>({Active:'<span class="badge badge-active">Active</span>',Deceased:'<span class="badge badge-deceased">Deceased</span>'})[s]||`<span class="badge badge-unavail">${s}</span>`;
  tbody.innerHTML=rows.map((r,i)=>`<tr>
    <td style="color:var(--muted);font-size:11px">${i+1}</td>
    <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${r.batch_code||'—'}</td>
    <td><strong>${r.last_name}</strong></td>
    <td>${r.first_name}</td>
    <td style="color:var(--muted)">${r.middle_name||'—'}</td>
    <td style="color:var(--muted)">${r.extension||'—'}</td>
    <td style="font-size:12px">${fmtDate(r.birthdate)}</td>
    <td><strong>${calcAge(r.birthdate)}</strong></td>
    <td>${r.sex||'—'}</td>
    <td>${catBadge(r.category)}</td>
    <td>${stBadge(r.status)}</td>
    <td style="white-space:nowrap">
      <button class="btn btn-ghost btn-sm" onclick="editRow(${r.id})">✏️ Edit</button>
      <button class="btn btn-danger btn-sm" data-delete-id="${r.id}" onclick="deleteRow(${r.id})">🗑️</button>
    </td>
  </tr>`).join('');
}

// ════════════════════════════════════════
//  BENEFICIARY CRUD
// ════════════════════════════════════════
function clearForm(){
  ['f-lname','f-fname','f-mname','f-ext','f-bdate','f-death','f-batch','f-remarks'].forEach(id=>{ document.getElementById(id).value=''; });
  document.getElementById('f-id').value='';
  document.getElementById('f-sex').value='';
  document.getElementById('f-cat').value='';
  document.getElementById('f-status').value='Active';
}

function saveBeneficiary(){
  const ln=(fv('f-lname')).trim(), fn=(fv('f-fname')).trim();
  const bd=fv('f-bdate'), sx=fv('f-sex');
  if(!ln||!fn||!bd||!sx){ toast('Please fill: Last Name, First Name, Birthdate, Sex','error'); return; }
  const cat=fv('f-cat')||autoCategory(calcAge(bd));
  const id=parseInt(fv('f-id')||'0');
  const params=[fv('f-batch'),ln,fn,fv('f-mname'),fv('f-ext'),bd,sx,cat,fv('f-status'),fv('f-death')||null,fv('f-remarks')];
  if(id){
    db.run(`UPDATE beneficiaries SET batch_code=?,last_name=?,first_name=?,middle_name=?,extension=?,birthdate=?,sex=?,category=?,status=?,date_of_death=?,remarks=? WHERE id=?`,[...params,id]);
    toast('Beneficiary updated!','success');
    document.getElementById('modal-title').textContent='＋ Add Beneficiary';
    document.getElementById('f-id').value='';
    clearForm();
  } else {
    db.run(`INSERT INTO beneficiaries(batch_code,last_name,first_name,middle_name,extension,birthdate,sex,category,status,date_of_death,remarks)VALUES(?,?,?,?,?,?,?,?,?,?,?)`,params);
    toast('Beneficiary added!','success');
    clearForm();
    // modal stays open for next entry
  }
  saveDB(); renderTable(); renderStats(); populateBatchFilter();
}

function editRow(id){
  const res=db.exec(`SELECT * FROM beneficiaries WHERE id=${id}`);
  if(!res.length)return;
  const row={};res[0].columns.forEach((c,i)=>row[c]=res[0].values[0][i]);
  document.getElementById('f-id').value=row.id;
  document.getElementById('f-lname').value=row.last_name||'';
  document.getElementById('f-fname').value=row.first_name||'';
  document.getElementById('f-mname').value=row.middle_name||'';
  document.getElementById('f-ext').value=row.extension||'';
  document.getElementById('f-bdate').value=row.birthdate||'';
  document.getElementById('f-sex').value=row.sex||'';
  document.getElementById('f-cat').value=row.category||'';
  document.getElementById('f-status').value=row.status||'Active';
  document.getElementById('f-death').value=row.date_of_death||'';
  document.getElementById('f-batch').value=row.batch_code||'';
  document.getElementById('f-remarks').value=row.remarks||'';
  document.getElementById('modal-title').textContent='✏️ Edit Beneficiary';
  openModal(id);
}

function deleteRow(id){
  // confirm() is blocked in sandboxed iframes — use inline row confirmation instead
  const btn = document.querySelector(`button[data-delete-id="${id}"]`);
  if(!btn) return;

  if(btn.dataset.confirming === 'true'){
    db.run(`DELETE FROM beneficiaries WHERE id=?`,[id]);
    saveDB(); renderTable(); renderStats(); populateBatchFilter();
    toast('Beneficiary removed.','error');
    return;
  }

  // First click: switch to confirm state
  btn.dataset.confirming = 'true';
  btn.textContent = '⚠️ Sure?';
  btn.style.background = '#92400e';
  btn.style.minWidth = '72px';

  // Auto-revert after 3s if not confirmed
  setTimeout(()=>{
    if(btn && btn.dataset.confirming === 'true'){
      btn.dataset.confirming = 'false';
      btn.textContent = '🗑️';
      btn.style.background = '';
      btn.style.minWidth = '';
    }
  }, 3000);
}

// ════════════════════════════════════════
//  BATCH FILTER (payout page)
// ════════════════════════════════════════
function populateBatchFilter(){
  const res=db.exec(`SELECT DISTINCT batch_code FROM beneficiaries WHERE batch_code IS NOT NULL AND batch_code!='' ORDER BY batch_code`);
  const sel=document.getElementById('p-batch');
  const cur=sel.value;
  sel.innerHTML=`<option value="">All Batches</option>`;
  if(res.length) res[0].values.forEach(v=>{ const o=document.createElement('option');o.value=v[0];o.textContent=v[0];sel.appendChild(o); });
  if(cur) sel.value=cur;
}

// ════════════════════════════════════════
//  PAYROLL DATA
// ════════════════════════════════════════
function getPayrollData(){
  const amount=parseFloat(fv('p-amount'))||0;
  if(!amount) return null;
  const batchF=fv('p-batch'), catF=document.getElementById('p-cat-filter').value;
  let sql=`SELECT * FROM beneficiaries WHERE status='Active'`;
  if(batchF) sql+=` AND batch_code='${batchF}'`;
  if(catF)   sql+=` AND category='${catF}'`;
  sql+=` ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`;
  const res=db.exec(sql);
  if(!res.length||!res[0].values.length) return null;
  const cols=res[0].columns;
  const rows=res[0].values.map(v=>{const o={};cols.forEach((c,i)=>o[c]=v[i]);return o;});
  return{
    rows,amount,
    region:fv('p-region')||'—',
    province:fv('p-province')||'—',
    city:fv('p-city')||'—'
  };
}

// ════════════════════════════════════════
//  HTML PAGE BUILDER — fixed 1248×816px canvas
//  13" × 8.5" @ 96 dpi, scaled to viewer
// ════════════════════════════════════════
const CANVAS_W=1248; // px — legal landscape 13"
const CANVAS_H=816;  // px — 8.5"

function buildPageHTML(page, pi, totalPages, data, s, grandTotal){
  const {amount,region,province,city}=data;
  const PER_PAGE=5;
  const subTotal=page.length*amount;
  const isLast=pi===totalPages-1;
  const emptyCount=PER_PAGE-page.length;

  // colgroup so table-layout:fixed uses the class widths
  const colgroup=`<colgroup>${Array.from({length:17},(_,i)=>`<col class="c${i}"/>`).join('')}</colgroup>`;

  const dataRows=page.map((r,i)=>{
    const no=(pi*PER_PAGE)+(i+1);
    const age=calcAge(r.birthdate);
    const rowBg=i%2===0?'':'background:#f9fbff';
    return`<tr style="${rowBg}">
      <td>${r.batch_code||''}</td>
      <td>${no}</td>
      <td class="al" style="font-weight:bold">${r.last_name||''}</td>
      <td class="al">${r.first_name||''}</td>
      <td class="al">${r.middle_name||''}</td>
      <td>${r.extension||''}</td>
      <td>${fmtDate(r.birthdate)}</td>
      <td>${age}</td>
      <td>${r.sex||''}</td>
      <td style="text-align:right;font-weight:600">${pesoFmt(amount)}</td>
      <td></td>
      <td></td>
      <td></td>
      <td></td>
      <td>${r.date_of_death?fmtDate(r.date_of_death):''}</td>
      <td></td>
      <td class="al">${r.remarks||''}</td>
    </tr>`;
  }).join('');

  const emptyRows=Array(emptyCount).fill(0).map((_,i)=>{
    const rowBg=(page.length+i)%2===0?'':'background:#f9fbff';
    return`<tr style="${rowBg}"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
  }).join('');

  return`
  <div class="preview-page-canvas" style="width:${CANVAS_W}px;height:${CANVAS_H}px">
    <div class="pay-wrap">

      <!-- HEADER -->
      <div class="pay-header-top">
        <div class="pay-logo-box">NCSC<br/>LOGO</div>
        <div class="pay-center">
          <span class="pay-agency">National Commission of Senior Citizens</span>
          <span class="pay-subtitle">Regional Office <span class="pay-field">${region}</span> &nbsp; Province <span class="pay-field">${province}</span> &nbsp; City/Municipality <span class="pay-field">${city}</span></span>
          <span class="pay-subtitle">Expanded Centenarians Act</span>
          <span class="pay-doc-title">Cash Gift Payroll</span>
        </div>
        <div class="pay-logo-box pay-logo-right">BAGONG<br/>PILIPINAS</div>
      </div>

      <!-- PURPOSE -->
      <div class="pay-purpose">
        <strong>A.&nbsp;PURPOSE:</strong>
        <span>Cash gift payout for Octogenarians, Nonagenarians, and Centenarians pursuant to R.A. No. 11982 – Expanded Centenarian Act.</span>
      </div>

      <!-- TABLE -->
      <table class="pay-tbl">
        ${colgroup}
        <thead>
          <tr>
            <th rowspan="2">Batch<br/>Code</th>
            <th rowspan="2">No.</th>
            <th colspan="4" style="text-align:center">Full Name of Beneficiary</th>
            <th rowspan="2">BDate<br/>(mm/dd/yy)</th>
            <th rowspan="2">Age</th>
            <th rowspan="2">Sex</th>
            <th rowspan="2">Amount</th>
            <th rowspan="2">Amount<br/>Received</th>
            <th colspan="2" style="text-align:center">Beneficiary / Authorized Rep.</th>
            <th rowspan="2">For Auth. Rep.<br/>(Relationship/<br/>Witness)</th>
            <th rowspan="2">Date of<br/>Death</th>
            <th rowspan="2">Date<br/>Received</th>
            <th rowspan="2">Remarks</th>
          </tr>
          <tr>
            <th>Last Name</th><th>First Name</th><th>Middle Name</th><th>Ext.</th>
            <th>Signature Over<br/>Printed Name</th><th>Thumb-<br/>mark</th>
          </tr>
        </thead>
        <tbody>
          ${dataRows}
          ${emptyRows}
          <tr class="subtotal-row">
            <td colspan="9" style="text-align:right">SUBTOTAL</td>
            <td style="text-align:right">${pesoFmt(subTotal)}</td>
            <td colspan="7"></td>
          </tr>
          ${isLast?`<tr class="grand-row">
            <td colspan="9" style="text-align:right">GRAND TOTAL</td>
            <td style="text-align:right">${pesoFmt(grandTotal)}</td>
            <td colspan="7"></td>
          </tr>`:''}
        </tbody>
      </table>

      <!-- FOOTER -->
      <div class="pay-footer">
        <div class="pay-sig-2">
          <div>
            <p style="font-size:8px">I hereby certify that each person whose name appears on the roll are entitled to cash gift.</p>
            <div class="sig-block" style="margin-top:14px">
              <span class="sig-name">${s.preparer}</span>
              <span class="sig-title">Printed Name and Signature of Acting/In-Charge-of-Office</span>
            </div>
          </div>
          <div>
            <p style="font-size:8px">Approved for Payment:</p>
            <div class="sig-block" style="margin-top:14px">
              <span class="sig-name">${s.approver}</span>
              <span class="sig-title">Printed Name and Signature of Head of Office</span>
            </div>
          </div>
        </div>
        <div class="cert-text">I/we certify on my/our official oath that on _________________, I/we have paid in cash to each individual on the roll, the amount set opposite to each name, having presented himself/herself, established identity and affixed his/her signature or thumbmark on the space provided.</div>
        <div class="pay-sig-3">
          <div class="sig-block">
            <span class="sig-name">${s.sdo}</span>
            <span class="sig-title">Printed Name and Signature of SDO</span>
          </div>
          <div class="sig-block">
            <span class="sig-name">${s.officer1}</span>
            <span class="sig-title">Printed Name and Signature of other officer present during Payout</span>
          </div>
          <div class="sig-block">
            <span class="sig-name">${s.officer2}</span>
            <span class="sig-title">Printed Name and Signature of other officer present during Payout</span>
          </div>
        </div>
        <div class="pay-pg-num">Page ${pi+1} of ${totalPages}</div>
      </div>

    </div>
  </div>`;
}

// ════════════════════════════════════════
//  PREVIEW — scales the fixed canvas to fit the viewer
// ════════════════════════════════════════
function previewPayroll(){
  const data=getPayrollData();
  if(!data){ toast('No active beneficiaries found.','error'); return; }
  const {rows,amount}=data;
  const s=getSettings();
  const PER_PAGE=5;
  const pages=[];
  for(let i=0;i<rows.length;i+=PER_PAGE) pages.push(rows.slice(i,i+PER_PAGE));
  const grandTotal=rows.length*amount;

  // Update payout stats
  document.getElementById('payout-stats').style.display='grid';
  document.getElementById('payout-stats').innerHTML=`
    <div class="stat-card" style="cursor:default"><div class="stat-label">Beneficiaries</div><div class="stat-value">${rows.length}</div></div>
    <div class="stat-card" style="cursor:default"><div class="stat-label">Per Person</div><div class="stat-value" style="font-size:18px;color:var(--green)">₱${Number(amount).toLocaleString()}</div></div>
    <div class="stat-card" style="cursor:default"><div class="stat-label">Grand Total</div><div class="stat-value" style="font-size:18px;color:var(--gold)">₱${Number(grandTotal).toLocaleString()}</div></div>
    <div class="stat-card" style="cursor:default"><div class="stat-label">Pages</div><div class="stat-value">${pages.length}</div></div>
  `;

  const scroll=document.getElementById('preview-scroll');

  // Compute scale: fit canvas width into scroll area (with 48px padding each side)
  function getScale(){
    const availW=scroll.clientWidth - 48;
    return Math.min(1, availW / CANVAS_W);
  }

  function buildScaledPages(){
    const scale=getScale();
    const scaledW=Math.round(CANVAS_W*scale);
    const scaledH=Math.round(CANVAS_H*scale);
    scroll.innerHTML=pages.map((page,pi)=>{
      const html=buildPageHTML(page,pi,pages.length,data,s,grandTotal);
      return`<div class="preview-page-outer" style="width:${scaledW}px;height:${scaledH}px;overflow:hidden">
        <div style="transform:scale(${scale});transform-origin:top left;width:${CANVAS_W}px;height:${CANVAS_H}px">
          ${html}
        </div>
      </div>`;
    }).join('');
  }

  buildScaledPages();
  document.getElementById('preview-overlay').classList.add('open');

  // Re-scale on resize
  let resizeTimer;
  const onResize=()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(buildScaledPages,120); };
  window._previewResizeHandler=onResize;
  window.addEventListener('resize',onResize);

  toast(`Preview ready — ${pages.length} page(s) for ${rows.length} beneficiaries.`,'success');
}

function closePreview(){
  document.getElementById('preview-overlay').classList.remove('open');
  if(window._previewResizeHandler){ window.removeEventListener('resize',window._previewResizeHandler); }
}

// ════════════════════════════════════════
//  PDF GENERATOR  (Legal Landscape 8"×13")
// ════════════════════════════════════════
async function savePDF(){
  const data=getPayrollData();
  if(!data){ toast('No active beneficiaries found.','error'); return; }
  const prog=document.getElementById('pdf-progress');
  const progText=document.getElementById('pdf-progress-text');
  prog.classList.add('show'); progText.textContent='Preparing PDF…';
  await new Promise(r=>setTimeout(r,30));

  const {jsPDF}=window.jspdf;
  const {rows,amount,region,province,city}=data;
  const s=getSettings();
  const PER_PAGE=5;
  const pages=[];
  for(let i=0;i<rows.length;i+=PER_PAGE) pages.push(rows.slice(i,i+PER_PAGE));
  const totalPages=pages.length;
  const grandTotal=rows.length*amount;

  // Legal Landscape: 13" × 8.5" → 330.2mm × 215.9mm
  const PW_IN=13, PH_IN=8.5;
  const PW=PW_IN*25.4, PH=PH_IN*25.4; // 330.2 × 215.9 mm

  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:[PH,PW]});
  // Note: jsPDF landscape swaps width/height internally
  const docW=doc.internal.pageSize.getWidth();   // 330.2
  const docH=doc.internal.pageSize.getHeight();  // 215.9

  const ML=7, MR=7, MT=5;
  const cW=docW-ML-MR;

  const BLUE=[0,48,135];
  const WHITE=[255,255,255];
  const BLACK=[0,0,0];
  const LGRAY=[232,238,248];
  const GOLD_BG=[255,243,205];
  const ROW_ALT=[249,251,255];

  for(let pi=0;pi<totalPages;pi++){
    if(pi>0) doc.addPage([PH,PW],'landscape');
    progText.textContent=`Building page ${pi+1} of ${totalPages}…`;
    await new Promise(r=>setTimeout(r,0));

    const page=pages[pi];
    const isLast=pi===totalPages-1;
    let y=MT;

    // ── OUTER BORDER ──
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.6);
    doc.rect(ML-1,MT-1,cW+2,docH-MT*2+2,'S');

    // ── HEADER ROW ──
    const LOGO_SIZE=16;
    // Left logo
    doc.setDrawColor(...BLUE); doc.setLineWidth(0.5);
    doc.rect(ML+1,y,LOGO_SIZE,LOGO_SIZE,'S');
    doc.setFontSize(5); doc.setFont('helvetica','bold'); doc.setTextColor(...BLUE);
    doc.text('NCSC',ML+1+LOGO_SIZE/2,y+6,{align:'center'});
    doc.text('LOGO',ML+1+LOGO_SIZE/2,y+10,{align:'center'});

    // Right logo (filled blue)
    const rxL=ML+cW-LOGO_SIZE-1;
    doc.setFillColor(...BLUE); doc.rect(rxL,y,LOGO_SIZE,LOGO_SIZE,'F');
    doc.setTextColor(...WHITE); doc.setFontSize(5);
    doc.text('BAGONG',rxL+LOGO_SIZE/2,y+6,{align:'center'});
    doc.text('PILIPINAS',rxL+LOGO_SIZE/2,y+10,{align:'center'});

    // Center header text
    const cx=ML+cW/2;
    doc.setTextColor(...BLACK); doc.setFont('times','bold'); doc.setFontSize(11);
    doc.text('NATIONAL COMMISSION OF SENIOR CITIZENS',cx,y+5,{align:'center'});

    // Subtitle line with underlined field values
    doc.setFont('times','normal'); doc.setFontSize(7.5);
    const subY=y+9.5;
    // Build the subtitle by measuring and drawing each segment + underline
    const subParts=[
      {text:'Regional Office ', bold:false},
      {text:region,            bold:false, underline:true},
      {text:'  Province ',     bold:false},
      {text:province,          bold:false, underline:true},
      {text:'  City/Municipality ',bold:false},
      {text:city,              bold:false, underline:true},
    ];
    // Measure total width to centre it
    let totalSubW=0;
    subParts.forEach(p=>{ doc.setFont('times','normal'); totalSubW+=doc.getTextWidth(p.text); });
    let sx=cx-totalSubW/2;
    subParts.forEach(p=>{
      doc.setFont('times','normal'); doc.setFontSize(7.5); doc.setTextColor(...BLACK);
      const pw=doc.getTextWidth(p.text);
      doc.text(p.text,sx,subY);
      if(p.underline){
        doc.setDrawColor(...BLACK); doc.setLineWidth(0.2);
        doc.line(sx,subY+0.6,sx+pw,subY+0.6);
      }
      sx+=pw;
    });

    doc.text('Expanded Centenarians Act',cx,y+13,{align:'center'});
    doc.setFont('times','bold'); doc.setFontSize(9.5);
    doc.text('CASH GIFT PAYROLL',cx,y+18,{align:'center'});
    const tw=doc.getTextWidth('CASH GIFT PAYROLL');
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.25);
    doc.line(cx-tw/2,y+18.5,cx+tw/2,y+18.5);

    y+=21;

    // ── PURPOSE ──
    doc.setLineWidth(0.3); doc.setDrawColor(...BLACK);
    doc.line(ML,y,ML+cW,y); y+=0.8;
    doc.setFont('times','bold'); doc.setFontSize(7); doc.setTextColor(...BLACK);
    doc.text('A. PURPOSE:',ML+1,y+3.5);
    doc.setFont('times','normal');
    doc.text('Cash gift payout for Octogenarians, Nonagenarians, and Centenarians pursuant to R.A. No. 11982 – Expanded Centenarian Act.',ML+21,y+3.5);
    y+=5.5;
    doc.line(ML,y,ML+cW,y); y+=0.8;

    // ── TABLE HEADERS ──
    // Column widths (total must = cW ≈ 316.2mm)
    // Batch|No|Last|First|Mid|Ext|Bdate|Age|Sex|Amount|AmtRcvd|Sig|Thumb|AuthRep|DOD|DateRcvd|Remarks
    const CW=[22,7,26,24,20,9,19,7,8,24,16,26,16,22,14,14,0];
    const usedW2=CW.slice(0,-1).reduce((a,b)=>a+b,0);
    CW[CW.length-1]=cW-usedW2;

    // Compute x positions
    const CX=[ML];
    for(let i=1;i<CW.length;i++) CX.push(CX[i-1]+CW[i-1]);

    const H1=7, H2=5.5; // header row heights
    const tblHeaderY=y;

    // Fill header blue
    doc.setFillColor(...BLUE);
    doc.rect(ML,y,cW,H1+H2,'F');

    // Group spans
    // "Full Name of Beneficiary" = cols 2-5 (index 2,3,4,5)
    const fnbX=CX[2], fnbW=CW[2]+CW[3]+CW[4]+CW[5];
    // "Beneficiary / Authorized Rep." = cols 11-12
    const barX=CX[11], barW=CW[11]+CW[12];

    // Horizontal divider in groups only
    doc.setDrawColor(...WHITE); doc.setLineWidth(0.15);
    doc.line(fnbX,y+H1,fnbX+fnbW,y+H1);
    doc.line(barX,y+H1,barX+barW,y+H1);

    // Group labels row 1
    doc.setFont('helvetica','bold'); doc.setFontSize(5.2); doc.setTextColor(...WHITE);
    doc.text('Full Name of Beneficiary',fnbX+fnbW/2,y+H1/2+1.5,{align:'center'});
    doc.text('Beneficiary / Authorized Rep.',barX+barW/2,y+H1/2+1.5,{align:'center'});

    // Per-column labels
    const hLabels=['Batch\nCode','No.','Last Name','First Name','Middle\nName','Ext.','BDate\n(mm/dd/yy)','Age','Sex','Amount','Amount\nReceived','Signature Over\nPrinted Name','Thumb-\nmark','For Auth. Rep.\n(Relationship/\nWitness)','Date of\nDeath','Date\nReceived','Remarks'];
    const groupCols=new Set([2,3,4,5,11,12]); // row2 only
    hLabels.forEach((lbl,ci)=>{
      const isGroup=groupCols.has(ci);
      const rowY=isGroup?y+H1:y;
      const rowH=isGroup?H2:H1+H2;
      const lines=lbl.split('\n');
      const lhgt=2.7;
      const startY=rowY+rowH/2-(lines.length*lhgt)/2+lhgt*0.7;
      doc.setFont('helvetica','bold'); doc.setFontSize(4.8); doc.setTextColor(...WHITE);
      lines.forEach((ln,li)=> doc.text(ln,CX[ci]+CW[ci]/2,startY+li*lhgt,{align:'center'}));
      // vertical separator
      if(ci>0){ doc.setDrawColor(...WHITE); doc.setLineWidth(0.15); doc.line(CX[ci],y,CX[ci],y+H1+H2); }
    });
    // Outer border
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.4); doc.rect(ML,y,cW,H1+H2,'S');
    y+=H1+H2;

    // ── DATA ROWS ──
    const ROW_H=9;
    for(let ri=0;ri<PER_PAGE;ri++){
      const r=page[ri]||null;
      const rowY=y+ri*ROW_H;
      if(ri%2===0){ doc.setFillColor(...ROW_ALT); doc.rect(ML,rowY,cW,ROW_H,'F'); }
      doc.setDrawColor(190,200,220); doc.setLineWidth(0.12); doc.rect(ML,rowY,cW,ROW_H,'S');
      if(r){
        const age=calcAge(r.birthdate);
        const no=(pi*PER_PAGE)+(ri+1);
        const vals=[r.batch_code||'',String(no),r.last_name||'',r.first_name||'',r.middle_name||'',r.extension||'',fmtDate(r.birthdate),String(age),r.sex||'','PHP '+Number(amount).toLocaleString('en-PH',{minimumFractionDigits:2}),'','','','',r.date_of_death?fmtDate(r.date_of_death):'','',r.remarks||''];
        vals.forEach((val,ci)=>{
          const isRight=ci===9||ci===10;
          const isBold=ci===2;
          doc.setFont('times',isBold?'bold':'normal');
          doc.setFontSize(6); doc.setTextColor(...BLACK);
          const tx=isRight?CX[ci]+CW[ci]-1:CX[ci]+1.2;
          doc.text(String(val),tx,rowY+ROW_H/2+1.8,{align:isRight?'right':'left',maxWidth:CW[ci]-2});
          if(ci>0){ doc.setDrawColor(190,200,220); doc.setLineWidth(0.12); doc.line(CX[ci],rowY,CX[ci],rowY+ROW_H); }
        });
      } else {
        CX.forEach((x,ci)=>{ if(ci>0){ doc.setDrawColor(190,200,220); doc.setLineWidth(0.12); doc.line(x,rowY,x,rowY+ROW_H); } });
      }
    }

    const afterData=y+PER_PAGE*ROW_H;

    // ── SUBTOTAL ──
    const amtX=CX[9]; const amtW=CW[9];
    doc.setFillColor(...LGRAY); doc.rect(ML,afterData,cW,5.5,'F');
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.3); doc.rect(ML,afterData,cW,5.5,'S');
    doc.setFont('times','bold'); doc.setFontSize(6.8); doc.setTextColor(...BLACK);
    doc.text('SUBTOTAL',amtX-0.8,afterData+3.8,{align:'right'});
    doc.text('PHP '+Number(page.length*amount).toLocaleString('en-PH',{minimumFractionDigits:2}),amtX+amtW-0.8,afterData+3.8,{align:'right'});
    doc.setLineWidth(0.15); doc.line(amtX,afterData,amtX,afterData+5.5);

    let nextY=afterData+5.5;
    if(isLast){
      doc.setFillColor(...GOLD_BG); doc.rect(ML,nextY,cW,6,'F');
      doc.setDrawColor(...BLACK); doc.setLineWidth(0.3); doc.rect(ML,nextY,cW,6,'S');
      doc.setFont('times','bold'); doc.setFontSize(7.5);
      doc.text('GRAND TOTAL',amtX-0.8,nextY+4,{align:'right'});
      doc.text('PHP '+Number(grandTotal).toLocaleString('en-PH',{minimumFractionDigits:2}),amtX+amtW-0.8,nextY+4,{align:'right'});
      doc.line(amtX,nextY,amtX,nextY+6);
      nextY+=6;
    }

    // ── FOOTER ──
    let fy=nextY+3;
    doc.setFont('times','normal'); doc.setFontSize(6.5); doc.setTextColor(...BLACK);
    doc.text('I hereby certify that each person whose name appears on the roll are entitled to cash gift.',ML,fy);
    doc.text('Approved for Payment:',ML+cW/2+4,fy);

    fy+=10;
    const halfW=cW/2-10;
    doc.setDrawColor(...BLACK); doc.setLineWidth(0.25);
    doc.line(ML,fy,ML+halfW,fy);
    doc.line(ML+cW/2+4,fy,ML+cW/2+4+halfW,fy);
    doc.setFont('times','bold'); doc.setFontSize(6.8);
    doc.text(s.preparer,ML+halfW/2,fy-1,{align:'center'});
    doc.text(s.approver,ML+cW/2+4+halfW/2,fy-1,{align:'center'});
    doc.setFont('times','normal'); doc.setFontSize(5.8);
    doc.text('Printed Name and Signature of Acting/In-Charge-of-Office',ML+halfW/2,fy+3,{align:'center'});
    doc.text('Printed Name and Signature of Head of Office',ML+cW/2+4+halfW/2,fy+3,{align:'center'});

    fy+=7;
    const certText='I/we certify on my/our official oath that on _________________, I/we have paid in cash to each individual on the roll, the amount set opposite to each name, having presented himself/herself, established identity and affixed his/her signature or thumbmark on the space provided.';
    const cLines=doc.splitTextToSize(certText,cW);
    doc.setFontSize(6); doc.text(cLines,ML,fy);

    fy+=cLines.length*2.8+4;
    const colW3=cW/3;
    [{name:s.sdo,title:'Printed Name and Signature of SDO'},
     {name:s.officer1,title:'Printed Name and Signature of other officer present during Payout'},
     {name:s.officer2,title:'Printed Name and Signature of other officer present during Payout'}
    ].forEach((sg,i)=>{
      const sx=ML+i*colW3+colW3/2;
      doc.setLineWidth(0.25);
      doc.line(ML+i*colW3+6,fy,ML+(i+1)*colW3-6,fy);
      doc.setFont('times','bold'); doc.setFontSize(6.8);
      doc.text(sg.name,sx,fy-1,{align:'center'});
      doc.setFont('times','normal'); doc.setFontSize(5.5);
      const tl=doc.splitTextToSize(sg.title,colW3-12);
      doc.text(tl,sx,fy+3,{align:'center'});
    });

    // Page number
    doc.setFont('times','italic'); doc.setFontSize(6); doc.setTextColor(140,140,140);
    doc.text(`Page ${pi+1} of ${totalPages}`,ML+cW,docH-3,{align:'right'});
  }

  prog.classList.remove('show');
  const batchLabel=fv('p-batch')?`_${fv('p-batch').replace(/[^a-z0-9]/gi,'_')}`:'';
  doc.save(`NCSC_CashGift_Payroll${batchLabel}_${new Date().toISOString().slice(0,10)}.pdf`);
  toast(`PDF saved! ${totalPages} page(s).`,'success');
}

// ════════════════════════════════════════
//  MISC
// ════════════════════════════════════════
function exportData(){
  const res=db.exec(`SELECT * FROM beneficiaries ORDER BY last_name,first_name`);
  if(!res.length){ toast('No data to export.','error'); return; }
  const cols=res[0].columns;
  const rows=res[0].values.map(v=>{const o={};cols.forEach((c,i)=>o[c]=v[i]);return o;});
  const blob=new Blob([JSON.stringify(rows,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download='ncsc_beneficiaries.json';a.click();
  toast('Data exported!','success');
}
function clearAllData(){
  if(!confirm('Delete ALL beneficiaries? This cannot be undone.'))return;
  db.run(`DELETE FROM beneficiaries`);
  saveDB(); renderTable(); renderStats(); populateBatchFilter();
  toast('All data cleared.','error');
}

// ════════════════════════════════════════
//  BOOT
// ════════════════════════════════════════
initSQL();

