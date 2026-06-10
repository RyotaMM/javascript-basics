import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
const db = getFirestore();

// Geocoding API キーは Secret として保持 (クライアントには露出させない)
const GEOCODING_API_KEY = defineSecret('GEOCODING_API_KEY');
const REGION = 'asia-northeast1';

/**
 * 店舗の住所→緯度経度変換。
 * geocodeStatus が 'pending' の場合のみ実行し、結果をキャッシュ的に書き戻す。
 * 住所が変わらない再書き込みでは再変換しない (無駄なAPIコストを防ぐ)。
 */
export const geocodeStore = onDocumentWritten(
  {
    document: 'stores/{storeId}',
    region: REGION,
    secrets: [GEOCODING_API_KEY],
  },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return; // 削除
    if (after.geocodeStatus !== 'pending') return; // 既に確定済み
    if (!after.address) return;

    const url =
      'https://maps.googleapis.com/maps/api/geocode/json' +
      `?address=${encodeURIComponent(after.address)}` +
      `&language=ja&region=jp&key=${GEOCODING_API_KEY.value()}`;

    let lat = null;
    let lng = null;
    let status = 'failed';
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK' && json.results?.[0]) {
        lat = json.results[0].geometry.location.lat;
        lng = json.results[0].geometry.location.lng;
        status = 'ok';
      }
    } catch (e) {
      console.error('geocode error', e);
    }

    await event.data.after.ref.update({
      lat,
      lng,
      geocodeStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
    });
  },
);

/**
 * 管理者によるスタッフ/管理者アカウント発行。
 * サインアップは無効なので、アカウントは必ずこの経路で作る。
 */
export const createUser = onCall({ region: REGION }, async (request) => {
  // 呼び出し元が admin か確認
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'ログインが必要です');
  const caller = await db.collection('users').doc(callerUid).get();
  if (caller.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', '管理者のみ実行できます');
  }

  const { email, password, name, role } = request.data ?? {};
  if (!email || !password || !name || !['admin', 'staff'].includes(role)) {
    throw new HttpsError('invalid-argument', '入力値が不正です');
  }

  const userRecord = await getAuth().createUser({ email, password, displayName: name });
  // ロール/無効フラグをカスタムクレームにも持たせる(Security Rulesでの users 読み取りを省く)
  await getAuth().setCustomUserClaims(userRecord.uid, { role, disabled: false });
  await db.collection('users').doc(userRecord.uid).set({
    email,
    name,
    role,
    disabled: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { uid: userRecord.uid };
});

/**
 * 既存ユーザーの users ドキュメントの role/disabled をカスタムクレームに同期(admin)。
 * コンソールで role/disabled を直接編集した後や、claim 導入時の一括反映に使う。
 * 反映は対象ユーザーの次回トークン更新(再ログイン等)後に有効。
 */
export const syncUserClaims = onCall({ region: REGION }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) throw new HttpsError('unauthenticated', 'ログインが必要です');
  const caller = await db.collection('users').doc(callerUid).get();
  if (caller.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', '管理者のみ実行できます');
  }
  const snap = await db.collection('users').get();
  let count = 0;
  for (const docSnap of snap.docs) {
    const d = docSnap.data();
    await getAuth().setCustomUserClaims(docSnap.id, {
      role: d.role === 'admin' ? 'admin' : 'staff',
      disabled: d.disabled === true,
    });
    count += 1;
  }
  return { synced: count };
});
