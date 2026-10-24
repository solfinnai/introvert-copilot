import Link from "next/link";
import { PrintReportButton } from "./PrintReportButton";
import { reportDownloadHref, reportHref } from "@/lib/speakers";

export function ReportLinks({ id, report }: { id: string; report: boolean }) {
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link
        href={reportHref(id)}
        aria-current={report ? "page" : undefined}
        className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-center text-sm font-semibold ${
          report ? "border border-line bg-white text-ink" : "bg-accent text-white"
        }`}
      >
        Get full report
      </Link>
      <a
        href={reportDownloadHref(id)}
        className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-center text-sm"
      >
        Download report
      </a>
      <PrintReportButton />
    </div>
  );
}
