interface Props {
  icon: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ icon, title, body, ctaLabel, onCta }: Props) {
  return (
    <div className="card text-center py-10 space-y-3">
      <div className="text-5xl">{icon}</div>
      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-500 leading-relaxed px-4">{body}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="inline-block bg-health-blue text-white text-sm font-semibold px-6 py-2.5 rounded-xl mt-2"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
