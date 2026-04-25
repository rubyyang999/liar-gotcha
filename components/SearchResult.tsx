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
