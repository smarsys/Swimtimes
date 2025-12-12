// =============================================================================
// SwimTimes App - app.js
// =============================================================================

let swimmer = null;
let TIME_STANDARDS = null;
let CATEGORIES = null;
let STROKES = null;
let DISTANCES = null;

// =============================================================================
// LOAD TIME STANDARDS FROM JSON
// =============================================================================
async function loadTimeStandards() {
    try {
        const response = await fetch('temps-limites.json');
        if (!response.ok) throw new Error('Fichier non trouvé');
        
        const data = await response.json();
        TIME_STANDARDS = { Female: data.Female, Male: data.Male };
        CATEGORIES = data.categories;
        STROKES = data.strokes;
        DISTANCES = data.distances;
        
        console.log('✅ Temps limites chargés:', data._metadata?.version);
        return true;
    } catch (err) {
        console.error('❌ Erreur chargement temps-limites.json:', err);
        alert('Erreur: Impossible de charger les temps limites. Vérifiez que temps-limites.json est présent.');
        return false;
    }
}

// =============================================================================
// UTILITIES
// =============================================================================
function timeToMs(timeStr) {
    if (!timeStr) return null;
    const clean = timeStr.replace(',', '.').trim();
    
    if (clean.includes(':')) {
        const [min, secPart] = clean.split(':');
        const [sec, centi] = secPart.split('.');
        return (parseInt(min) * 60 + parseInt(sec)) * 1000 + (parseInt(centi) || 0) * 10;
    } else {
        const parts = clean.split('.');
        return parseInt(parts[0]) * 1000 + (parseInt(parts[1]) || 0) * 10;
    }
}

function formatDiff(diffMs) {
    if (diffMs === null) return '';
    const diffSec = diffMs / 1000;
    const sign = diffSec > 0 ? '+' : '';
    return `${sign}${diffSec.toFixed(2)}s`;
}

// =============================================================================
// SWIMRANKINGS FETCH
// =============================================================================
async function fetchSwimmerData(athleteId) {
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const targetUrl = `https://www.swimrankings.net/index.php?page=athleteDetail&athleteId=${athleteId}`;
    
    const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
    
    const html = await response.text();
    return parseSwimRankingsHTML(html, athleteId);
}

function parseSwimRankingsHTML(html, athleteId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    let fullName = 'Nageur';
    const nameElem = doc.querySelector('td.name') || doc.querySelector('h1');
    if (nameElem) fullName = nameElem.textContent.trim();
    else {
        const title = doc.querySelector('title');
        if (title) fullName = title.textContent.replace('SwimRankings.net -', '').trim();
    }
    
    let club = '', nation = '', yearOfBirth = null, gender = '';
    
    doc.querySelectorAll('table tr').forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
            const label = cells[0].textContent.toLowerCase();
            const value = cells[1].textContent.trim();
            if (label.includes('club')) club = value;
            if (label.includes('nation') || label.includes('country')) nation = value;
            if (label.includes('birth') || label.includes('born')) {
                const m = value.match(/\d{4}/);
                if (m) yearOfBirth = parseInt(m[0]);
            }
        }
    });
    
    const pageText = html.toLowerCase();
    gender = (pageText.includes('women') || pageText.includes('female') || pageText.includes('damen')) ? 'Female' : 'Male';
    
    const personalBests = [];
    let currentPoolLength = 50;
    
    doc.querySelectorAll('table').forEach(table => {
        const text = table.textContent.toLowerCase();
        if (text.includes('short course') || text.includes('25m')) currentPoolLength = 25;
        else if (text.includes('long course') || text.includes('50m')) currentPoolLength = 50;
        
        let currentStroke = null;
        
        table.querySelectorAll('tr').forEach(row => {
            const th = row.querySelector('th');
            if (th) {
                const t = th.textContent.toLowerCase();
                if (t.includes('free')) currentStroke = 'Freestyle';
                else if (t.includes('back') || t.includes('dos')) currentStroke = 'Backstroke';
                else if (t.includes('breast') || t.includes('brasse')) currentStroke = 'Breaststroke';
                else if (t.includes('fly') || t.includes('pap')) currentStroke = 'Butterfly';
                else if (t.includes('medley') || t.includes('4 n') || t.includes('lagen')) currentStroke = 'Medley';
                return;
            }
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const first = cells[0].textContent.trim();
                const match = first.match(/^(\d+)/);
                
                if (match) {
                    const distance = parseInt(match[1]);
                    let stroke = currentStroke;
                    
                    const firstLower = first.toLowerCase();
                    if (firstLower.includes('free')) stroke = 'Freestyle';
                    else if (firstLower.includes('back') || firstLower.includes('dos')) stroke = 'Backstroke';
                    else if (firstLower.includes('breast') || firstLower.includes('brasse')) stroke = 'Breaststroke';
                    else if (firstLower.includes('fly') || firstLower.includes('pap')) stroke = 'Butterfly';
                    else if (firstLower.includes('medley') || firstLower.includes('4 n')) stroke = 'Medley';
                    
                    if (!stroke) return;
                    
                    for (let i = 1; i < cells.length; i++) {
                        const cellText = cells[i].textContent.trim();
                        if (/^\d{1,2}:\d{2}\.\d{2}$/.test(cellText) || /^\d{2}\.\d{2}$/.test(cellText)) {
                            const timeMs = timeToMs(cellText);
                            if (timeMs > 0) {
                                const exists = personalBests.find(pb => 
                                    pb.stroke === stroke && pb.distance === distance && pb.poolLength === currentPoolLength
                                );
                                if (!exists) {
                                    personalBests.push({ stroke, distance, poolLength: currentPoolLength, timeMs, timeDisplay: cellText });
                                }
                            }
                            break;
                        }
                    }
                }
            }
        });
    });
    
    const nameParts = fullName.split(' ');
    
    return {
        id: athleteId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        fullName, gender, club, nation, yearOfBirth, personalBests,
        lastUpdated: new Date().toISOString()
    };
}

// =============================================================================
// UI FUNCTIONS
// =============================================================================
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).classList.add('active');
    document.querySelector(`.nav-tab[data-tab="${tabId}"]`).classList.add('active');
    
    if (tabId === 'times') updateTimesDisplay();
    if (tabId === 'progress') updateProgressDisplay();
}

function renderProfileTab() {
    const container = document.getElementById('tab-profile');
    
    if (!swimmer) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px 0">
                <div class="profile-avatar">🏊</div>
                <h2 style="font-size:24px;margin-bottom:8px">Bienvenue !</h2>
                <p style="opacity:.7">Entre ton ID SwimRankings pour synchroniser tes temps</p>
            </div>
            <form onsubmit="handleProfileSubmit(event)">
                <div class="form-group">
                    <label class="form-label">ID SwimRankings</label>
                    <input type="text" id="athlete-id-input" class="form-input" placeholder="ex: 5332548" value="${localStorage.getItem('athlete_id') || ''}">
                    <p class="form-hint">Trouve ton ID dans l'URL de ta page SwimRankings:<br>swimrankings.net/...athleteId=<strong>XXXXXX</strong></p>
                </div>
                <div id="profile-error"></div>
                <button type="submit" class="btn btn-primary" id="profile-submit-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Charger mon profil
                </button>
            </form>
            <div class="help-box">
                <h4>🎯 Comment trouver mon ID ?</h4>
                <ol>
                    <li>Va sur <a href="https://www.swimrankings.net" target="_blank">swimrankings.net</a></li>
                    <li>Recherche ton nom</li>
                    <li>Clique sur ton profil</li>
                    <li>Copie le nombre après "athleteId=" dans l'URL</li>
                </ol>
            </div>
        `;
    } else {
        const initials = (swimmer.firstName?.[0] || '') + (swimmer.lastName?.[0] || '');
        container.innerHTML = `
            <div class="card">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
                    <div class="profile-avatar-small">${initials}</div>
                    <div style="flex:1">
                        <div style="font-size:20px;font-weight:700">${swimmer.fullName}</div>
                        <div style="opacity:.7;font-size:14px">${swimmer.club || ''}</div>
                    </div>
                    <button class="btn-icon" onclick="refreshProfile()" title="Actualiser">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    </button>
                </div>
                <div class="profile-stats">
                    <div><div class="profile-stat-value">${swimmer.personalBests?.length || 0}</div><div class="profile-stat-label">Records</div></div>
                    <div><div class="profile-stat-value">${swimmer.nation || '—'}</div><div class="profile-stat-label">Nation</div></div>
                    <div><div class="profile-stat-value">${swimmer.yearOfBirth || '—'}</div><div class="profile-stat-label">Année</div></div>
                </div>
                <div style="font-size:12px;opacity:.5">ID: ${swimmer.id} • Mis à jour: ${new Date(swimmer.lastUpdated).toLocaleDateString('fr-CH')}</div>
            </div>
            <div class="card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:600">🏅 Mes Records Personnels</div>
                ${renderPBsByPool(50, 'Grand Bassin (50m)')}
                ${renderPBsByPool(25, 'Petit Bassin (25m)')}
            </div>
            <button class="btn btn-secondary" onclick="clearProfile()" style="margin-top:8px">Changer de profil</button>
        `;
    }
}

function renderPBsByPool(poolLength, title) {
    const pbs = swimmer?.personalBests?.filter(pb => pb.poolLength === poolLength) || [];
    if (pbs.length === 0) return '';
    
    return `
        <div style="margin-bottom:16px">
            <div style="font-size:13px;opacity:.6;margin-bottom:8px">${title}</div>
            <div class="pb-grid">
                ${pbs.map(pb => `
                    <div class="pb-item">
                        <div class="pb-item-event">${pb.distance}m ${STROKES?.[pb.stroke]?.abbr || pb.stroke}</div>
                        <div class="pb-item-time">${pb.timeDisplay}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('athlete-id-input');
    const athleteId = input.value.trim();
    if (!athleteId) return;
    
    const btn = document.getElementById('profile-submit-btn');
    const errorDiv = document.getElementById('profile-error');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Chargement...';
    errorDiv.innerHTML = '';
    
    try {
        swimmer = await fetchSwimmerData(athleteId);
        localStorage.setItem('swimmer_profile', JSON.stringify(swimmer));
        localStorage.setItem('athlete_id', athleteId);
        
        document.getElementById('header-user').textContent = swimmer.firstName;
        document.getElementById('select-gender').value = swimmer.gender || 'Female';
        
        renderProfileTab();
        setTimeout(() => showTab('times'), 1000);
    } catch (err) {
        errorDiv.innerHTML = `<div class="error-box">⚠️ ${err.message}</div>`;
        btn.disabled = false;
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Charger mon profil`;
    }
}

async function refreshProfile() {
    if (!swimmer) return;
    try {
        swimmer = await fetchSwimmerData(swimmer.id);
        localStorage.setItem('swimmer_profile', JSON.stringify(swimmer));
        renderProfileTab();
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

function clearProfile() {
    swimmer = null;
    localStorage.removeItem('swimmer_profile');
    localStorage.removeItem('athlete_id');
    document.getElementById('header-user').textContent = '';
    renderProfileTab();
}

function updateTimesDisplay() {
    if (!TIME_STANDARDS) return;
    
    const gender = document.getElementById('select-gender').value;
    const poolLength = document.getElementById('select-pool').value;
    const stroke = document.getElementById('select-stroke').value;
    const distance = document.getElementById('select-distance').value;
    
    // Update available distances
    const distSelect = document.getElementById('select-distance');
    const availableDistances = DISTANCES?.[stroke] || [50, 100, 200];
    const currentDistance = distSelect.value;
    
    distSelect.innerHTML = availableDistances.map(d => 
        `<option value="${d}" ${d == currentDistance ? 'selected' : ''}>${d}m</option>`
    ).join('');
    
    if (!availableDistances.includes(parseInt(currentDistance))) {
        distSelect.value = availableDistances[0];
    }
    
    const actualDistance = distSelect.value;
    
    // Find PB
    const poolLengthNum = poolLength === '50m' ? 50 : 25;
    const pb = swimmer?.personalBests?.find(p => 
        p.stroke === stroke && 
        p.distance === parseInt(actualDistance) && 
        p.poolLength === poolLengthNum
    );
    
    // Update PB display
    const pbDisplay = document.getElementById('pb-display');
    const pbTime = document.getElementById('pb-time');
    
    if (pb) {
        pbDisplay.classList.remove('empty');
        pbTime.textContent = pb.timeDisplay;
    } else {
        pbDisplay.classList.add('empty');
        pbTime.innerHTML = swimmer ? '<span style="font-size:14px;opacity:.5">Pas encore de temps</span>' : '—';
    }
    
    // Get standards from JSON
    const eventKey = `${actualDistance}_${stroke}`;
    const poolData = TIME_STANDARDS?.[gender]?.[poolLength];
    const standards = poolData?.[eventKey] || {};
    
    // Build table
    const tableContainer = document.getElementById('times-table');
    
    if (Object.keys(standards).length === 0) {
        tableContainer.innerHTML = '<div style="text-align:center;padding:40px;opacity:.5">Pas de temps limites pour cette épreuve</div>';
        return;
    }
    
    const rows = Object.entries(standards)
        .map(([cat, time]) => {
            const limitMs = timeToMs(time);
            const pbMs = pb?.timeMs;
            const diffMs = (pbMs && limitMs) ? pbMs - limitMs : null;
            
            let status = '';
            if (diffMs !== null) {
                if (diffMs <= 0) status = 'qualified';
                else if (diffMs <= 1000) status = 'close';
                else status = 'far';
            }
            
            return { 
                cat, time, limitMs, diffMs, status, 
                info: CATEGORIES?.[cat] || { name: cat, icon: '🏊' }
            };
        })
        .sort((a, b) => b.limitMs - a.limitMs); // Slowest first (easiest)
    
    tableContainer.innerHTML = `
        <table>
            <thead><tr><th>Compétition</th><th>Limite</th><th>Écart</th></tr></thead>
            <tbody>
                ${rows.map(row => `
                    <tr class="${row.cat.includes('JO') ? 'olympic' : ''}">
                        <td><div class="comp-name"><span>${row.info?.icon || ''}</span><span>${row.info?.name || row.cat}</span></div></td>
                        <td>${row.time}</td>
                        <td class="diff-${row.status}">${row.diffMs !== null ? (row.status === 'qualified' ? '✓ ' : '') + formatDiff(row.diffMs) : '—'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateProgressDisplay() {
    const container = document.getElementById('progress-content');
    
    if (!swimmer || !swimmer.personalBests?.length || !TIME_STANDARDS) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📈</div>
                <h3 style="margin-bottom:8px">Pas encore de données</h3>
                <p style="opacity:.6;font-size:14px">Configure ton profil pour voir ta progression</p>
            </div>
        `;
        return;
    }
    
    const gender = swimmer.gender || 'Female';
    const categoryOrder = ['JO_A', 'JO_B', 'CS', 'RSR_Ete', 'RSR_Hiver'];
    
    const analysis = swimmer.personalBests.map(pb => {
        const poolKey = pb.poolLength === 25 ? '25m' : '50m';
        const eventKey = `${pb.distance}_${pb.stroke}`;
        const standards = TIME_STANDARDS?.[gender]?.[poolKey]?.[eventKey] || {};
        
        let bestQualified = null;
        let nextTarget = null;
        let smallestGap = Infinity;
        
        Object.entries(standards).forEach(([cat, time]) => {
            const limitMs = timeToMs(time);
            const diff = pb.timeMs - limitMs;
            
            if (diff <= 0) {
                if (!bestQualified || categoryOrder.indexOf(cat) < categoryOrder.indexOf(bestQualified)) {
                    bestQualified = cat;
                }
            } else if (diff < smallestGap) {
                smallestGap = diff;
                nextTarget = { category: cat, gap: diff, time };
            }
        });
        
        return {
            ...pb,
            bestQualified,
            nextTarget,
            eventName: `${pb.distance}m ${STROKES?.[pb.stroke]?.abbr || pb.stroke} ${pb.poolLength === 25 ? 'PB' : 'GB'}`
        };
    });
    
    const qualified = analysis.filter(a => a.bestQualified);
    const objectives = analysis.filter(a => a.nextTarget).sort((a, b) => a.nextTarget.gap - b.nextTarget.gap);
    
    container.innerHTML = `
        <div class="progress-summary">
            <div class="progress-card green"><div class="progress-value">${qualified.length}</div><div class="progress-label">Qualifications</div></div>
            <div class="progress-card yellow"><div class="progress-value">${objectives.length}</div><div class="progress-label">Objectifs</div></div>
        </div>
        
        ${objectives.length > 0 ? `
            <div style="margin-bottom:24px">
                <div class="section-title">🎯 Prochains objectifs</div>
                ${objectives.slice(0, 5).map(item => `
                    <div class="objective-card">
                        <div class="objective-header">
                            <div>
                                <div class="objective-event">${item.eventName}</div>
                                <div class="objective-current">Actuel: ${item.timeDisplay}</div>
                            </div>
                            <div style="text-align:right">
                                <div class="objective-gap">-${(item.nextTarget.gap / 1000).toFixed(2)}s</div>
                                <div class="objective-target">${CATEGORIES?.[item.nextTarget.category]?.name || item.nextTarget.category}</div>
                            </div>
                        </div>
                        <div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.max(10, 100 - item.nextTarget.gap / 100)}%"></div></div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        ${qualified.length > 0 ? `
            <div>
                <div class="section-title">🏆 Qualifications atteintes</div>
                <div class="qualification-grid">
                    ${qualified.map(item => `
                        <div class="qualification-item">
                            <div class="qualification-event">✓ ${item.eventName}</div>
                            <div class="qualification-level">${CATEGORIES?.[item.bestQualified]?.name || item.bestQualified}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

// =============================================================================
// INIT
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    await loadTimeStandards();
    
    const savedProfile = localStorage.getItem('swimmer_profile');
    if (savedProfile) {
        try {
            swimmer = JSON.parse(savedProfile);
            document.getElementById('header-user').textContent = swimmer.firstName;
            document.getElementById('select-gender').value = swimmer.gender || 'Female';
        } catch (e) {
            console.error('Error loading profile:', e);
        }
    }
    
    renderProfileTab();
    updateTimesDisplay();
});
