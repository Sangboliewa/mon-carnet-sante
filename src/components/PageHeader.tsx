"use client";
import { useRouter } from "next/navigation";

interface Props {
  title: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
  gradient?: string; // ex: "from-blue-600 to-indigo-700"
  emoji?: string;
}

export default function PageHeader({ title, subtitle, back, action, gradient, emoji }: Props) {
  const router = useRouter();

  if (gradient) {
    return (
      <header className={`bg-gradient-to-br ${gradient} px-4 pt-10 pb-5`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {back && (
              <button
                onClick={() => router.back()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white mt-0.5 active:bg-white/30"
                aria-label="Retour"
              >
                ←
              </button>
            )}
            <div>
              {emoji && <span className="text-3xl block mb-1">{emoji}</span>}
              <h1 className="text-xl font-bold text-white leading-tight">{title}</h1>
              {subtitle && <p className="text-sm text-white/70 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
        </div>
      </header>
    );
  }

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
