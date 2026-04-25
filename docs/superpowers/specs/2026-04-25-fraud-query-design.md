# 詐騙帳號查詢網頁 — 設計文件

**日期**:2026-04-25
**狀態**:設計已確認,待實作

## 目標

讓使用者可以提報遇到的 Threads / IG 詐騙帳號(附截圖跟描述),並讓其他人可以查詢某帳號是否曾被提報為詐騙。

## 核心使用情境

1. **提報情境(有詐騙 tag)**:小明遇到代購詐騙,把詐騙帳號 + 對話截圖 + 一句說明貼上來,讓其他人不要再被騙。
2. **查詢情境(找詐騙 tag)**:小華準備跟某帳號交易前,先到網站搜一下這個帳號,看是不是已經被別人提報過。

## 範圍邊界(MVP)

**做**
- 兩個 tab:有詐騙(提報)/ 找詐騙(搜尋)
- 提報:輸入帳號 + 簡短描述 + 上傳最多 3 張截圖
- 搜尋:輸入帳號 → 命中跳警告框並列出所有提報、未命中跳「待觀察」提醒
- 部署到 Vercel,任何人都能瀏覽跟提報
- 圖片上傳前在瀏覽器自動壓縮

**不做(MVP 範圍外)**
- 使用者註冊/登入
- 管理員審核或刪除流程
- 防 spam 機制
- 檢舉功能
- 手機原生 App
- SEO 優化
- 國際化(只做繁體中文)

## 技術選型

| 項目 | 選擇 | 理由 |
|------|------|------|
| 前後端框架 | Next.js 15 (App Router) + TypeScript | 全端在一個專案,部署簡單 |
| 資料庫 | Supabase PostgreSQL | 免費 500MB,內建 client library |
| 圖片儲存 | Supabase Storage | 免費 1GB,跟 DB 同帳號 |
| 樣式 | Tailwind CSS | 快速做出極簡圓角風 |
| 圖片壓縮 | `browser-image-compression` | 上傳前壓縮,延長免費額度壽命 |
| 部署 | Vercel | 使用者已有帳號 |

## 路由結構

| 路徑 | 內容 |
|------|------|
| `/` | 重導向至 `/search` |
| `/search` | 找詐騙(搜尋頁,預設 tab) |
| `/report` | 有詐騙(提報頁) |

兩個頁面共用 header(標題 + tab 切換)。tab 切換 = 路由切換。

## 視覺風格

極簡圓角派(Style C):
- 背景米白 / 灰白 (#f4f6fb)
- 卡片白底圓角 16px
- 主色:深灰文字 (#1f2937)
- 警告色:不刺眼的紅(警告卡內)
- 字體:system UI

詳見 `.superpowers/brainstorm/244-1777094565/content/layout-overview.html` 的 mockup。

## 資料模型

### Table: `reports`

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid (PK, default `gen_random_uuid()`) | 主鍵 |
| `account` | text, NOT NULL | 正規化後的帳號(小寫、去 @、trim) |
| `account_display` | text, NOT NULL | 使用者輸入的原始帳號(顯示用) |
| `description` | text, NOT NULL, 1~500 字 | 簡短描述 |
| `image_paths` | text[], default `'{}'` | Storage 路徑陣列,最多 3 個 |
| `created_at` | timestamptz, default `now()` | 自動填入 |

**Index**:`CREATE INDEX reports_account_idx ON reports (account)` — 加速搜尋

### Storage Bucket: `report-images`

- **公開讀取**(任何人都能看圖片)
- **匿名寫入**(透過 anon key 用 RLS 控制)
- 檔案路徑格式:`{report_id}/{index}.webp`

### RLS 政策

`reports` table:
- `SELECT`:任何人都可以(public read)
- `INSERT`:任何人都可以(public insert,沒登入也能用)
- `UPDATE` / `DELETE`:都禁止(MVP 不開放編輯/刪除)

`report-images` bucket:
- `SELECT`:public
- `INSERT`:public(配合 file size 限制)

## 帳號正規化規則

提報跟搜尋都套用:
1. `trim()` 去除前後空白
2. 去掉開頭的 `@`(如有)
3. 轉小寫

範例:`@Scam_User`、`scam_user`、` Scam_User ` 都會視為同一個帳號(`scam_user`)。

## 行為流程

### 提報流程(/report)

1. 使用者填寫:
   - 帳號(必填,送出時做正規化)
   - 描述(必填,1~500 字,即時字數計算)
   - 圖片(選填,最多 3 張)
2. 點「送出提報」:
   - 前端驗證(空欄、字數、圖片限制)
   - 在 client 端 `crypto.randomUUID()` 產生 `report_id`(後續寫入 DB 也用同一個)
   - 圖片在瀏覽器壓縮:每張 resize 到 max 1600px 寬,輸出 webp,目標單張 < 500KB
   - 壓縮後上傳到 Supabase Storage,路徑 `{report_id}/{index}.webp`
   - 把 `id`(=`report_id`)、`account`、`account_display`、`description`、`image_paths` 寫入 `reports` table
   - 成功:顯示「提報成功 ✓」,清空表單
   - 失敗:顯示錯誤訊息,**保留表單內容**;若已上傳了部分圖片但 DB 寫入失敗,清掉那些圖片後再讓使用者重試

### 搜尋流程(/search)

1. 使用者輸入帳號,點「查詢」(不做 onChange 即時搜,避免打字時連續打 DB)
2. 空輸入時按鈕 disabled
3. 點查詢後:
   - 前端正規化輸入
   - `select * from reports where account = ? order by created_at desc`
4. **有結果**:
   - 顯示警告卡:⚠️「這是詐騙帳號」+「已被 X 人提報」
   - 下方列出每筆提報:描述、圖片(可點開放大)、提報時間
5. **無結果**:
   - 顯示溫和提醒:「目前還沒人提報過,但仍要小心」
6. 重新搜尋會清掉前一次結果

## 圖片處理規則

| 規則 | 說明 |
|------|------|
| 上傳前格式 | 接受 jpg / png / webp / heic |
| 上傳前單張上限 | 5MB,超過拒絕 |
| 上傳張數上限 | 3 張 |
| 壓縮後格式 | webp |
| 壓縮後尺寸 | 最大寬度 1600px |
| 壓縮後目標大小 | 單張 < 500KB(壓不下去就盡力而為) |
| 壓縮失敗 fallback | 用原圖上傳 |

## 錯誤處理

| 情況 | 處理方式 |
|------|---------|
| 圖片格式不對 | 上傳當下顯示「只接受圖片檔(jpg/png/webp/heic)」 |
| 圖片 > 5MB | 顯示「單張上限 5MB」 |
| 圖片壓縮失敗 | 警告但仍允許上傳原圖 |
| Supabase 寫入失敗 | 顯示「網路有問題,稍後再試」,表單內容保留 |
| Supabase 圖片上傳失敗 | 顯示「圖片上傳失敗」,清掉已上傳的圖,讓使用者重試 |
| 描述超過 500 字 | 即時字數提示,超過送出按鈕 disabled |
| 帳號為空 | 送出按鈕 disabled |
| 重複帳號被提報多次 | 允許,當作獨立提報(計入「被 X 人提報」) |
| 搜尋時 DB 失敗 | 顯示「查詢失敗,請重試」 |

## 環境變數

存在 Vercel + 本地 `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 元件結構(預期)

```
app/
  layout.tsx              -- 全站 header + tab 切換
  page.tsx                -- 重導向至 /search
  search/page.tsx         -- 找詐騙
  report/page.tsx         -- 有詐騙
  components/
    Header.tsx
    Tabs.tsx
    SearchForm.tsx
    SearchResult.tsx      -- 警告卡 + 提報列表
    ReportItem.tsx        -- 單筆提報顯示
    ReportForm.tsx
    ImageUpload.tsx       -- 拖拉/點擊上傳,含壓縮邏輯
    AccountInput.tsx
  lib/
    supabase.ts           -- client 初始化
    normalize.ts          -- 帳號正規化
    compress.ts           -- 圖片壓縮包裝
    db.ts                 -- 提報的讀寫函式
```

## 測試策略

使用者選擇「直接生出能跑的東西」模式,**不寫自動化測試**。

實作完成後提供驗收清單,使用者依清單手動測試:
- 提報帶 0/1/2/3 張圖
- 提報帶超大圖(被拒絕)
- 提報空帳號 / 空描述(被擋)
- 搜尋已提報帳號(命中)
- 搜尋未提報帳號(未命中)
- 搜尋大小寫不同的同個帳號(都命中)
- 搜尋帶 @ vs 不帶 @ 的同個帳號(都命中)
- 網路斷線時提報(顯示錯誤,表單保留)

## 後續迭代候選清單(不在 MVP 內)

1. 簡單的防 spam(rate limiting / Cloudflare Turnstile)
2. 檢舉錯誤提報的功能
3. 管理員後台(可刪除惡意提報)
4. 帳號 fuzzy / partial 搜尋
5. 提報數量達到門檻時的「危險等級」標記
6. 分享單筆提報的可分享連結
7. 提報數量統計、熱門詐騙手法等資料儀表板

---

**設計確認**:已與使用者確認所有段落
**下一步**:invoke writing-plans skill 產出 implementation plan
