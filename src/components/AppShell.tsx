import NavBar from "./NavBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-gray-50">
      <main className="flex-1 pb-20">{children}</main>
      <NavBar />
    </div>
  );
}
