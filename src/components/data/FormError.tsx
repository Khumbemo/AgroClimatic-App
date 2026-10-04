import { AlertTriangle } from 'lucide-react';

const FormError = ({ message }: { message: string | null }) =>
  message ? (
    <div role="alert" className="flex gap-2 items-start text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  ) : null;

export default FormError;
