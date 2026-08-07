"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  Brain,
  Bug,
  CalendarRange,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getClassColor } from "@/lib/classColors";
import { CLASSES_CHANGED_EVENT } from "@/lib/classEvents";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SidebarClass = {
  id: string;
  class_code: string | null;
  color: string | null;
};

type NavChild = {
  href: string;
  label: string;
};

const studyLinks: NavChild[] = [
  { href: "/study/ai-tutor", label: "AI Tutor" },
  { href: "/study/study-guide", label: "Study Guides" },
  { href: "/study/flashcards", label: "Flashcards" },
];

const plannerLinks: NavChild[] = [
  { href: "/calendar", label: "Calendar" },
  { href: "/planner/progress", label: "Progress" },
  { href: "/planner/assignments", label: "Assignments" },
];

const SIDEBAR_PREFERENCE_EVENT = "study-sidebar-preference-changed";

const pageLinks: NavChild[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/classes", label: "Classes" },
  { href: "/study", label: "Study tools" },
  { href: "/study/ai-tutor", label: "AI Tutor" },
  { href: "/study/study-guide", label: "Study guides" },
  { href: "/study/flashcards", label: "Flashcards" },
  { href: "/planner", label: "Study planner" },
  { href: "/calendar", label: "Calendar" },
  { href: "/planner/progress", label: "Progress" },
  { href: "/planner/assignments", label: "Assignments" },
  { href: "/settings", label: "Settings" },
  { href: "/report-bug", label: "Report a problem" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageLabel(pathname: string) {
  if (pathname.startsWith("/classes/")) return "Class workspace";

  const match = [...pageLinks]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActivePath(pathname, item.href));

  return match?.label ?? "Study space";
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      aria-label="ADHD Study AI dashboard"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-500/30",
        compact && "justify-center",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-purple-700 text-gray-100">
        <Brain aria-hidden="true" />
      </span>
      {compact ? null : (
        <span className="flex min-w-0 flex-1 items-center justify-center">
          <span className="truncate text-2xl font-semibold">ADHD Study AI</span>
        </span>
      )}
    </Link>
  );
}

function NavLink({
  compact,
  href,
  icon: Icon,
  label,
  pathname,
  onNavigate,
}: {
  compact: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      title={compact ? label : undefined}
      aria-label={compact ? label : undefined}
      aria-current={pathname === href ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center text-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        compact && "min-h-10 justify-center rounded-lg px-0 hover:bg-gray-200",
      )}
    >
      {compact ? (
        <>
          <Icon className="size-5 shrink-0" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </Link>
  );
}

function NavGroup({
  children,
  compact,
  defaultOpen = true,
  href,
  icon: Icon,
  label,
  pathname,
  onNavigate,
}: {
  children: ReactNode;
  compact: boolean;
  defaultOpen?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  if (compact) {
    return (
      <NavLink
        compact
        href={href}
        icon={Icon}
        label={label}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          onClick={onNavigate}
          className="text-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {label}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen((current) => !current)}
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          className="rounded-md p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-950"
        >
          <ChevronRight
            className={cn(
              "size-5 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-90",
            )}
            aria-hidden="true"
          />
        </Button>
      </div>

      <div
        id={contentId}
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "flex flex-col gap-2 pl-6 pt-2 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open ? "translate-y-0" : "-translate-y-1",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChildLink({
  href,
  label,
  pathname,
  onNavigate,
}: NavChild & { pathname: string; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      aria-current={pathname === href ? "page" : undefined}
      onClick={onNavigate}
      className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {label}
    </Link>
  );
}

function Navigation({
  classes,
  compact,
  pathname,
  onNavigate,
}: {
  classes: SidebarClass[] | null;
  compact: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Workspace navigation" className="flex flex-col gap-4">
      <NavLink
        compact={compact}
        href="/dashboard"
        icon={LayoutDashboard}
        label="Dashboard"
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <NavGroup
        compact={compact}
        href="/classes"
        icon={GraduationCap}
        label="Classes"
        pathname={pathname}
        onNavigate={onNavigate}
      >
        {classes === null ? (
          <div className="space-y-2 py-2" aria-label="Loading classes">
            <div className="h-7 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
            <div className="h-7 w-4/5 animate-pulse rounded-md bg-slate-100 motion-reduce:animate-none" />
          </div>
        ) : classes.length ? (
          classes.map((classItem) => {
            const color = getClassColor(classItem.color);
            const href = `/classes/${classItem.id}`;
            const active = pathname === href;

            return (
              <Link
                key={classItem.id}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
                  color.bg,
                  color.text,
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", color.accent)} aria-hidden="true" />
                <span className="truncate">
                  {classItem.class_code ?? "Untitled class"}
                </span>
              </Link>
            );
          })
        ) : (
          <Link
            href="/classes"
            onClick={onNavigate}
            className="block rounded-lg px-2.5 py-2 text-xs leading-5 text-slate-500 hover:bg-slate-100"
          >
            Add your first class
          </Link>
        )}
      </NavGroup>

      <NavGroup
        compact={compact}
        href="/study"
        icon={BookOpenCheck}
        label="Study Tools"
        pathname={pathname}
        onNavigate={onNavigate}
      >
        {studyLinks.map((item) => (
          <ChildLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </NavGroup>

      <NavGroup
        compact={compact}
        href="/planner"
        icon={CalendarRange}
        label="Planner"
        pathname={pathname}
        onNavigate={onNavigate}
      >
        {plannerLinks.map((item) => (
          <ChildLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </NavGroup>
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const desktopExpanded = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    () => true,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [classes, setClasses] = useState<SidebarClass[] | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadClasses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isActive) setClasses([]);
        return;
      }

      const { data, error } = await supabase
        .from("classes")
        .select("id, class_code, color")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching sidebar classes:", error);
        if (isActive) setClasses([]);
        return;
      }

      if (isActive) setClasses(data ?? []);
    }

    void loadClasses();
    window.addEventListener(CLASSES_CHANGED_EVENT, loadClasses);

    return () => {
      isActive = false;
      window.removeEventListener(CLASSES_CHANGED_EVENT, loadClasses);
    };
  }, []);

  function toggleDesktopSidebar() {
    localStorage.setItem("study-sidebar-collapsed", String(desktopExpanded));
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }

  const pageLabel = getPageLabel(pathname);

  return (
    <div className="flex min-h-svh bg-slate-50 text-slate-950">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-gray-300 bg-gray-100 transition-[width] duration-200 motion-reduce:transition-none md:flex",
          desktopExpanded ? "w-64" : "w-20",
        )}
      >
        <div className="p-4">
          <Brand compact={!desktopExpanded} />
        </div>
        <div className="my-2 h-px w-full bg-gray-300" />

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {desktopExpanded ? (
            <Navigation classes={classes} compact={false} pathname={pathname} />
          ) : null}
        </div>

        <div
          className={cn(
            "mt-auto flex p-4",
            desktopExpanded
              ? "items-end justify-between gap-3"
              : "flex-col items-center gap-2",
          )}
        >
          <div className="flex flex-col gap-2">
            <Link
              href="/report-bug"
              aria-label="Report a bug"
              className="flex items-center rounded-full p-2 hover:bg-gray-200"
            >
              <Bug className={desktopExpanded ? "mr-2" : ""} />
              <span className={desktopExpanded ? "" : "hidden"}>Report a bug</span>
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex items-center rounded-full p-2 transition-colors",
                pathname === "/settings"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-200",
              )}
            >
              <Settings className={desktopExpanded ? "mr-2" : ""} />
              <span className={desktopExpanded ? "" : "hidden"}>Settings</span>
            </Link>
          </div>
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            aria-label={desktopExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={desktopExpanded}
            className="rounded-lg p-2 hover:bg-gray-200"
          >
            {desktopExpanded ? (
              <PanelLeftClose className="opacity-25" aria-hidden="true" />
            ) : (
              <PanelRightClose className="opacity-75" aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-xl"
          >
            <Menu aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{pageLabel}</p>
            <p className="truncate text-xs text-slate-500">ADHD Study AI</p>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-x-clip focus:outline-none">
          {children}
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(90vw,20rem)] bg-gray-100 p-0">
          <SheetHeader className="border-b border-gray-300 pr-14">
            <SheetTitle asChild>
              <div><Brand /></div>
            </SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <Navigation classes={classes} compact={false} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex flex-col gap-2 border-t border-gray-300 p-4">
            <Link
              href="/report-bug"
              onClick={() => setMobileOpen(false)}
              className="flex items-center rounded-full p-2 hover:bg-gray-200"
            >
              <Bug className="mr-2" aria-hidden="true" />
              Report a bug
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex items-center rounded-full p-2 transition-colors",
                pathname === "/settings"
                  ? "bg-gray-900 text-white"
                  : "hover:bg-gray-200",
              )}
            >
              <Settings className="mr-2" aria-hidden="true" />
              Settings
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function subscribeToSidebarPreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_PREFERENCE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_PREFERENCE_EVENT, callback);
  };
}

function getSidebarPreference() {
  return localStorage.getItem("study-sidebar-collapsed") !== "true";
}
