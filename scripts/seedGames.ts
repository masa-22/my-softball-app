import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import type { Game } from '../src/types/Game';

// TODO: 環境変数や設定ファイルから取得する
const firebaseConfig = {
  apiKey: 'AIzaSyDfJf4fJfJfJfJfJfJfJfJfJfJfJfJfJfJf',
  authDomain: 'softball-app-12345.firebaseapp.com',
  projectId: 'softball-app-12345',
  storageBucket: 'softball-app-12345.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:123456789',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 任意のGameオブジェクトを投入する関数
export async function seedGame(game: Game) {
  const ref = doc(db, 'games', game.gameId);
  await setDoc(ref, game);
  console.log(`Seeded game: ${game.gameId}`);
}

// CLI: 引数にJSONファイルパスを渡すと、その内容を投入
async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.log('Usage: ts-node scripts/seedGames.ts <path-to-game.json>');
    return;
  }
  const fs = await import('fs/promises');
  const raw = await fs.readFile(jsonPath, 'utf-8');
  const game = JSON.parse(raw) as Game;

  await seedGame(game);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});