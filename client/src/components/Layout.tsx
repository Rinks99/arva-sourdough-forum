import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Search, Sun, Moon, Menu, X, Wheat, LogOut, User, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/components/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<"login" | "register" | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mr-2 shrink-0">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Arva Sourdough Community" className="text-primary">
              <circle cx="14" cy="14" r="12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <path d="M8 18 Q14 8 20 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              <circle cx="14" cy="10" r="2" fill="currentColor" opacity="0.7"/>
              <path d="M10 21 h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="font-bold text-sm tracking-wide hidden sm:block" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>
              Arva Sourdough
            </span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-background"
                data-testid="input-search"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            {user && (
              <Button size="sm" asChild className="hidden sm:flex h-8 text-xs gap-1.5">
                <Link href="/new-thread">
                  <PenSquare className="w-3.5 h-3.5" /> New Post
                </Link>
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8" aria-label="Toggle theme" data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>

            {user ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground hidden sm:block max-w-[100px] truncate">{user.displayName}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => logout()} aria-label="Log out" data-testid="button-logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setAuthModal("login")} data-testid="button-login">
                  Sign in
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={() => setAuthModal("register")} data-testid="button-register">
                  Join
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted-foreground">
        <p>
          <a href="https://arvaflourmills.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            Arva Flour Mills
          </a>
          {" · "}Sourdough Community{" · "}
          <a href="https://arvaflourmills.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            Shop our flours
          </a>
        </p>
      </footer>

      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSwitch={m => setAuthModal(m)} />
      )}
    </div>
  );
}
