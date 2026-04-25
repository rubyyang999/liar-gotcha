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
