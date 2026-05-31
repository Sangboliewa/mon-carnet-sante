"use client";
import { useRouter } from "next/navigation";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, back, action }: Props) {
  const router = useRouter();
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
      {back && (
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-600 active:bg-gray-100"
          aria-label="Retour"
        >
          ←
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  );
}
