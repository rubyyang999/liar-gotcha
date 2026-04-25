# 詐騙帳號查詢網頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 蓋一個 Next.js + Supabase 網站,讓使用者提報 Threads/IG 詐騙帳號,並讓其他人搜尋帳號是否已被提報。

**Architecture:** Next.js 15 App Router (TypeScript) + Tailwind 全端寫在一個專案,Supabase 提供 PostgreSQL 資料庫和 Storage(圖片)。所有讀寫匿名(無登入),透過 RLS 限制只能讀取與新增。Vercel 部署。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`), `browser-image-compression`

**Testing approach:** 使用者選擇了 MVP 快速做出來模式,**不寫自動化測試**。每個 task 完成後做手動驗證(在瀏覽器試一次)。最後一個 task 是完整的手動驗收清單。

**Spec:** `docs/superpowers/specs/2026-04-25-fraud-query-design.md`

---

## Task 1: 初始化 git 與 Next.js 專案

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`(由 `create-next-app` 產生)
- Create: `.git/` (git init)

- [ ] **Step 1: git init 在專案根目錄**

從 `C:/Users/rubyyang/Documents/liar` 執行:

```bash
git init
git config user.email "ttl412frontend@gmail.com"
git config user.name "ruby"
```

預期:`Initialized empty Git repository ...`

- [ ] **Step 2: 用 create-next-app 初始化專案到當前目錄**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-eslint --turbopack
```

選擇互動提示時:
- `Would you like to use Turbopack?` → Yes
- 其他都用預設

預期:當前目錄出現 `app/`, `package.json`, `tailwind.config.ts` 等檔案。注意 `--no-src-dir` 表示 app 直接在根目錄。

如果工具提示目錄不空因為已有 `docs/`、`.superpowers/` 等,使用 `--force` 或先把那些目錄暫時移開。最簡單:

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --no-eslint --turbopack --force
```

- [ ] **Step 3: 把 .superpowers/ 加進 .gitignore**

開啟 `.gitignore`,在最後加入:

```
# brainstorming session files
.superpowers/

# env
.env*.local
```

(如果已經有 `.env*.local` 不用重複加。)

- [ ] **Step 4: 確認 dev server 跑得起來**

```bash
npm run dev
```

打開瀏覽器到 `http://localhost:3000`,應該看到 Next.js 預設首頁。**確認後 Ctrl+C 停止 dev server。**

- [ ] **Step 5: 第一次 commit**

```bash
git add -A
git commit -m "chore: init Next.js project with Tailwind + TypeScript"
```

---

## Task 2: 安裝額外 dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 裝 Supabase client 和圖片壓縮套件**

```bash
npm install @supabase/supabase-js browser-image-compression
```

- [ ] **Step 2: 確認 package.json 出現新的 dependencies**

開啟 `package.json`,確認 `dependencies` 區塊有:

```json
"@supabase/supabase-js": "^2.x",
"browser-image-compression": "^2.x",
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add Supabase client and image compression deps"
```

---

## Task 3: 在 Supabase 建立專案 + 資料表 + Storage(手動操作)

**Files:** 沒有檔案變更,純手動操作

- [ ] **Step 1: 註冊 / 登入 Supabase**

到 https://supabase.com,用 GitHub 登入。

- [ ] **Step 2: 新建專案**

點 **New Project**,選一個 organization。
- Name: `fraud-query`(或自取)
- Database Password: 產生一個隨機強密碼,記在密碼管理器
- Region: 選 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`,取較近台灣
- Plan: Free

點建立。等 1-2 分鐘專案 provision 完成。

- [ ] **Step 3: 在 SQL Editor 建立 reports 資料表**

左側選單 → **SQL Editor** → **New query**,貼上並執行:

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  account text not null,
  account_display text not null,
  description text not null check (char_length(description) between 1 and 500),
  image_paths text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index reports_account_idx on reports (account);
```

點 **Run**。預期:`Success. No rows returned`。

- [ ] **Step 4: 設定 reports 的 RLS 政策**

在同一個 SQL Editor 貼上並執行:

```sql
alter table reports enable row level security;

create policy "anon read reports"
  on reports for select
  to anon
  using (true);

create policy "anon insert reports"
  on reports for insert
  to anon
  with check (true);
```

點 **Run**。預期:`Success`。

- [ ] **Step 5: 建立 Storage Bucket**

左側選單 → **Storage** → **New bucket**。
- Name: `report-images`
- Public bucket: **打勾**(讓圖片可以被公開讀)
- File size limit: 5 MB
- Allowed MIME types: 留空(我們在前端控制)

點 **Save**。

- [ ] **Step 6: 設定 Storage 的 RLS 讓匿名可上傳**

回到 SQL Editor,執行:

```sql
create policy "anon upload report images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'report-images');

create policy "anon delete own report images"
  on storage.objects for delete
  to anon
  using (bucket_id = 'report-images');
```

(`delete` 是為了上傳出錯時可以清掉殘留圖片。)

預期:`Success`。

- [ ] **Step 7: 抓 URL 跟 anon key**

左側選單 → **Project Settings** → **API**:
- 複製 **Project URL**(像 `https://xxxxx.supabase.co`)
- 複製 **anon public** key(很長一串)

兩個都先記下,下個 task 要用。

---

## Task 4: 環境變數

**Files:**
- Create: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: 建立 .env.local**

在專案根目錄建 `.env.local`,內容(用 Task 3 step 7 抓到的值):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...你的_anon_key
```

- [ ] **Step 2: 建立 .env.example(範本給未來其他 dev 看)**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: 確認 .env.local 沒被 git 追蹤**

```bash
git status
```

確認 `.env.local` **不出現**在 untracked files。如果出現了,檢查 `.gitignore` 是否包含 `.env*.local`。

- [ ] **Step 4: Commit .env.example**

```bash
git add .env.example
git commit -m "chore: add env example"
```

---

## Task 5: 帳號正規化函式

**Files:**
- Create: `lib/normalize.ts`

- [ ] **Step 1: 建立 lib/ 目錄並寫 normalize.ts**

建立 `lib/normalize.ts`:

```typescript
export function normalizeAccount(input: string): string {
  return input.trim().replace(/^@+/, '').toLowerCase();
}
```

- [ ] **Step 2: 在 dev console 快速驗證**

開啟 `npm run dev`,然後在瀏覽器 console 貼:

```javascript
// 直接測試 — 把 normalize.ts 內容貼進 console 也行
const normalize = (s) => s.trim().replace(/^@+/, '').toLowerCase();
console.log(normalize('@Scam_User'));      // → 'scam_user'
console.log(normalize('  Scam_User  '));   // → 'scam_user'
console.log(normalize('SCAM_USER'));       // → 'scam_user'
console.log(normalize('@@scam'));          // → 'scam'
```

四個都應該輸出 `scam_user` 或 `scam`。**Ctrl+C 停止 dev server。**

- [ ] **Step 3: Commit**

```bash
git add lib/normalize.ts
git commit -m "feat: add account normalization utility"
```

---

## Task 6: Supabase client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: 建立 lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export const REPORT_BUCKET = 'report-images';
```

- [ ] **Step 2: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase client"
```

---

## Task 7: 圖片壓縮 utility

**Files:**
- Create: `lib/compress.ts`

- [ ] **Step 1: 建立 lib/compress.ts**

```typescript
import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1600,
      fileType: 'image/webp',
      useWebWorker: true,
    });

    return new File([compressed], replaceExt(file.name, 'webp'), {
      type: 'image/webp',
    });
  } catch (err) {
    console.warn('image compression failed, using original', err);
    return file;
  }
}

function replaceExt(name: string, newExt: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.${newExt}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/compress.ts
git commit -m "feat: add image compression utility"
```

---

## Task 8: DB helper 函式

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: 建立 lib/db.ts**

```typescript
import { supabase, REPORT_BUCKET } from './supabase';
import { normalizeAccount } from './normalize';

export type Report = {
  id: string;
  account: string;
  account_display: string;
  description: string;
  image_paths: string[];
  created_at: string;
};

export async function searchReportsByAccount(rawAccount: string): Promise<Report[]> {
  const account = normalizeAccount(rawAccount);
  if (!account) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('account', account)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export type CreateReportInput = {
  rawAccount: string;
  description: string;
  images: File[];
};

export async function createReport(input: CreateReportInput): Promise<Report> {
  const reportId = crypto.randomUUID();
  const account = normalizeAccount(input.rawAccount);
  const accountDisplay = input.rawAccount.trim();

  const uploadedPaths: string[] = [];

  try {
    for (let i = 0; i < input.images.length; i++) {
      const file = input.images[i];
      const path = `${reportId}/${i}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(REPORT_BUCKET)
        .upload(path, file, { contentType: 'image/webp', upsert: false });

      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        id: reportId,
        account,
        account_display: accountDisplay,
        description: input.description.trim(),
        image_paths: uploadedPaths,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Report;
  } catch (err) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(REPORT_BUCKET).remove(uploadedPaths).catch(() => {});
    }
    throw err;
  }
}

export function getImagePublicUrl(path: string): string {
  const { data } = supabase.storage.from(REPORT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db.ts
git commit -m "feat: add DB helpers for reports"
```

---

## Task 9: 全域樣式

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 改寫 app/globals.css**

把 `app/globals.css` 內容**整個替換**成:

```css
@import "tailwindcss";

:root {
  --bg: #f4f6fb;
  --surface: #ffffff;
  --border: #e3e7f0;
  --text: #1f2937;
  --text-muted: #6b7280;
  --warn: #d62828;
  --warn-bg: #fff5f5;
}

html, body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif;
}

body {
  min-height: 100vh;
}
```

- [ ] **Step 2: 確認 dev server 啟動且首頁背景是淺灰**

```bash
npm run dev
```

開 `http://localhost:3000`,首頁背景應該變成淺灰白(#f4f6fb)。**Ctrl+C 停止。**

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: set up base theme colors"
```

---

## Task 10: 主版型 + Header + Tabs 元件

**Files:**
- Create: `components/Header.tsx`
- Create: `components/Tabs.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: 建立 components/Header.tsx**

```tsx
import Tabs from './Tabs';

export default function Header() {
  return (
    <header className="px-6 py-6 text-center">
      <h1 className="text-2xl font-bold text-[var(--text)]">詐騙帳號查詢</h1>
      <p className="text-sm text-[var(--text-muted)] mt-1">幫大家避開可疑帳號</p>
      <div className="mt-4 max-w-lg mx-auto">
        <Tabs />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: 建立 components/Tabs.tsx**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/report', label: '有詐騙' },
  { href: '/search', label: '找詐騙' },
];

export default function Tabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-[var(--bg)] rounded-xl p-1 border border-[var(--border)]">
      {TABS.map(t => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              'flex-1 text-center py-2 rounded-lg text-sm font-semibold transition ' +
              (active
                ? 'bg-white text-[var(--text)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: 改寫 app/layout.tsx**

把 `app/layout.tsx` **整個替換**成:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: '詐騙帳號查詢',
  description: 'Threads / IG 詐騙帳號查詢與提報',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="max-w-lg mx-auto pb-12">
          <Header />
          <main className="px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: 暫時改 app/page.tsx 讓首頁可以開**

把 `app/page.tsx` **整個替換**成:

```tsx
export default function HomePage() {
  return <p className="text-center text-[var(--text-muted)]">首頁(待重新導向)</p>;
}
```

- [ ] **Step 5: 手動驗證 header 跟 tabs 顯示**

```bash
npm run dev
```

開 `http://localhost:3000`,應該看到:
- 標題「詐騙帳號查詢」
- 副標題「幫大家避開可疑帳號」
- 兩個 tab 按鈕「有詐騙 / 找詐騙」(目前點了會 404,正常)

**Ctrl+C 停止。**

- [ ] **Step 6: Commit**

```bash
git add components/Header.tsx components/Tabs.tsx app/layout.tsx app/page.tsx
git commit -m "feat: add layout with header and tabs"
```

---

## Task 11: 首頁重新導向到 /search

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 把 app/page.tsx 改成 redirect**

整個替換成:

```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/search');
}
```

- [ ] **Step 2: 確認首頁直接跳到 /search**

```bash
npm run dev
```

開 `http://localhost:3000`,網址應該變成 `http://localhost:3000/search`(會 404 因為頁面還沒建,正常)。**Ctrl+C 停止。**

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: redirect root to /search"
```

---

## Task 12: 搜尋頁骨架 + SearchForm 元件

**Files:**
- Create: `app/search/page.tsx`
- Create: `components/SearchForm.tsx`

- [ ] **Step 1: 建立 components/SearchForm.tsx**

```tsx
'use client';

import { useState } from 'react';

type Props = {
  onSearch: (account: string) => void;
  loading: boolean;
};

export default function SearchForm({ onSearch, loading }: Props) {
  const [value, setValue] = useState('');
  const trimmed = value.trim();
  const disabled = loading || trimmed.length === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSearch(trimmed);
      }}
      className="space-y-3"
    >
      <label className="block text-xs text-[var(--text-muted)]">
        輸入要查的帳號 (Threads / IG)
      </label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="@scam_account"
        className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
      />
      <button
        type="submit"
        disabled={disabled}
        className="w-full bg-[var(--text)] text-white rounded-xl py-3 text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading ? '查詢中...' : '查詢'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 建立 app/search/page.tsx 骨架**

```tsx
'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';

export default function SearchPage() {
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState<string | null>(null);

  async function handleSearch(account: string) {
    setLoading(true);
    setSearched(account);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <SearchForm onSearch={handleSearch} loading={loading} />
      {searched && (
        <div className="text-center text-sm text-[var(--text-muted)]">
          (還沒接 DB:你搜尋了「{searched}」)
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 手動驗證**

```bash
npm run dev
```

開 `http://localhost:3000/search`:
- 應該看到搜尋框、查詢按鈕(空輸入時 disabled)
- 輸入文字後按鈕亮起
- 送出後下方出現「(還沒接 DB:你搜尋了 "..."」

**Ctrl+C 停止。**

- [ ] **Step 4: Commit**

```bash
git add app/search/page.tsx components/SearchForm.tsx
git commit -m "feat: add search page skeleton with form"
```

---

## Task 13: SearchResult + ReportItem 元件

**Files:**
- Create: `components/SearchResult.tsx`
- Create: `components/ReportItem.tsx`

- [ ] **Step 1: 建立 components/ReportItem.tsx**

```tsx
import type { Report } from '@/lib/db';
import { getImagePublicUrl } from '@/lib/db';

type Props = { report: Report };

export default function ReportItem({ report }: Props) {
  return (
    <div className="bg-white border border-[var(--border)] rounded-xl p-4">
      <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap break-words">
        {report.description}
      </p>
      {report.image_paths.length > 0 && (
        <div className="flex gap-2 mt-3">
          {report.image_paths.map((path) => (
            <a
              key={path}
              href={getImagePublicUrl(path)}
              target="_blank"
              rel="noopener noreferrer"
              className="block flex-1 max-w-[33%]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImagePublicUrl(path)}
                alt="提報截圖"
                className="w-full h-20 object-cover rounded-lg bg-[var(--bg)]"
              />
            </a>
          ))}
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)] mt-2">
        {new Date(report.created_at).toLocaleDateString('zh-TW')}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: 建立 components/SearchResult.tsx**

```tsx
import type { Report } from '@/lib/db';
import ReportItem from './ReportItem';

type Props = {
  query: string;
  reports: Report[];
};

export default function SearchResult({ query, reports }: Props) {
  if (reports.length === 0) {
    return (
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 text-center">
        <div className="text-3xl">🤔</div>
        <p className="text-base font-semibold text-[var(--text)] mt-2">
          目前沒人提報過「{query}」
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          可能有待觀察,交易前還是要小心
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-[var(--warn-bg)] border border-[#ffd1d1] rounded-2xl p-6 text-center">
        <div className="text-3xl">⚠️</div>
        <p className="text-base font-semibold text-[var(--warn)] mt-2">
          這是詐騙帳號
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          已被 {reports.length} 人提報
        </p>
      </div>
      {reports.map((r) => (
        <ReportItem key={r.id} report={r} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/SearchResult.tsx components/ReportItem.tsx
git commit -m "feat: add search result and report item components"
```

---

## Task 14: 接 DB,搜尋功能完整可用

**Files:**
- Modify: `app/search/page.tsx`

- [ ] **Step 1: 改寫 app/search/page.tsx**

整個替換成:

```tsx
'use client';

import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import SearchResult from '@/components/SearchResult';
import { searchReportsByAccount, type Report } from '@/lib/db';

type Result =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; query: string; reports: Report[] }
  | { kind: 'error'; message: string };

export default function SearchPage() {
  const [result, setResult] = useState<Result>({ kind: 'idle' });

  async function handleSearch(rawAccount: string) {
    setResult({ kind: 'loading' });
    try {
      const reports = await searchReportsByAccount(rawAccount);
      setResult({ kind: 'ok', query: rawAccount, reports });
    } catch (err) {
      console.error(err);
      setResult({ kind: 'error', message: '查詢失敗,請重試' });
    }
  }

  return (
    <div className="space-y-6">
      <SearchForm onSearch={handleSearch} loading={result.kind === 'loading'} />

      {result.kind === 'ok' && (
        <SearchResult query={result.query} reports={result.reports} />
      )}

      {result.kind === 'error' && (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 text-center text-sm text-[var(--warn)]">
          {result.message}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 手動驗證(沒命中的 case)**

```bash
npm run dev
```

開 `http://localhost:3000/search`:
- 輸入隨便一個帳號(例如 `nonexistent_user`)按查詢
- 應該看到「目前沒人提報過...可能有待觀察」訊息

**Ctrl+C 停止。**

- [ ] **Step 3: 在 Supabase Dashboard 手動塞一筆假資料測命中**

到 Supabase Dashboard → Table Editor → `reports` → **Insert row**:
- `account`: `test_scam`
- `account_display`: `test_scam`
- `description`: `測試用提報`
- `image_paths`: 留空

點 Save。

- [ ] **Step 4: 驗證命中的 case**

```bash
npm run dev
```

開 `http://localhost:3000/search`:
- 輸入 `test_scam` 按查詢 → 應該看到「⚠️ 這是詐騙帳號 已被 1 人提報」+ 一筆描述卡
- 輸入 `@TEST_SCAM` 按查詢 → 應該也命中(正規化生效)
- 輸入 ` Test_Scam ` 按查詢 → 應該也命中

**Ctrl+C 停止。**

- [ ] **Step 5: 在 Supabase 把假資料刪掉**

回到 Table Editor → `reports`,把剛才那筆 `test_scam` 刪掉。

- [ ] **Step 6: Commit**

```bash
git add app/search/page.tsx
git commit -m "feat: wire search page to Supabase"
```

---

## Task 15: ImageUpload 元件

**Files:**
- Create: `components/ImageUpload.tsx`

- [ ] **Step 1: 建立 components/ImageUpload.tsx**

```tsx
'use client';

import { useState } from 'react';
import { compressImage } from '@/lib/compress';

const MAX_IMAGES = 3;
const MAX_RAW_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

type Pending = {
  raw: File;
  compressed: File;
  previewUrl: string;
};

type Props = {
  value: Pending[];
  onChange: (next: Pending[]) => void;
  disabled?: boolean;
};

export default function ImageUpload({ value, onChange, disabled }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function handleFiles(files: FileList) {
    setError(null);
    const incoming = Array.from(files);
    const room = MAX_IMAGES - value.length;
    if (incoming.length > room) {
      setError(`最多只能上傳 ${MAX_IMAGES} 張`);
      return;
    }

    const accepted: Pending[] = [];

    setWorking(true);
    try {
      for (const file of incoming) {
        if (!ACCEPTED.includes(file.type)) {
          setError('只接受圖片檔(jpg/png/webp/heic)');
          return;
        }
        if (file.size > MAX_RAW_SIZE) {
          setError('單張上限 5MB');
          return;
        }
        const compressed = await compressImage(file);
        accepted.push({
          raw: file,
          compressed,
          previewUrl: URL.createObjectURL(compressed),
        });
      }
      onChange([...value, ...accepted]);
    } finally {
      setWorking(false);
    }
  }

  function remove(idx: number) {
    URL.revokeObjectURL(value[idx].previewUrl);
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  const canAddMore = !disabled && value.length < MAX_IMAGES;

  return (
    <div>
      {value.length > 0 && (
        <div className="flex gap-2 mb-2">
          {value.map((p, i) => (
            <div key={i} className="relative w-20 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="w-full h-full object-cover rounded-lg border border-[var(--border)]"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -top-1 -right-1 bg-white border border-[var(--border)] rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center"
                aria-label="移除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className={
          'block border-2 border-dashed rounded-xl p-6 text-center text-sm cursor-pointer ' +
          (canAddMore
            ? 'border-[var(--border)] text-[var(--text-muted)] bg-white hover:bg-[var(--bg)]'
            : 'border-[var(--border)] text-gray-300 bg-[var(--bg)] cursor-not-allowed')
        }
      >
        {working ? '處理中...' : `📷 點擊或拖曳圖片(最多 ${MAX_IMAGES} 張,目前 ${value.length})`}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          disabled={!canAddMore || working}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {error && <p className="text-xs text-[var(--warn)] mt-2">{error}</p>}
    </div>
  );
}

export type { Pending };
```

- [ ] **Step 2: Commit**

```bash
git add components/ImageUpload.tsx
git commit -m "feat: add image upload component with compression"
```

---

## Task 16: ReportForm 元件 + report 頁面

**Files:**
- Create: `components/ReportForm.tsx`
- Create: `app/report/page.tsx`

- [ ] **Step 1: 建立 components/ReportForm.tsx**

```tsx
'use client';

import { useState } from 'react';
import ImageUpload, { type Pending } from './ImageUpload';
import { createReport } from '@/lib/db';

const DESC_MAX = 500;

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export default function ReportForm() {
  const [account, setAccount] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<Pending[]>([]);
  const [state, setState] = useState<SubmitState>({ kind: 'idle' });

  const accountOk = account.trim().length > 0;
  const descLen = description.trim().length;
  const descOk = descLen >= 1 && descLen <= DESC_MAX;
  const submitting = state.kind === 'submitting';
  const canSubmit = accountOk && descOk && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setState({ kind: 'submitting' });
    try {
      await createReport({
        rawAccount: account,
        description,
        images: images.map((p) => p.compressed),
      });
      setState({ kind: 'success' });
      setAccount('');
      setDescription('');
      images.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setImages([]);
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error && err.message.includes('storage')
          ? '圖片上傳失敗,請重試'
          : '網路有問題,稍後再試';
      setState({ kind: 'error', message: msg });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          詐騙帳號 (Threads / IG)
        </label>
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="@scam_account"
          disabled={submitting}
          className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          簡短描述
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="說明發生了什麼事..."
          rows={4}
          disabled={submitting}
          className="w-full border border-[var(--border)] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
        />
        <p
          className={
            'text-xs mt-1 text-right ' +
            (descLen > DESC_MAX ? 'text-[var(--warn)]' : 'text-[var(--text-muted)]')
          }
        >
          {descLen} / {DESC_MAX}
        </p>
      </div>

      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">
          上傳截圖 (選填,最多 3 張)
        </label>
        <ImageUpload value={images} onChange={setImages} disabled={submitting} />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-[var(--text)] text-white rounded-xl py-3 text-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {submitting ? '送出中...' : '送出提報'}
      </button>

      {state.kind === 'success' && (
        <div className="bg-white border border-[var(--border)] rounded-xl p-4 text-center text-sm text-[var(--text)]">
          ✓ 提報成功,謝謝你
        </div>
      )}

      {state.kind === 'error' && (
        <div className="bg-[var(--warn-bg)] border border-[#ffd1d1] rounded-xl p-4 text-center text-sm text-[var(--warn)]">
          {state.message}
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: 建立 app/report/page.tsx**

```tsx
import ReportForm from '@/components/ReportForm';

export default function ReportPage() {
  return <ReportForm />;
}
```

- [ ] **Step 3: 手動驗證(基本提報)**

```bash
npm run dev
```

開 `http://localhost:3000/report`:
- 看到帳號、描述、圖片上傳三個欄位 + 送出按鈕
- 帳號或描述空的時候按鈕 disabled
- 隨便填一個帳號 + 描述,**不上傳圖片**,按送出
- 應該看到「✓ 提報成功,謝謝你」

接著切到 `/search`,輸入剛剛提報的帳號 → 應該命中。

**Ctrl+C 停止。**

- [ ] **Step 4: 手動驗證(帶圖片)**

```bash
npm run dev
```

開 `/report`:
- 提報一個新帳號,**上傳 1-3 張圖片**(隨便挑桌面上的 jpg/png 圖)
- 看到圖片預覽出現
- 送出 → 「提報成功」
- 切到 `/search`,搜剛剛的帳號 → 應該命中,且看到圖片

**Ctrl+C 停止。**

- [ ] **Step 5: 在 Supabase Dashboard 把測試資料清掉**

到 Supabase Dashboard → Table Editor → `reports`,刪掉測試的 row。再到 Storage → `report-images`,把對應的資料夾也刪掉。

- [ ] **Step 6: Commit**

```bash
git add components/ReportForm.tsx app/report/page.tsx
git commit -m "feat: add report form page with image upload"
```

---

## Task 17: 完整手動驗收清單

**Files:** 沒有檔案變更,只是手動測試

啟動 dev server:`npm run dev`

逐項勾選,有問題就回頭找對應 task 修。

**提報相關**

- [ ] 提報空帳號 → 送出按鈕 disabled,無法送出
- [ ] 提報空描述 → 送出按鈕 disabled
- [ ] 提報描述超過 500 字 → 送出按鈕 disabled,字數變紅
- [ ] 提報合法帳號 + 描述 + 0 張圖 → 成功
- [ ] 提報合法帳號 + 描述 + 1 張圖 → 成功,搜尋看得到圖
- [ ] 提報合法帳號 + 描述 + 3 張圖 → 成功,搜尋看到 3 張圖
- [ ] 嘗試上傳第 4 張圖 → 顯示「最多只能上傳 3 張」
- [ ] 嘗試上傳 > 5MB 圖檔 → 顯示「單張上限 5MB」
- [ ] 嘗試上傳 PDF / txt 檔 → 顯示「只接受圖片檔」
- [ ] 提報成功後表單**整個清空**,可以馬上提下一筆

**搜尋相關**

- [ ] 空輸入 → 查詢按鈕 disabled
- [ ] 搜尋從沒提報過的帳號 → 顯示「目前沒人提報過...可能有待觀察」
- [ ] 搜尋已提報帳號 → 顯示警告卡 + 提報列表
- [ ] 提報數量 N > 1 時,警告卡顯示「已被 N 人提報」,下方列出 N 筆
- [ ] 提報用 `@USER`,搜尋 `user` → 命中(大小寫 + @ 都正規化)
- [ ] 提報用 `user`,搜尋 ` USER ` → 命中(空白 + 大小寫)
- [ ] 提報照片可以點開放大(點圖片 → 開新分頁)

**錯誤情境**

- [ ] 把瀏覽器的 Network 設成 Offline,送出提報 → 顯示「網路有問題,稍後再試」,**表單內容保留**
- [ ] 同上,點查詢 → 顯示「查詢失敗,請重試」

**版面**

- [ ] 手機尺寸(瀏覽器開 devtools 切到 iPhone)→ 版面不會破
- [ ] Tab 切換時 active 狀態正確
- [ ] 圖片預覽 thumbnail 正常顯示
- [ ] 重新整理頁面狀態合理(不會殘留前一次搜尋結果)

**全清完成後 commit 一次驗收結果(可選):**

```bash
git commit --allow-empty -m "chore: passed manual verification checklist"
```

---

## Task 18: 部署到 Vercel

**Files:** 沒有 code 變更

- [ ] **Step 1: 建立 GitHub repo 並推上去**

```bash
gh repo create fraud-query --public --source=. --remote=origin --push
```

(如果沒裝 `gh`,改用 GitHub 網頁建 repo 後執行 `git remote add origin <url> && git push -u origin main`。)

- [ ] **Step 2: 到 Vercel 匯入專案**

到 https://vercel.com/new,選剛剛的 GitHub repo `fraud-query`,點 **Import**。

- [ ] **Step 3: 設定 Environment Variables**

在 Vercel 的 import 設定畫面,展開 **Environment Variables**,加入(複製 `.env.local` 的值):
- `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxxx.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `eyJhbGc...`

點 **Deploy**。

- [ ] **Step 4: 等部署完成,打開 production URL**

部署成功後 Vercel 會給一個 `xxx.vercel.app`,開啟測試:
- 提報一筆
- 搜尋,確認命中
- 確認圖片可以正常顯示

- [ ] **Step 5: (可選)在 Supabase 把測試資料清掉**

刪掉 production 上提的測試 row 跟 storage 圖。

- [ ] **Step 6: Commit final state**

```bash
git commit --allow-empty -m "chore: deployed to Vercel"
git push
```

---

## 完成 ✓

到此 MVP 完成,網站可以實際使用。後續迭代候選見 spec 文件最後一節。
