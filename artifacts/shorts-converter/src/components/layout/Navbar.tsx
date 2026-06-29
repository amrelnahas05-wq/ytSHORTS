import { Link } from "wouter";

export function Navbar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4 pt-0">
      <nav className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-b-2xl px-6 py-3 flex items-center gap-8 shadow-2xl">
        <Link href="/" className="text-white font-bold tracking-tight flex items-center gap-2 hover:text-primary transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-secondary" />
          <span>CutPro</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/upload" className="hover:text-white transition-colors">Upload</Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
        </div>
      </nav>
    </div>
  );
}
