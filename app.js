// =============================================================================
// SwimTimes App - app.js
// Lausanne Aquatique
// =============================================================================

// Les données des nageurs sont chargées depuis swimmers-data.json
// (généré automatiquement par GitHub Actions)

let swimmer = null;
let swimmersData = null;
let TIME_STANDARDS = null;
let CATEGORIES = null;
let STROKES = null;
let DISTANCES = null;

// =============================================================================
// FINA POINTS 2025 - Base times (en secondes)
// Source: World Aquatics Points Table 2025
// =============================================================================
const FINA_BASE_TIMES = {
    Female: {
        "50m": {
            "50_Freestyle": 23.04,
            "100_Freestyle": 50.25,
            "200_Freestyle": 110.31,
            "400_Freestyle": 231.32,
            "800_Freestyle": 476.46,
            "1500_Freestyle": 912.56,
            "50_Backstroke": 26.01,
            "100_Backstroke": 55.75,
            "200_Backstroke": 120.90,
            "50_Breaststroke": 28.56,
            "100_Breaststroke": 62.36,
            "200_Breaststroke": 134.57,
            "50_Butterfly": 24.38,
            "100_Butterfly": 54.08,
            "200_Butterfly": 120.43,
            "200_Medley": 124.40,
            "400_Medley": 263.16
        },
        "25m": {
            "50_Freestyle": 22.67,
            "100_Freestyle": 49.46,
            "200_Freestyle": 109.34,
            "400_Freestyle": 230.30,
            "800_Freestyle": 474.30,
            "1500_Freestyle": 918.01,
            "50_Backstroke": 25.25,
            "100_Backstroke": 54.08,
            "200_Backstroke": 118.37,
            "50_Breaststroke": 28.04,
            "100_Breaststroke": 61.55,
            "200_Breaststroke": 133.32,
            "50_Butterfly": 24.02,
            "100_Butterfly": 53.36,
            "200_Butterfly": 118.94,
            "100_Medley": 56.51,
            "200_Medley": 122.98,
            "400_Medley": 261.68
        }
    },
    Male: {
        "50m": {
            "50_Freestyle": 20.42,
            "100_Freestyle": 44.84,
            "200_Freestyle": 100.22,
            "400_Freestyle": 217.13,
            "800_Freestyle": 452.12,
            "1500_Freestyle": 870.36,
            "50_Backstroke": 23.22,
            "100_Backstroke": 50.34,
            "200_Backstroke": 110.05,
            "50_Breaststroke": 25.60,
            "100_Breaststroke": 55.28,
            "200_Breaststroke": 120.16,
            "50_Butterfly": 21.93,
            "100_Butterfly": 48.24,
            "200_Butterfly": 108.21,
            "200_Medley": 113.13,
            "400_Medley": 241.42
        },
        "25m": {
            "50_Freestyle": 20.08,
            "100_Freestyle": 44.07,
            "200_Freestyle": 98.63,
            "400_Freestyle": 214.64,
            "800_Freestyle": 449.76,
            "1500_Freestyle": 858.24,
            "50_Backstroke": 22.43,
            "100_Backstroke": 48.48,
            "200_Backstroke": 107.16,
            "50_Breaststroke": 24.88,
            "100_Breaststroke": 54.56,
            "200_Breaststroke": 119.11,
            "50_Butterfly": 21.42,
            "100_Butterfly": 47.34,
            "200_Butterfly": 107.00,
            "100_Medley": 50.20,
            "200_Medley": 111.23,
            "400_Medley": 239.85
        }
    }
};

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

function calculateFinaPoints(timeMs, gender, poolLength, stroke, distance) {
    const poolKey = poolLength === 25 ? '25m' : '50m';
    const eventKey = `${distance}_${stroke}`;
    const baseTime = FINA_BASE_TIMES?.[gender]?.[poolKey]?.[eventKey];
    
    if (!baseTime || !timeMs) return null;
    
    const timeSec = timeMs / 1000;
    const points = Math.round(1000 * Math.pow(baseTime / timeSec, 3));
    return points;
}

// =============================================================================
// SWIMMERS DATA (depuis GitHub - mis à jour automatiquement chaque jour)
// =============================================================================
const SWIMMERS_DATA_URL = 'https://raw.githubusercontent.com/smarsys/Swimtimes/main/swimmers-data.json';

async function loadSwimmersData() {
    if (swimmersData) return swimmersData;
    
    try {
        const response = await fetch(SWIMMERS_DATA_URL);
        if (!response.ok) throw new Error('Fichier non trouvé');
        swimmersData = await response.json();
        console.log('✅ Données nageurs chargées:', swimmersData._metadata?.generated);
        return swimmersData;
    } catch (err) {
        console.log('ℹ️ swimmers-data.json non disponible');
        return null;
    }
}

async function fetchSwimmerData(athleteId) {
    const data = await loadSwimmersData();
    
    if (data?.swimmers?.[athleteId]) {
        return data.swimmers[athleteId];
    }
    
    throw new Error(`Nageur ${athleteId} non trouvé. Ajoutez cet ID dans athletes.txt et relancez le workflow GitHub.`);
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
                <p style="opacity:.7">Sélectionne ton profil</p>
            </div>
            <div class="form-group">
                <label class="form-label">Nageur</label>
                <select id="swimmer-selector" class="form-select" onchange="handleSwimmerSelect(this.value)">
                    <option value="">-- Choisir un nageur --</option>
                </select>
            </div>
            <div id="profile-error"></div>
            <div class="help-box">
                <h4>💡 Comment ça marche ?</h4>
                <ol>
                    <li>Les données sont synchronisées automatiquement chaque jour</li>
                    <li>Pour ajouter un nageur, modifie <code>athletes.txt</code> sur GitHub</li>
                    <li>Les temps limites sont mis à jour chaque saison</li>
                </ol>
            </div>
        `;
        loadSwimmerSelector();
    } else {
        const initials = (swimmer.firstName?.[0] || '') + (swimmer.lastName?.[0] || '');
        const age = swimmer.yearOfBirth ? (new Date().getFullYear() - swimmer.yearOfBirth) : null;
        
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
                    <div><div class="profile-stat-value">${swimmer.nation || '🇨🇭'}</div><div class="profile-stat-label">Nation</div></div>
                    <div><div class="profile-stat-value">${age ? age + ' ans' : '—'}</div><div class="profile-stat-label">Âge</div></div>
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

async function loadSwimmerSelector() {
    const selector = document.getElementById('swimmer-selector');
    if (!selector) return;
    
    const data = await loadSwimmersData();
    
    if (!data?.swimmers || Object.keys(data.swimmers).length === 0) {
        selector.innerHTML = `<option value="">Aucun nageur configuré</option>`;
        return;
    }
    
    const swimmers = Object.values(data.swimmers);
    
    selector.innerHTML = `
        <option value="">-- Choisir un nageur --</option>
        ${swimmers.map(s => `
            <option value="${s.id}">${s.fullName} (${s.club || 'N/A'}) - ${s.personalBests?.length || 0} PBs</option>
        `).join('')}
    `;
}

async function handleSwimmerSelect(athleteId) {
    if (!athleteId) return;
    
    try {
        swimmer = await fetchSwimmerData(athleteId);
        localStorage.setItem('swimmer_profile', JSON.stringify(swimmer));
        localStorage.setItem('athlete_id', athleteId);
        
        document.getElementById('header-user').textContent = swimmer.firstName;
        document.getElementById('select-gender').value = swimmer.gender || 'Female';
        
        renderProfileTab();
        updateSwimmerInfoBar();
        setTimeout(() => showTab('times'), 500);
    } catch (err) {
        document.getElementById('profile-error').innerHTML = `<div class="error-box">⚠️ ${err.message}</div>`;
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
        updateSwimmerInfoBar();
        setTimeout(() => showTab('times'), 1000);
    } catch (err) {
        errorDiv.innerHTML = `<div class="error-box">⚠️ ${err.message}</div>`;
        btn.disabled = false;
        btn.innerHTML = `Charger mon profil`;
    }
}

async function refreshProfile() {
    if (!swimmer) return;
    swimmersData = null; // Force reload
    try {
        swimmer = await fetchSwimmerData(swimmer.id);
        localStorage.setItem('swimmer_profile', JSON.stringify(swimmer));
        renderProfileTab();
        updateSwimmerInfoBar();
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
    updateSwimmerInfoBar();
}

function updateSwimmerInfoBar() {
    const container = document.getElementById('swimmer-info-bar');
    if (!container) return;
    
    if (!swimmer) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    const initials = (swimmer.firstName?.[0] || '') + (swimmer.lastName?.[0] || '');
    const age = swimmer.yearOfBirth ? (new Date().getFullYear() - swimmer.yearOfBirth) : null;
    
    container.style.display = 'flex';
    container.innerHTML = `
        <div class="swimmer-info-avatar">${initials}</div>
        <div class="swimmer-info-details">
            <div class="swimmer-info-name">${swimmer.fullName}</div>
            <div class="swimmer-info-meta">${swimmer.club || ''} ${age ? '• ' + age + ' ans' : ''} ${swimmer.nation ? '• ' + swimmer.nation : ''}</div>
        </div>
    `;
}

function updateTimesDisplay() {
    if (!TIME_STANDARDS) return;
    
    // Presélectionner le genre du nageur sélectionné
    if (swimmer?.gender) {
        document.getElementById('select-gender').value = swimmer.gender;
    }
    
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
    
    // Update swimmer info bar
    updateSwimmerInfoBar();
    
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
        const finaPoints = calculateFinaPoints(pb.timeMs, gender, poolLengthNum, stroke, parseInt(actualDistance));
        pbTime.innerHTML = `${pb.timeDisplay} <span style="font-size:14px;opacity:.6">${finaPoints ? finaPoints + ' pts FINA' : ''}</span>`;
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
        
        // Calculate current FINA points
        const currentFinaPoints = calculateFinaPoints(pb.timeMs, gender, pb.poolLength, pb.stroke, pb.distance);
        
        let bestQualified = null;
        let nextTarget = null;
        let smallestFinaGap = Infinity;
        
        Object.entries(standards).forEach(([cat, time]) => {
            const limitMs = timeToMs(time);
            const diff = pb.timeMs - limitMs;
            
            // Calculate FINA points for the target time
            const targetFinaPoints = calculateFinaPoints(limitMs, gender, pb.poolLength, pb.stroke, pb.distance);
            const finaGap = targetFinaPoints && currentFinaPoints ? targetFinaPoints - currentFinaPoints : Infinity;
            
            if (diff <= 0) {
                if (!bestQualified || categoryOrder.indexOf(cat) < categoryOrder.indexOf(bestQualified)) {
                    bestQualified = cat;
                }
            } else if (finaGap < smallestFinaGap) {
                smallestFinaGap = finaGap;
                nextTarget = { category: cat, gap: diff, time, finaGap, targetFinaPoints };
            }
        });
        
        return {
            ...pb,
            currentFinaPoints,
            bestQualified,
            nextTarget,
            eventName: `${pb.distance}m ${STROKES?.[pb.stroke]?.abbr || pb.stroke} ${pb.poolLength === 25 ? 'PB' : 'GB'}`
        };
    });
    
    const qualified = analysis.filter(a => a.bestQualified);
    // Sort by FINA points gap (smallest first = closest to qualifying)
    const objectives = analysis
        .filter(a => a.nextTarget && a.nextTarget.finaGap !== Infinity)
        .sort((a, b) => a.nextTarget.finaGap - b.nextTarget.finaGap);
    
    container.innerHTML = `
        <div class="progress-summary">
            <div class="progress-card green"><div class="progress-value">${qualified.length}</div><div class="progress-label">Qualifications</div></div>
            <div class="progress-card yellow"><div class="progress-value">${objectives.length}</div><div class="progress-label">Objectifs</div></div>
        </div>
        
        ${objectives.length > 0 ? `
            <div style="margin-bottom:24px">
                <div class="section-title">🎯 Prochains objectifs (par écart FINA)</div>
                ${objectives.slice(0, 5).map(item => `
                    <div class="objective-card">
                        <div class="objective-header">
                            <div>
                                <div class="objective-event">${item.eventName}</div>
                                <div class="objective-current">Actuel: ${item.timeDisplay} (${item.currentFinaPoints || '—'} pts)</div>
                            </div>
                            <div style="text-align:right">
                                <div class="objective-gap">+${item.nextTarget.finaGap} pts</div>
                                <div class="objective-target">${CATEGORIES?.[item.nextTarget.category]?.name || item.nextTarget.category}</div>
                                <div class="objective-fina">Objectif: ${item.nextTarget.time} (${item.nextTarget.targetFinaPoints} pts)</div>
                            </div>
                        </div>
                        <div class="progress-bar"><div class="progress-bar-fill" style="width:${Math.min(95, Math.max(10, (item.currentFinaPoints / item.nextTarget.targetFinaPoints) * 100))}%"></div></div>
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
    updateSwimmerInfoBar();
    updateTimesDisplay();
});
