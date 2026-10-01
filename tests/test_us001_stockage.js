// Tests unitaires US-001 : stockage du profil (node tests/test_us001_stockage.js)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
let store = {}, failSet = false, failAll = false;
global.localStorage = {
  getItem(k){ if (failAll) throw new Error('SecurityError'); return k in store ? store[k] : null; },
  setItem(k,v){ if (failAll||failSet) throw new Error('QuotaExceededError'); store[k]=String(v); },
  removeItem(k){ if (failAll) throw new Error('SecurityError'); delete store[k]; }
};
console.warn = console.error = () => {};
// Section « STOCKAGE LOCAL » d'app.js, exécutée seule avec un faux localStorage
const appJs = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = appJs.indexOf('// STOCKAGE LOCAL');
const end = appJs.indexOf('// SWIMMERS DATA');
if (start < 0 || end < start) throw new Error("Section STOCKAGE LOCAL introuvable dans app.js");
const api = new Function(appJs.slice(start, end) + '\nreturn {getProfile,saveProfile,clearAllData};')();
const { getProfile, saveProfile, clearAllData } = api;
const p = { name:'Ava Hehlen', swimrankingsId:'5332548', gender:'F', birthYear:'2010', club:'Lausanne Aquatique' };

const s1 = saveProfile(p);
assert.deepStrictEqual(JSON.parse(store.swimtimes_profile), s1);
assert.strictEqual(getProfile().name, 'Ava Hehlen');
assert.ok(s1.createdAt && s1.updatedAt);

// createdAt figé, updatedAt mis à jour (horloge décalée de 5 s)
const RealDate = Date, t0 = RealDate.now();
global.Date = class extends RealDate { constructor(...a){ super(...(a.length ? a : [t0 + 5000])); } };
const s2 = saveProfile({ ...p, club:'Red Fish' });
global.Date = RealDate;
assert.strictEqual(s2.createdAt, s1.createdAt);
assert.notStrictEqual(s2.updatedAt, s1.updatedAt);
assert.strictEqual(getProfile().club, 'Red Fish');

store = {}; assert.strictEqual(getProfile(), null);
store.swimtimes_profile = '{pas du json'; assert.strictEqual(getProfile(), null);
store.swimtimes_profile = '"texte"'; assert.strictEqual(getProfile(), null);
store.swimtimes_profile = JSON.stringify({ name:'X' }); assert.strictEqual(getProfile(), null);

store = { swimtimes_profile:'{}', swimtimes_pb:'{}', swimtimes_season:'{}', autre:'1' };
clearAllData(); assert.deepStrictEqual(store, { autre:'1' });

store = {}; failSet = true;
assert.throws(() => saveProfile(p), /Impossible d'enregistrer sur cet appareil/);
assert.deepStrictEqual(store, {}); failSet = false;

failAll = true;
assert.strictEqual(getProfile(), null);
assert.throws(() => saveProfile(p), /Impossible d'enregistrer/);
assert.throws(() => clearAllData(), /Impossible de supprimer/);
console.log('✅ US-001 : tous les tests passent');
