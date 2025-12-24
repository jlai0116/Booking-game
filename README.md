# 🏖️ 海景民宿訂房系統 (Booking Game)

這是一個現代化、響應式的民宿線上訂房系統，結合了 React 前端與 Google Sheets/Apps Script 無伺服器後端。

## ✨ 特色功能

*   **兩階段訂房流程**：
    1.  **即時計價**：選擇日期與人數後，立即計算精確房價（含加床、加人、寵物費）。
    2.  **資料確認**：檢視費用明細並填寫聯絡資料。
*   **自動鎖房機制**：自動偵測並鎖定已售出的日期，防止重複訂房。
*   **靈活計價模型**：支援平日/假日/過年不同費率，以及複雜的加人/加床規則。
*   **Google 生態整合**：使用 Google Sheets 作為資料庫，Google Apps Script 作為後端 API，免維護伺服器。

## 🛠️ 技術棧

*   **前端**：React, Vite, CSS Modules (Glassmorphism Design)
*   **後端**：Google Apps Script (GAS)
*   **資料庫**：Google Sheets

---

## 🚀 快速開始

### 1. 前置需求

*   Node.js (v16+)
*   Google 帳號 (用於建立後端)

### 2. 安裝與執行前端

1.  複製專案到本地：
    ```bash
    git clone <your-repo-url>
    cd Booking-game
    ```

2.  安裝依賴：
    ```bash
    npm install
    ```

3.  設定後端 API URL：
    *   在專案根目錄建立 `.env` 檔案（參考 `.env.example`）。
    *   填入你的 GAS Web App URL：
        ```
        VITE_GAS_API_URL=https://script.google.com/macros/s/你的部署ID/exec
        ```
    *   *(注意：在完成後端設定前，您可以先跳過此步)*

4.  啟動開發伺服器：
    ```bash
    npm run dev
    ```

5.  建置生產版本：
    ```bash
    npm run build
    ```

---

## ⚙️ 後端設定 (Google Sheets & GAS)

本專案依賴 Google Sheets 運作。請務必按照詳細指南設定試算表與部署腳本。

📄 **[點擊查看詳細後端設定指南 (backend/SHEETS_SETUP.md)](./backend/SHEETS_SETUP.md)**

主要步驟摘要：
1. 建立新的 Google Sheet。
2. 設定 4 個必要分頁 (`PriceList`, `GlobalSettings`, `HolidayConfig`, `Bookings`)。
3.開啟擴充功能 Apps Script，貼上 `backend/Code.gs` 代碼。
4. 部署為 Web App 並取得 API URL。

---

## 📂 專案結構

```
Booking-game/
├── backend/               # 後端相關檔案
│   ├── Code.gs           # Google Apps Script 原始碼
│   └── SHEETS_SETUP.md   # 後端詳細設定指南
├── src/
│   ├── components/       # React 組件 (BookingWizard, Step1, Step2...)
│   ├── hooks/            # Custom Hooks (useBooking, useRooms)
│   ├── services/         # API 通訊層 (gasApi.js)
│   └── App.jsx           # 主程式入口
├── public/
└── vite.config.js        # Vite 設定
```

## 🤝 貢獻與開發

歡迎提交 Pull Requests 或 Issues 來協助改進這個專案！

---

## 🚀 GitHub Pages 自動部署

本專案已設定 GitHub Actions workflow，每次推送到 `main` 分支時會自動部署到 GitHub Pages。

### 設定步驟：

1.  **啟用 GitHub Pages**：
    *   進入 GitHub Repository 的 **Settings** > **Pages**。
    *   在 "Build and deployment" 下的 Source 選擇 **Deploy from a branch**? 
    *   **注意**：本 Workflow 使用 `github-pages-deploy-action`，它會自動建立/更新一個 `gh-pages` 分支。
    *   因此，請在 Action 首次成功運行後，回來這裡將 Branch 設定為 `gh-pages` / `(root)`。

2.  **設定環境變數 (Secrets)**：
    由於安全原因，我們不能將 `.env` 上傳。你需要將環境變數設定到 GitHub Secrets。
    *   進入 **Settings** > **Secrets and variables** > **Actions**。
    *   點擊 **New repository secret**。
    *   新增以下變數（參考 `.env.example`）：
        *   `VITE_GAS_API_URL`：填入你的 Google Apps Script Web App URL。

3.  **觸發部署**：
    *   只要 Push 代码到 `main` 分支，或者在 Actions 分頁手動觸發 "Deploy to GitHub Pages"，部署流程就會開始。
    *   完成後，你的網站將會在 `https://<your-username>.github.io/<repo-name>/` 上線。

---

*Built with ❤️ for generic booking scenarios.*
