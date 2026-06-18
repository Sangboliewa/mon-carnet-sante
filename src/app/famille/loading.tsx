export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-24 bg-health-blue" />
      <div className="px-4 py-5 space-y-3">
        <div className="h-24 bg-gray-100 rounded-2xl" />
        <div className="h-16 bg-gray-100 rounded-2xl" />
        <div className="h-16 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}
