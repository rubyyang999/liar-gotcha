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
        err instanceof Error && err.message.toLowerCase().includes('storage')
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
