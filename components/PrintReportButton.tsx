"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm"
      onClick={() => window.print()}
    >
      Print view
    </button>
  );
}
