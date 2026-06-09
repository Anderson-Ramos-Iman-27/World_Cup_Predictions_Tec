type SubmitButtonProps = {
  children: React.ReactNode;
  isLoading?: boolean;
};

export function SubmitButton({ children, isLoading = false }: SubmitButtonProps) {
  return (
    <button
      className="h-12 w-full rounded-[14px] bg-action px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(20,87,217,0.28)] transition hover:bg-[#0b4cc4] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
      type="submit"
      disabled={isLoading}
    >
      {isLoading ? 'Procesando...' : children}
    </button>
  );
}
