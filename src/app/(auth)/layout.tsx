export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,110,247,0.15), transparent), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(167,139,250,0.07), transparent)",
      }}
    >
      {children}
    </div>
  );
}
