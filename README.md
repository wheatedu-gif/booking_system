# 智慧預約系統 (Smart Booking System)

這是一個基於 **React + Supabase** 的全功能預約管理系統，具備雙軌身份驗證（管理員/會員）、動態表單、CMS 內容管理、以及彈性的預約時段設定功能。

## 🌟 功能特色

*   **雙軌驗證系統**：管理員 (Supabase Auth) 與 一般會員 (自定義 Table) 完全隔離。
*   **動態時段管理**：後台可設定營業時間、午休、特殊公休日。
*   **所見即所得 CMS**：後台直接編輯首頁文案、Logo 與特色圖示。
*   **預約通知系統**：整合 Gmail SMTP，自動發送預約申請、確認與取消通知。

---

## 🚀 快速部署指南

### 步驟 1：設定 Supabase 資料庫
1.  建立 Supabase 專案。
2.  執行根目錄下的 `INITIAL_SETUP.sql`。
3.  在 **Authentication > Users** 建立一個管理員帳號即可登入。

### 步驟 2：設定 Email 通知功能 (必做)
為了讓預約成功時能發送 Email，請完成以下設定：

1.  **取得 Gmail 應用程式密碼**：
    *   進入 Google 帳號設定 > 安全性 > 開啟「兩步驟驗證」。
    *   搜尋「應用程式密碼」，建立一個新的（名稱自訂），取得 **16 位數密碼**。
2.  **建立 Edge Function**：
    *   在 Supabase Dashboard 進入 **Edge Functions**。
    *   點擊 **"Create a new function"**，名稱填入 `notify`。
    *   將本專案 `supabase/functions/notify/index.ts` 的代碼貼入 Online Editor 並儲存。
3.  **設定環境變數**：
    *   在 `notify` 函式的 Settings > Env Variables 中，新增：
        *   `SUPABASE_SERVICE_ROLE_KEY`: (從 Project Settings > API 取得 secret key)。
4.  **在網頁後台啟用**：
    *   登入您的預約系統後台 > **系統與 Email 設定**。
    *   填入 Gmail 帳號與 16 位數密碼，並勾選「**啟用**」。

### 步驟 3：部署到 Netlify
1.  將本專案 Fork 到您的 GitHub。
2.  在 Netlify 匯入專案。
3.  設定環境變數：
    *   `VITE_SUPABASE_URL`: 您的專案 URL。
    *   `VITE_SUPABASE_ANON_KEY`: 您的專案 Anon Key。

---

## 🛠️ 技術堆疊
React, Vite, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Edge Functions)