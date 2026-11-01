const form = document.getElementById('incidentForm');
const summary = document.getElementById('summary');
const results = document.getElementById('results');
const statusMessage = document.getElementById('status');
const resultCount = document.getElementById('resultCount');
const resultsActions = document.getElementById('resultsActions');

let currentCase = null;
let currentUser = null;
let savedCases = [];
const statusNames = {
  submitted: 'Submitted',
  under_review: 'Under police review',
  closed: 'Closed',
};

const rules = {
  theft: {
    title: 'Possible property-taking issue',
    keywords: [
      'stolen',
      'steal',
      'stole',
      'taken without permission',
      'missing phone',
      'mobile phone',
    ],
    reason:
      'Review the reported circumstances of the alleged taking of property.',
  },
  assault: {
    title: 'Possible physical-harm issue',
    keywords: [
      'hit',
      'beaten',
      'punched',
      'slapped',
      'assault',
      'injury',
      'attacked',
    ],
    reason:
      'Review the alleged physical contact, injuries, and surrounding circumstances.',
  },
  cheating: {
    title: 'Possible deception-related issue',
    keywords: [
      'cheated',
      'fraud',
      'deceived',
      'false promise',
      'dishonest inducement',
    ],
    reason:
      'Review whether the facts describe deception and the required legal elements.',
  },
  robbery: {
    title: 'Possible force-or-threat property issue',
    keywords: [
      'robbed',
      'robbery',
      'snatched',
      'forcefully took',
      'threatened and took',
    ],
    reason:
      'Review the reported taking of property and any alleged force or threat.',
  },
  threat: {
    title: 'Possible threat-related issue',
    keywords: ['threatened', 'threat', 'kill', 'harm you', 'intimidated'],
    reason:
      'Review the exact words, context, and circumstances of the alleged threat.',
  },
  trespass: {
    title: 'Possible unauthorised-entry issue',
    keywords: [
      'trespassed',
      'entered without permission',
      'unlawfully entered',
      'broke into',
    ],
    reason:
      'Review the alleged entry, permission, intent, and surrounding circumstances.',
  },
  damage: {
    title: 'Possible property-damage issue',
    keywords: [
      'damaged',
      'broke',
      'smashed',
      'vandalized',
      'destroyed property',
    ],
    reason:
      'Review the reported damage, property involved, and surrounding circumstances.',
  },
};

const categoryNames = {
  theft: 'Theft',
  assault: 'Assault',
  cheating: 'Cheating',
  robbery: 'Robbery',
  threat: 'Criminal intimidation / threat',
  trespass: 'Trespassing',
  damage: 'Property damage',
  other: 'Other / uncertain',
};

function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
}

function readSavedCases() {
  return savedCases;
}

async function refreshSavedCases() {
  const result = await FIR.request('/cases');
  savedCases = result.cases;
  renderSavedCases();
  updateStats();
}

function analyzeIncident(data) {
  const text = data.description
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const found = [];

  for (const [key, rule] of Object.entries(rules)) {
    const matched = rule.keywords.filter((word) =>
      ` ${text} `.includes(` ${word} `),
    );
    const selectedCategory = data.category === key;
    if (matched.length || selectedCategory) {
      found.push({
        id: 'R-' + key.toUpperCase(),
        key,
        title: rule.title,
        reason: rule.reason,
        matched,
        categoryMatch: selectedCategory,
        code: 'Requires verification against official legal sources',
        note: 'Keyword/category matches are only prompts for manual review; they do not establish an offence.',
      });
    }
  }

  if (data.threats === 'yes' && !found.some((item) => item.key === 'threat')) {
    found.push({
      id: 'R-THREAT-CONTEXT',
      key: 'threat',
      title: 'Threat reported — manual review',
      reason: 'The form indicates that threats may have been involved.',
      matched: [],
      categoryMatch: false,
      code: 'Requires verification against official legal sources',
      note: 'Contextual prompt only. Review the exact words and circumstances.',
    });
  }

  if (data.weapon === 'yes') {
    found.push({
      id: 'R-WEAPON-CONTEXT',
      key: 'other',
      title: 'Weapon reported — manual review',
      reason: 'The form indicates that a weapon may have been involved.',
      matched: [],
      categoryMatch: false,
      code: 'Requires verification against official legal sources',
      note: 'Review the object, its alleged use, injuries, and applicable law.',
    });
  }

  return found;
}

function collectFormData() {
  return {
    ...currentCase,
    caseId: document.getElementById('caseId').value.trim() || 'Not provided',
    date: document.getElementById('incidentDate').value,
    location: document.getElementById('location').value.trim(),
    category: document.getElementById('category').value,
    description: document.getElementById('description').value.trim(),
    weapon: document.getElementById('weapon').value,
    threats: document.getElementById('threats').value,
    injury: document.getElementById('injury').value.trim() || 'Not provided',
  };
}

function renderAnalysis(data, matches) {
  summary.className = '';
  summary.innerHTML = `
    <div class="result-card">
      <div class="result-top">
        <div><h3>Case ${escapeHTML(data.caseId)}</h3><span class="tag">${escapeHTML(categoryNames[data.category] || data.category)}</span></div>
        <span class="tag">${escapeHTML(new Date().toLocaleString())}</span>
      </div>
      <p><strong>Incident date:</strong> ${escapeHTML(data.date || 'Not provided')}</p>
      <p><strong>Status:</strong> ${escapeHTML(statusNames[data.status] || 'Unsaved draft')}</p>
      ${currentUser.role === 'admin' && data.ownerName ? `<p><strong>Reported by:</strong> ${escapeHTML(data.ownerName)} (${escapeHTML(data.ownerEmail)})</p>` : ''}
      <p><strong>Location:</strong> ${escapeHTML(data.location)}</p>
      <p><strong>Weapon reported:</strong> ${escapeHTML(data.weapon)}</p>
      <p><strong>Threats reported:</strong> ${escapeHTML(data.threats)}</p>
      <p><strong>Injury / property details:</strong> ${escapeHTML(data.injury)}</p>
      <p><strong>Description:</strong> ${escapeHTML(data.description)}</p>
    </div>`;

  if (!matches.length) {
    results.innerHTML =
      '<div class="empty-state compact"><h3>No demo rule matched</h3><p>This does not mean no offence occurred. Manual review is required.</p></div>';
  } else {
    results.innerHTML = matches
      .map(
        (item, index) => `
      <article class="result-card" data-rule-id="${escapeHTML(item.id)}">
        <div class="result-top">
          <div><h3>${escapeHTML(item.title)}</h3><span class="tag">${escapeHTML(item.id)}</span></div>
          <span class="tag">Preliminary prompt</span>
        </div>
        <p><strong>Legal section:</strong> ${escapeHTML(item.code)}</p>
        <p class="reason"><strong>Why suggested:</strong> ${escapeHTML(item.reason)}</p>
        <p class="matched"><strong>Matched keywords:</strong> ${escapeHTML(item.matched.join(', ') || (item.categoryMatch ? 'Selected category' : 'Contextual flag'))}</p>
        <p class="matched">${escapeHTML(item.note)}</p>
        <div class="review-row">
          <input type="checkbox" id="review-${index}" class="review-check" data-id="${escapeHTML(item.id)}" ${currentUser.role !== 'admin' || !data.id ? 'disabled' : ''}>
          <label for="review-${index}">Mark for officer review</label>
        </div>
        <div class="review-note">
          <label for="note-${index}">Police review note</label>
          <input id="note-${index}" class="review-note-input" data-id="${escapeHTML(item.id)}" maxlength="2000" ${currentUser.role !== 'admin' || !data.id ? 'readonly' : ''}>
        </div>
      </article>
    `,
      )
      .join('');
  }

  resultCount.textContent = `${matches.length} prompt${matches.length === 1 ? '' : 's'} found`;
  resultsActions.hidden = false;
  for (const card of results.querySelectorAll('.result-card')) {
    const review = (data.review || []).find(
      (entry) => entry.id === card.dataset.ruleId,
    );
    card.querySelector('.review-check').checked = Boolean(review?.selected);
    card.querySelector('.review-note-input').value = review?.note || '';
  }
  const policeReview = currentUser.role === 'admin' && Boolean(data.id);
  document.getElementById('policeReviewControls').hidden = !policeReview;
  document.getElementById('caseStatus').value = data.status || 'submitted';
  document.getElementById('saveButton').textContent = policeReview
    ? 'Save police review'
    : 'Save case';
  document.getElementById('saveButton').disabled =
    !policeReview && Boolean(data.id) && data.status !== 'submitted';
  updateStats();
}

function getCurrentReviewData() {
  if (!currentCase) return [];
  return [...results.querySelectorAll('.result-card')].map((card) => {
    const check = card.querySelector('.review-check');
    const note = card.querySelector('.review-note-input');
    return {
      id: card.dataset.ruleId,
      selected: Boolean(check && check.checked),
      note: note ? note.value.trim() : '',
    };
  });
}

async function saveCurrentCase() {
  if (!currentCase) return;
  const button = document.getElementById('saveButton');
  if (button.disabled) return;
  button.disabled = true;
  try {
    const policeReview = currentUser.role === 'admin' && currentCase.id;
    const path = currentCase.id
      ? `/cases/${currentCase.id}${policeReview ? '/review' : ''}`
      : '/cases';
    const data = policeReview
      ? {
          version: currentCase.version,
          review: getCurrentReviewData(),
          status: document.getElementById('caseStatus').value,
        }
      : currentCase;
    const result = await FIR.request(
      path,
      policeReview ? 'PATCH' : currentCase.id ? 'PUT' : 'POST',
      data,
    );
    currentCase = result.case;
    renderAnalysis(currentCase, analyzeIncident(currentCase));
    setFormEditable();
    statusMessage.textContent = policeReview
      ? 'Police review saved.'
      : 'Case saved to your account.';
    await refreshSavedCases();
  } catch (error) {
    statusMessage.textContent = error.message;
  } finally {
    button.disabled =
      currentUser.role !== 'admin' &&
      Boolean(currentCase?.id) &&
      currentCase.status !== 'submitted';
  }
}

function setFormEditable() {
  const locked =
    currentCase?.id &&
    (currentUser.role === 'admin' || currentCase.status !== 'submitted');
  form
    .querySelectorAll("input, select, textarea, button[type='submit']")
    .forEach((control) => {
      control.disabled = Boolean(locked);
    });
}

function renderSavedCases() {
  const holder = document.getElementById('savedCases');
  const query = document
    .getElementById('searchSaved')
    .value.trim()
    .toLowerCase();
  const filter = document.getElementById('filterSaved').value;
  const saved = readSavedCases().filter((item) => {
    const matchesQuery = [
      item.caseId,
      item.location,
      item.description,
      categoryNames[item.category],
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
    return matchesQuery && (filter === 'all' || item.category === filter);
  });

  if (!saved.length) {
    holder.innerHTML =
      '<p class="empty-state compact">No matching saved cases.</p>';
    return;
  }

  holder.innerHTML = saved
    .map(
      (item) => `
    <div class="saved-case">
      <div>
        <h3>${escapeHTML(item.caseId)} · ${escapeHTML(categoryNames[item.category] || item.category)}</h3>
        <p>${escapeHTML(item.date || 'No date')} · ${escapeHTML(item.location)} · Saved ${escapeHTML(new Date(item.savedAt || item.createdAt).toLocaleString())}</p>
        <p>${escapeHTML(statusNames[item.status])}${currentUser.role === 'admin' ? ` · ${escapeHTML(item.ownerName)} (${escapeHTML(item.ownerEmail)})` : ''}</p>
      </div>
      <div class="saved-actions">
        <button type="button" class="btn btn-light" data-action="load" data-id="${escapeHTML(item.id)}">Load</button>
        ${currentUser.role === 'admin' || item.status === 'submitted' ? `<button type="button" class="btn btn-danger-outline" data-action="delete" data-id="${escapeHTML(item.id)}">Archive</button>` : ''}
      </div>
    </div>
  `,
    )
    .join('');
}

function updateStats() {
  const saved = readSavedCases();
  document.getElementById('totalCases').textContent = saved.length;
  document.getElementById('reviewCount').textContent = saved.reduce(
    (sum, item) =>
      sum + (item.review || []).filter((entry) => entry.selected).length,
    0,
  );
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = collectFormData();
  if (data.description.length < 10) {
    statusMessage.textContent =
      'Please enter a more detailed incident description.';
    return;
  }
  currentCase = data;
  const matches = analyzeIncident(data);
  renderAnalysis(data, matches);
  statusMessage.textContent =
    'Analysis complete. Review every prompt before taking any action.';
  document
    .getElementById('resultsSection')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
});

form.addEventListener('reset', () => {
  setTimeout(() => {
    currentCase = null;
    setFormEditable();
    summary.className = 'empty-state';
    summary.innerHTML =
      '<div class="empty-icon">⌕</div><h3>Ready to analyze</h3><p>Complete the form and select <strong>Analyze incident</strong>. Results will appear here.</p>';
    results.innerHTML = '';
    resultCount.textContent = 'No analysis yet';
    resultsActions.hidden = true;
    statusMessage.textContent = '';
  }, 0);
});

document
  .getElementById('saveButton')
  .addEventListener('click', saveCurrentCase);
document.getElementById('printButton').addEventListener('click', async () => {
  try {
    await FIR.request('/me');
    window.print();
  } catch (error) {
    statusMessage.textContent = error.message;
  }
});

form.addEventListener('input', () => {
  if (!currentCase) return;
  document.getElementById('saveButton').disabled = true;
  statusMessage.textContent =
    'Details changed. Analyze the incident again before saving.';
});

document
  .getElementById('searchSaved')
  .addEventListener('input', renderSavedCases);
document
  .getElementById('filterSaved')
  .addEventListener('change', renderSavedCases);

document
  .getElementById('savedCases')
  .addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const saved = readSavedCases();
    let item = saved.find((entry) => entry.id === id);
    if (!item) return;

    button.disabled = true;
    try {
      if (button.dataset.action === 'delete') {
        if (
          !confirm(
            `Archive case ${item.caseId}? It will leave the active list; the server retains the record.`,
          )
        )
          return;
        await FIR.request(`/cases/${id}`, 'DELETE', { version: item.version });
        if (currentCase?.id === id) form.reset();
        await refreshSavedCases();
        statusMessage.textContent = 'Case archived.';
        return;
      }

      item = (await FIR.request(`/cases/${id}`)).case;
      document.getElementById('caseId').value =
        item.caseId === 'Not provided' ? '' : item.caseId;
      document.getElementById('incidentDate').value = item.date || '';
      document.getElementById('location').value = item.location || '';
      document.getElementById('category').value = item.category || '';
      document.getElementById('description').value = item.description || '';
      document.getElementById('weapon').value = item.weapon || 'unknown';
      document.getElementById('threats').value = item.threats || 'unknown';
      document.getElementById('injury').value =
        item.injury === 'Not provided' ? '' : item.injury || '';

      currentCase = item;
      renderAnalysis(currentCase, analyzeIncident(currentCase));
      setFormEditable();
      statusMessage.textContent =
        currentUser.role === 'admin'
          ? 'Case loaded for police review.'
          : 'Your saved case is loaded.';
      document
        .getElementById('resultsSection')
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      statusMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });

document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await FIR.request('/logout', 'POST', {});
    FIR.sessionChanged();
    window.location.replace('/index.html');
  } catch (error) {
    document.getElementById('pageMessage').textContent = error.message;
  }
});

async function initializeDashboard() {
  try {
    const result = await FIR.request('/me');
    currentUser = result.user;
    FIR.setUser(currentUser);
    const police = currentUser.role === 'admin';
    document.getElementById('signedInUser').textContent =
      `${currentUser.name} · ${police ? 'Police administrator' : 'Citizen'}`;
    document.getElementById('dashboardTitle').textContent = police
      ? 'Police case dashboard'
      : 'My incident records';
    document.getElementById('savedHeading').textContent = police
      ? 'All citizen and police cases'
      : 'My saved cases';
    document.getElementById('incidentDate').max = new Date()
      .toISOString()
      .slice(0, 10);
    await refreshSavedCases();
    document.getElementById('dashboardContent').hidden = false;
  } catch (error) {
    document.getElementById('pageMessage').textContent = error.message;
  }
}

initializeDashboard();
