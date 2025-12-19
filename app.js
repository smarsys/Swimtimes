// =============================================================================
// SwimTimes App - app.js
// Lausanne Aquatique
// =============================================================================

let swimmer = null;
let swimmersData = null;
let TIME_STANDARDS = null;
let CATEGORIES = null;
let STROKES = null;
let DISTANCES = null;

// =============================================================================
// FINA 2025 BASE TIMES (from official World Aquatics table)
// Format: seconds (converted from mm:ss.cc)
// =============================================================================
const FINA_BASE_TIMES = {
    Male: {
        "25m": {
            "50_Freestyle": 19.90,
            "100_Freestyle": 44.84,
            "200_Freestyle": 98.61,
            "400_Freestyle": 212.25,
            "800_Freestyle": 440.46,
            "1500_Freestyle": 846.88,
            "50_Backstroke": 22.11,
            "100_Backstroke": 48.33,
            "200_Backstroke": 105.63,
            "50_Breaststroke": 24.95,
            "100_Breaststroke": 55.28,
            "200_Breaststroke": 120.16,
            "50_Butterfly": 21.32,
            "100_Butterfly": 47.71,
            "200_Butterfly": 106.85,
            "100_Medley": 49.28,
            "200_Medley": 108.88,
            "400_Medley": 234.81
        },
        "50m": {
            "50_Freestyle": 20.91,
            "100_Freestyle": 46.40,
            "200_Freestyle": 102.00,
            "400_Freestyle": 220.07,
            "800_Freestyle": 452.12,
            "1500_Freestyle": 870.67,
            "50_Backstroke": 23.55,
            "100_Backstroke": 51.60,
            "200_Backstroke": 111.92,
            "50_Breaststroke": 25.95,
            "100_Breaststroke": 56.88,
            "200_Breaststroke": 125.48,
            "50_Butterfly": 22.27,
            "100_Butterfly": 49.45,
            "200_Butterfly": 110.34,
            "200_Medley": 114.00,
            "400_Medley": 242.50
        }
    },
    Female: {
        "25m": {
            "50_Freestyle": 22.83,
            "100_Freestyle": 50.25,
            "200_Freestyle": 110.31,
            "400_Freestyle": 230.25,
            "800_Freestyle": 477.42,
            "1500_Freestyle": 908.24,
            "50_Backstroke": 25.23,
            "100_Backstroke": 54.02,
            "200_Backstroke": 118.04,
            "50_Breaststroke": 28.37,
            "100_Breaststroke": 62.36,
            "200_Breaststroke": 132.50,
            "50_Butterfly": 23.94,
            "100_Butterfly": 52.71,
            "200_Butterfly": 119.32,
            "100_Medley": 55.11,
            "200_Medley": 121.63,
            "400_Medley": 255.48
        },
        "50m": {
            "50_Freestyle": 23.61,
            "100_Freestyle": 51.71,
            "200_Freestyle": 112.23,
            "400_Freestyle": 235.38,
            "800_Freestyle": 484.79,
            "1500_Freestyle": 920.48,
            "50_Backstroke": 26.86,
            "100_Backstroke": 57.13,
            "200_Backstroke": 123.14,
            "50_Breaststroke": 29.16,
            "100_Breaststroke": 64.13,
            "200_Breaststroke": 137.55,
            "50_Butterfly": 24.43,
            "100_Butterfly": 55.18,
            "200_Butterfly": 121.81,
            "200_Medley": 126.12,
            "400_Medley": 264.38
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

function getNationFlag(nationCode) {
    if (!nationCode) return '🏊';
    const flags = {
        'SUI': '🇨🇭', 'FRA': '🇫🇷', 'GER': '🇩🇪', 'ITA': '🇮🇹', 'ESP': '🇪🇸',
        'GBR': '🇬🇧', 'USA': '🇺🇸', 'AUS': '🇦🇺', 'JPN': '🇯🇵', 'CHN': '🇨🇳',
        'BRA': '🇧🇷', 'CAN': '🇨🇦', 'NED': '🇳🇱', 'BEL': '🇧🇪', 'AUT': '🇦🇹',
        'POR': '🇵🇹', 'SWE': '🇸🇪', 'NOR': '🇳🇴', 'DEN': '🇩🇰', 'FIN': '🇫🇮',
        'POL': '🇵🇱', 'RUS': '🇷🇺', 'UKR': '🇺🇦', 'GRE': '🇬🇷', 'TUR': '🇹🇷',
        'RSA': '🇿🇦', 'MEX': '🇲🇽', 'ARG': '🇦🇷', 'KOR': '🇰🇷', 'IND': '🇮🇳'
    };
    return flags[nationCode.toUpperCase()] || '🏊';
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
    // FINA Points formula: Points = 1000 × (BaseTime / SwimmerTime)³
    const points = Math.round(1000 * Math.pow(baseTime / timeSec, 3));
    return points;
}

// =============================================================================
// SWIMMERS DATA (depuis GitHub - mis à jour automatiquement chaque jour)
// =============================================================================
const SWIMMERS_DATA_URL = 'https://raw.githubusercontent.com/smarsys/Swimtimes/main/swimmers-data.json';
const SWIMMERS_SEASON_URL = 'https://raw.githubusercontent.com/smarsys/Swimtimes/main/swimmers-season.json';

let swimmersSeasonData = null;

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

async function loadSwimmersSeasonData() {
    if (swimmersSeasonData) return swimmersSeasonData;
    
    try {
        const response = await fetch(SWIMMERS_SEASON_URL);
        if (!response.ok) throw new Error('Fichier non trouvé');
        swimmersSeasonData = await response.json();
        console.log('✅ Données saison chargées:', swimmersSeasonData._metadata?.season?.label);
        return swimmersSeasonData;
    } catch (err) {
        console.log('ℹ️ swimmers-season.json non disponible');
        return null;
    }
}

function getSeasonLabel() {
    return swimmersSeasonData?._metadata?.season?.label || 'Saison courante';
}

async function fetchSwimmerData(athleteId) {
    const data = await loadSwimmersData();
    const seasonData = await loadSwimmersSeasonData();
    
    if (data?.swimmers?.[athleteId]) {
        const swimmerData = data.swimmers[athleteId];
        // Attach season bests if available
        if (seasonData?.swimmers?.[athleteId]) {
            swimmerData.seasonBests = seasonData.swimmers[athleteId].seasonBests || [];
        } else {
            swimmerData.seasonBests = [];
        }
        return swimmerData;
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
                    <li>Les données sont synchronisées automatiquement chaque jour depuis SwimRankings</li>
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
                    <div><div class="profile-stat-value" style="font-size:40px">${getNationFlag(swimmer.nation)}</div><div class="profile-stat-label">${swimmer.nation || 'Nation'}</div></div>
                    <div><div class="profile-stat-value">${age ? age + ' ans' : '—'}</div><div class="profile-stat-label">Âge</div></div>
                </div>
                <div style="font-size:12px;opacity:.5">ID: ${swimmer.id} • Mis à jour: ${new Date(swimmer.lastUpdated).toLocaleDateString('fr-CH')}</div>
            </div>
            <button class="btn btn-secondary" onclick="clearProfile()" style="margin-bottom:16px">Changer de profil</button>
            <div class="card">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:600">🏅 Mes Records Personnels</div>
                ${renderPBsByPool(50, 'Grand Bassin (50m)')}
                ${renderPBsByPool(25, 'Petit Bassin (25m)')}
            </div>
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
        
        // Update gender selector based on swimmer profile
        const genderSelect = document.getElementById('select-gender');
        if (genderSelect && swimmer.gender) {
            genderSelect.value = swimmer.gender;
        }
        
        renderProfileTab();
        updateSwimmerInfoBar();
        updateTimesDisplay();
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

async function refreshProfile() {
    if (!swimmer) return;
    swimmersData = null; // Force reload
    try {
        swimmer = await fetchSwimmerData(swimmer.id);
        localStorage.setItem('swimmer_profile', JSON.stringify(swimmer));
        renderProfileTab();
        updateSwimmerInfoBar();
        alert('Profil actualisé !');
    } catch (err) {
        alert('Erreur: ' + err.message);
    }
}

function clearProfile() {
    swimmer = null;
    localStorage.removeItem('swimmer_profile');
    localStorage.removeItem('athlete_id');
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
    
    const age = swimmer.yearOfBirth ? (new Date().getFullYear() - swimmer.yearOfBirth) : null;
    
    container.style.display = 'flex';
    container.innerHTML = `
        <div class="swimmer-info-details">
            <div class="swimmer-info-name">${swimmer.fullName}</div>
            <div class="swimmer-info-meta">${swimmer.club || ''} ${age ? '• ' + age + ' ans' : ''} ${swimmer.nation ? '• ' + swimmer.nation : ''}</div>
        </div>
    `;
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
    
    // Update swimmer info bar (demande #5)
    updateSwimmerInfoBar();
    
    // Find PB (all-time) and Season Best
    const poolLengthNum = poolLength === '50m' ? 50 : 25;
    const pb = swimmer?.personalBests?.find(p => 
        p.stroke === stroke && 
        p.distance === parseInt(actualDistance) && 
        p.poolLength === poolLengthNum
    );
    const seasonBest = swimmer?.seasonBests?.find(p => 
        p.stroke === stroke && 
        p.distance === parseInt(actualDistance) && 
        p.poolLength === poolLengthNum
    );
    
    // Update PB display (show both PB and season)
    const pbDisplay = document.getElementById('pb-display');
    const pbTime = document.getElementById('pb-time');
    
    if (pb || seasonBest) {
        pbDisplay.classList.remove('empty');
        const displayTime = pb || seasonBest;
        const finaPoints = calculateFinaPoints(displayTime.timeMs, gender, poolLengthNum, stroke, parseInt(actualDistance));
        
        let pbHtml = '';
        if (pb) {
            pbHtml += `<div>PB: ${pb.timeDisplay}</div>`;
        }
        if (seasonBest) {
            const seasonLabel = getSeasonLabel();
            pbHtml += `<div style="font-size:14px;opacity:.8">${seasonLabel}: ${seasonBest.timeDisplay}</div>`;
        } else if (pb) {
            pbHtml += `<div style="font-size:12px;opacity:.5">Pas encore nagé cette saison</div>`;
        }
        if (finaPoints) {
            pbHtml += `<div style="font-size:12px;opacity:.6">${finaPoints} pts FINA</div>`;
        }
        pbTime.innerHTML = pbHtml;
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
        .filter(([cat, time]) => {
            // Filter by pool length - only show competitions matching selected pool
            const catInfo = CATEGORIES?.[cat];
            if (!catInfo || catInfo.poolLength === null) return true; // Show if no pool restriction
            return catInfo.poolLength === poolLengthNum;
        })
        .map(([cat, time]) => {
            const limitMs = timeToMs(time);
            const pbMs = pb?.timeMs;
            const seasonMs = seasonBest?.timeMs;
            
            // Calculate diffs
            const pbDiffMs = (pbMs && limitMs) ? pbMs - limitMs : null;
            const seasonDiffMs = (seasonMs && limitMs) ? seasonMs - limitMs : null;
            
            // Determine qualification status
            // qualified: season time under limit
            // pending: PB under limit but no season time yet (or season time above limit)
            // close: within 1 second
            // far: more than 1 second away
            let status = '';
            if (seasonDiffMs !== null && seasonDiffMs <= 0) {
                status = 'qualified';
            } else if (pbDiffMs !== null && pbDiffMs <= 0) {
                status = 'pending'; // PB is good but need to redo this season
            } else if (seasonDiffMs !== null) {
                status = seasonDiffMs <= 1000 ? 'close' : 'far';
            } else if (pbDiffMs !== null) {
                status = pbDiffMs <= 1000 ? 'close' : 'far';
            }
            
            return { 
                cat, time, limitMs, pbMs, seasonMs, pbDiffMs, seasonDiffMs, status, 
                info: CATEGORIES?.[cat] || { name: cat, icon: '🏊' }
            };
        })
        .sort((a, b) => b.limitMs - a.limitMs); // Slowest first (easiest)
    
    tableContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Compétition</th>
                    <th>Limite</th>
                    <th>PB</th>
                    <th>Saison</th>
                    <th>Statut</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr class="${row.cat.includes('JO') ? 'olympic' : ''}">
                        <td><div class="comp-name"><span>${row.info?.icon || ''}</span><span>${row.info?.name || row.cat}</span></div></td>
                        <td>${row.time}</td>
                        <td class="${row.pbDiffMs !== null && row.pbDiffMs <= 0 ? 'diff-qualified' : ''}">${row.pbMs ? formatTime(row.pbMs) : '—'}</td>
                        <td class="${row.seasonDiffMs !== null && row.seasonDiffMs <= 0 ? 'diff-qualified' : ''}">${row.seasonMs ? formatTime(row.seasonMs) : '—'}</td>
                        <td class="diff-${row.status}">${getStatusDisplay(row.status, row.seasonDiffMs, row.pbDiffMs)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function formatTime(timeMs) {
    if (!timeMs) return '—';
    const totalSeconds = timeMs / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
        return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
    }
    return seconds.toFixed(2);
}

function getStatusDisplay(status, seasonDiffMs, pbDiffMs) {
    switch (status) {
        case 'qualified':
            return `<span class="status-badge qualified">✓ Qualifié</span>`;
        case 'pending':
            return `<span class="status-badge pending">⏳ À refaire</span>`;
        case 'close':
            const diff = seasonDiffMs !== null ? seasonDiffMs : pbDiffMs;
            return `<span class="status-badge close">${formatDiff(diff)}</span>`;
        case 'far':
            const diffFar = seasonDiffMs !== null ? seasonDiffMs : pbDiffMs;
            return `<span class="status-badge far">${formatDiff(diffFar)}</span>`;
        default:
            return '—';
    }
}

function setProgressPool(pool) {
    const select = document.getElementById('select-progress-pool');
    if (select) select.value = pool;
    updateProgressDisplay();
}

function updateProgressDisplay() {
    const container = document.getElementById('progress-content');
    
    // Get selected pool from select dropdown
    const poolSelect = document.getElementById('select-progress-pool');
    const selectedPool = poolSelect?.value || '50m';
    const poolLengthNum = selectedPool === '50m' ? 50 : 25;
    
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
    const categoryOrder = ['JO_A', 'JO_B', 'CS', 'CS_Hiver', 'RSR_Ete', 'RSR_Hiver'];
    
    // Filter personal bests by selected pool length
    const filteredPBs = swimmer.personalBests.filter(pb => pb.poolLength === poolLengthNum);
    
    if (filteredPBs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏊</div>
                <h3 style="margin-bottom:8px">Pas de temps en ${selectedPool === '50m' ? 'grand' : 'petit'} bassin</h3>
                <p style="opacity:.6;font-size:14px">Aucun record personnel enregistré pour ce type de bassin</p>
            </div>
        `;
        return;
    }
    
    const analysis = filteredPBs.map(pb => {
        const poolKey = pb.poolLength === 25 ? '25m' : '50m';
        const eventKey = `${pb.distance}_${pb.stroke}`;
        const allStandards = TIME_STANDARDS?.[gender]?.[poolKey]?.[eventKey] || {};
        
        // Filter standards by pool length (only show competitions for matching pool)
        const standards = Object.fromEntries(
            Object.entries(allStandards).filter(([cat, time]) => {
                const catInfo = CATEGORIES?.[cat];
                if (!catInfo || catInfo.poolLength === null) return true;
                return catInfo.poolLength === pb.poolLength;
            })
        );
        
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
            } else if (finaGap < smallestFinaGap && finaGap > 0) {
                smallestFinaGap = finaGap;
                nextTarget = { category: cat, gap: diff, time, finaGap: Math.round(finaGap), targetFinaPoints };
            }
        });
        
        return {
            ...pb,
            currentFinaPoints,
            bestQualified,
            nextTarget,
            eventName: `${pb.distance}m ${STROKES?.[pb.stroke]?.abbr || pb.stroke}`
        };
    });
    
    const qualified = analysis.filter(a => a.bestQualified);
    // Sort by FINA points gap (smallest first = closest to qualifying) - demande #4
    const objectives = analysis
        .filter(a => a.nextTarget && a.nextTarget.finaGap !== Infinity && a.nextTarget.finaGap > 0)
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
// =============================================================================
// SEASONAL DEFAULT POOL
// Petit bassin: 1er août - 30 novembre
// Grand bassin: 1er décembre - 31 juillet
// =============================================================================
function getSeasonalDefaultPool() {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    
    // Petit bassin: août (8) à novembre (11)
    if (month >= 8 && month <= 11) {
        return '25m';
    }
    // Grand bassin: décembre (12) à juillet (7)
    return '50m';
}

function initializePoolSelectors() {
    const defaultPool = getSeasonalDefaultPool();
    
    // Set Times tab pool selector
    const timesPoolSelect = document.getElementById('select-pool');
    if (timesPoolSelect) timesPoolSelect.value = defaultPool;
    
    // Set Progression tab pool selector
    const progressPoolSelect = document.getElementById('select-progress-pool');
    if (progressPoolSelect) progressPoolSelect.value = defaultPool;
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadTimeStandards();
    await loadSwimmersSeasonData(); // Pre-load season data
    
    const savedProfile = localStorage.getItem('swimmer_profile');
    if (savedProfile) {
        try {
            swimmer = JSON.parse(savedProfile);
            document.getElementById('select-gender').value = swimmer.gender || 'Female';
            
            // Attach season bests if available
            const seasonData = await loadSwimmersSeasonData();
            if (seasonData?.swimmers?.[swimmer.id]) {
                swimmer.seasonBests = seasonData.swimmers[swimmer.id].seasonBests || [];
            }
        } catch (e) {
            console.error('Error loading profile:', e);
        }
    }
    
    // Initialize pool selectors based on season
    initializePoolSelectors();
    
    renderProfileTab();
    updateSwimmerInfoBar();
    updateTimesDisplay();
    updateProgressDisplay();
});
