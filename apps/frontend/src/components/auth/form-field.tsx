type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
};

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  required = true,
  minLength,
  defaultValue,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-[14px] border border-slate-200 bg-white px-4 text-sm text-ink shadow-sm outline-none transition focus:border-action focus:ring-4 focus:ring-blue-100"
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        suppressHydrationWarning
      />
    </label>
  );
}
