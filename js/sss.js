// sss.js
// SSS Extension との接続と、それを起点にした Node / SDK の初期化

import { appState, NetworkType } from "./config.js";
import { selectNode } from "./nodeSelector.js";
import { initSdk } from "./sdk.js";
import { setStatus, setText } from "./ui.js";
import { refreshAccount } from "./account.js";
import { loadRecentTx } from "./transactions.js";

/* ------------------------------------------------------
  ネットワーク名表示
------------------------------------------------------ */
function networkLabel(nt) {
  return nt === NetworkType.TESTNET ? "Testnet" : "Mainnet";
}

/* ------------------------------------------------------
  多重実行防止 + ネットワーク確定フラグ
------------------------------------------------------ */
let isConnecting = false;
let isConnectedOnce = false;        // ← 1回だけ実行
let lockedNetworkType = null;       // ← 途中で Testnet に変わらないようロック

/* ------------------------------------------------------
  内部接続処理（SSS専用：自動 / 手動）
------------------------------------------------------ */
async function internalConnect(isAuto) {

  // --- 完全に1回だけ実行 ---
  if (isConnecting || isConnectedOnce) return;
  isConnecting = true;

  try {
    // SSS 未インストール
    if (!window.SSS) {
      if (!isAuto) setStatus("sss-status", "SSS Extension が見つかりません。", "error");
      return;
    }

    const pubKey = window.SSS.activePublicKey;
    const detectedNetworkType = Number(window.SSS.activeNetworkType);

    if (!pubKey || ![NetworkType.MAINNET, NetworkType.TESTNET].includes(detectedNetworkType)) {
      if (!isAuto) {
        setStatus("sss-status", "SSS のポップアップでアカウントを選択してください。", "error");
      }
      return;
    }

    // --- ネットワークタイプをロックする ---
    if (!lockedNetworkType) lockedNetworkType = detectedNetworkType;
    const networkType = lockedNetworkType;

    // --- 状態をセット ---
    appState.currentPubKey = pubKey;
    appState.networkType = networkType;

    const isTestnet = networkType === NetworkType.TESTNET;
    setText("network-label", networkLabel(networkType));

    /* ------------------------------------------------------
      1. NodeWatch でノード選択
    ------------------------------------------------------ */
    appState.NODE = await selectNode(isTestnet);

    console.log("sss.js  Selected NODE:", appState.NODE);

    /* ------------------------------------------------------
      2. SDK 初期化（選択した NODE に接続）
    ------------------------------------------------------ */
    await initSdk();

    /* ------------------------------------------------------
      3. 公開アカウント生成
    ------------------------------------------------------ */
    const pub = new appState.sdkCore.PublicKey(pubKey);
    const publicAccount = appState.facade.createPublicAccount(pub);
    appState.currentAddress = publicAccount.address;

    setText("account-address", publicAccount.address.toString());
    setStatus("sss-status", "SSS と接続済み", "success");

    /* ------------------------------------------------------
      4. UI ボタンの有効化
    ------------------------------------------------------ */
    ["btn-transfer", "btn-update-meta"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    /* ------------------------------------------------------
      5. アカウント情報 / TX を読み込み
    ------------------------------------------------------ */
    await refreshAccount();

    await loadRecentTx();

    // --- 完全に接続完了 ---
    isConnectedOnce = true;

  } catch (e) {
    console.error("internalConnect error:", e);
  } finally {
    isConnecting = false;
  }
}

/* ------------------------------------------------------
  Keystone 接続処理（新規追加）
------------------------------------------------------ */
export async function initKeystone() {

  // Keystone の情報
  const acc = window.catapult?.activeAccount;
  if (!acc) {
    console.warn("Keystone activeAccount が取得できません");
    return;
  }

  // ---------------------------
  // 0. appState に情報をセット
  // ---------------------------
  appState.currentPubKey = acc.publicKey;
  appState.networkType = acc.networkType;
  appState.currentAddress = acc.address;

  setText("network-label", networkLabel(acc.networkType));
  setText("account-address", acc.address);

  // ---------------------------
  // 1. NodeWatch でノード選択
  // ---------------------------
  const isTestnet = acc.networkType === NetworkType.TESTNET;
  appState.NODE = await selectNode(isTestnet);

  console.log("Keystone  Selected NODE:", appState.NODE);

  // ---------------------------
  // 2. SDK 初期化
  // ---------------------------
  await initSdk();

  // ---------------------------
  // 3. アカウント情報 / TX 読み込み
  // ---------------------------
  await refreshAccount();
  await loadRecentTx();

  // UI 表示（SSS と同じスタイル）
  setStatus("sss-status", "Keystone と接続済み", "success");

  // UI ボタン有効化
  ["btn-transfer", "btn-update-meta"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });

  console.log("Keystone connect complete:", appState);
}

/* ------------------------------------------------------
  自動接続（activePublicKey があれば即接続）
------------------------------------------------------ */
export async function autoConnectSSS() {
  await internalConnect(true);
}
