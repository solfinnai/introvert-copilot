type IconName = "home" | "user" | "users" | "list" | "bookmark" | "message";

const PATHS: Record<IconName, string> = {
  home: "M2.75 7.1 8 2.9l5.25 4.2V13.2H10V9.2H6v4H2.75V7.1z",
  user: "M8 8.1a2.15 2.15 0 1 0 0-4.3 2.15 2.15 0 0 0 0 4.3zM3.3 13.3c.5-2.05 2.2-3.1 4.7-3.1s4.2 1.05 4.7 3.1",
  users:
    "M6.1 7.6a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM2.6 12.6c.35-1.55 1.6-2.35 3.5-2.35.7 0 1.3.12 1.8.32M10.2 7.5a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zM8.4 10.4c.55-.16 1.15-.24 1.85-.24 1.7 0 2.85.7 3.2 2.15",
  list: "M3 4.25h10M3 8h10M3 11.75h7",
  bookmark: "M4.25 2.75h7.5V13.2L8 11.1l-3.75 2.1V2.75z",
  message: "M2.75 3.5h10.5v7.2H2.75V3.5zM3 4.1 8 7.6l5-3.5",
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
