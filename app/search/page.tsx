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
