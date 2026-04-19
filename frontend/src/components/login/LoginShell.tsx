export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 antialiased relative overflow-hidden"
      dir="rtl"
      lang="fa"
    >
      {children}
    </div>
  );
}
