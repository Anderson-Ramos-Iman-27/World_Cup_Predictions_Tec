type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-action/20 bg-action/10 px-3 py-1 text-sm font-semibold text-action">
      {label}
    </span>
  );
}
