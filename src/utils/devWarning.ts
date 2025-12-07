/**
 * 開発モードでの本番データ操作に関する警告ユーティリティ
 * 
 * ローカル開発環境で本番Firestoreデータを扱う際の警告を表示します。
 */

/**
 * 開発モードかどうかを判定
 */
const isDevelopment = import.meta.env.DEV;
const isUsingProduction = import.meta.env.VITE_USE_EMULATOR === 'false';

/**
 * 本番環境に接続しているかどうかを判定
 */
export const isProductionFirebase = isDevelopment && isUsingProduction;

/**
 * 書き込み操作前の警告を表示
 * @param operation 操作名（例: "ゲーム作成", "選手更新"）
 * @param collection コレクション名（例: "games", "players"）
 * @param documentId ドキュメントID（オプション）
 * @returns 操作を続行するかどうか（現在は常にtrue、将来的に確認ダイアログを追加可能）
 */
export const warnBeforeWrite = (
  operation: string,
  collection: string,
  documentId?: string
): boolean => {
  if (!isProductionFirebase) {
    return true; // エミュレータ使用時は警告不要
  }

  const message = `⚠️ [開発モード] 本番データへの書き込み操作を実行します
操作: ${operation}
コレクション: ${collection}${documentId ? `\nドキュメントID: ${documentId}` : ''}

本番データを変更する可能性があります。操作を続行しますか？`;

  console.warn(message);
  
  // 将来的に確認ダイアログを表示する場合は、ここで実装
  // const confirmed = window.confirm(message);
  // return confirmed;

  return true; // 現在は警告のみで続行
};

/**
 * 削除操作前の警告を表示（より厳重）
 */
export const warnBeforeDelete = (
  collection: string,
  documentId: string
): boolean => {
  if (!isProductionFirebase) {
    return true;
  }

  const message = `🚨 [開発モード] 本番データの削除操作を実行しようとしています
コレクション: ${collection}
ドキュメントID: ${documentId}

⚠️ この操作は取り消せません！本当に削除しますか？`;

  console.error(message);
  
  // 削除操作は確認ダイアログを表示（将来的に実装）
  // const confirmed = window.confirm(message);
  // return confirmed;

  return true; // 現在は警告のみで続行
};

/**
 * 開発モードでの接続状態をログに表示
 */
export const logConnectionStatus = (): void => {
  if (isDevelopment) {
    if (isProductionFirebase) {
      console.warn(
        '⚠️ [開発モード] 本番Firebaseに接続しています。\n' +
        'データの書き込み操作には十分注意してください。\n' +
        'エミュレータを使用する場合は、.envファイルで VITE_USE_EMULATOR=true を設定してください。'
      );
    } else {
      console.log('✅ [開発モード] Firebaseエミュレータに接続しています。');
    }
  }
};

