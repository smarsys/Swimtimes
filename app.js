// =============================================================================
// SwimTimes App - app.js
// Lausanne Aquatique
// =============================================================================

let profile = null;          // Profil v2 (localStorage)
let swimmer = null;          // Temps du nageur du profil
let swimmerDataStatus = 'loading'; // 'loading' | 'loaded' | 'not-found' | 'error'
let appReady = null;         // Promesse : temps limites chargés et sélecteurs initialisés
let swimmersSeasonData = null;
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
// Échappe une valeur avant injection via innerHTML (données saisies par l'utilisateur)
function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

// Initiales : première lettre du premier et du dernier mot ("Ava Hehlen" → "AH").
// Les mots sans lettre (émojis, ponctuation) sont ignorés ; une lettre donne un seul caractère ("ß" → "S").
function getInitials(name) {
    const words = String(name || '').split(/\s+/).filter(word => /\p{L}/u.test(word));
    if (words.length === 0) return '';
    const initial = word => [...word.match(/\p{L}/u)[0].toLocaleUpperCase('fr')][0];
    const first = initial(words[0]);
    const last = words.length > 1 ? initial(words[words.length - 1]) : '';
    return first + last;
}

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
// STOCKAGE LOCAL (v2) - profil et données de l'utilisateur
// =============================================================================
const STORAGE_KEYS = {
    profile: 'swimtimes_profile',
    pb: 'swimtimes_pb',
    season: 'swimtimes_season'
};

// Clés de SwimTimes v1 (profil choisi dans l'ancien sélecteur de nageur)
const LEGACY_KEYS = {
    profile: 'swimmer_profile',
    athleteId: 'athlete_id'
};

// Genre : profil v2 ("F"/"M") ↔ sélecteurs de l'app ("Female"/"Male")
const GENDER_TO_APP = { F: 'Female', M: 'Male' };

const PROFILE_FIELDS = ['name', 'swimrankingsId', 'gender', 'birthYear', 'club'];
const ATHLETE_ID_MAX_DIGITS = 10;
const BIRTH_YEAR_MIN = 1920;

// Règles de validation du profil : retournent un message d'erreur, ou '' si la valeur est valide
const PROFILE_VALIDATORS = {
    // Au moins une lettre : refuse les noms faits d'espaces ou de caractères invisibles
    name: v => /\p{L}/u.test(v) ? '' : 'Indique ton nom complet',
    swimrankingsId: v => {
        if (!v) return "L'ID SwimRankings est nécessaire pour retrouver tes temps";
        return isValidAthleteId(v) ? '' : `L'ID ne contient que des chiffres (${ATHLETE_ID_MAX_DIGITS} au maximum)`;
    },
    gender: v => GENDER_TO_APP[v] ? '' : 'Choisis un genre (il détermine les temps limites)',
    birthYear: v => {
        if (!v) return '';
        const year = Number(v);
        return /^\d{4}$/.test(v) && year >= BIRTH_YEAR_MIN && year <= new Date().getFullYear() ? '' : 'Année invalide (ex. 2010)';
    }
};

function isValidAthleteId(value) {
    return new RegExp(`^\\d{1,${ATHLETE_ID_MAX_DIGITS}}$`).test(value);
}

// ID SwimRankings contenu dans une adresse de page nageur (« …athleteId=5332548… », éventuellement encodée).
// Retourne la valeur telle quelle si ce n'est pas une adresse.
function extractAthleteId(value) {
    const match = String(value).match(/athleteId(?:=|%3D)(\d+)/i);
    return match ? match[1] : value;
}

// Lit une clé JSON ; retourne null si absente, corrompue ou si localStorage est indisponible
function readStorage(key) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    } catch (err) {
        console.warn(`⚠️ Lecture impossible de ${key}:`, err);
        return null;
    }
}

// Lit une clé texte brute (non JSON) ; retourne '' si absente ou si localStorage est indisponible
function readRawStorage(key) {
    try {
        return localStorage.getItem(key) || '';
    } catch (err) {
        return '';
    }
}

// Valeur texte d'un champ stocké (les nombres sont acceptés) ; '' sinon
function toText(value) {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

// Genre au format v1 ("Female"/"Male") → v2 ("F"/"M") ; valeur inchangée sinon
function toProfileGender(value) {
    return Object.keys(GENDER_TO_APP).find(key => GENDER_TO_APP[key] === value) || value;
}

// Champs du profil qui ne respectent pas les règles de validation
function getInvalidProfileFields(candidate) {
    return Object.keys(PROFILE_VALIDATORS).filter(key => PROFILE_VALIDATORS[key](candidate[key] ?? ''));
}

// Charge le profil ; un profil absent, illisible ou invalide est traité comme absent
function getProfile() {
    const stored = readStorage(STORAGE_KEYS.profile);
    if (!stored || typeof stored !== 'object') return null;
    const allText = PROFILE_FIELDS.every(key => stored[key] === undefined || typeof stored[key] === 'string');
    if (!allText || getInvalidProfileFields(stored).length > 0) return null;
    return stored;
}

// Profil stocké sans validation (champs texte uniquement) : pré-remplit le formulaire
// quand le profil enregistré est invalide, pour le faire corriger plutôt que le perdre
function getStoredProfileDraft() {
    const stored = readStorage(STORAGE_KEYS.profile);
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;

    const draft = {};
    PROFILE_FIELDS.forEach(key => {
        const value = toText(stored[key]);
        if (value) draft[key] = value;
    });
    if (draft.gender) draft.gender = toProfileGender(draft.gender);
    if (typeof stored.createdAt === 'string') draft.createdAt = stored.createdAt;
    // Rien à corriger sans nom, ID ni genre : formulaire vierge
    return draft.name || draft.swimrankingsId || draft.gender ? draft : null;
}

// Met en casse « Titre » un texte entièrement en majuscules ("HEHLEN" → "Hehlen", "DUPONT-ROCHE" → "Dupont-Roche")
function toTitleCaseIfUpper(text) {
    if (text !== text.toLocaleUpperCase('fr') || !/\p{L}/u.test(text)) return text;
    return text.toLocaleLowerCase('fr').replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, letter) => sep + letter.toLocaleUpperCase('fr'));
}

// Nom d'un nageur v1 au format « Prénom Nom ». SwimRankings fournit fullName sous la forme
// « HEHLEN, Ava » : on privilégie firstName + lastName, sinon on remet fullName dans l'ordre.
function getLegacyName(legacy) {
    const firstName = toText(legacy.firstName);
    const lastName = toTitleCaseIfUpper(toText(legacy.lastName));
    if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(' ');

    const fullName = toText(legacy.fullName);
    const [last, first] = fullName.split(',').map(part => part.trim());
    return first ? `${first} ${toTitleCaseIfUpper(last)}` : fullName;
}

// Profil SwimTimes v1 converti au format v2, pour pré-remplir le formulaire (US-008).
// Retourne null si absent, illisible ou sans nom ni ID.
function getLegacyProfileDraft() {
    const legacy = readStorage(LEGACY_KEYS.profile);
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return null;

    const draft = {
        name: getLegacyName(legacy),
        // athlete_id était stocké en texte brut (pas en JSON)
        swimrankingsId: toText(legacy.id) || readRawStorage(LEGACY_KEYS.athleteId).trim(),
        gender: toProfileGender(toText(legacy.gender)),
        birthYear: toText(legacy.yearOfBirth),
        club: toText(legacy.club)
    };
    return draft.name || draft.swimrankingsId ? draft : null;
}

// Sauvegarde le profil : createdAt est figé à la création, updatedAt change à chaque sauvegarde.
// createdAt est relu dans le stockage, y compris depuis un profil invalide en cours de correction.
// Lève une erreur au message affichable si localStorage est bloqué ou plein.
function saveProfile(newProfile) {
    const now = new Date().toISOString();
    const stored = {
        ...newProfile,
        createdAt: getStoredProfileDraft()?.createdAt || now,
        updatedAt: now
    };

    try {
        localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(stored));
    } catch (err) {
        console.error('❌ Erreur sauvegarde profil:', err);
        throw new Error("Impossible d'enregistrer sur cet appareil. Vérifie que tu n'es pas en navigation privée et qu'il reste de l'espace.");
    }
    return stored;
}

// Supprime les clés v1 une fois le profil repris ou remplacé ; retourne false si le stockage refuse
function clearLegacyData() {
    try {
        Object.values(LEGACY_KEYS).forEach(key => localStorage.removeItem(key));
        return true;
    } catch (err) {
        console.warn('⚠️ Suppression des clés v1 impossible:', err);
        return false;
    }
}

// Supprime les temps synchronisés, qui appartiennent à l'ancien ID après un changement d'ID
function clearSyncedTimes() {
    try {
        localStorage.removeItem(STORAGE_KEYS.pb);
        localStorage.removeItem(STORAGE_KEYS.season);
    } catch (err) {
        console.warn('⚠️ Suppression des temps synchronisés impossible:', err);
    }
}

// Supprime les données v1, les temps synchronisés puis le profil. Le profil est supprimé en dernier :
// si une suppression échoue en route, l'utilisateur garde son profil et peut réessayer.
function clearAllData() {
    const keys = [...Object.values(LEGACY_KEYS), STORAGE_KEYS.pb, STORAGE_KEYS.season, STORAGE_KEYS.profile];
    try {
        keys.forEach(key => localStorage.removeItem(key));
    } catch (err) {
        console.error('❌ Erreur suppression données:', err);
        throw new Error('Impossible de supprimer les données de cet appareil.');
    }
}

// =============================================================================
// SWIMMERS DATA (fichiers du club sur GitHub)
// TODO Phase 3 : pont temporaire (US-009), remplacé par les temps synchronisés en localStorage
// =============================================================================
const SWIMMERS_DATA_URL = 'https://raw.githubusercontent.com/smarsys/Swimtimes/main/swimmers-data.json';
const SWIMMERS_SEASON_URL = 'https://raw.githubusercontent.com/smarsys/Swimtimes/main/swimmers-season.json';
const FETCH_TIMEOUT_MS = 8000; // Au-delà, le chargement est abandonné et une erreur s'affiche

// Charge un JSON avec un délai maximal ; lève une erreur en cas d'échec
async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

// Chargeur mis en cache : une seule requête à la fois, nouvel essai possible après un échec.
// La promesse retournée donne null si le fichier est indisponible.
function createJsonLoader(url) {
    const fileName = url.split('/').pop();
    let request = null;
    return () => {
        if (!request) {
            request = fetchJson(url)
                .then(data => {
                    console.log(`✅ ${fileName} chargé`);
                    return data;
                })
                .catch(err => {
                    console.log(`ℹ️ ${fileName} non disponible :`, err.message);
                    request = null;
                    return null;
                });
        }
        return request;
    };
}

const loadSwimmersData = createJsonLoader(SWIMMERS_DATA_URL);
const loadSwimmersSeasonData = createJsonLoader(SWIMMERS_SEASON_URL);

function getSeasonLabel() {
    return swimmersSeasonData?._metadata?.season?.label || 'Saison courante';
}

// TODO Phase 3 : remplacer par getPBs() / getSeasonTimes()
// Temps d'un nageur. Retourne une copie : les données en cache ne sont jamais modifiées.
// Lève l'erreur 'network' si les données sont indisponibles, 'not-found' si l'ID est absent.
async function fetchSwimmerData(athleteId) {
    const [data, seasonData] = await Promise.all([loadSwimmersData(), loadSwimmersSeasonData()]);
    if (seasonData) swimmersSeasonData = seasonData;
    if (!data) throw new Error('network');

    const swimmerData = data.swimmers?.[athleteId];
    if (!swimmerData) throw new Error('not-found');
    return { ...swimmerData, seasonBests: seasonData?.swimmers?.[athleteId]?.seasonBests || [] };
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

// =============================================================================
// PARAMÈTRES (US-005)
// =============================================================================
let settingsReturnTab = 'times'; // Onglet affiché avant l'ouverture des paramètres

// Bouton marqué « Bientôt disponible » : cliquable (tooltip, toast) mais sans effet
function renderSoonButton(label, extraClass = 'btn-secondary') {
    return `
        <button type="button" class="btn ${extraClass}" aria-disabled="true"
            onclick="showToast('Bientôt disponible')">
            ${label} <span class="badge-soon">Bientôt</span>
        </button>
    `;
}

function renderSettingsScreen() {
    document.getElementById('settings-screen').innerHTML = `
        <div class="screen-header">
            <button type="button" class="btn-back" onclick="closeSettings()" aria-label="Retour">←</button>
            <h1>Paramètres</h1>
        </div>

        <section class="card" aria-labelledby="settings-profile-title">
            <h2 class="card-title" id="settings-profile-title">Mon profil</h2>
            <div class="identity">
                <div class="profile-avatar-small" aria-hidden="true">${escapeHtml(getInitials(profile.name))}</div>
                <div class="identity__text">
                    <div class="identity__name">${escapeHtml(profile.name)}</div>
                    <div class="identity__meta">${escapeHtml(profile.club || '')}</div>
                    <div class="identity__meta identity__meta--small" id="settings-details"></div>
                </div>
            </div>
            <button type="button" class="btn btn-secondary" id="settings-edit" onclick="renderProfileForm('edit')">Modifier le profil</button>
            <div id="settings-records"></div>
        </section>

        <section class="card" aria-labelledby="settings-data-title">
            <h2 class="card-title" id="settings-data-title">Mes données</h2>
            <div class="settings-row"><span>Dernière synchronisation</span><span>Jamais synchronisé</span></div>
            <!-- TODO Phase 3 : ligne liée au pont temporaire swimmers-data.json (US-009) -->
            <div class="settings-row"><span>Temps affichés</span><span id="settings-source"></span></div>
            ${renderSoonButton('🔄 Synchroniser maintenant')}
            ${renderSoonButton('⬇️ Exporter mes données')}
        </section>

        <section class="danger-zone" aria-label="Zone de suppression">
            <button type="button" class="btn btn-danger" id="settings-delete" onclick="openDeleteDialog()">🗑️ Supprimer mes données</button>
        </section>
    `;
    updateSettingsData();
}

// Parties des Paramètres qui dépendent des temps (mises à jour à la fin d'un chargement)
function updateSettingsData() {
    const details = [
        `ID ${escapeHtml(profile.swimrankingsId)}`,
        profile.birthYear ? `né·e en ${escapeHtml(profile.birthYear)}` : '',
        swimmer?.nation ? `${getNationFlag(swimmer.nation)} ${escapeHtml(swimmer.nation)}` : ''
    ].filter(Boolean).join(' • ');
    document.getElementById('settings-details').innerHTML = details;

    // TODO Phase 2 : date de la dernière synchronisation de l'utilisateur
    document.getElementById('settings-source').textContent = swimmer?.lastUpdated
        ? `Données du club du ${new Date(swimmer.lastUpdated).toLocaleDateString('fr-CH')}`
        : getDataStateMessage().split('.')[0];

    // Conserve l'état déplié des records
    const records = document.getElementById('settings-records');
    const wasOpen = records.querySelector('details')?.open;
    const recordsCount = swimmer?.personalBests?.length || 0;
    records.innerHTML = recordsCount ? `
        <details class="records-details"${wasOpen ? ' open' : ''}>
            <summary>🏅 Mes records personnels (${recordsCount})</summary>
            ${renderPBsByPool(50, 'Grand Bassin (50m)')}
            ${renderPBsByPool(25, 'Petit Bassin (25m)')}
        </details>` : '';
}

function openSettings() {
    if (!profile) return;
    if (document.body.classList.contains('settings-active')) {
        closeSettings();
        return;
    }
    hideSwimmerPopup();
    settingsReturnTab = document.querySelector('.nav-tab.active')?.dataset.tab || 'times';
    renderSettingsScreen();
    document.body.classList.add('settings-active');
    document.getElementById('header-settings').setAttribute('aria-pressed', 'true');
    document.addEventListener('keydown', closeSettingsOnEscape);
    window.scrollTo(0, 0);
    document.querySelector('#settings-screen .btn-back').focus();
}

function closeSettings() {
    document.body.classList.remove('settings-active');
    document.getElementById('header-settings').setAttribute('aria-pressed', 'false');
    document.removeEventListener('keydown', closeSettingsOnEscape);
    showTab(settingsReturnTab);
    window.scrollTo(0, 0);
    document.getElementById('header-settings').focus();
}

function closeSettingsOnEscape(e) {
    // Échap ferme d'abord la popup de l'avatar ou la confirmation si elles sont ouvertes
    if (!isEscapeKey(e) || isConfirmDialogOpen()) return;
    if (document.getElementById('swimmer-popup').style.display !== 'none') return;
    closeSettings();
}

// Échap « volontaire » : ni répétition d'un appui long, ni validation d'une saisie IME
function isEscapeKey(e) {
    return e.key === 'Escape' && !e.repeat && !e.isComposing;
}

// =============================================================================
// CONFIRMATION (dialog modal partagé : suppression, abandon, repartir de zéro)
// =============================================================================
// Protection contre les taps répétés sur le bouton qui ouvre la confirmation : selon la taille de
// l'écran, le bouton de confirmation apparaît exactement sous le doigt. Il reste donc visiblement
// inactif pendant 1 s (quel que soit l'écran) ; « Annuler » ignore les clics pendant 400 ms.
const DIALOG_CONFIRM_DELAY_MS = 1000;
const DIALOG_CANCEL_GUARD_MS = 400;
let confirmDialogAction = null;
let confirmDialogOpenedAt = 0;
let confirmDialogTimer = null;
let confirmOkEnabledAt = Infinity; // Moment où le bouton de confirmation est devenu actif
let lastPointerDownAt = 0;         // Début du dernier appui (doigt ou souris) sur la page

// Un clic se termine au relâchement : on retient le début de l'appui pour savoir s'il a commencé
// pendant que le bouton de confirmation était encore inactif (appui long à cheval sur le délai)
document.addEventListener('pointerdown', () => { lastPointerDownAt = performance.now(); }, true);

// onConfirm peut lever une erreur : son message s'affiche et la confirmation reste ouverte.
// Il peut retourner l'élément qui recevra le focus une fois la confirmation fermée.
function showConfirmDialog({ title, text, confirmLabel, cancelLabel = 'Annuler', onConfirm }) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-text').textContent = text;
    document.getElementById('confirm-ok').textContent = confirmLabel;
    document.getElementById('confirm-cancel').textContent = cancelLabel;
    document.getElementById('confirm-error').innerHTML = '';
    confirmDialogAction = onConfirm;
    confirmDialogOpenedAt = performance.now();

    const okButton = document.getElementById('confirm-ok');
    okButton.disabled = true;
    confirmOkEnabledAt = Infinity;
    clearTimeout(confirmDialogTimer);
    confirmDialogTimer = setTimeout(() => {
        okButton.disabled = false;
        confirmOkEnabledAt = performance.now();
    }, DIALOG_CONFIRM_DELAY_MS);

    document.getElementById('confirm-dialog').showModal();
    document.getElementById('confirm-cancel').focus(); // Choix par défaut : le plus sûr
}

function isConfirmDialogOpen() {
    return document.getElementById('confirm-dialog').open;
}

function closeConfirmDialog() {
    document.getElementById('confirm-dialog').close();
}

function handleConfirmDialogCancel() {
    if (performance.now() - confirmDialogOpenedAt >= DIALOG_CANCEL_GUARD_MS) closeConfirmDialog();
}

function handleConfirmDialogOk(e) {
    if (document.getElementById('confirm-ok').disabled) return;
    // Clic au doigt ou à la souris (detail > 0, contrairement au clavier) dont l'appui a commencé
    // avant que le bouton soit actif : ce n'est pas une confirmation délibérée
    if (e?.detail > 0 && lastPointerDownAt < confirmOkEnabledAt) return;
    let focusTarget;
    try {
        focusTarget = confirmDialogAction?.();
    } catch (err) {
        document.getElementById('confirm-error').innerHTML = `<div class="error-box">✗ ${escapeHtml(err.message)}</div>`;
        return;
    }
    closeConfirmDialog(); // Rend le focus à l'élément d'origine…
    focusTarget?.focus(); // …sauf si l'action en désigne un autre
}

// Garde le focus clavier dans la confirmation : Tab et Maj+Tab bouclent sur ses boutons,
// y compris quand le focus est sur le dialog lui-même (après un clic sur son texte)
function trapConfirmDialogFocus(e) {
    if (e.key !== 'Tab') return;
    // Seuls les boutons actifs : « Supprimer » est inactif pendant la première seconde
    const buttons = [...document.querySelectorAll('#confirm-dialog button')].filter(button => !button.disabled);
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    const inside = buttons.includes(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first)) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
    }
}

// =============================================================================
// SUPPRESSION DES DONNÉES (US-007)
// =============================================================================
function openDeleteDialog() {
    showConfirmDialog({
        title: 'Supprimer mes données ?',
        text: 'Ton profil et tes temps seront supprimés de cet appareil. Cette action est irréversible.',
        confirmLabel: '🗑️ Supprimer',
        onConfirm: deleteAllData
    });
}

function deleteAllData() {
    clearAllData(); // Lève une erreur si le stockage refuse : rien n'a changé à l'écran
    resetToFirstLaunch();
    showToast('✓ Données supprimées de cet appareil');
    return document.getElementById('setup-heading');
}

// Retour à l'état « premier lancement » : plus aucune donnée de l'ancien profil dans la page
function resetToFirstLaunch() {
    swimmerLoadId++; // Ignore un chargement encore en cours
    profile = null;
    swimmer = null;
    swimmerDataStatus = 'loading';

    hideSwimmerPopup();
    document.body.classList.remove('settings-active');
    document.removeEventListener('keydown', closeSettingsOnEscape);
    document.getElementById('settings-screen').innerHTML = '';
    document.getElementById('swimmer-popup-content').innerHTML = '';
    document.getElementById('pb-time').textContent = '—';
    document.getElementById('times-table').innerHTML = '';
    document.getElementById('progress-content').innerHTML = '';
    updateHeaderAvatar();
    renderProfileForm('create');
}

function renderPBsByPool(poolLength, title) {
    const pbs = swimmer?.personalBests?.filter(pb => pb.poolLength === poolLength) || [];
    if (pbs.length === 0) return '';
    
    return `
        <div style="margin-bottom:16px">
            <div style="font-size:13px;opacity:.9;margin-bottom:8px">${title}</div>
            <div class="pb-grid">
                ${pbs.map(pb => `
                    <div class="pb-item">
                        <div class="pb-item-event">${escapeHtml(pb.distance)}m ${escapeHtml(STROKES?.[pb.stroke]?.abbr || pb.stroke)}</div>
                        <div class="pb-item-time">${escapeHtml(pb.timeDisplay)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function updateHeaderAvatar() {
    const avatar = document.getElementById('header-avatar');
    if (!avatar) return;
    
    // Initiales du profil saisi (et non des données SwimRankings)
    avatar.textContent = profile ? (getInitials(profile.name) || '?') : '';
}

function toggleSwimmerPopup() {
    const popup = document.getElementById('swimmer-popup');
    if (!popup || !profile) return;
    
    if (popup.style.display === 'none') {
        showSwimmerPopup();
    } else {
        hideSwimmerPopup();
    }
}

function showSwimmerPopup() {
    const popup = document.getElementById('swimmer-popup');
    const content = document.getElementById('swimmer-popup-content');
    if (!popup || !content || !profile) return;
    
    renderSwimmerPopupContent();
    popup.style.display = 'block';
    document.getElementById('header-avatar').setAttribute('aria-expanded', 'true');
    
    // Fermeture au clic extérieur, avec Échap ou quand le focus clavier quitte la popup.
    // Le clic extérieur n'est écouté qu'après le clic d'ouverture, et seulement si la popup
    // est encore ouverte (double-clic rapide sur l'avatar).
    setTimeout(() => {
        if (popup.style.display !== 'none') document.addEventListener('click', closePopupOnClickOutside);
    }, 10);
    document.addEventListener('keydown', closePopupOnEscape);
    popup.addEventListener('focusout', closePopupOnFocusOut);
    content.querySelector('.swimmer-popup-close').focus();
}

// Contenu de la popup ; appelé aussi à la fin d'un chargement si la popup est ouverte
function renderSwimmerPopupContent() {
    const content = document.getElementById('swimmer-popup-content');
    const age = profile.birthYear ? (new Date().getFullYear() - Number(profile.birthYear)) : null;
    const meta = [profile.club, swimmer?.nation].filter(Boolean).join(' • ');
    // Sans temps chargés : « … » pendant le chargement, « — » sinon (pas de faux zéro)
    const count = list => swimmer ? (list?.length || 0) : (swimmerDataStatus === 'loading' ? '…' : '—');
    const hadFocus = content.contains(document.activeElement);
    
    content.innerHTML = `
        <button class="swimmer-popup-close" onclick="closeSwimmerPopup()" aria-label="Fermer">✕</button>
        <div class="swimmer-popup-name">${escapeHtml(profile.name)}</div>
        <div class="swimmer-popup-meta">${escapeHtml(meta)}</div>
        <div class="swimmer-popup-stats">
            <div>
                <div class="swimmer-popup-stat-value">${age ?? '—'}</div>
                <div class="swimmer-popup-stat-label">ans</div>
            </div>
            <div>
                <div class="swimmer-popup-stat-value">${count(swimmer?.personalBests)}</div>
                <div class="swimmer-popup-stat-label">PBs</div>
            </div>
            <div>
                <div class="swimmer-popup-stat-value">${count(swimmer?.seasonBests)}</div>
                <div class="swimmer-popup-stat-label">${escapeHtml(getSeasonLabel())}</div>
            </div>
        </div>
        ${swimmer ? '' : `<div class="swimmer-popup-id" role="status">${getDataStateMessage().split('.')[0]}</div>`}
        <div class="swimmer-popup-id">ID: ${escapeHtml(profile.swimrankingsId)}</div>
    `;
    if (hadFocus) content.querySelector('.swimmer-popup-close').focus();
}

function hideSwimmerPopup() {
    const popup = document.getElementById('swimmer-popup');
    if (popup) {
        popup.style.display = 'none';
        popup.removeEventListener('focusout', closePopupOnFocusOut);
    }
    document.getElementById('header-avatar')?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', closePopupOnClickOutside);
    document.removeEventListener('keydown', closePopupOnEscape);
}

// Fermeture explicite (✕, Échap) : le focus revient à l'avatar
function closeSwimmerPopup() {
    hideSwimmerPopup();
    document.getElementById('header-avatar').focus();
}

function closePopupOnClickOutside(e) {
    const popup = document.getElementById('swimmer-popup');
    const avatar = document.getElementById('header-avatar');
    if (popup && !popup.contains(e.target) && !avatar.contains(e.target)) {
        hideSwimmerPopup();
    }
}

function closePopupOnFocusOut(e) {
    const popup = document.getElementById('swimmer-popup');
    const avatar = document.getElementById('header-avatar');
    // relatedTarget nul : focus perdu pendant un nouveau rendu de la popup, on la garde ouverte
    if (e.relatedTarget && !popup.contains(e.relatedTarget) && e.relatedTarget !== avatar) hideSwimmerPopup();
}

function closePopupOnEscape(e) {
    if (isEscapeKey(e)) closeSwimmerPopup();
}

// Message bref en bas de l'écran
let toastTimer = null;
function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), duration);
}

// Bouton 🔄 : inactif jusqu'à la Phase 2 (synchronisation)
function handleSyncClick() {
    showToast('🔄 Synchronisation disponible prochainement');
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
            pbHtml += `<div>PB: ${escapeHtml(pb.timeDisplay)}</div>`;
        }
        if (seasonBest) {
            const seasonLabel = getSeasonLabel();
            pbHtml += `<div style="font-size:14px;opacity:.8">${escapeHtml(seasonLabel)}: ${escapeHtml(seasonBest.timeDisplay)}</div>`;
        } else if (pb) {
            pbHtml += `<div style="font-size:12px;opacity:.9">Pas encore nagé cette saison</div>`;
        }
        if (finaPoints) {
            pbHtml += `<div style="font-size:12px;opacity:.9">${finaPoints} pts FINA</div>`;
        }
        pbTime.innerHTML = pbHtml;
    } else {
        pbDisplay.classList.add('empty');
        pbTime.innerHTML = swimmer
            ? '<span class="pb-time__state">Pas encore de temps</span>'
            : `<span class="pb-time__state" role="status">${getDataStateMessage()}</span>`;
    }
    
    // Get standards from JSON
    const eventKey = `${actualDistance}_${stroke}`;
    const poolData = TIME_STANDARDS?.[gender]?.[poolLength];
    const standards = poolData?.[eventKey] || {};
    
    // Build table
    const tableContainer = document.getElementById('times-table');
    
    if (Object.keys(standards).length === 0) {
        tableContainer.innerHTML = '<div style="text-align:center;padding:40px">Pas de temps limites pour cette épreuve</div>';
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
                    <th>PB</th>
                    <th>Saison</th>
                    <th>Écart</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(row => `
                    <tr class="${row.cat.includes('JO') ? 'olympic' : ''}">
                        <td>
                            <div class="comp-name-solo">${escapeHtml(row.info?.name || row.cat)}</div>
                            <div class="comp-limit">${row.time}</div>
                        </td>
                        <td class="pb-icon-cell">${row.pbDiffMs !== null && row.pbDiffMs <= 0 ? '💪' : ''}</td>
                        <td>${row.seasonMs ? formatTime(row.seasonMs) : '—'}</td>
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
            return '<span class="status-icon">✓</span>';
        case 'pending':
            return '<span class="status-icon">⏳</span>';
        case 'close':
            const diff = seasonDiffMs !== null ? seasonDiffMs : pbDiffMs;
            return formatDiff(diff);
        case 'far':
            const diffFar = seasonDiffMs !== null ? seasonDiffMs : pbDiffMs;
            return formatDiff(diffFar);
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
        container.innerHTML = renderDataState('📈');
        return;
    }
    
    const gender = GENDER_TO_APP[profile.gender]; // Le genre du profil fait foi
    const categoryOrder = ['JO_A', 'JO_B', 'CS', 'CS_Hiver', 'RSR_Ete', 'RSR_Hiver'];
    
    // Filter personal bests by selected pool length
    const filteredPBs = swimmer.personalBests.filter(pb => pb.poolLength === poolLengthNum);
    
    if (filteredPBs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏊</div>
                <h3 style="margin-bottom:8px">Pas de temps en ${selectedPool === '50m' ? 'grand' : 'petit'} bassin</h3>
                <p class="empty-state__text">Aucun record personnel enregistré pour ce type de bassin</p>
            </div>
        `;
        return;
    }
    
    // Get season bests for this pool
    const filteredSeasonBests = swimmer.seasonBests?.filter(sb => sb.poolLength === poolLengthNum) || [];
    
    // Analyze each event
    const analysis = filteredPBs.map(pb => {
        const poolKey = pb.poolLength === 25 ? '25m' : '50m';
        const eventKey = `${pb.distance}_${pb.stroke}`;
        const allStandards = TIME_STANDARDS?.[gender]?.[poolKey]?.[eventKey] || {};
        
        // Find season best for this event
        const seasonBest = filteredSeasonBests.find(sb => 
            sb.stroke === pb.stroke && sb.distance === pb.distance
        );
        
        // Filter standards by pool length
        const standards = Object.fromEntries(
            Object.entries(allStandards).filter(([cat, time]) => {
                const catInfo = CATEGORIES?.[cat];
                if (!catInfo || catInfo.poolLength === null) return true;
                return catInfo.poolLength === pb.poolLength;
            })
        );
        
        // Calculate current FINA points (from PB)
        const pbFinaPoints = calculateFinaPoints(pb.timeMs, gender, pb.poolLength, pb.stroke, pb.distance);
        const seasonFinaPoints = seasonBest ? calculateFinaPoints(seasonBest.timeMs, gender, pb.poolLength, pb.stroke, pb.distance) : null;
        
        // Find qualifications and next targets
        let qualifiedSeason = []; // Qualified with season time
        let qualifiedPBOnly = []; // Qualified with PB but not season (pending)
        let notYetQualified = []; // PB doesn't qualify yet
        let nextTarget = null;
        let smallestFinaGap = Infinity;
        
        Object.entries(standards).forEach(([cat, time]) => {
            const limitMs = timeToMs(time);
            const pbDiff = pb.timeMs - limitMs;
            const seasonDiff = seasonBest ? seasonBest.timeMs - limitMs : null;
            
            // Calculate FINA points for the target time
            const targetFinaPoints = calculateFinaPoints(limitMs, gender, pb.poolLength, pb.stroke, pb.distance);
            const finaGap = targetFinaPoints && pbFinaPoints ? targetFinaPoints - pbFinaPoints : Infinity;
            
            if (seasonDiff !== null && seasonDiff <= 0) {
                // Qualified this season
                qualifiedSeason.push({ cat, time, targetFinaPoints });
            } else if (pbDiff <= 0) {
                // PB qualifies but not season time - need to redo
                qualifiedPBOnly.push({ cat, time, targetFinaPoints, finaGap: seasonFinaPoints && targetFinaPoints ? targetFinaPoints - seasonFinaPoints : finaGap });
            } else {
                // PB doesn't qualify yet - add to objectives
                notYetQualified.push({ cat, time, targetFinaPoints, finaGap: Math.round(finaGap), gap: pbDiff });
                if (finaGap < smallestFinaGap && finaGap > 0) {
                    smallestFinaGap = finaGap;
                    nextTarget = { category: cat, gap: pbDiff, time, finaGap: Math.round(finaGap), targetFinaPoints };
                }
            }
        });
        
        // Get best qualification level
        const bestQualifiedSeason = qualifiedSeason.length > 0 ? 
            qualifiedSeason.reduce((best, q) => !best || categoryOrder.indexOf(q.cat) < categoryOrder.indexOf(best.cat) ? q.cat : best, null) : null;
        
        return {
            ...pb,
            seasonBest,
            pbFinaPoints,
            seasonFinaPoints,
            bestQualifiedSeason,
            qualifiedSeason, // All season qualifications for this event
            qualifiedPBOnly, // Array of qualifs to redo
            notYetQualified, // Array of objectives not yet reached
            nextTarget,
            eventName: `${pb.distance}m ${STROKES?.[pb.stroke]?.abbr || pb.stroke}`
        };
    });
    
    // Separate into categories
    const qualifiedThisSeason = analysis.filter(a => a.bestQualifiedSeason);
    
    // Build flat list of ALL season qualifications (one entry per event+competition)
    const allSeasonQualifications = [];
    analysis.forEach(a => {
        if (a.qualifiedSeason && a.qualifiedSeason.length > 0) {
            a.qualifiedSeason.forEach(q => {
                allSeasonQualifications.push({
                    eventName: a.eventName,
                    cat: q.cat,
                    time: q.time
                });
            });
        }
    });
    
    // Build flat list of all qualifications to redo (one entry per event+competition)
    const pendingRedo = [];
    analysis.forEach(a => {
        a.qualifiedPBOnly.forEach(q => {
            const limitMs = timeToMs(q.time);
            const pbDiff = a.timeMs - limitMs; // Diff between PB and limit (should be <= 0 since PB qualifies)
            const seasonDiff = a.seasonBest ? a.seasonBest.timeMs - limitMs : null;
            // FINA gap from PB to target (for sorting - always use PB-based gap)
            const finaGapFromPB = q.targetFinaPoints && a.pbFinaPoints ? q.targetFinaPoints - a.pbFinaPoints : 0;
            pendingRedo.push({
                eventName: a.eventName,
                stroke: a.stroke,
                distance: a.distance,
                seasonBest: a.seasonBest,
                timeDisplay: a.timeDisplay,
                timeMs: a.timeMs,
                pbFinaPoints: a.pbFinaPoints,
                seasonFinaPoints: a.seasonFinaPoints,
                target: q,
                pbDiff,
                seasonDiff,
                finaGapFromPB
            });
        });
    });
    // Sort by FINA gap from PB (ascending - most negative first = easiest to achieve)
    pendingRedo.sort((a, b) => a.finaGapFromPB - b.finaGapFromPB);
    
    // Build flat list of all objectives (one entry per event+competition)
    // Only include objectives within +100 FINA points
    const objectives = [];
    analysis.forEach(a => {
        if (a.notYetQualified && a.notYetQualified.length > 0) {
            a.notYetQualified.forEach(q => {
                if (q.finaGap <= 100) {
                    objectives.push({
                        eventName: a.eventName,
                        stroke: a.stroke,
                        distance: a.distance,
                        timeDisplay: a.timeDisplay,
                        timeMs: a.timeMs,
                        pbFinaPoints: a.pbFinaPoints,
                        target: q
                    });
                }
            });
        }
    });
    // Sort by FINA gap (ascending - smallest gap first = closest to achieving)
    objectives.sort((a, b) => a.target.finaGap - b.target.finaGap);
    
    container.innerHTML = `
        <div class="progress-summary">
            <div class="progress-card green"><div class="progress-value">${allSeasonQualifications.length}</div><div class="progress-label">Qualifiés</div></div>
            <div class="progress-card orange"><div class="progress-value">${pendingRedo.length}</div><div class="progress-label">À refaire</div></div>
            <div class="progress-card yellow"><div class="progress-value">${objectives.length}</div><div class="progress-label">Objectifs</div></div>
        </div>
        
        ${pendingRedo.length > 0 ? `
            <div style="margin-bottom:24px">
                <div class="section-title">⏳ À refaire cette saison</div>
                <div class="progress-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Épreuve</th>
                                <th>Objectif</th>
                                <th>Saison</th>
                                <th>Écart (PB)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pendingRedo.map(item => {
                                const catName = CATEGORIES?.[item.target.cat]?.name || item.target.cat;
                                const hasSeason = item.seasonBest !== null && item.seasonBest !== undefined;
                                const seasonTime = hasSeason ? formatTime(item.seasonBest.timeMs) : '—';
                                const seasonDiffDisplay = hasSeason && item.seasonDiff !== null ? formatDiff(item.seasonDiff) : '';
                                
                                // Always show PB-based data in last column
                                const pbDiffClass = item.pbDiff !== null && item.pbDiff <= 0 ? 'diff-qualified' : (item.pbDiff !== null && item.pbDiff <= 1000 ? 'diff-close' : 'diff-far');
                                const pbDiffDisplay = item.pbDiff !== null ? formatDiff(item.pbDiff) : '—';
                                const pbFinaGapDisplay = item.finaGapFromPB !== null ? `${item.finaGapFromPB > 0 ? '+' : ''}${Math.round(item.finaGapFromPB)} pts` : '';
                                
                                return `
                                    <tr>
                                        <td><strong>${escapeHtml(item.eventName)}</strong></td>
                                        <td>
                                            <div class="comp-cat">${catName}</div>
                                            <div class="comp-limit">${item.target.time}</div>
                                            <div class="fina-small">${item.target.targetFinaPoints || ''} pts</div>
                                        </td>
                                        <td>
                                            <span class="time-mono">${seasonTime}</span>
                                            ${seasonDiffDisplay ? `<div class="fina-small">${seasonDiffDisplay}</div>` : ''}
                                        </td>
                                        <td class="${pbDiffClass}">
                                            ${pbDiffDisplay}
                                            ${pbFinaGapDisplay ? `<div class="fina-small">${pbFinaGapDisplay}</div>` : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}
        
        ${objectives.length > 0 ? `
            <div style="margin-bottom:24px">
                <div class="section-title">🎯 Prochains objectifs</div>
                <div class="progress-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Épreuve</th>
                                <th>Objectif</th>
                                <th>PB</th>
                                <th>Écart</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${objectives.map(item => {
                                const catName = CATEGORIES?.[item.target.cat]?.name || item.target.cat;
                                const finaGapValue = item.target.finaGap;
                                const finaGapDisplay = finaGapValue ? `${finaGapValue > 0 ? '+' : ''}${finaGapValue} pts` : '';
                                return `
                                    <tr>
                                        <td><strong>${escapeHtml(item.eventName)}</strong></td>
                                        <td>
                                            <div class="comp-cat">${catName}</div>
                                            <div class="comp-limit">${item.target.time}</div>
                                            <div class="fina-small">${item.target.targetFinaPoints || ''} pts</div>
                                        </td>
                                        <td>
                                            <span class="time-mono">${escapeHtml(item.timeDisplay)}</span>
                                            <div class="fina-small">${item.pbFinaPoints || ''} pts</div>
                                        </td>
                                        <td class="${item.target.gap <= 1000 ? 'diff-close' : 'diff-far'}">
                                            ${formatDiff(item.target.gap)}
                                            ${finaGapDisplay ? `<div class="fina-small">${finaGapDisplay}</div>` : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}
        
        ${allSeasonQualifications.length > 0 ? `
            <div>
                <div class="section-title">✓ Qualifié cette saison</div>
                <div class="qualification-grid">
                    ${allSeasonQualifications.map(item => `
                        <div class="qualification-item">
                            <div class="qualification-event">${escapeHtml(item.eventName)}</div>
                            <div class="qualification-level">${CATEGORIES?.[item.cat]?.name || item.cat}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

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

// =============================================================================
// CONFIGURATION DU PROFIL (US-002, US-003, US-006, US-008)
// =============================================================================
let profileFormBusy = false;
const CREATE_SUCCESS_DELAY_MS = 600;  // Durée du « ✓ C'est parti ! » avant d'afficher l'app
const STATUS_MESSAGE_MS = 3000;       // Durée du message « ID extrait de l'adresse »
const LIVE_REGION_DELAY_MS = 100;     // Texte inséré après le rendu pour qu'une région live l'annonce

// Messages affichés à la place des temps, selon l'état du chargement
const DATA_STATE_MESSAGES = {
    loading: 'Chargement des temps…',
    'not-found': 'Aucune donnée. Clique sur 🔄 pour synchroniser.',
    error: 'Impossible de charger les temps. Vérifie ta connexion puis recharge la page.'
};

function getDataStateMessage() {
    return DATA_STATE_MESSAGES[swimmerDataStatus] || DATA_STATE_MESSAGES['not-found'];
}

function renderDataState(icon) {
    const isLoading = swimmerDataStatus === 'loading';
    return `
        <div class="empty-state" role="status">
            <div class="empty-icon">${isLoading ? '<span class="loading" aria-hidden="true"></span>' : icon}</div>
            <p class="empty-state__text">${getDataStateMessage()}</p>
        </div>
    `;
}

// Affiche le formulaire de profil : 'create' au premier lancement, 'edit' depuis les Paramètres
function renderProfileForm(mode = 'create') {
    const isEdit = mode === 'edit' && Boolean(profile);
    // Brouillon : profil v2 enregistré mais invalide (à corriger), sinon profil v1 à reprendre (US-008)
    const invalidDraft = isEdit ? null : getStoredProfileDraft();
    const legacyDraft = isEdit || invalidDraft ? null : getLegacyProfileDraft();
    const initial = isEdit ? profile : (invalidDraft || legacyDraft || { club: 'Lausanne Aquatique' });

    document.getElementById('setup-screen').innerHTML = renderProfileFormHtml({
        isEdit,
        hasNotice: Boolean(invalidDraft || legacyDraft),
        canReset: Boolean(legacyDraft)
    });
    const form = document.getElementById('profile-form');
    fillProfileForm(form, initial);
    bindProfileFormEvents(form, isEdit);
    bindSwimrankingsIdField(form);

    profileFormBusy = false;
    if (isEdit) document.getElementById('profile-submit').disabled = true;
    showSetupScreen();

    if (invalidDraft || legacyDraft) {
        showDraftState(form, legacyDraft ? 'legacy' : 'invalid');
    } else if (isEdit) {
        // Le focus va au titre pour que le lecteur d'écran annonce le nouvel écran
        form.querySelector('.setup-title').focus();
    }
}

function renderProfileFormHtml({ isEdit, hasNotice, canReset }) {
    return `
        <form id="profile-form" novalidate>
            ${isEdit ? `
            <div class="screen-header">
                <button type="button" class="btn-back" id="profile-back" aria-label="Annuler et revenir aux paramètres">←</button>
                <h1 class="setup-title" tabindex="-1">Modifier le profil</h1>
            </div>` : `
            <div class="setup-intro">
                <div class="profile-avatar" aria-hidden="true">🏊</div>
                <h1 id="setup-heading" tabindex="-1">Configuration du profil</h1>
                <p>Quelques infos pour retrouver tes temps sur SwimRankings.</p>
            </div>`}
            ${hasNotice ? `
            <div class="notice">
                <p id="profile-notice" role="status"></p>
                ${canReset ? '<button type="button" class="btn-link" id="profile-reset">Repartir de zéro</button>' : ''}
            </div>` : ''}
            <div class="card">
                <div class="form-group">
                    <label class="form-label" for="profile-name">Nom complet *</label>
                    <input class="form-input" id="profile-name" name="name" type="text"
                        autocomplete="name" autocapitalize="words" maxlength="80" placeholder="Prénom Nom"
                        aria-required="true" aria-describedby="profile-name-error">
                    <div class="field-error" id="profile-name-error" hidden></div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="profile-swimrankingsId">ID SwimRankings *</label>
                    <input class="form-input form-input--mono" id="profile-swimrankingsId" name="swimrankingsId" type="text"
                        inputmode="numeric" autocomplete="off" maxlength="2000" placeholder="ex. 5332548"
                        aria-required="true" aria-describedby="profile-swimrankingsId-hint profile-swimrankingsId-error">
                    <div class="form-hint" id="profile-swimrankingsId-hint">Le nombre dans l'adresse de ta page SwimRankings (ou l'adresse complète).</div>
                    <div class="field-error" id="profile-swimrankingsId-error" hidden></div>
                    <div class="field-status" id="profile-swimrankingsId-status" role="status"></div>
                    <div class="field-warning" id="profile-swimrankingsId-warning" aria-live="polite"></div>
                    <button type="button" class="btn-link" id="profile-id-help-toggle"
                        aria-expanded="false" aria-controls="profile-id-help">ⓘ Comment trouver mon ID ?</button>
                    <div class="help-box" id="profile-id-help" hidden>
                        <ol>
                            <li>Va sur <a href="https://www.swimrankings.net" target="_blank" rel="noopener">swimrankings.net ↗<span class="sr-only"> (nouvel onglet)</span></a></li>
                            <li>Recherche ton nom</li>
                            <li>Ouvre ta page nageur</li>
                            <li>Copie le nombre qui suit <code>athleteId=</code> dans l'adresse</li>
                        </ol>
                        <p class="help-box__example">…athleteId=<mark>5332548</mark></p>
                        <p>💡 Tu peux aussi coller l'adresse complète : l'ID est extrait automatiquement.</p>
                    </div>
                </div>
                <div class="form-group">
                    <div class="form-label" id="profile-gender-label">Genre *</div>
                    <div class="segmented" id="profile-gender" role="radiogroup" aria-labelledby="profile-gender-label"
                        aria-required="true" aria-describedby="profile-gender-error">
                        <label class="segmented__option"><input type="radio" name="gender" value="F"><span>Femme</span></label>
                        <label class="segmented__option"><input type="radio" name="gender" value="M"><span>Homme</span></label>
                    </div>
                    <div class="field-error" id="profile-gender-error" hidden></div>
                </div>
            </div>
            <div class="card">
                <div class="form-section-title">Optionnel</div>
                <div class="form-group">
                    <label class="form-label" for="profile-birthYear">Année de naissance</label>
                    <input class="form-input" id="profile-birthYear" name="birthYear" type="text"
                        inputmode="numeric" autocomplete="bday-year" maxlength="4" placeholder="ex. 2010"
                        aria-describedby="profile-birthYear-error">
                    <div class="field-error" id="profile-birthYear-error" hidden></div>
                </div>
                <div class="form-group" style="margin-bottom:0">
                    <label class="form-label" for="profile-club">Club</label>
                    <input class="form-input" id="profile-club" name="club" type="text" maxlength="80">
                </div>
            </div>
            <div id="profile-form-error" role="alert"></div>
            <button type="submit" class="btn btn-primary" id="profile-submit">Enregistrer</button>
            ${isEdit ? '<button type="button" class="btn btn-secondary" id="profile-cancel">Annuler</button>' : ''}
            <p class="setup-privacy">🔒 Tes données restent sur cet appareil.</p>
        </form>
    `;
}

// Pré-remplissage via .value : aucune donnée utilisateur injectée dans le HTML
function fillProfileForm(form, initial) {
    form.elements.namedItem('name').value = initial.name || '';
    form.elements.namedItem('swimrankingsId').value = initial.swimrankingsId || '';
    form.elements.namedItem('birthYear').value = initial.birthYear || '';
    form.elements.namedItem('club').value = initial.club || '';
    if (GENDER_TO_APP[initial.gender]) form.elements.namedItem('gender').value = initial.gender;
    form.dataset.initial = JSON.stringify(readProfileForm(form));
}

function isProfileFormChanged(form) {
    return JSON.stringify(readProfileForm(form)) !== form.dataset.initial;
}

function bindProfileFormEvents(form, isEdit) {
    form.addEventListener('submit', handleProfileSubmit);

    form.addEventListener('input', e => {
        e.target.dataset.dirty = '1';
        // Pendant la frappe, on ne fait qu'effacer une erreur déjà affichée si le champ redevient valide
        if (e.target.getAttribute('aria-invalid') === 'true') validateProfileField(form, e.target.name);
        document.getElementById('profile-form-error').innerHTML = ''; // Erreur de stockage périmée
        if (isEdit) updateEditState(form);
    });
    form.addEventListener('change', e => {
        if (e.target.name === 'gender') validateProfileField(form, 'gender');
        if (isEdit) updateEditState(form);
    });

    // Validation à la sortie d'un champ modifié. Pendant un clic, on attend la fin du clic :
    // l'apparition d'un message déplacerait la cible sous le pointeur et le clic serait perdu.
    const pendingKeys = new Set();
    let pointerActive = false;
    form.addEventListener('pointerdown', () => {
        pointerActive = true;
        // pointerup ou pointercancel : le premier des deux retire les deux écouteurs
        const pointerEnd = new AbortController();
        const flushPending = () => {
            pointerEnd.abort();
            pointerActive = false;
            setTimeout(() => {
                if (form.isConnected) pendingKeys.forEach(key => validateProfileField(form, key));
                pendingKeys.clear();
            }, 0);
        };
        document.addEventListener('pointerup', flushPending, { signal: pointerEnd.signal });
        document.addEventListener('pointercancel', flushPending, { signal: pointerEnd.signal });
    });
    form.addEventListener('focusout', e => {
        const key = e.target.name;
        if (!PROFILE_VALIDATORS[key] || key === 'gender') return;
        if (!e.target.dataset.dirty && !form.dataset.submitted) return;
        if (pointerActive) pendingKeys.add(key);
        else validateProfileField(form, key);
    });

    // Sortie du mode édition : Annuler, ← ou Échap
    document.getElementById('profile-cancel')?.addEventListener('click', requestCancelProfileEdit);
    document.getElementById('profile-back')?.addEventListener('click', requestCancelProfileEdit);
    document.removeEventListener('keydown', cancelProfileEditOnEscape);
    if (isEdit) document.addEventListener('keydown', cancelProfileEditOnEscape);

    document.getElementById('profile-reset')?.addEventListener('click', requestLegacyReset);
}

// Édition : « Enregistrer » actif seulement si le profil a changé ; avertissement si l'ID change
function updateEditState(form) {
    if (profileFormBusy) return;
    document.getElementById('profile-submit').disabled = !isProfileFormChanged(form);

    const newId = readProfileForm(form).swimrankingsId;
    const showWarning = isValidAthleteId(newId) && newId !== profile.swimrankingsId;
    const warning = document.getElementById('profile-swimrankingsId-warning');
    const warningText = showWarning ? "⚠️ Les temps synchronisés de l'ancien ID seront supprimés." : '';
    if (warning.textContent !== warningText) warning.textContent = warningText;
    // L'avertissement n'est relié au champ que s'il est affiché : sinon un lecteur d'écran le lirait quand même
    const describedBy = ['profile-swimrankingsId-hint', 'profile-swimrankingsId-error'];
    if (showWarning) describedBy.push('profile-swimrankingsId-warning');
    form.elements.namedItem('swimrankingsId').setAttribute('aria-describedby', describedBy.join(' '));
}

// Profil à corriger ou profil v1 à reprendre : bandeau annoncé, erreurs affichées, focus placé
function showDraftState(form, kind) {
    form.dataset.submitted = '1';
    const invalidKeys = validateAllProfileFields(form);
    const message = kind === 'legacy'
        ? '👋 On a retrouvé ton profil. Vérifie tes infos et enregistre.'
        : invalidKeys.length
            ? '⚠️ Ton profil enregistré est incomplet. Corrige les champs signalés puis enregistre.'
            : '⚠️ Ton profil enregistré doit être vérifié. Contrôle tes informations puis enregistre.';
    setTimeout(() => {
        const notice = document.getElementById('profile-notice');
        if (notice) notice.textContent = message;
    }, LIVE_REGION_DELAY_MS);

    if (invalidKeys.length) focusProfileField(form, invalidKeys[0]);
    else document.getElementById('setup-heading').focus();
}

// Profil v1 : « Repartir de zéro » oublie définitivement l'ancien profil, après confirmation
function requestLegacyReset() {
    showConfirmDialog({
        title: 'Repartir de zéro ?',
        text: 'Ton ancien profil SwimTimes sera oublié sur cet appareil et le formulaire sera vidé.',
        confirmLabel: 'Repartir de zéro',
        onConfirm: () => {
            if (!clearLegacyData()) throw new Error("Impossible d'effacer l'ancien profil sur cet appareil.");
            renderProfileForm('create');
            return document.getElementById('setup-heading');
        }
    });
}

// Champ ID : aide dépliable et extraction de l'ID depuis une adresse (US-003)
function bindSwimrankingsIdField(form) {
    const input = form.elements.namedItem('swimrankingsId');
    const status = document.getElementById('profile-swimrankingsId-status');
    const toggle = document.getElementById('profile-id-help-toggle');
    const help = document.getElementById('profile-id-help');
    let statusTimer = null;

    const setHelpOpen = open => {
        help.hidden = !open;
        toggle.setAttribute('aria-expanded', open);
    };
    toggle.addEventListener('click', () => setHelpOpen(help.hidden));
    // Échap dans l'aide dépliée la replie (sans quitter l'édition)
    [toggle, help].forEach(el => el.addEventListener('keydown', e => {
        if (!isEscapeKey(e) || help.hidden) return;
        e.stopPropagation();
        setHelpOpen(false);
        toggle.focus();
    }));

    const applyExtraction = () => {
        const id = extractAthleteId(input.value);
        if (id === input.value) return;
        input.value = id;
        status.textContent = "✓ ID extrait de l'adresse";
        input.classList.remove('form-input--flash');
        void input.offsetWidth; // Relance l'animation
        input.classList.add('form-input--flash');
        clearTimeout(statusTimer);
        statusTimer = setTimeout(() => { status.textContent = ''; }, STATUS_MESSAGE_MS);
    };
    // Collage ou saisie d'un bloc : extraction immédiate. Frappe caractère par caractère : à la sortie
    // du champ, sinon l'adresse serait réduite dès le premier chiffre de l'ID. L'écouteur du champ
    // passe avant celui du formulaire, qui valide donc la valeur extraite.
    let previousLength = input.value.length;
    input.addEventListener('input', e => {
        const isBlock = e.inputType?.startsWith('insertFrom') || input.value.length - previousLength > 1;
        if (isBlock) applyExtraction();
        previousLength = input.value.length;
    });
    input.addEventListener('change', applyExtraction);
}

// Sortie du mode édition (Annuler, ←, Échap) : confirmation si le profil a été modifié
function requestCancelProfileEdit() {
    const form = document.getElementById('profile-form');
    if (!isProfileFormChanged(form)) {
        leaveProfileEdit().focus();
        return;
    }
    showConfirmDialog({
        title: 'Abandonner les modifications ?',
        text: 'Tes modifications du profil ne seront pas enregistrées.',
        confirmLabel: 'Abandonner',
        cancelLabel: 'Continuer la modification',
        onConfirm: leaveProfileEdit
    });
}

// Retour aux Paramètres ; retourne « Modifier le profil » pour y replacer le focus
function leaveProfileEdit() {
    showApp();
    openSettings();
    return document.getElementById('settings-edit');
}

function cancelProfileEditOnEscape(e) {
    if (!isEscapeKey(e) || isConfirmDialogOpen()) return;
    // Sans preventDefault, le navigateur traiterait ce même Échap comme une demande de fermeture
    // de la confirmation qui vient de s'ouvrir, et la refermerait aussitôt
    e.preventDefault();
    requestCancelProfileEdit();
}

// Lit les valeurs du formulaire (espaces de début et fin retirés, ID extrait d'une adresse)
function readProfileForm(form) {
    const value = name => (form.elements.namedItem(name).value || '').trim();
    return {
        name: value('name'),
        swimrankingsId: extractAthleteId(value('swimrankingsId')),
        gender: value('gender'),
        birthYear: value('birthYear'),
        club: value('club')
    };
}

// Valide un champ et affiche ou efface son message d'erreur ; retourne true si valide
function validateProfileField(form, key) {
    const message = PROFILE_VALIDATORS[key](readProfileForm(form)[key]);
    const errorEl = document.getElementById(`profile-${key}-error`);
    errorEl.textContent = message ? `⚠️ ${message}` : '';
    errorEl.hidden = !message;

    if (key === 'gender') {
        const group = document.getElementById('profile-gender');
        group.classList.toggle('segmented--invalid', !!message);
        group.setAttribute('aria-invalid', !!message);
    } else {
        const input = form.elements.namedItem(key);
        input.classList.toggle('form-input--invalid', !!message);
        input.setAttribute('aria-invalid', !!message);
    }
    return !message;
}

// Valide tous les champs ; retourne les champs en erreur
function validateAllProfileFields(form) {
    return Object.keys(PROFILE_VALIDATORS).filter(key => !validateProfileField(form, key));
}

// Place le focus sur un champ du formulaire (premier bouton radio pour le genre)
function focusProfileField(form, key, { scroll = false } = {}) {
    const field = key === 'gender' ? form.querySelector('input[name="gender"]') : form.elements.namedItem(key);
    field.focus({ preventScroll: scroll });
    if (scroll) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        (key === 'gender' ? document.getElementById('profile-gender') : field)
            .scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
}

function setProfileSubmitState(label, disabled) {
    const button = document.getElementById('profile-submit');
    if (!button) return;
    button.textContent = label;
    button.disabled = disabled;
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    if (profileFormBusy) return; // Évite le double envoi

    const form = e.currentTarget;
    const isCreate = !profile;
    const previousId = profile?.swimrankingsId;
    form.dataset.submitted = '1';
    document.getElementById('profile-form-error').innerHTML = '';

    const invalidKeys = validateAllProfileFields(form);
    if (invalidKeys.length > 0) {
        focusProfileField(form, invalidKeys[0], { scroll: true });
        return;
    }

    profileFormBusy = true;
    setProfileSubmitState('⏳ Enregistrement…', true);

    // Les champs optionnels vides ne sont pas stockés
    const values = readProfileForm(form);
    const newProfile = { name: values.name, swimrankingsId: values.swimrankingsId, gender: values.gender };
    if (values.birthYear) newProfile.birthYear = values.birthYear;
    if (values.club) newProfile.club = values.club;

    try {
        profile = saveProfile(newProfile);
    } catch (err) {
        document.getElementById('profile-form-error').innerHTML =
            `<div class="error-box">✗ ${escapeHtml(err.message)}</div>`;
        profileFormBusy = false;
        setProfileSubmitState('Enregistrer', false);
        return;
    }

    if (isCreate) clearLegacyData(); // Profil v1 repris ou remplacé
    if (!isCreate && profile.swimrankingsId !== previousId) clearSyncedTimes();

    // Les temps se chargent en arrière-plan : l'app s'affiche sans les attendre
    if (profile.swimrankingsId !== previousId) {
        loadSwimmerForProfile();
    }

    if (isCreate) {
        setProfileSubmitState("✓ C'est parti !", true);
        await Promise.all([appReady, new Promise(resolve => setTimeout(resolve, CREATE_SUCCESS_DELAY_MS))]);
        showApp('times');
        document.querySelector('.nav-tab.active').focus();
    } else {
        leaveProfileEdit().focus();
        showToast('✓ Profil mis à jour');
    }
}

// Écran de formulaire : masque onglets, Paramètres et boutons du header
function showSetupScreen() {
    document.body.classList.remove('settings-active');
    document.removeEventListener('keydown', closeSettingsOnEscape);
    document.getElementById('header-settings').setAttribute('aria-pressed', 'false');
    document.body.classList.add('setup-active');
    window.scrollTo(0, 0);
}

// Charge les temps du nageur depuis swimmers-data.json.
// Seul le chargement le plus récent est pris en compte (changement d'ID pendant un chargement).
// TODO Phase 3 : remplacer par getPBs() / getSeasonTimes()
let swimmerLoadId = 0;
async function loadSwimmerForProfile() {
    const loadId = ++swimmerLoadId;
    const { swimrankingsId } = profile;
    swimmer = null;
    swimmerDataStatus = 'loading';
    refreshDataViews();

    let result = null;
    let status = 'loaded';
    try {
        result = await fetchSwimmerData(swimrankingsId);
    } catch (err) {
        status = err.message === 'not-found' ? 'not-found' : 'error';
        console.log(`ℹ️ Pas de temps pour l'ID ${swimrankingsId} (${status})`);
    }

    if (loadId !== swimmerLoadId) return; // Un chargement plus récent a été lancé
    swimmer = result;
    swimmerDataStatus = status;
    refreshDataViews();
}

// Met à jour tout ce qui dépend des temps, sans changer d'écran
function refreshDataViews() {
    if (!profile) return;
    updateTimesDisplay();
    updateProgressDisplay();
    if (document.body.classList.contains('settings-active')) updateSettingsData();
    if (document.getElementById('swimmer-popup').style.display !== 'none') renderSwimmerPopupContent();
}

// Quitte le formulaire et affiche les onglets
function showApp(tabId) {
    document.removeEventListener('keydown', cancelProfileEditOnEscape);
    document.body.classList.remove('setup-active');
    document.getElementById('setup-screen').innerHTML = '';
    document.getElementById('select-gender').value = GENDER_TO_APP[profile.gender];

    updateHeaderAvatar();
    refreshDataViews();
    if (tabId) showTab(tabId);
    window.scrollTo(0, 0);
}

// =============================================================================
// INIT
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    profile = getProfile();
    appReady = loadTimeStandards().then(initializePoolSelectors);

    if (profile) {
        clearLegacyData(); // Un profil v2 valide remplace définitivement le profil v1
        // L'app s'affiche tout de suite (genre, avatar) ; les temps arrivent ensuite
        showApp();
        loadSwimmerForProfile();
    } else {
        // Sans profil valide, le formulaire s'affiche et les onglets restent bloqués
        renderProfileForm('create');
    }

    await appReady;
    refreshDataViews();
});
