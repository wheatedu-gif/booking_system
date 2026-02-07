# 智慧預約系統 (Smart Booking System)

這是一個基於 **React + Supabase** 的全功能預約管理系統。

## 🚀 部署指南

### 步驟 1：Supabase 資料庫
1.  執行 `INITIAL_SETUP.sql` 建立所有資料表。
2.  在 **Authentication > Users** 建立一個管理員帳號。

### 步驟 2：Email 通知 (GitHub 自動部署)
本專案已設定 GitHub Actions，只要您將代碼推送到 GitHub，它會自動部署發信功能到 Supabase。

**請務必在 GitHub 專案的 Settings > Secrets > Actions 設定以下三個祕鑰：**
1.  `SUPABASE_ACCESS_TOKEN`: [在這裡產生](https://supabase.com/dashboard/account/tokens)。
2.  `SUPABASE_PROJECT_ID`: 您的專案 ID (例如 `abcdefljslkdjf`)。
3.  **注意**：請確保 `SUPABASE_PROJECT_ID` 是正確的英數字 ID，不是專案名稱。

### 步驟 3：Netlify 部署 (解決 404 問題)
1.  連結 GitHub 儲存庫。
2.  設定環境變數 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。
3.  **重新整理頁面 404 解決方法**：本專案已內建 `netlify.toml` 與 `public/_redirects`。建置完成後，Netlify 會自動處理 SPA 路由，確保重新整理不再出錯。

---

## 🛠️ 常見問題排查 (Troubleshooting)

### Q: GitHub Action 顯示 "Run failed"？
*   **原因 1**: `SUPABASE_ACCESS_TOKEN` 過期或填錯。
*   **原因 2**: `SUPABASE_PROJECT_ID` 填成專案名稱了。請檢查網址列：`project/YOUR_ID_HERE`。
*   **如何查看錯誤**: 點擊 GitHub 的 **Actions** 標籤 -> 點擊失敗的紀錄 -> 展開 **Deploy functions** 步驟查看具體報錯。

### Q: Email 主旨還是亂碼？
*   請確保您已經成功部署了最新的 `supabase/functions/notify/index.ts`。
*   本版本已改用 **RFC 2047 Base64 編碼**，能完美相容 Gmail。
