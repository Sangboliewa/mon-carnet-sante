export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-16 bg-gray-100 mx-4 mt-5 rounded-2xl" />
      <div className="px-4 py-4 space-y-3">
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="h-20 bg-gray-100 rounded-2xl" />
        <div className="h-20 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}
