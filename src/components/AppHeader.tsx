import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  Map,
  Settings,
  LogOut,
  FileText,
  StickyNote,
} from "lucide-react";
import logoIcon from "@/assets/selfmaxizer-icon-square.svg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResilientImage } from "@/components/ResilientImage";
import type { AppHeaderProps } from "@/types";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/note", label: "Notes", icon: StickyNote },
  { to: "/projects", label: "Circles", icon: FolderKanban },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/memory-map", label: "Memory Map", icon: Map },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppHeader({ className = "" }: AppHeaderProps) {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className={`border-b border-border/40 ${className}`.trim()}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/dashboard" className="flex items-center gap-2 font-brand text-lg">
          <ResilientImage src={logoIcon} alt="Self Maximizer" className="h-7 w-7" />
          Self Maximizer
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </header>
  );
}
