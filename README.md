# 智慧預約系統 (Smart Booking System)

這是一個基於 **React + Supabase** 的全功能預約管理系統，具備雙軌身份驗證（管理員/會員）、動態表單、CMS 內容管理、以及彈性的預約時段設定功能。

## 🌟 功能特色

*   **雙軌驗證系統**：
    *   **管理員**：使用 Supabase Auth 登入，擁有完整後台管理權限。
    *   **一般會員**：獨立的客戶帳號系統，需註冊登入後才能預約，並可管理個人預約紀錄。
*   **動態時段管理**：
    *   後台可設定每週營業時間、午休時段。
    *   支援特定日期公休或加班設定。
    *   可自訂預約間隔（如每 30 分鐘或 60 分鐘）。
    *   可限制開放預約的天數範圍。
*   **所見即所得 CMS**：
    *   後台可直接編輯首頁的所有文案與品牌名稱 (Logo)。
    *   支援更換特色區塊的圖示 (Icon Picker)。
*   **完善的預約流程**：
    *   自動過濾不可預約時段。
    *   預約確認與取消機制（含取消原因紀錄）。
    *   一鍵加入 Google 行事曆。
    *   (選用) Email 自動通知功能。

## 🛠️ 技術堆疊

*   **前端**：React, Vite, TypeScript, Tailwind CSS
*   **後端/資料庫**：Supabase (PostgreSQL, Auth, Edge Functions)
*   **部署**：Netlify (推薦) 或 Vercel

---

## 🚀 快速部署指南

### 步驟 1：設定 Supabase 資料庫

1.  登入 [Supabase Dashboard](https://supabase.com/) 並建立一個新專案。
2.  進入專案的 **SQL Editor**。
3.  點擊 **New Query**。
4.  複製本專案根目錄下的 `INITIAL_SETUP.sql` 檔案內容。
5.  貼上並點擊 **Run** 執行。這將會自動建立所有資料表、函數與權限設定。
6.  (重要) 設定您的第一位管理員：
    *   前往 **Authentication** > **Users**，手動新增一個使用者（這將是您的管理員帳號）。
    *   回到 **SQL Editor**，執行以下指令將該帳號升級為管理員：
        ```sql
        UPDATE profiles SET role = 'admin' WHERE email = '您的管理員Email';
        ```

### 步驟 2：部署到 Netlify

我們使用 "Fork & Deploy" 的方式，將程式碼複製到您的 GitHub 並連結至 Netlify。

1.  **Fork 專案**：
    *   在 GitHub 上將本專案 Fork 到您自己的帳號下。

2.  **新增至 Netlify**：
    *   登入 [Netlify](https://www.netlify.com/)。
    *   點擊 **"Add new site"** -> **"Import from an existing project"**。
    *   選擇 **GitHub** 並授權。
    *   選擇您剛剛 Fork 的 `booking_system` 儲存庫。

3.  **設定環境變數 (Environment Variables)**：
    *   在 Netlify 的部署設定頁面，找到 **"Environment variables"** 區塊。
    *   點擊 **"Add a variable"**，新增以下兩組變數（資料來源請見 Supabase > Project Settings > API）：
        *   Key: `VITE_SUPABASE_URL`
            *   Value: 您的 Supabase Project URL (例如 `https://xyz.supabase.co`)
        *   Key: `VITE_SUPABASE_ANON_KEY`
            *   Value: 您的 Supabase `anon` `public` Key
    *   **Build settings** 維持預設：
        *   Build command: `npm run build`
        *   Publish directory: `dist`

4.  **開始部署**：
    *   點擊 **"Deploy booking_system"**。
    *   等待約 1-2 分鐘，Netlify 會提供您一個網址（例如 `https://xxx.netlify.app`），這就是您的系統了！

---

## 📖 使用說明

### 首次進入系統
1.  **管理員**：前往 `/admin/login`，使用您在 Supabase 建立的帳號登入。
2.  **設定網站**：
    *   進入後台 > **網站內容編輯**：修改首頁標題與 Logo。
    *   進入後台 > **預約時段設定**：設定您的營業時間。
3.  **一般用戶**：
    *   前往首頁 `/` 或 `/login` 進行註冊。
    *   登入後即可開始預約。

### 本地開發 (Local Development)

如果您想在電腦上修改程式碼：

1.  複製專案：
    ```bash
    git clone https://github.com/您的帳號/booking_system.git
    cd booking_system
    ```
2.  安裝依賴：
    ```bash
    npm install
    ```
3.  設定環境變數：
    *   複製 `.env` 檔案（如果沒有請自行建立）。
    *   填入 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。
4.  啟動伺服器：
    ```bash
    npm run dev
    ```

---

## 📂 專案結構

*   `/src/pages`: 所有頁面 (Landing, Booking, Admin...)
*   `/src/components`: 共用元件 (Navbar, CMS Templates...)
*   `/src/hooks`: 自定義 Hooks (useAuth, useCustomer)
*   `INITIAL_SETUP.sql`: 資料庫完整初始化腳本
