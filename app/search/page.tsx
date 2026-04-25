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
