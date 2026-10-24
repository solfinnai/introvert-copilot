"use client";

export function PrintReportButton() {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      Print view
    </button>
  );
}
