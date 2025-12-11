// index.js（元コードはすべて残し、Keystone 対応を追加）

// index.js（元コードはすべて残し、Keystone 対応を追加）

import { appState } from "./config.js";
import { autoConnectSSS, initKeystone } from "./sss.js"; // ← Keystone 初期化追加
import { refreshAccount } from "./account.js";
import { sendTx } from "./transfer.js";
import { loadRecentTx, initLiveTx } from "./transactions.js";
import { initWebSocket } from "./ws.js";
import { initSdk } from "./sdk.js";
import { showPopup } from "./utils.js";

// --------------------------------------
// デバイス判定（最小限のロジック）
// --------------------------------------
function isMobile() {
  return window.innerWidth <= 768;
}

window.addEventListener("load", async () => {

  // --------------------------------------
  // Keystone / SSS の存在チェック
  // --------------------------------------
  const hasKeystone = !!window.catapult?.activeAccount;
  const hasSSS = !!window.SSS?.activePublicKey;

  console.log("Detected:", { hasKeystone, hasSSS });

  // --------------------------------------
  // 📱 モバイルなら Keystone 優先
  // --------------------------------------
  if (isMobile()) {
    if (hasKeystone) {
      console.log("📱 Keystone モードで起動");
      await initKeystone();
    } else {
      showPopup(
        "📱 モバイル環境では Keystone が必要です。<br>Keystone アプリから開いてください。",
        true
      );
      return;
    }

  } else {
    // --------------------------------------
    // 💻 PC は SSS を優先
    // --------------------------------------
    console.log("💻 SSS モードで起動");
    await autoConnectSSS();

    if (!hasSSS && !window.SSS?.activePublicKey) {
      showPopup(
        "⚠️ SSS Extension とリンクしてください 🔗<br>Symbol アカウントを選択する必要があります。",
        true
      );
      return;
    }
  }

  // --------------------------------------
  // Keystone も SSS もセットされなかった場合
  // --------------------------------------
  if (!appState.currentPubKey) {
    showPopup(
      "⚠️ SSS Extension または Keystone で開いてください。",
      true
    );
    return;
  }

  // --------------------------------------
  // SDK 初期化（元コードのまま）
  // --------------------------------------
  await initSdk();

  // ========= イベント登録 =========

  document.getElementById("refresh-account")
    ?.addEventListener("click", refreshAccount);

  document.getElementById("btn-transfer")
    ?.addEventListener("click", sendTx);

  document.getElementById("reload-tx")
    ?.addEventListener("click", loadRecentTx);

  document.getElementById("copy-address-btn")?.addEventListener("click", () => {
    const addr = document.getElementById("account-address").textContent;

    navigator.clipboard.writeText(addr)
      .then(() => {
        showPopup("アドレスをコピーしました");
      })
      .catch(() => {
        showPopup("コピーに失敗しました", true);
      });
  });

  // --------------------------------------
  // ⑤ 接続済みなら TX 情報を読み込む
  // --------------------------------------

  if (appState.currentAddress) {
    await loadRecentTx();

    initWebSocket(appState.currentAddress.toString());
    initLiveTx(appState.currentAddress.toString());
  }
});
