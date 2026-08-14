// TRACE compliance engine — portfolio demo version
const attackforge = window.ATTACKFORGE_DATA;
const appOwners = attackforge.appOwners || [];
const owners = appOwners.map(app => ({ name: app.Owner.Name, email: app.Owner.Email, team: app.Team, title: app.Owner.Title, appId: app.AppID, appName: app.AppName, techLead: app.TechLead }));
const emailStorageKey = 'trace-email-activity';
const emailActivity = JSON.parse(localStorage.getItem(emailStorageKey) || '[]');

const severitySla = { Critical: 14, High: 30, Medium: 45, Low: 90, Info: 120 };
const projectIcons = ['G', 'N', 'P', 'A'];
const projectIconClasses = ['icon-ugsi', 'icon-pci', 'icon-soc', 'icon-cis'];
const TODAY = new Date('2026-08-13T00:00:00Z');

// Map original project names to portfolio-safe display names
const projectDisplayNames = {
  'USGCI 2026 - IDS_TFB_DI':    'GCI 2026 - IDS_Review',
  'SI 2026 - Network_Perimeter': 'NET 2026 - Network_Perimeter',
  'PCI 2026 - CardData_ENV':     'PAY 2026 - Payment_Systems',
  'ROPE 2026 - ExtApp_Review':   'APP 2026 - ExtApp_Review'
};

// Placeholder contract data keyed by display name
const contractPlaceholders = {
  'GCI 2026 - IDS_Review':         { contract: 'MSA-2026-GCI-001', cost: '$48,500' },
  'NET 2026 - Network_Perimeter':  { contract: 'MSA-2026-NET-003', cost: '$62,000' },
  'PAY 2026 - Payment_Systems':    { contract: 'MSA-2026-PAY-007', cost: '$55,200' },
  'APP 2026 - ExtApp_Review':      { contract: 'MSA-2026-APP-002', cost: '$41,750' }
};

const daysUntil = date => {
  if (!date) return null;
  return Math.ceil((new Date(date) - TODAY) / 86400000);
};
const projectPosture = project => Math.max(0, 100 - (project.CriticalOpen * 25) - (project.HighOpen * 15) - (project.MediumOpen * 10) - (project.LowOpen * 5) - (project.InfoOpen * 1));
const formatDate = dateStr => dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

function resolveApplication(finding, projectIndex) {
  const title = finding.FindingName.toLowerCase();
  const platformMatches = [
    [/ios|swift|snapshot/, 'APP-002'],
    [/android|kotlin|jetpack/, 'APP-003'],
    [/billing|invoice|payment|dunning/, 'APP-005'],
    [/crm|salesforce|customer relationship/, 'APP-006'],
    [/network|apache|http server|noc/, 'APP-004'],
    [/portal|web|xss|iframe|javascript/, 'APP-001']
  ];
  const match = platformMatches.find(([pattern]) => pattern.test(title));
  const app = appOwners.find(candidate => candidate.AppID === (match?.[1] || appOwners[projectIndex % Math.max(1, appOwners.length)]?.AppID));
  return { app, confidence: match ? 'Matched from finding title' : 'Project fallback' };
}

const buildTestsFromAttackforge = () => attackforge.projects.map((project, index) => {
  const projectFindings = attackforge.findings.filter(finding => finding.ProjectName === project.ProjectName);
  const score = projectPosture(project);
  const displayName = projectDisplayNames[project.ProjectName] || project.ProjectName;
  const contract = contractPlaceholders[displayName] || { contract: 'TBD', cost: 'TBD' };
  return {
    id: `attackforge-${index}`,
    name: displayName,
    label: `${project.ProjectStatus} security assessment`,
    icon: projectIcons[index % projectIcons.length],
    iconClass: projectIconClasses[index % projectIconClasses.length],
    score,
    status: project.OpenFindings ? 'Needs attention' : 'Healthy',
    controls: project.TotalFindings,
    passed: project.ClosedFindings,
    sla: 14,
    startDate: project.StartDate,
    endDate: project.EndDate,
    contract: contract.contract,
    cost: contract.cost,
    description: `Security assessment completed ${project.EndDate}; ${project.TotalAssets} asset${project.TotalAssets === 1 ? '' : 's'} assessed.`,
    findings: projectFindings.map(finding => {
      const rawDays = daysUntil(finding.SLADays);
      const days = rawDays !== null ? rawDays : severitySla[finding.Severity];
      const isOverdue = days < 0;
      const isDueSoon = days >= 0 && days <= 3;
      return {
        id: finding.AlternateID || finding.FindingID,
        title: finding.FindingName,
        description: finding.Description || `${finding.Severity} severity finding. CVSSv3: ${finding.CVSSv3 || 'N/A'}. Affected assets: ${finding.AffectedAssetCount || 0}.`,
        owner: resolveApplication(finding, index).app?.Owner.Name || 'Unassigned',
        application: resolveApplication(finding, index).app,
        ownerEmail: resolveApplication(finding, index).app?.Owner.Email || '',
        ownerTitle: resolveApplication(finding, index).app?.Owner.Title || '',
        team: resolveApplication(finding, index).app?.Team || 'Unassigned',
        ownerConfidence: resolveApplication(finding, index).confidence,
        days,
        isOverdue,
        isDueSoon,
        severity: finding.Severity.toLowerCase(),
        sourceId: finding.FindingID,
        slaStatus: finding.SLAStatus,
        slaDate: finding.SLADays
      };
    })
  };
});

let tests = buildTestsFromAttackforge();

const getTest = id => tests.find(test => test.id === id);
const initials = name => name.split(' ').map(part => part[0]).join('').slice(0, 2);
const allFindings = () => tests.flatMap(test => test.findings.map(finding => ({ ...finding, test })));
const showToast = message => { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };

function statusClass(status) { return status === 'Healthy' ? 'good' : 'warn'; }

function slaLabel(finding) {
  if (finding.isOverdue) return `${Math.abs(finding.days)} days overdue`;
  if (finding.days === 0) return 'Due today';
  return `${finding.days} days left`;
}

function slaClass(finding) {
  if (finding.isOverdue) return 'overdue';
  if (finding.isDueSoon) return 'due';
  return 'ok';
}

function statusPill(finding) {
  if (finding.isOverdue) return `<span class="status-pill urgent">Overdue</span>`;
  if (finding.isDueSoon) return `<span class="status-pill urgent">Due soon</span>`;
  return `<span class="status-pill warn">Open</span>`;
}

function renderTestCard(test) {
  return `<article class="test-card" data-test="${test.id}">
    <div class="test-card-top"><span class="test-icon ${test.iconClass}">${test.icon}</span><span class="status-pill ${statusClass(test.status)}">${test.status}</span></div>
    <h3>${test.name}</h3>
    <p>${test.label}</p>
    <div class="test-dates">${formatDate(test.startDate)} → ${formatDate(test.endDate)}</div>
    <div class="test-card-foot"><strong>${test.score}<small>/100</small></strong><span>${test.findings.length} open finding${test.findings.length === 1 ? '' : 's'}<br>${test.sla} day default SLA</span></div>
  </article>`;
}

function renderTests() {
  const html = tests.map(renderTestCard).join('');
  const averageScore = Math.round(tests.reduce((total, test) => total + test.score, 0) / Math.max(1, tests.length));
  document.getElementById('test-grid').innerHTML = html;
  document.getElementById('all-tests-grid').innerHTML = html;
  document.getElementById('overall-score').textContent = averageScore;
  document.getElementById('score-bar-fill').style.width = `${averageScore}%`;
  document.querySelector('.posture-card .status-pill').textContent = averageScore >= 80 ? 'Healthy' : 'Needs attention';
  document.querySelector('.posture-card .status-pill').className = `status-pill ${averageScore >= 80 ? 'good' : 'warn'}`;
  document.querySelector('.nav-item[data-view="tests"] .nav-count').textContent = tests.length;
  document.querySelectorAll('.test-card').forEach(card => card.addEventListener('click', () => openDetail(card.dataset.test)));
  renderExecutive();
}

function renderOwner(owner) { return `<div class="owner-cell"><span class="owner-avatar">${initials(owner.name)}</span><span>${owner.name}</span></div>`; }

function renderRow(item) {
  return `<tr>
    <td><span class="finding-name">${item.title}</span><span class="finding-id">${item.id}</span></td>
    <td>${item.test.name}</td>
    <td>${renderOwner({ name: item.owner })}<small class="owner-context">${item.application?.AppName || item.team}</small></td>
    <td><span class="sla-cell ${slaClass(item)}">${slaLabel(item)}</span></td>
    <td>${statusPill(item)}</td>
    <td><span class="contract-cell">${item.test.contract}</span></td>
    <td><span class="cost-cell">${item.test.cost}</span></td>
    <td><button class="row-action email-action" data-finding="${item.id}" title="Email owner" aria-label="Email owner">✉</button></td>
  </tr>`;
}

function renderQueue() {
  const findings = allFindings();
  const overdue = findings.filter(f => f.isOverdue).length;
  const dueSoon = findings.filter(f => f.isDueSoon).length;
  const onTrack = findings.filter(f => !f.isOverdue && !f.isDueSoon).length;
  const onTrackRate = Math.round((findings.length - overdue) / Math.max(1, findings.length) * 100);
  const rows = findings.sort((a, b) => a.days - b.days).map(renderRow).join('');
  document.getElementById('queue-table').innerHTML = rows;
  document.getElementById('full-queue-table').innerHTML = rows;
  document.querySelectorAll('.email-action').forEach(button => button.addEventListener('click', () => emailFinding(button.dataset.finding)));
  document.getElementById('open-findings').textContent = findings.length;
  document.getElementById('sla-rate').textContent = `${onTrackRate}%`;
  document.querySelectorAll('.stat-card .stat-meta')[0].textContent = `${overdue + dueSoon} need attention today`;
  document.querySelectorAll('.stat-card .stat-meta')[1].textContent = `${onTrack} of ${findings.length} findings`;
  document.querySelector('.nav-item[data-view="queue"] .nav-count').textContent = overdue + dueSoon;
  const ring = document.querySelector('.ring');
  ring.style.background = `conic-gradient(var(--teal) 0 ${onTrackRate}%, #DBEAFE ${onTrackRate}% 100%)`;
  ring.querySelector('span').textContent = `${onTrackRate}%`;
}

function renderExecutive() {
  const findings = allFindings();
  const overdue = findings.filter(f => f.isOverdue);
  const dueSoon = findings.filter(f => f.isDueSoon);
  const totalCost = Object.values(contractPlaceholders).reduce((sum, c) => sum + parseFloat(c.cost.replace(/[$,]/g, '')), 0);
  document.getElementById('exec-total-tests').textContent = tests.length;
  document.getElementById('exec-total-findings').textContent = findings.length;
  document.getElementById('exec-overdue').textContent = overdue.length;
  document.getElementById('exec-due-soon').textContent = dueSoon.length;
  document.getElementById('exec-total-cost').textContent = `$${totalCost.toLocaleString()}`;
  const rows = tests.map(test => {
    const testOverdue = test.findings.filter(f => f.isOverdue).length;
    const testDueSoon = test.findings.filter(f => f.isDueSoon).length;
    const slaStatus = testOverdue > 0 ? `<span class="status-pill urgent">${testOverdue} overdue</span>` :
                      testDueSoon > 0 ? `<span class="status-pill urgent">${testDueSoon} due soon</span>` :
                      `<span class="status-pill good">On track</span>`;
    return `<tr>
      <td><span class="finding-name">${test.name}</span></td>
      <td>${formatDate(test.startDate)}</td>
      <td>${formatDate(test.endDate)}</td>
      <td>${test.findings.length}</td>
      <td>${slaStatus}</td>
      <td><span class="contract-cell">${test.contract}</span></td>
      <td><span class="cost-cell">${test.cost}</span></td>
      <td><span class="status-pill good">✓ Sent</span></td>
    </tr>`;
  }).join('');
  document.getElementById('exec-portfolio-table').innerHTML = rows;
}

function renderOwners() { document.getElementById('owners-list').innerHTML = owners.map(owner => `<div class="owner-list-row">${renderOwner(owner)}<div><strong>${owner.email}</strong><small>${owner.title} · ${owner.team}</small></div><span class="owner-work">${allFindings().filter(finding => finding.owner === owner.name).length} open findings</span></div>`).join(''); }
function saveEmailActivity() { localStorage.setItem(emailStorageKey, JSON.stringify(emailActivity)); }
function activityStatusClass(status) { return status === 'Sent' ? 'good' : status === 'Follow-up due' ? 'urgent' : 'warn'; }
function renderEmailActivity() { const now = Date.now(); const due = emailActivity.filter(item => item.status !== 'Sent' && item.followUpAt && item.followUpAt <= now); due.forEach(item => { item.status = 'Follow-up due'; }); saveEmailActivity(); document.getElementById('activity-count').textContent = due.length; document.getElementById('email-activity-list').innerHTML = emailActivity.length ? emailActivity.slice().reverse().map(item => `<div class="activity-row"><div class="activity-icon">✉</div><div class="activity-main"><strong>${item.findingTitle}</strong><span>${item.ownerName} · ${item.appName}</span><small>${item.findingId} · Created ${new Date(item.createdAt).toLocaleString()}</small></div><span class="status-pill ${activityStatusClass(item.status)}">${item.status}</span><div class="activity-actions">${item.status !== 'Sent' ? `<button class="button secondary mark-sent" data-email-id="${item.id}">Mark sent</button><button class="button secondary mark-follow-up" data-email-id="${item.id}">Follow up tomorrow</button>` : `<span class="sent-time">Sent ${new Date(item.sentAt).toLocaleString()}</span>`}</div></div>`).join('') : '<div class="empty-activity"><strong>No email activity yet.</strong><span>Use Email owner on a finding to create a tracked draft.</span></div>'; document.querySelectorAll('.mark-sent').forEach(button => button.addEventListener('click', () => updateEmailActivity(button.dataset.emailId, { status: 'Sent', sentAt: Date.now(), followUpAt: null }))); document.querySelectorAll('.mark-follow-up').forEach(button => button.addEventListener('click', () => updateEmailActivity(button.dataset.emailId, { status: 'Follow-up scheduled', followUpAt: Date.now() + 86400000 }))); }
function updateEmailActivity(id, changes) { const item = emailActivity.find(activity => activity.id === id); if (!item) return; Object.assign(item, changes); saveEmailActivity(); renderEmailActivity(); showToast(`Email activity updated: ${item.status}`); }

function openDetail(id) {
  const test = getTest(id);
  if (!test) return;
  document.getElementById('detail-eyebrow').textContent = test.name;
  document.getElementById('detail-title').textContent = test.label;
  document.getElementById('detail-description').textContent = test.description;
  document.getElementById('detail-score-value').textContent = test.score;
  document.getElementById('detail-status').textContent = test.status;
  document.getElementById('detail-status').className = `status-pill ${statusClass(test.status)}`;
  document.getElementById('detail-controls').textContent = test.controls;
  document.getElementById('detail-passed').textContent = test.passed;
  document.getElementById('detail-open').textContent = test.findings.length;
  document.getElementById('detail-standard').textContent = test.name;
  document.getElementById('detail-sla').textContent = `${test.sla} days`;
  document.getElementById('detail-start-date').textContent = formatDate(test.startDate);
  document.getElementById('detail-end-date').textContent = formatDate(test.endDate);
  document.getElementById('detail-contract').textContent = test.contract;
  document.getElementById('detail-cost').textContent = test.cost;
  const passing = test.score;
  document.getElementById('detail-progress-label').textContent = `${passing}%`;
  document.getElementById('detail-progress-fill').style.width = `${passing}%`;
  document.getElementById('detail-findings').innerHTML = test.findings.length
    ? test.findings.map(finding => `<div class="finding-detail">
        <div>
          <h3>${finding.title}</h3>
          <p>${finding.id} · ${finding.owner} · <span class="${slaClass(finding)}-text">${slaLabel(finding)}</span></p>
          <p>${finding.description}</p>
        </div>
        <button class="button secondary email-action" data-finding="${finding.id}">✉ Email owner</button>
      </div>`).join('')
    : '<div class="empty-state">No open findings in this test.</div>';
  document.querySelectorAll('.email-action').forEach(button => button.addEventListener('click', () => emailFinding(button.dataset.finding)));
  navigate('detail');
}

function emailFinding(id) { const finding = allFindings().find(item => item.id === id); if (!finding) return; const owner = finding.application?.Owner || owners.find(person => person.name === finding.owner); const subject = `[${finding.test.name}] ${finding.id}: ${finding.title}`; const body = `Hi ${finding.owner.split(' ')[0]},\n\nA compliance finding needs your attention.\n\nFinding: ${finding.title}\nApplication: ${finding.application?.AppName || 'Unmatched application'}\nTest: ${finding.test.name}\nFinding ID: ${finding.id}\nSeverity: ${finding.severity}\nSLA: ${finding.test.sla} days\nTime remaining: ${finding.days} days\n\nDetails: ${finding.description}\n\nPlease reply with an update or remediation evidence before the SLA expires.\n\nThanks,\nSecurity Operations`; const activity = { id: `${finding.id}-${Date.now()}`, findingId: finding.id, findingTitle: finding.title, ownerName: finding.owner, ownerEmail: owner?.Email || finding.ownerEmail, appName: finding.application?.AppName || 'Unmatched application', subject, createdAt: Date.now(), status: 'Draft created', followUpAt: Date.now() + 172800000 }; emailActivity.push(activity); saveEmailActivity(); renderEmailActivity(); window.location.href = `mailto:${owner?.Email || finding.ownerEmail || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; showToast(`Draft addressed to ${finding.owner}`); }
function navigate(view) { document.querySelectorAll('.view').forEach(section => section.classList.remove('active-view')); const target = document.getElementById(`${view}-view`); if (target) target.classList.add('active-view'); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view)); document.getElementById('breadcrumb-label').textContent = view === 'detail' ? 'Test details' : view === 'executive' ? 'Executive summary' : view.charAt(0).toUpperCase() + view.slice(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function parseCsv(text) { const lines = text.trim().split(/\r?\n/); const headers = lines.shift().split(',').map(header => header.trim().toLowerCase()); return lines.map(line => { const values = line.split(',').map(value => value.trim()); return headers.reduce((record, header, index) => ({ ...record, [header]: values[index] || '' }), {}); }).filter(record => record.name && record.email); }

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
document.getElementById('import-button').addEventListener('click', () => navigate('imports'));
document.getElementById('json-file').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; document.getElementById('json-file-name').textContent = file.name; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (Array.isArray(data.tests)) { tests = data.tests; renderTests(); renderQueue(); renderOwners(); showToast(`Imported ${tests.length} compliance tests`); } else showToast('JSON needs a tests array'); } catch { showToast('Could not read that JSON file'); } }; reader.readAsText(file); });
document.getElementById('owner-file').addEventListener('change', event => { const file = event.target.files[0]; if (!file) return; document.getElementById('owner-file-name').textContent = file.name; const reader = new FileReader(); reader.onload = () => { const imported = parseCsv(reader.result); if (imported.length) { owners.splice(0, owners.length, ...imported); renderQueue(); renderOwners(); showToast(`Imported ${imported.length} owners`); } else showToast('CSV needs name and email columns'); }; reader.readAsText(file); });
document.getElementById('email-digest').addEventListener('click', () => { const subject = 'TRACE compliance queue digest'; const body = `Hi team,\n\nThere are ${allFindings().length} open compliance findings in the current queue. Please review your assigned findings and update evidence before each programmed SLA expires.\n\nThanks,\nSecurity Operations`; window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; });
document.getElementById('clear-email-activity').addEventListener('click', () => { emailActivity.splice(0, emailActivity.length); saveEmailActivity(); renderEmailActivity(); showToast('Email activity cleared'); });

renderTests(); renderQueue(); renderOwners(); renderEmailActivity();
