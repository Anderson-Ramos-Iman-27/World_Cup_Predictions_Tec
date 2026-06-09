type AuthAlertProps = {
  type: 'error' | 'success';
  message: string;
};

export function AuthAlert({ type, message }: AuthAlertProps) {
  return (
    <div
      className={
        type === 'error'
          ? 'rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700'
          : 'rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700'
      }
    >
      {message}
    </div>
  );
}
