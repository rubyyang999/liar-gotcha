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
