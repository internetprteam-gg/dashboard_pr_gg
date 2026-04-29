const API_URL = 'https://script.google.com/macros/s/AKfycbw8dxDTAMl-ZFZKxNutLbpkD3ZgQpxGQtOKSp1j7veQb7vqQ3Qssrsm3ebLAJcCTIGE/exec';
const TOKEN   = 'gg_internet_PR_team';
const MEDIA_LIST = ['홈페이지 배너','브랜드검색 광고','경기도 뉴스레터','당근마켓','e알리미','경기지역화폐'];

let allRequests = [];
let allCompletes = [];
let parsedRequests = []; parsedCompletes = [];

// ── 데이터 로드 ────────────────────────────────────
async function loadData() {
  document.getElementById('syncTime').textContent = '불러오는 중...';
  try {
    const res = await fetch(`${API_URL}?action=getList&token=${TOKEN}`, { redirect: 'follow' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    allRequests  = data.requests  || [];
    allCompletes = data.completes || [];
    updateStats();
    renderRequest();
    renderComplete();
    const now = new Date();
    document.getElementById('syncTime').textContent =
      `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} 동기화`;
  } catch(e) {
    document.getElementById('syncTime').textContent = '연결 오류';
    showToast('데이터 로드 실패: ' + e.message, 'error');
    document.getElementById('tbody-request').innerHTML =
      `<tr><td colspan="8"><div class="empty-state"><p>데이터를 불러올 수 없습니다</p></div></td></tr>`;
    document.getElementById('tbody-complete').innerHTML =
      `<tr><td colspan="11"><div class="empty-state"><p>데이터를 불러올 수 없습니다</p></div></td></tr>`;
  }
}


function updateStats() {
  // 전체 신청 = 신청 목록 + 완료 목록 합계 (누적)
  document.getElementById('stat-total').textContent = allRequests.length + allCompletes.length;
  // 현재 신청 = 신청 목록 건수
  document.getElementById('stat-request').textContent = allRequests.length;
  // 완료 = 완료 목록 건수
  document.getElementById('stat-done').textContent  = allCompletes.length;
  document.getElementById('cnt-request').textContent  = allRequests.length;
  document.getElementById('cnt-complete').textContent = allCompletes.length;

  const cnt = {};
  MEDIA_LIST.forEach(m => cnt[m] = 0);
  allRequests.forEach(r => {
    MEDIA_LIST.forEach(m => { if ((r['신청항목'] || '').includes(m)) cnt[m]++; });
  });
  const top = Object.entries(cnt).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('stat-top-media').textContent = top && top[1] > 0 ? top[0] : '—';
}

// ── 신청목록 렌더 ──────────────────────────────────
function renderRequest() {
  const q  = document.getElementById('search-request').value.toLowerCase();
  const fm = getSelectedMedia();
  const ft = document.getElementById('filter-type').value;

  let rows = allRequests.filter(r => {
    const text = [r['사업부서'], r['사업담당자'], r['사업명']].join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (fm.length > 0 && !fm.some(m => (r['신청항목'] || '').includes(m))) return false;
    if (ft && r['지속사업여부'] !== ft) return false;
    return true;
  });

  // 날짜 기준 최신순 정렬
  rows.sort((a, b) => {
    const dateA = parseDateForSort(a['송출요청기간']);
    const dateB = parseDateForSort(b['송출요청기간']);
    return dateB - dateA; // 최신순 (내림차순)
  });

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / pageSizeReq);
  if (currentPageReq > totalPages && totalPages > 0) currentPageReq = totalPages;
  if (currentPageReq < 1) currentPageReq = 1;

  const start = (currentPageReq - 1) * pageSizeReq;
  const end = start + pageSizeReq;
  const pageRows = rows.slice(start, end);

  const tbody = document.getElementById('tbody-request');
  if (!totalRows) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><p>조건에 맞는 신청 항목이 없습니다</p></div></td></tr>`;
    document.getElementById('pagination-req').innerHTML = '';
    return;
  }

  tbody.innerHTML = pageRows.map((r, i) => {
    const media = parseMedia(r['신청항목'] || '');
    
    // 테이블용 칩 (최대 2개 + 외 n건)
    let chipsShort = '';
    if (media.length === 0) {
      chipsShort = '<span style="color:var(--text3)">—</span>';
    } else if (media.length <= 2) {
      chipsShort = media.map(m => `<span class="chip">${m}</span>`).join('');
    } else {
      chipsShort = media.slice(0, 2).map(m => `<span class="chip">${m}</span>`).join('');
      chipsShort += ` <span style="color:var(--text2);font-size:12px;margin-left:2px">외 ${media.length - 2}건</span>`;
    }

    // 펼침 영역용 전체 칩
    const chipsAll = media.length
      ? media.map(m => `<span class="chip">${m}</span>`).join('')
      : '<span style="color:var(--text3)">—</span>';

    const link = r['랜딩페이지']
      ? `<a class="link-btn" href="${escAttr(r['랜딩페이지'])}" target="_blank" onclick="event.stopPropagation()" title="랜딩페이지 열기">
           <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M10.604 1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.75.75 0 0 1-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1zM3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-3.5a.75.75 0 0 0-1.5 0v3.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h3.5a.75.75 0 0 0 0-1.5h-3.5z"/></svg>
         </a>` : '';

    const hasContent = r['사업내용'] && String(r['사업내용']).trim();
    return `
      <tr onclick="toggleExpand(${i})" id="row-req-${i}">
        <td class="col-dept">${escHtml(r['사업부서'] || '—')}</td>
        <td class="col-person">${escHtml(r['사업담당자'] || '—')}</td>
        <td class="col-tel">${formatTel(r['행정전화(뒷4자리)'] || r['행정전화'] || '')}</td>
        <td class="col-media"><div class="media-chips">${chipsShort}</div></td>
        <td class="col-reason" style="color:var(--text2)">${escHtml(r['신청사유'] || '—')}</td>
        <td class="col-name" style="font-weight:500">${escHtml(r['사업명'] || '—')}</td>
        <td class="col-link">${link}</td>
        <td class="col-period">${escHtml(normalizeDateFormat(r['송출요청기간']) || '—')}</td>
      </tr>
      <tr id="expand-req-${i}" style="display:none" class="expand-row">
        <td colspan="8">
          <div class="expand-content">
            <div class="expand-label">신청 매체</div>
            <div class="media-chips" style="margin-bottom:14px">${chipsAll}</div>
            <div class="expand-label">사업 내용</div>
            <div class="expand-text">${hasContent ? escHtml(String(r['사업내용'])) : '(내용 없음)'}</div>
            <button class="btn-complete-transfer" onclick="event.stopPropagation();openCompleteTransfer(${i})">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM2 2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H2z"/><path d="M2.5 4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V4z"/></svg>
              완료 처리
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  renderPagination('req', currentPageReq, totalPages, totalRows);
}
function renderPagination(type, current, total, totalItems) {
  const elem = document.getElementById(`pagination-${type}`);
  if (total === 0) { elem.innerHTML = ''; return; }
  
  const pageSize = type === 'req' ? pageSizeReq : pageSizeComp;
  
  if (total === 1) {
    elem.innerHTML = `
      <div class="pagination-center">
        <span class="page-info">1 / 1 페이지 (전체 ${totalItems}건)</span>
      </div>
      <div class="pagination-right">
        <span>페이지당</span>
        <select class="filter-select" id="page-size-${type}" onchange="changePageSize('${type}')" style="padding:5px 8px;min-width:70px">
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100개</option>
        </select>
      </div>`;
    return;
  }

  let html = '<div class="pagination-center">';
  html += `<button class="page-btn" onclick="goPage('${type}', 1)" ${current === 1 ? 'disabled' : ''}>처음</button>`;
  html += `<button class="page-btn" onclick="goPage('${type}', ${current - 1})" ${current === 1 ? 'disabled' : ''}>이전</button>`;
  
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    }
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<span style="padding:0 4px;color:var(--text3)">...</span>`;
    } else {
      html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="goPage('${type}', ${p})">${p}</button>`;
    }
  });

  html += `<button class="page-btn" onclick="goPage('${type}', ${current + 1})" ${current === total ? 'disabled' : ''}>다음</button>`;
  html += `<button class="page-btn" onclick="goPage('${type}', ${total})" ${current === total ? 'disabled' : ''}>마지막</button>`;
  html += `<span class="page-info">${current} / ${total} 페이지 (전체 ${totalItems}건)</span>`;
  html += '</div>';
  html += `<div class="pagination-right">
    <span>페이지당</span>
    <select class="filter-select" id="page-size-${type}" onchange="changePageSize('${type}')" style="padding:5px 8px;min-width:70px">
      <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개</option>
      <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개</option>
      <option value="100" ${pageSize === 100 ? 'selected' : ''}>100개</option>
    </select>
  </div>`;
  elem.innerHTML = html;
}

function goPage(type, page) {
  if (type === 'req') {
    currentPageReq = page;
    renderRequest();
  } else {
    currentPageComp = page;
    renderComplete();
  }
}

function changePageSize(type) {
  if (type === 'req') {
    pageSizeReq = parseInt(document.getElementById('page-size-req').value);
    currentPageReq = 1;
    renderRequest();
  } else {
    pageSizeComp = parseInt(document.getElementById('page-size-comp').value);
    currentPageComp = 1;
    renderComplete();
  }
}

function toggleExpand(i) {
  const expandRow = document.getElementById(`expand-req-${i}`);
  const mainRow   = document.getElementById(`row-req-${i}`);
  const isOpen = expandRow.style.display !== 'none';
  expandRow.style.display = isOpen ? 'none' : 'table-row';
  mainRow.classList.toggle('expanded', !isOpen);
}

// ── 완료목록 렌더 ──────────────────────────────────
function renderComplete() {
  const q = document.getElementById('search-complete').value.toLowerCase();
  let rows = allCompletes.filter(r => {
    const text = [r['사업부서'], r['사업담당자'], r['사업명']].join(' ').toLowerCase();
    return !q || text.includes(q);
  });

  // 날짜 기준 최신순 정렬 (여러 송출일시 중 가장 최근 날짜 기준)
  rows.sort((a, b) => {
    const dateA = getLatestCompletionDate(a);
    const dateB = getLatestCompletionDate(b);
    return dateB - dateA; // 최신순 (내림차순)
  });

  const totalRows = rows.length;
  const totalPages = Math.ceil(totalRows / pageSizeComp);
  if (currentPageComp > totalPages && totalPages > 0) currentPageComp = totalPages;
  if (currentPageComp < 1) currentPageComp = 1;

  const start = (currentPageComp - 1) * pageSizeComp;
  const end = start + pageSizeComp;
  const pageRows = rows.slice(start, end);

  const tbody = document.getElementById('tbody-complete');
  if (!totalRows) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state"><p>완료된 항목이 없습니다</p></div></td></tr>`;
    document.getElementById('pagination-comp').innerHTML = '';
    return;
  }

  const dateCell = v => {
    if (!v) return `<span class="date-empty">—</span>`;
    const formatted = formatDateToYYMMDD(v);
    return `<span class="date-filled">${escHtml(formatted)}</span>`;
  };

  tbody.innerHTML = pageRows.map(r => {
    const link = r['랜딩페이지']
      ? `<a class="link-btn" href="${escAttr(r['랜딩페이지'])}" target="_blank" title="랜딩페이지 열기">
           <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M10.604 1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.75.75 0 0 1-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1zM3.75 2A1.75 1.75 0 0 0 2 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 12.25v-3.5a.75.75 0 0 0-1.5 0v3.5a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h3.5a.75.75 0 0 0 0-1.5h-3.5z"/></svg>
         </a>` : '';
    return `<tr>
      <td class="col-dept">${escHtml(r['사업부서'] || '—')}</td>
      <td class="col-person">${escHtml(r['사업담당자'] || '—')}</td>
      <td class="col-tel">${formatTel(r['행정전화(뒷4자리)'] || r['행정전화'] || '')}</td>
      <td class="col-name" style="font-weight:500">${escHtml(r['사업명'] || '—')}</td>
      <td class="col-link">${link}</td>
      <td class="col-media-date">${dateCell(r['송출일시_홈페이지배너'])}</td>
      <td class="col-media-date">${dateCell(r['송출일시_브랜드검색광고'])}</td>
      <td class="col-media-date">${dateCell(r['송출일시_경기도뉴스레터'])}</td>
      <td class="col-media-date">${dateCell(r['송출일시_당근마켓'])}</td>
      <td class="col-media-date">${dateCell(r['송출일시_e알리미'])}</td>
      <td class="col-media-date">${dateCell(r['송출일시_경기지역화폐'])}</td>
    </tr>`;
  }).join('');

  renderPagination('comp', currentPageComp, totalPages, totalRows);
}
function renderPagination(type, current, total, totalItems) {
  const elem = document.getElementById(`pagination-${type}`);
  if (total === 0) { elem.innerHTML = ''; return; }
  
  const pageSize = type === 'req' ? pageSizeReq : pageSizeComp;
  
  if (total === 1) {
    elem.innerHTML = `
      <div class="pagination-center">
        <span class="page-info">1 / 1 페이지 (전체 ${totalItems}건)</span>
      </div>
      <div class="pagination-right">
        <span>페이지당</span>
        <select class="filter-select" id="page-size-${type}" onchange="changePageSize('${type}')" style="padding:5px 8px;min-width:70px">
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개</option>
          <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개</option>
          <option value="100" ${pageSize === 100 ? 'selected' : ''}>100개</option>
        </select>
      </div>`;
    return;
  }

  let html = '<div class="pagination-center">';
  html += `<button class="page-btn" onclick="goPage('${type}', 1)" ${current === 1 ? 'disabled' : ''}>처음</button>`;
  html += `<button class="page-btn" onclick="goPage('${type}', ${current - 1})" ${current === 1 ? 'disabled' : ''}>이전</button>`;
  
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    }
  }

  pages.forEach(p => {
    if (p === '...') {
      html += `<span style="padding:0 4px;color:var(--text3)">...</span>`;
    } else {
      html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="goPage('${type}', ${p})">${p}</button>`;
    }
  });

  html += `<button class="page-btn" onclick="goPage('${type}', ${current + 1})" ${current === total ? 'disabled' : ''}>다음</button>`;
  html += `<button class="page-btn" onclick="goPage('${type}', ${total})" ${current === total ? 'disabled' : ''}>마지막</button>`;
  html += `<span class="page-info">${current} / ${total} 페이지 (전체 ${totalItems}건)</span>`;
  html += '</div>';
  html += `<div class="pagination-right">
    <span>페이지당</span>
    <select class="filter-select" id="page-size-${type}" onchange="changePageSize('${type}')" style="padding:5px 8px;min-width:70px">
      <option value="20" ${pageSize === 20 ? 'selected' : ''}>20개</option>
      <option value="50" ${pageSize === 50 ? 'selected' : ''}>50개</option>
      <option value="100" ${pageSize === 100 ? 'selected' : ''}>100개</option>
    </select>
  </div>`;
  elem.innerHTML = html;
}

function goPage(type, page) {
  if (type === 'req') {
    currentPageReq = page;
    renderRequest();
  } else {
    currentPageComp = page;
    renderComplete();
  }
}

function changePageSize(type) {
  if (type === 'req') {
    pageSizeReq = parseInt(document.getElementById('page-size-req').value);
    currentPageReq = 1;
    renderRequest();
  } else {
    pageSizeComp = parseInt(document.getElementById('page-size-comp').value);
    currentPageComp = 1;
    renderComplete();
  }
}

// ── 탭 전환 ────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('panel-request').style.display  = tab === 'request'  ? 'block' : 'none';
  document.getElementById('panel-complete').style.display = tab === 'complete' ? 'block' : 'none';
  document.getElementById('tab-request').className  = 'tab-btn' + (tab === 'request'  ? ' active' : '');
  document.getElementById('tab-complete').className = 'tab-btn' + (tab === 'complete' ? ' active complete' : '');
}

// ── 모달 ───────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'modal-upload') {
    document.getElementById('upload-preview').style.display = 'none';
    document.getElementById('btn-import').style.display = 'none';
    document.getElementById('file-input').value = '';
    parsedRequests = []; parsedCompletes = [];
  }
}

// ── 신청 등록 ──────────────────────────────────────
async function submitRequest() {
  const checked = [...document.querySelectorAll('#media-checks input:checked')].map(c => c.value);
  const dept   = document.getElementById('f-dept').value.trim();
  const person = document.getElementById('f-person').value.trim();
  const name   = document.getElementById('f-name').value.trim();
  if (!dept || !person || !name || !checked.length) {
    showToast('필수 항목(부서, 담당자, 사업명, 매체)을 모두 입력해주세요', 'error'); return;
  }
  await postData({
    action: 'addRequest', token: TOKEN,
    '사업부서': dept, '사업담당자': person,
    '행정전화': document.getElementById('f-tel').value.trim(),
    '신청항목': checked.join(', '),
    '지속사업여부': document.getElementById('f-biz-type').value,
    '신청사유': document.getElementById('f-reason').value,
    '사업명': name,
    '사업내용': document.getElementById('f-content').value.trim(),
    '랜딩페이지': document.getElementById('f-url').value.trim(),
    '송출요청기간': document.getElementById('f-period').value.trim(),
  });
  closeModal('modal-request');
  resetFields(['f-dept','f-person','f-tel','f-biz-type','f-reason','f-name','f-content','f-url','f-period']);
  document.querySelectorAll('#media-checks input').forEach(c => {
    c.checked = false;
    c.closest('label').classList.remove('checked');
  });
  showToast('신청이 등록되었습니다', 'success');
  // 데이터 저장 완료를 위해 약간의 지연 후 로드
  setTimeout(() => loadData(), 500);
}

// ── 완료 등록 ──────────────────────────────────────
async function submitComplete() {
  const dept   = document.getElementById('c-dept').value.trim();
  const person = document.getElementById('c-person').value.trim();
  const name   = document.getElementById('c-name').value.trim();
  if (!dept || !person || !name) {
    showToast('필수 항목(부서, 담당자, 사업명)을 모두 입력해주세요', 'error'); return;
  }
  await postData({
    action: 'addComplete', token: TOKEN,
    '사업부서': dept, '사업담당자': person,
    '행정전화': document.getElementById('c-tel').value.trim(),
    '사업명': name,
    '랜딩페이지': document.getElementById('c-url').value.trim(),
    '송출일시_홈페이지배너':  document.getElementById('c-m1').value.trim(),
    '송출일시_브랜드검색광고': document.getElementById('c-m2').value.trim(),
    '송출일시_경기도뉴스레터': document.getElementById('c-m3').value.trim(),
    '송출일시_당근마켓':      document.getElementById('c-m4').value.trim(),
    '송출일시_e알리미':       document.getElementById('c-m5').value.trim(),
    '송출일시_경기지역화폐':  document.getElementById('c-m6').value.trim(),
  });
  closeModal('modal-complete');
  resetFields(['c-dept','c-person','c-tel','c-name','c-url','c-m1','c-m2','c-m3','c-m4','c-m5','c-m6']);
  showToast('완료 항목이 등록되었습니다', 'success');
  // 데이터 저장 완료를 위해 약간의 지연 후 로드
  setTimeout(() => loadData(), 500);
}

async function postData(params) {
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
    headers: { 'Content-Type': 'text/plain' },
    redirect: 'follow'
  });
}

// ── 엑셀 업로드 ────────────────────────────────────
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-area').classList.remove('dragover');
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
}
function handleFileSelect(e) {
  if (e.target.files[0]) processFile(e.target.files[0]);
}



function processFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: 'array' });
    parsedRequests = [];
    parsedCompletes = [];

    // 신청목록 시트 찾기
    const reqSheetName = wb.SheetNames.find(n => n.includes('신청') || n === '신청목록');
    if (reqSheetName) {
      const ws = wb.Sheets[reqSheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      parsedRequests = parseRequestSheet(raw);
    }

    // 완료목록 시트 찾기
    const compSheetName = wb.SheetNames.find(n => n.includes('완료') || n === '완료목록');
    if (compSheetName) {
      const ws = wb.Sheets[compSheetName];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      parsedCompletes = parseCompleteSheet(raw);
    }

    if (parsedRequests.length === 0 && parsedCompletes.length === 0) {
      showToast('신청목록 또는 완료목록 시트를 찾을 수 없습니다', 'error');
      return;
    }

    showUploadPreview(parsedRequests, parsedCompletes);
  };
  reader.readAsArrayBuffer(file);
}

function parseRequestSheet(raw) {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    if (raw[i].map(String).some(c => c.includes('사업부서') || c.includes('연번'))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return [];

  const headers  = raw[headerIdx].map(c => String(c).trim());
  const dataRows = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

  const idx = {
    dept:    findCol(headers, ['사업부서']),
    person:  findCol(headers, ['사업 담당자','사업담당자','담당자']),
    tel:     findCol(headers, ['행정전화','전화']),
    media:   findCol(headers, ['신청 항목','신청항목','항목']),
    type:    findCol(headers, ['계속사업 여부','지속사업여부','계속사업여부']),
    reason:  findCol(headers, ['신청사유','신청 사유']),
    name:    findCol(headers, ['사업명']),
    content: findCol(headers, ['사업내용','사업 내용']),
    url:     findCol(headers, ['랜딩페이지','랜딩 페이지']),
    period:  findCol(headers, ['송출 요청 기간','송출요청기간','기간']),
  };

  return dataRows.map(row => ({
    '사업부서':     get(row, idx.dept),
    '사업담당자':   get(row, idx.person),
    '행정전화':     extractTel(get(row, idx.tel)),
    '신청항목':     parseMediaStr(cleanNum(get(row, idx.media))),
    '지속사업여부': cleanNum(get(row, idx.type)),
    '신청사유':     cleanNum(get(row, idx.reason)),
    '사업명':       get(row, idx.name),
    '사업내용':     get(row, idx.content),
    '랜딩페이지':   get(row, idx.url),
    '송출요청기간': normalizeDateFormat(get(row, idx.period)),
  })).filter(r => r['사업부서'] || r['사업명']);
}

function parseCompleteSheet(raw) {
  let headerIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    if (raw[i].map(String).some(c => c.includes('사업부서'))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx === -1) return [];

  const headers  = raw[headerIdx].map(c => String(c).trim());
  const dataRows = raw.slice(headerIdx + 1).filter(r => r.some(c => c !== ''));

  const idx = {
    dept:   findCol(headers, ['사업부서']),
    person: findCol(headers, ['사업 담당자','사업담당자','담당자']),
    tel:    findCol(headers, ['행정전화','전화']),
    name:   findCol(headers, ['사업명']),
    url:    findCol(headers, ['랜딩페이지','랜딩 페이지']),
    m1:     findCol(headers, ['송출일시_홈페이지배너']),
    m2:     findCol(headers, ['송출일시_브랜드검색광고']),
    m3:     findCol(headers, ['송출일시_경기도뉴스레터']),
    m4:     findCol(headers, ['송출일시_당근마켓']),
    m5:     findCol(headers, ['송출일시_e알리미']),
    m6:     findCol(headers, ['송출일시_경기지역화폐']),
  };

  return dataRows.map(row => ({
    '사업부서':     get(row, idx.dept),
    '사업담당자':   get(row, idx.person),
    '행정전화':     extractTel(get(row, idx.tel)),
    '사업명':       get(row, idx.name),
    '랜딩페이지':   get(row, idx.url),
    '송출일시_홈페이지배너':  get(row, idx.m1),
    '송출일시_브랜드검색광고': get(row, idx.m2),
    '송출일시_경기도뉴스레터': get(row, idx.m3),
    '송출일시_당근마켓':      get(row, idx.m4),
    '송출일시_e알리미':       get(row, idx.m5),
    '송출일시_경기지역화폐':  get(row, idx.m6),
  })).filter(r => r['사업부서'] || r['사업명']);
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const i = headers.findIndex(h => h.includes(c));
    if (i !== -1) return i;
  }
  return -1;
}
function get(row, idx) { return idx >= 0 ? String(row[idx] || '').trim() : ''; }
function extractTel(val) {
  const m = String(val).match(/(\d{4})$/);
  return m ? m[1] : String(val).replace(/\D/g,'').slice(-4);
}
function cleanNum(val) {
  if (!val) return '';
  return val.replace(/^\d+\.\s*/, '').trim();
}
function parseMediaStr(val) {
  if (!val) return '';
  if (val.includes('전체')) return MEDIA_LIST.join(', ');
  // 번호 목록 형태 처리: "1. 홈페이지 배너  2. 브랜드검색 광고" 등
  const found = MEDIA_LIST.filter(m => val.includes(m));
  return found.length ? found.join(', ') : val;
}

function normalizeDateFormat(val) {
  if (!val) return '';
  let s = String(val).trim();
  
  // 공백 제거
  s = s.replace(/\s+/g, '');
  
  // 2026 → 26
  s = s.replace(/\b20(\d{2})\./g, '$1.');
  
  // 한 자리 월/일을 두 자리로 (반복 적용)
  for (let i = 0; i < 5; i++) {
    s = s.replace(/(\d{2})\.(\d)\./g, '$1.0$2.');    // yy.m. → yy.0m.
    s = s.replace(/\.(\d)\./g, '.0$1.');               // .m. → .0m.
    s = s.replace(/\.(\d)~/g, '.0$1~');                 // .m~ → .0m~
    s = s.replace(/~(\d)\./g, '~0$1.');                 // ~m. → ~0m.
    s = s.replace(/\.(\d)$/g, '.0$1');                  // .m$ → .0m
  }
  
  return s;
}

function showUploadPreview(requests, completes) {
  const preview = document.getElementById('upload-preview');
  const btn     = document.getElementById('btn-import');
  
  if (requests.length === 0 && completes.length === 0) {
    preview.innerHTML = '<p style="color:var(--danger);font-size:13px;margin-top:12px">데이터를 파싱할 수 없습니다</p>';
    preview.style.display = 'block'; return;
  }
  
  preview.style.display = 'block';
  btn.style.display = 'flex';

  // 중복 체크
  requests.forEach((r, i) => {
    r._isDup = allRequests.some(existing => 
      existing['사업부서'] === r['사업부서'] &&
      existing['사업담당자'] === r['사업담당자'] &&
      existing['사업명'] === r['사업명']
    );
    r._selected = !r._isDup; // 중복 아니면 기본 체크
  });

  completes.forEach((c, i) => {
    c._isDup = allCompletes.some(existing =>
      existing['사업부서'] === c['사업부서'] &&
      existing['사업담당자'] === c['사업담당자'] &&
      existing['사업명'] === c['사업명']
    );
    c._selected = !c._isDup;
  });

  const dupReqCount = requests.filter(r => r._isDup).length;
  const dupCompCount = completes.filter(c => c._isDup).length;

  let html = '<div style="font-size:12px;color:var(--text2);margin-bottom:8px">';
  if (requests.length > 0) {
    html += `<b>신청목록 ${requests.length}건</b>`;
    if (dupReqCount > 0) html += ` <span style="color:var(--danger)">(중복 ${dupReqCount}건)</span>`;
  }
  if (requests.length > 0 && completes.length > 0) html += ' / ';
  if (completes.length > 0) {
    html += `<b>완료목록 ${completes.length}건</b>`;
    if (dupCompCount > 0) html += ` <span style="color:var(--danger)">(중복 ${dupCompCount}건)</span>`;
  }
  html += ' — 중복 항목 확인 후 저장하세요</div>';

  if (requests.length > 0) {
    html += `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:11px;font-weight:600;color:var(--text3)">신청목록</div>
        <button onclick="toggleAllReq()" style="font-size:11px;padding:3px 8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);cursor:pointer">전체 선택/해제</button>
      </div>
    <div class="preview-table-wrap" style="max-height:200px;overflow-y:auto">
      <table class="preview-table">
        <thead><tr><th style="width:30px;position:sticky;top:0;background:var(--surface2);z-index:1"></th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">사업부서</th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">담당자</th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">신청항목</th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">사업명</th></tr></thead>
        <tbody>${requests.map((r, i) => {
          const dupStyle = r._isDup ? 'background:#ffe6e6' : '';
          const dupLabel = r._isDup ? '<span style="color:var(--danger);font-size:10px;font-weight:600;margin-left:4px">중복</span>' : '';
          return `<tr style="${dupStyle}">
          <td><input type="checkbox" class="dup-chk-req" data-idx="${i}" ${r._selected ? 'checked' : ''} onchange="updateImportBtn()"></td>
          <td>${escHtml(r['사업부서']||'—')}${dupLabel}</td>
          <td>${escHtml(r['사업담당자']||'—')}</td>
          <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${escHtml(r['신청항목']||'—')}</td>
          <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis">${escHtml(r['사업명']||'—')}</td>
        </tr>`;
        }).join('')}</tbody>
      </table>
    </div></div>`;
  }

  if (completes.length > 0) {
    html += `<div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-size:11px;font-weight:600;color:var(--text3)">완료목록</div>
        <button onclick="toggleAllComp()" style="font-size:11px;padding:3px 8px;border:1px solid var(--border);border-radius:4px;background:var(--surface);cursor:pointer">전체 선택/해제</button>
      </div>
    <div class="preview-table-wrap" style="max-height:200px;overflow-y:auto">
      <table class="preview-table">
        <thead><tr><th style="width:30px;position:sticky;top:0;background:var(--surface2);z-index:1"></th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">사업부서</th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">담당자</th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">사업명</th><th style="position:sticky;top:0;background:var(--surface2);z-index:1">홈페이지</th></tr></thead>
        <tbody>${completes.map((c, i) => {
          const dupStyle = c._isDup ? 'background:#ffe6e6' : '';
          const dupLabel = c._isDup ? '<span style="color:var(--danger);font-size:10px;font-weight:600;margin-left:4px">중복</span>' : '';
          return `<tr style="${dupStyle}">
          <td><input type="checkbox" class="dup-chk-comp" data-idx="${i}" ${c._selected ? 'checked' : ''} onchange="updateImportBtn()"></td>
          <td>${escHtml(c['사업부서']||'—')}${dupLabel}</td>
          <td>${escHtml(c['사업담당자']||'—')}</td>
          <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${escHtml(c['사업명']||'—')}</td>
          <td style="max-width:90px;overflow:hidden;text-overflow:ellipsis">${escHtml(c['송출일시_홈페이지배너']||'—')}</td>
        </tr>`;
        }).join('')}</tbody>
      </table>
    </div></div>`;
  }

  preview.innerHTML = html;
  updateImportBtn();
}

function toggleAllReq() {
  const chks = document.querySelectorAll('.dup-chk-req');
  const allChecked = [...chks].every(c => c.checked);
  chks.forEach(c => c.checked = !allChecked);
  updateImportBtn();
}

function toggleAllComp() {
  const chks = document.querySelectorAll('.dup-chk-comp');
  const allChecked = [...chks].every(c => c.checked);
  chks.forEach(c => c.checked = !allChecked);
  updateImportBtn();
}

function updateImportBtn() {
  const btn = document.getElementById('btn-import');
  const reqCnt = document.querySelectorAll('.dup-chk-req:checked').length;
  const compCnt = document.querySelectorAll('.dup-chk-comp:checked').length;
  const total = reqCnt + compCnt;
  if (total === 0) {
    btn.disabled = true;
    btn.innerHTML = '저장할 항목 없음';
  } else {
    btn.disabled = false;
    let txt = '';
    if (reqCnt > 0) txt += `신청 ${reqCnt}건`;
    if (reqCnt > 0 && compCnt > 0) txt += ' / ';
    if (compCnt > 0) txt += `완료 ${compCnt}건`;
    txt += ' 저장';
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg> ${txt}`;
  }
}

async function importData() {
  const btn = document.getElementById('btn-import');
  btn.textContent = '저장 중...'; btn.disabled = true;
  
  let successReq = 0, successComp = 0;
  
  // 체크된 신청목록만 저장
  const reqChecks = document.querySelectorAll('.dup-chk-req:checked');
  for (const chk of reqChecks) {
    const idx = parseInt(chk.dataset.idx);
    const row = parsedRequests[idx];
    if (row) {
      try { await postData({ action: 'addRequest', token: TOKEN, ...row }); successReq++; } catch {}
    }
  }
  
  // 체크된 완료목록만 저장
  const compChecks = document.querySelectorAll('.dup-chk-comp:checked');
  for (const chk of compChecks) {
    const idx = parseInt(chk.dataset.idx);
    const row = parsedCompletes[idx];
    if (row) {
      try { await postData({ action: 'addComplete', token: TOKEN, ...row }); successComp++; } catch {}
    }
  }
  
  btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg> 시트에 저장';
  btn.disabled = false;
  closeModal('modal-upload');
  
  let msg = '';
  if (successReq > 0) msg += `신청 ${successReq}건`;
  if (successReq > 0 && successComp > 0) msg += ' / ';
  if (successComp > 0) msg += `완료 ${successComp}건`;
  msg += ' 저장 완료';
  
  showToast(msg, 'success');
  // 데이터 저장 완료를 위해 약간의 지연 후 로드
  setTimeout(() => loadData(), 500);
}

// ── 유틸 ───────────────────────────────────────────
function parseMedia(val) {
  return MEDIA_LIST.filter(m => val.includes(m));
}
function formatTel(val) {
  if (!val) return '—';
  const s = String(val).trim();
  if (/^\d{4}$/.test(s)) return s;
  const m = s.match(/(\d{4})$/);
  return m ? m[1] : s;
}
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) { return escHtml(s); }
function toggleChip(input) {
  input.closest('label').classList.toggle('checked', input.checked);
}
function resetFields(ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}
function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' '+type : '');
  setTimeout(() => { t.className = 'toast'; }, 3000);
}
function openUploadModal() { openModal('modal-upload'); }

// ── 완료 처리 (신청→완료 이동) ────────────────────────
let transferSourceIdx = -1;
let currentPageReq = 1;
let pageSizeReq = 20;
let currentPageComp = 1;
let pageSizeComp = 20;

function openCompleteTransfer(idx) {
  transferSourceIdx = idx;
  const q  = document.getElementById('search-request').value.toLowerCase();
  const fm = getSelectedMedia();
  const ft = document.getElementById('filter-type').value;
  const rows = allRequests.filter(r => {
    const text = [r['사업부서'], r['사업담당자'], r['사업명']].join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (fm.length > 0 && !fm.some(m => (r['신청항목'] || '').includes(m))) return false;
    if (ft && r['지속사업여부'] !== ft) return false;
    return true;
  });
  const r = rows[idx];
  if (!r) return;

  document.getElementById('tr-dept-view').textContent = r['사업부서'] || '—';
  document.getElementById('tr-person-view').textContent = r['사업담당자'] || '—';
  document.getElementById('tr-name-view').textContent = r['사업명'] || '—';
  resetFields(['tr-m1','tr-m2','tr-m3','tr-m4','tr-m5','tr-m6']);
  openModal('modal-transfer');
}

async function submitTransfer() {
  if (transferSourceIdx === -1) return;
  const q  = document.getElementById('search-request').value.toLowerCase();
  const fm = getSelectedMedia();
  const ft = document.getElementById('filter-type').value;
  const rows = allRequests.filter(r => {
    const text = [r['사업부서'], r['사업담당자'], r['사업명']].join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (fm.length > 0 && !fm.some(m => (r['신청항목'] || '').includes(m))) return false;
    if (ft && r['지속사업여부'] !== ft) return false;
    return true;
  });
  const r = rows[transferSourceIdx];
  if (!r) return;

  await postData({
    action: 'addComplete', token: TOKEN,
    '사업부서': r['사업부서'] || '',
    '사업담당자': r['사업담당자'] || '',
    '행정전화': r['행정전화(뒷4자리)'] || r['행정전화'] || '',
    '사업명': r['사업명'] || '',
    '랜딩페이지': r['랜딩페이지'] || '',
    '송출일시_홈페이지배너': document.getElementById('tr-m1').value.trim(),
    '송출일시_브랜드검색광고': document.getElementById('tr-m2').value.trim(),
    '송출일시_경기도뉴스레터': document.getElementById('tr-m3').value.trim(),
    '송출일시_당근마켓': document.getElementById('tr-m4').value.trim(),
    '송출일시_e알리미': document.getElementById('tr-m5').value.trim(),
    '송출일시_경기지역화폐': document.getElementById('tr-m6').value.trim(),
  });
  closeModal('modal-transfer');
  transferSourceIdx = -1;
  showToast('완료 목록에 추가되었습니다', 'success');
  // 데이터 저장 완료를 위해 약간의 지연 후 로드
  setTimeout(() => loadData(), 500);
}

// ── 매체 필터 ──────────────────────────────────────
function getSelectedMedia() {
  const checked = [...document.querySelectorAll('.mf-item:checked')].map(c => c.value);
  // 전체 선택이면 필터 없음 처리
  const all = document.querySelectorAll('.mf-item').length;
  return checked.length === all ? [] : checked;
}

function toggleMediaFilter(e) {
  e.stopPropagation();
  const panel = document.getElementById('media-filter-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function onMediaFilterChange() {
  const items = [...document.querySelectorAll('.mf-item')];
  const checkedCount = items.filter(c => c.checked).length;
  const allChk = document.getElementById('mf-all');
  allChk.checked = checkedCount === items.length;
  allChk.indeterminate = checkedCount > 0 && checkedCount < items.length;

  // 버튼 라벨 업데이트
  const label = document.getElementById('media-filter-label');
  if (checkedCount === items.length || checkedCount === 0) {
    label.textContent = '전체 매체';
  } else if (checkedCount === 1) {
    label.textContent = items.find(c => c.checked).value;
  } else {
    label.textContent = `${checkedCount}개 선택`;
  }
  renderRequest();
}

function toggleMediaAll(el) {
  setTimeout(() => {
    const checked = document.getElementById('mf-all').checked;
    document.querySelectorAll('.mf-item').forEach(c => c.checked = checked);
    onMediaFilterChange();
  }, 0);
}

// 패널 바깥 클릭 시 닫기
document.addEventListener('click', e => {
  const wrap = document.getElementById('media-filter-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('media-filter-panel').style.display = 'none';
  }
});
function openDownloadModal() { openModal('modal-download'); }

function updateDlLabel() {
  // 둘 다 체크 해제 방지
  const r = document.getElementById('dl-request').checked;
  const c = document.getElementById('dl-complete').checked;
  if (!r && !c) {
    // 마지막 하나는 해제 못하게
    document.getElementById('dl-request').checked = true;
  }
}

function getFilteredRequests() {
  const q  = document.getElementById('search-request').value.toLowerCase();
  const fm = getSelectedMedia();
  const ft = document.getElementById('filter-type').value;
  return allRequests.filter(r => {
    const text = [r['사업부서'], r['사업담당자'], r['사업명']].join(' ').toLowerCase();
    if (q && !text.includes(q)) return false;
    if (fm.length > 0 && !fm.some(m => (r['신청항목'] || '').includes(m))) return false;
    if (ft && r['지속사업여부'] !== ft) return false;
    return true;
  });
}

function downloadExcel() {
  const inclRequest  = document.getElementById('dl-request').checked;
  const inclComplete = document.getElementById('dl-complete').checked;
  const isFiltered   = document.getElementById('dl-range-filtered').checked;

  const wb = XLSX.utils.book_new();

  if (inclRequest) {
    const rows = isFiltered ? getFilteredRequests() : allRequests;
    const headers = ['사업부서','사업담당자','행정전화(뒷4자리)','신청항목','지속사업여부','신청사유','사업명','사업내용','랜딩페이지','송출요청기간'];
    const data = [headers, ...rows.map(r => headers.map(h => r[h] || ''))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    // 컬럼 너비 설정
    ws['!cols'] = [14,12,14,30,10,16,28,40,40,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, '신청목록');
  }

  if (inclComplete) {
    const rows = isFiltered ? allCompletes : allCompletes;
    const headers = ['사업부서','사업담당자','행정전화(뒷4자리)','사업명','랜딩페이지','송출일시_홈페이지배너','송출일시_브랜드검색광고','송출일시_경기도뉴스레터','송출일시_당근마켓','송출일시_e알리미','송출일시_경기지역화폐'];
    const data = [headers, ...rows.map(r => headers.map(h => r[h] || ''))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [14,12,14,28,40,16,16,16,12,10,14].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, '완료목록');
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  XLSX.writeFile(wb, `매체홍보신청_${dateStr}.xlsx`);
  closeModal('modal-download');
  showToast('다운로드 완료', 'success');
}

// ── 날짜 정렬 유틸리티 ──────────────────────────────
function formatDateToYYMMDD(dateStr) {
  if (!dateStr) return '';
  
  const str = String(dateStr).trim();
  
  // 이미 "yy.mm.dd." 형식인지 확인
  if (/^\d{2}\.\d{1,2}\.\d{1,2}\.?$/.test(str)) {
    // "26.4.20" 또는 "26.4.20." 형식
    const match = str.match(/(\d{2})\.(\d{1,2})\.(\d{1,2})/);
    if (match) {
      const [_, yy, m, d] = match;
      const mm = m.padStart(2, '0');
      const dd = d.padStart(2, '0');
      return `${yy}.${mm}.${dd}.`;
    }
  }
  
  // "YYYY-MM-DD" 또는 "YYYY.MM.DD" 형식
  let match = str.match(/(\d{4})[-.\/]*(\d{1,2})[-.\/]*(\d{1,2})/);
  if (match) {
    const [_, yyyy, m, d] = match;
    const yy = yyyy.slice(-2); // 뒤 2자리만
    const mm = m.padStart(2, '0');
    const dd = d.padStart(2, '0');
    return `${yy}.${mm}.${dd}.`;
  }
  
  // 파싱 실패 시 원본 반환
  return str;
}

function parseDateForSort(dateStr) {
  if (!dateStr) return new Date(0); // 날짜 없으면 가장 오래된 것으로
  
  const str = String(dateStr).trim();
  
  // "26.4.20." 또는 "26.4.20" 형식 처리
  let match = str.match(/(\d{2,4})[.\s]*(\d{1,2})[.\s]*(\d{1,2})/);
  
  if (match) {
    let [_, year, month, day] = match;
    
    // 2자리 연도를 4자리로 변환 (26 -> 2026)
    if (year.length === 2) {
      year = '20' + year;
    }
    
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // "YYYY-MM-DD ~ YYYY-MM-DD" 형식인 경우 시작 날짜 추출
  match = str.match(/(\d{4})[-.\/년\s]*(\d{1,2})[-.\/월\s]*(\d{1,2})/);
  
  if (match) {
    const [_, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return new Date(0);
}

function getLatestCompletionDate(record) {
  const dateFields = [
    '송출일시_홈페이지배너',
    '송출일시_브랜드검색광고',
    '송출일시_경기도뉴스레터',
    '송출일시_당근마켓',
    '송출일시_e알리미',
    '송출일시_경기지역화폐'
  ];
  
  let latestDate = new Date(0);
  
  dateFields.forEach(field => {
    const dateStr = record[field];
    if (dateStr && dateStr.trim()) {
      const date = parseDateForSort(dateStr);
      if (date > latestDate) {
        latestDate = date;
      }
    }
  });
  
  return latestDate;
}

// ── 초기 로드 ──────────────────────────────────────
loadData();
