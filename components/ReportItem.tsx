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
