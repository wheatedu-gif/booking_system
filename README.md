# 智慧預約系統 (Smart Booking System)

基於 **React + Vite + Supabase** 的全功能預約管理系統，支援服務項目管理、線上預約、會員中心、Email 通知等。

---

## 一、本地開發

### 1. 環境需求

- Node.js 18+
- npm 或 pnpm
- Supabase 專案（免費版即可）

### 2. 克隆專案

```bash
git clone https://github.com/scorpioliu0953/booking_system.git
cd booking_system
```

### 3. 安裝相依套件

```bash
npm install
```

### 4. 設定 Supabase

1. 前往 [Supabase](https://supabase.com) 建立新專案（或使用既有專案）。
2. 進入 **SQL Editor**，複製並執行專案根目錄的 `INITIAL_SETUP.sql`，建立所有資料表與 RLS 政策。
3. 前往 **Authentication > Users**，點擊「Add user」建立管理員帳號（Email + 密碼）。

### 5. 設定環境變數

在專案根目錄建立 `.env` 檔：

```env
VITE_SUPABASE_URL=https://您的專案ID.supabase.co
VITE_SUPABASE_ANON_KEY=您的 anon public key
```

- `VITE_SUPABASE_URL`：Supabase 專案的 API URL（可在 Project Settings > API 取得）。
- `VITE_SUPABASE_ANON_KEY`：anon public key（同頁面可取得）。

### 6. 啟動開發伺服器

```bash
npm run dev
```

瀏覽器開啟 `http://localhost:5173`，即可進行本地開發與測試。

### 7. 其他指令

| 指令 | 說明 |
|------|------|
| `npm run build` | 建置生產版本 |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | 執行 ESLint 檢查 |

---

## 二、部署到 Netlify + Supabase

### 步驟 1：Supabase 資料庫

1. 登入 [Supabase Dashboard](https://supabase.com/dashboard)。
2. 建立新專案，記下專案 ID 與 API 金鑰。
3. 進入 **SQL Editor**，將 `INITIAL_SETUP.sql` 內容貼上並執行。
4. 前往 **Authentication > Users**，建立一個管理員帳號（用於登入後台）。

### 步驟 2：Netlify 部署前端

1. 登入 [Netlify](https://netlify.com)，點擊 **Add new site > Import an existing project**。
2. 選擇 **GitHub**，授權後選擇 `scorpioliu0953/booking_system`（或您的 fork）。
3. 建置設定（通常會自動偵測）：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Base directory**: 留空
4. 點擊 **Environment variables**，新增：
   | 變數名稱 | 說明 |
   |----------|------|
   | `VITE_SUPABASE_URL` | Supabase 專案的 API URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon public key |
5. 點擊 **Deploy site** 開始部署。

### 步驟 3：設定 SPA 路由（404 解決）

專案已內建 `netlify.toml` 與 `public/_redirects`，會將所有路徑轉導到 `index.html`，解決重新整理或直接輸入網址時出現 404 的問題。建置後 Netlify 會自動套用。

### 步驟 4：Email 通知（Supabase Edge Function）

本專案使用 GitHub Actions 在 push 時自動部署 `notify` 到 Supabase。

1. 前往 GitHub 專案 **Settings > Secrets and variables > Actions**。
2. 新增兩個 Secrets：

   | Secret 名稱 | 說明 |
   |-------------|------|
   | `SUPABASE_ACCESS_TOKEN` | [Supabase Access Token](https://supabase.com/dashboard/account/tokens) |
   | `SUPABASE_PROJECT_ID` | Supabase 專案 ID（網址列 `project/` 後面的英數字） |

3. 推送程式碼到 `main` 後，Actions 會自動部署 `supabase/functions/notify`。
4. 在系統後台 **設定 > 通知系統** 填寫 SMTP（例如 Gmail 應用程式密碼）即可發送預約通知信。

---

## 三、功能概覽

- **前台**：首頁、立即預約、會員登入/註冊、預約紀錄、個人資料
- **後台**：營運概況、預約管理（列表/日曆）、服務項目管理、會員管理、時段設定、表單自定義、Email 範本、CMS 首頁編輯
- **Email 變數**：`{name}`、`{date}`、`{time}`、`{service}`、`{reason}`、`{details}`

---

## 四、常見問題

### Q: GitHub Action 部署失敗？

- 檢查 `SUPABASE_ACCESS_TOKEN` 是否有效、未過期。
- 確認 `SUPABASE_PROJECT_ID` 為專案 ID（非專案名稱）。
- 在 Actions 頁面點開失敗紀錄，查看錯誤訊息。

### Q: 重新整理頁面出現 404？

- 確認 `netlify.toml` 與 `public/_redirects` 已正確部署。
- Netlify 應會自動套用，若仍異常可檢查 Build 輸出目錄是否為 `dist`。

### Q: Email 主旨亂碼？

- 請確保 `supabase/functions/notify/index.ts` 已成功部署。
- 本專案使用 UTF-8 編碼，與 Gmail SMTP 相容。

---

## License

MIT
