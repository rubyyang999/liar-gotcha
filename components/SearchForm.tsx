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
