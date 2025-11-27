type Tournament = {
  id: string;
  year: string;
  name: string;
  type: 'トーナメント' | 'リーグ' | string;
  createdAt?: string;
};

let tournaments: Tournament[] = [];

const load = () => {
  try {
    const raw = localStorage.getItem('tournaments');
    if (raw) {
      tournaments = JSON.parse(raw);
      return;
    }
  } catch (e) {
    console.warn('tournaments load error', e);
  }
  tournaments = [];
  persist();
};

const persist = () => {
  try {
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
  } catch (e) {
    console.warn('tournaments save error', e);
  }
};

load();

export const getTournaments = (): Tournament[] => tournaments.slice();

export const searchTournaments = async (params: { year?: string; name?: string }) : Promise<Tournament[]> => {
  const year = (params.year || '').trim();
  const name = (params.name || '').trim().toLowerCase();
  return tournaments.filter(t => {
    const matchYear = year ? t.year === year : true;
    const matchName = name ? t.name.toLowerCase().includes(name) : true;
    return matchYear && matchName;
  }).sort((a,b) => (a.year + a.name).localeCompare(b.year + b.name));
};

export const registerTournament = async (data: { year: string; name: string; type: Tournament['type'] }) : Promise<Tournament> => {
  const year = (data.year || '').trim();
  const name = (data.name || '').trim();
  const type = (data.type || '').trim() as Tournament['type'];

  if (!year || !name || !type) {
    const err = new Error('すべてのフィールドを入力してください。');
    (err as any).code = 'INVALID_INPUT';
    throw err;
  }

  // 重複チェック（年＋大会名）
  const exists = tournaments.find(t => t.year === year && t.name === name);
  if (exists) {
    const err = new Error('同じ年と大会名の組合せは既に登録されています。');
    (err as any).code = 'DUPLICATE';
    throw err;
  }

  // id 決定: t01, t02, ...
  const maxNum = tournaments.reduce((max, t) => {
    const m = t.id.match(/^t0*([0-9]+)$/);
    const n = m ? Number(m[1]) : 0;
    return Math.max(max, n);
  }, 0);
  const next = maxNum + 1;
  const id = `t${String(next).padStart(2, '0')}`;

  const newT: Tournament = { id, year, name, type, createdAt: new Date().toISOString() };
  tournaments.push(newT);
  persist();
  return newT;
};
