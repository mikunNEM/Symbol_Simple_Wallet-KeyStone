// index.js

import { appState } from "./config.js";
import { autoConnectSSS } from "./sss.js";
import { refreshAccount } from "./account.js";
import { sendTx } from "./transfer.js";
import { loadRecentTx, initLiveTx } from "./transactions.js";
import { initWebSocket } from "./ws.js";
import { initSdk } from "./sdk.js";
import { showPopup } from "./utils.js";

window.addEventListener("load", async () => {

  // ① まず SSS 接続 / ノード選択（ネットワーク判別に必要）
  await autoConnectSSS();

  // ② SDK を初期化
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


  // ⑤ 接続済みなら各種情報を読み込む
  if (window.SSS?.activePublicKey) {
    await loadRecentTx();
    initWebSocket(appState.currentAddress.toString());
    initLiveTx(appState.currentAddress.toString());
  }
});
