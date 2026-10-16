// Classifica online (Firebase Firestore). Senza configurazione resta disattivata e il gioco funziona lo stesso.
const Leaderboard = (() => {
  const TOP = 20;
  const cfg = window.FIREBASE_CONFIG;
  let db = null;
  if (cfg && window.firebase) {
    try { firebase.initializeApp(cfg); db = firebase.firestore(); } catch (e) { db = null; }
  }

  async function top() {
    const snap = await db.collection('scores').orderBy('score', 'desc').limit(TOP).get();
    return snap.docs.map(d => d.data());
  }

  async function qualifies(score) {
    if (!db || score <= 0) return false;
    const list = await top();
    return list.length < TOP || score > list[list.length - 1].score;
  }

  async function submit(name, score) {
    const clean = (name || '').trim().slice(0, 16) || 'Anonimo';
    await db.collection('scores').add({ name: clean, score: Math.floor(score) });
  }

  return { enabled: !!db, top, qualifies, submit };
})();
