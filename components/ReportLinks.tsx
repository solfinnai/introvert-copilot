import Link from "next/link";
import { PrintReportButton } from "./PrintReportButton";
import { reportDownloadHref, reportHref } from "@/lib/speakers";

export function ReportLinks({ id, report }: { id: string; report: boolean }) {
  return (
    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link href={reportHref(id)} aria-current={report ? "page" : undefined} className={report ? "btn btn-selected" : "btn btn-primary"}>
        Get full report
      </Link>
      <a href={reportDownloadHref(id)} className="btn">
        Download report
      </a>
      <PrintReportButton />
    </div>
  );
}
