# 📊 Google Sheets & Apps Script 後端設定指南

本系統使用 Google Sheets 作為資料庫與後端邏輯中心。請仔細按照以下步驟完成設定。

## 第一步：準備 Google Sheet

1.  前往 [Google Sheets](https://sheets.google.com) 建立一個新的試算表。
2.  將試算表命名為 `民宿訂房系統_後端` (或任意名稱)。

## 第二步：建立資料分頁 (必要)

您需要建立以下 **4 個** 分頁，請確保分頁名稱完全一致 (英文大小寫敏感)。

### 1. 分頁名稱：`PriceList` (房型與價目表)

此分頁定義所有房型資訊與基礎價格。

| 欄位 (A~H) | 說明 | 範例數據 |
| :--- | :--- | :--- |
| **roomNumber** | 房號 (唯一 ID) | `201` |
| **roomType** | 房型名稱 | `海景雙人房` |
| **baseCapacity** | 基礎人數 | `2` |
| **extraBeds** | 最大加床數 | `1` |
| **weekdayPrice** | 平日房價 | `3200` |
| **holidayPrice** | 假日房價 | `4800` |
| **cnyPrice** | 過年房價 | `6800` |
| **note** | 備註 | `無敵海景` |

> **提示**：第一列必須是標題，資料從第二列開始。

---

### 2. 分頁名稱：`GlobalSettings` (全域費率設定)

此分頁定義加人、加床、寵物等額外費用規則。

| 欄位 (A~E) | 說明 | A欄Key值 (必須完全一致) | C欄 (平日) | D欄 (假日) | E欄 (過年) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Key** | 設定鍵值 | `extra_bed` | `800` | `1000` | `1200` |
| **Description** | 描述 (選填) | `add_person_5plus` | `500` | `800` | `1000` |
| **Weekday** | 平日費率 | `add_person_5minus` | `300` | `300` | `500` |
| **Holiday** | 假日費率 | `pet_large` | `500` | `500` | `500` |
| **CNY** | 過年費率 | `pet_small` | `300` | `300` | `300` |

> **注意**：程式會讀取 **A欄** 的 Key 來對應費率，請勿更改 Key 的名稱。
> * `extra_bed`: 加床費 (每床/每晚)
> * `add_person_5plus`: 5歲以上加人費 (每人/每晚)
> * `add_person_5minus`: 5歲以下加人費 (每人/每晚)
> * `pet_large`: 大型犬清潔費 (每隻/次)
> * `pet_small`: 小型犬清潔費 (每隻/次)

---

### 3. 分頁名稱：`HolidayConfig` (特殊日期設定)

定義哪些日期是過年或國定假日。

| 欄位 (A~D) | 說明 | 範例 |
| :--- | :--- | :--- |
| **dataType** | 類型 (`CNY` 或 `HOLIDAY`) | `CNY` |
| **startDate** | 開始日期 (YYYY-MM-DD) | `2025-01-28` |
| **endDate** | 結束日期 (YYYY-MM-DD) | `2025-02-02` |
| **description** | 描述 | `春節連假` |

> **規則優先級**：
> 1. `CNY` (過年) - 最高優先
> 2. `HOLIDAY` (國定假日)
> 3. 寒暑假邏輯 (程式內建：1,2,7,8月 週五六日為假日)
> 4. 一般週末 (週五六為假日)
> 5. 平日

---

### 4. 分頁名稱：`Bookings` (訂單資料庫)

此分頁用於儲存所有訂單。**您不需要手動輸入資料**，但可以在此查看測試結果。
系統會自動建立標題列，包含：
* `createdAt`, `name`, `phone`, `roomNumber` ... `totalAmount` 等。

---

## 第三步：部署 Google Apps Script

1.  在 Google Sheet 上方選單，點選 **擴展功能 (Extensions)** > **Apps Script**。
2.  將 `Code.gs` (位於專案 `backend/` 資料夾) 的完整代碼複製並貼上到編輯器中，覆蓋原本的內容。
3.  點選上方「磁碟片」圖示儲存專案，命名為 `BookingBackend`。

### 部署為 Web API

1.  點選右上角的 **部署 (Deploy)** > **新增部署 (New deployment)**。
2.  點選左側齒輪圖示 > 選擇 **網頁應用程式 (Web app)**。
3.  設定如下：
    *   **描述**：`Initial Deploy` (或任意描述)
    *   **執行身分 (Execute as)**：**我 (Me)** (您的 Google 帳號)
    *   **誰可以存取 (Who has access)**：**所有人 (Anyone)**
        *   *(重要：這允許您的前端網站呼叫 API，無需使用者登入 Google)*
4.  點選 **部署 (Deploy)**。
5.  第一次部署需要 **授權 (Authorize access)**：
    *   點選您的帳號。
    *   出現「Google 尚未驗證此應用程式」警告時，點選 **進階 (Advanced)** > **前往... (Go to...) (unsafe)**。
    *   點選 **允許 (Allow)**。
6.  **複製網頁應用程式網址 (Web app URL)**。
    *   格式應為：`https://script.google.com/macros/s/......./exec`

## 第四步：連接前端

1.  回到您的本地專案資料夾。
2.  開啟或建立 `.env` 檔案。
3.  將剛剛複製的 URL 填入：
    ```
    VITE_GAS_API_URL=https://script.google.com/macros/s/您的長串ID/exec
    ```
4.  重新啟動前端伺服器 (`npm run dev`)。

設定完成！🎉 您現在可以開始測試訂房流程了。
