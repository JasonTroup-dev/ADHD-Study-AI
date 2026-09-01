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
import { useDemoWorkspace } from "@/components/demo/DemoWorkspaceProvider";
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
  { href: "/billing", label: "Billing" },
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

function getWorkspaceHref(href: string, demo: boolean) {
  if (!demo) return href;
  if (href === "/dashboard") return "/demo";
  if (href === "/calendar") return "/demo/calendar";
  if (href.startsWith("/classes/")) return `/demo${href}`;
  if (href.startsWith("/classes")) return "/demo/classes";
  if (href === "/study") return "/demo/study";
  if (href.startsWith("/study/")) return `/demo${href}`;
  if (href.startsWith("/planner")) return "/demo/planner";
  return "/demo";
}

function getWorkspacePathname(pathname: string, demo: boolean) {
  if (!demo) return pathname;
  if (pathname === "/demo") return "/dashboard";
  if (pathname.startsWith("/demo/classes/")) return pathname.slice(5);
  if (pathname.startsWith("/demo/classes")) return "/classes";
  if (pathname.startsWith("/demo/study/")) return pathname.slice(5);
  if (pathname.startsWith("/demo/study")) return "/study";
  if (pathname.startsWith("/demo/planner")) return "/planner";
  if (pathname.startsWith("/demo/calendar")) return "/calendar";
  return "/dashboard";
}

function Brand({ compact = false, demo = false }: { compact?: boolean; demo?: boolean }) {
  return (
    <Link
      href={getWorkspaceHref("/dashboard", demo)}
      aria-label="ADHD Study AI dashboard"
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#4d765f]/25",
        compact && "justify-center",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#19241f] text-[#fffaf0] shadow-[0_8px_20px_-12px_rgba(25,36,31,0.8)]">
        <Brain className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      {compact ? null : (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.02em] text-[#19241f]">
            ADHD Study AI
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-bold uppercase tracking-[0.13em] text-[#78847d]">
            Your study space
          </span>
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
  demo = false,
}: {
  compact: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
  onNavigate?: () => void;
  demo?: boolean;
}) {
  return (
    <Link
      href={getWorkspaceHref(href, demo)}
      title={compact ? label : undefined}
      aria-label={compact ? label : undefined}
      aria-current={pathname === href ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-[background-color,color,transform] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d765f]",
        isActivePath(pathname, href)
          ? "bg-[#19241f] text-[#fffaf0] shadow-[0_8px_18px_-14px_rgba(25,36,31,0.8)]"
          : "text-[#526159] hover:translate-x-0.5 hover:bg-[#19241f]/6 hover:text-[#19241f]",
        compact && "justify-center px-0",
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <span className={compact ? "sr-only" : "truncate"}>{label}</span>
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
  demo = false,
}: {
  children: ReactNode;
  compact: boolean;
  defaultOpen?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  pathname: string;
  onNavigate?: () => void;
  demo?: boolean;
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
        demo={demo}
      />
    );
  }

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center justify-between rounded-xl transition-colors",
          isActivePath(pathname, href)
            ? "bg-[#19241f]/7 text-[#19241f]"
            : "text-[#526159] hover:bg-[#19241f]/5 hover:text-[#19241f]",
        )}
      >
        <Link
          href={getWorkspaceHref(href, demo)}
          aria-current={pathname === href ? "page" : undefined}
          onClick={onNavigate}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d765f]"
        >
          <Icon className="size-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span className="truncate">{label}</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen((current) => !current)}
          aria-controls={contentId}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          className="mr-1 rounded-lg p-1 text-[#78847d] hover:bg-[#19241f]/8 hover:text-[#19241f]"
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
              "flex flex-col gap-1 pl-9 pr-1 pt-1 transition-transform duration-200 ease-out motion-reduce:transition-none",
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
  demo = false,
}: NavChild & { pathname: string; onNavigate?: () => void; demo?: boolean }) {
  return (
    <Link
      href={getWorkspaceHref(href, demo)}
      aria-current={pathname === href ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d765f]",
        isActivePath(pathname, href)
          ? "bg-[#fffaf0] text-[#9e3f28] shadow-[inset_3px_0_0_#d76543]"
          : "text-[#66736c] hover:bg-[#19241f]/5 hover:text-[#19241f]",
      )}
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
  demo = false,
}: {
  classes: SidebarClass[] | null;
  compact: boolean;
  pathname: string;
  onNavigate?: () => void;
  demo?: boolean;
}) {
  return (
    <nav aria-label="Workspace navigation" className="flex flex-col gap-2">
      <NavLink
        compact={compact}
        href="/dashboard"
        icon={LayoutDashboard}
        label="Dashboard"
        pathname={pathname}
        onNavigate={onNavigate}
        demo={demo}
      />

      <NavGroup
        compact={compact}
        href="/classes"
        icon={GraduationCap}
        label="Classes"
        pathname={pathname}
        onNavigate={onNavigate}
        demo={demo}
      >
        {classes === null ? (
          <div className="space-y-2 py-2" aria-label="Loading classes">
            <div className="h-7 animate-pulse rounded-lg bg-[#19241f]/6 motion-reduce:animate-none" />
            <div className="h-7 w-4/5 animate-pulse rounded-lg bg-[#19241f]/6 motion-reduce:animate-none" />
          </div>
        ) : classes.length ? (
          classes.map((classItem) => {
            const color = getClassColor(classItem.color);
            const href = `/classes/${classItem.id}`;
            const active = pathname === href;

            return (
              <Link
                key={classItem.id}
                href={getWorkspaceHref(href, demo)}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d765f]",
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
            href={getWorkspaceHref("/classes", demo)}
            onClick={onNavigate}
            className="block rounded-lg px-2.5 py-2 text-xs leading-5 text-[#66736c] hover:bg-[#19241f]/5 hover:text-[#19241f]"
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
        demo={demo}
      >
        {studyLinks.map((item) => (
          <ChildLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} demo={demo} />
        ))}
      </NavGroup>

      <NavGroup
        compact={compact}
        href="/planner"
        icon={CalendarRange}
        label="Planner"
        pathname={pathname}
        onNavigate={onNavigate}
        demo={demo}
      >
        {(demo ? [{ href: "/calendar", label: "Calendar" }] : plannerLinks).map((item) => (
          <ChildLink key={item.href} {...item} pathname={pathname} onNavigate={onNavigate} demo={demo} />
        ))}
      </NavGroup>
    </nav>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const routePathname = usePathname();
  const demoWorkspace = useDemoWorkspace();
  const readOnlyDemo = demoWorkspace !== null;
  const pathname = getWorkspacePathname(routePathname, readOnlyDemo);
  const desktopExpanded = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreference,
    () => true,
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [classes, setClasses] = useState<SidebarClass[] | null>(() =>
    demoWorkspace
      ? demoWorkspace.classes.map((classItem) => ({
          id: classItem.id,
          class_code: classItem.classCode,
          color: classItem.color,
        }))
      : null,
  );

  useEffect(() => {
    if (demoWorkspace) return;

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
  }, [demoWorkspace]);

  function toggleDesktopSidebar() {
    localStorage.setItem("study-sidebar-collapsed", String(desktopExpanded));
    window.dispatchEvent(new Event(SIDEBAR_PREFERENCE_EVENT));
  }

  const pageLabel = getPageLabel(pathname);

  return (
    <div
      className={cn(
        "workspace-shell flex min-h-svh bg-[#f7f3ea] text-[#19241f]",
        readOnlyDemo && "h-svh overflow-hidden",
      )}
    >
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-full bg-[#19241f] px-5 py-2.5 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>

      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col overflow-hidden border-r border-[#19241f]/10 bg-[#eee9dc] transition-[width] duration-200 motion-reduce:transition-none md:flex",
          desktopExpanded ? "w-64" : "w-[4.75rem]",
        )}
      >
        <div className="px-4 pb-3 pt-5">
          <Brand compact={!desktopExpanded} demo={readOnlyDemo} />
        </div>
        <div className="mx-4 h-px bg-[#19241f]/10" />

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          <Navigation
            classes={classes}
            compact={!desktopExpanded}
            pathname={pathname}
            demo={readOnlyDemo}
          />
        </div>

        <div
          className={cn(
            "mt-auto flex p-4",
            desktopExpanded
              ? "items-end justify-between gap-3"
              : "flex-col items-center gap-2",
          )}
        >
          {!readOnlyDemo ? <div className="flex flex-col gap-2">
            <Link
              href="/report-bug"
              aria-label="Report a bug"
              className="flex min-h-9 items-center rounded-xl px-2.5 text-sm font-medium text-[#66736c] transition-colors hover:bg-[#19241f]/6 hover:text-[#19241f]"
            >
              <Bug className={cn("size-[17px]", desktopExpanded ? "mr-2" : "")} />
              <span className={desktopExpanded ? "" : "hidden"}>Report a bug</span>
            </Link>
            <Link
              href="/settings"
              aria-label="Settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex min-h-9 items-center rounded-xl px-2.5 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-[#19241f] text-white"
                  : "text-[#66736c] hover:bg-[#19241f]/6 hover:text-[#19241f]",
              )}
            >
              <Settings className={cn("size-[17px]", desktopExpanded ? "mr-2" : "")} />
              <span className={desktopExpanded ? "" : "hidden"}>Settings</span>
            </Link>
          </div> : null}
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            aria-label={desktopExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={desktopExpanded}
            className="rounded-xl p-2 text-[#78847d] transition-colors hover:bg-[#19241f]/7 hover:text-[#19241f]"
          >
            {desktopExpanded ? (
              <PanelLeftClose className="opacity-25" aria-hidden="true" />
            ) : (
              <PanelRightClose className="opacity-75" aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[#19241f]/10 bg-[#f7f3ea]/90 px-4 backdrop-blur md:hidden">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-full border border-[#19241f]/10 bg-[#fffaf0]"
          >
            <Menu aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{pageLabel}</p>
            <p className="truncate text-xs text-[#78847d]">ADHD Study AI</p>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="workspace-content relative flex min-h-0 flex-1 flex-col overflow-x-clip focus:outline-none"
        >
          {readOnlyDemo ? (
            <div
              role="status"
              className="shrink-0 border-b border-[#ddc56f]/45 bg-[#fbf1c9] px-4 py-2 text-center text-xs font-medium text-[#6e5816]"
            >
              Sample workspace · read only. Account changes, uploads, and AI requests are disabled.{" "}
              <Link
                href="/login"
                className="font-semibold underline decoration-amber-500 underline-offset-2 transition-colors hover:text-amber-700 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
              >
                Open the live workspace
              </Link>
            </div>
          ) : null}
          {readOnlyDemo ? (
            <div className="min-h-0 flex-1 overflow-y-auto [&>*]:h-full [&>*]:min-h-0">
              {children}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(90vw,20rem)] border-[#19241f]/10 bg-[#eee9dc] p-0">
          <SheetHeader className="border-b border-[#19241f]/10 pr-14">
            <SheetTitle asChild>
              <div><Brand demo={readOnlyDemo} /></div>
            </SheetTitle>
            <SheetDescription className="sr-only">Workspace navigation</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <Navigation classes={classes} compact={false} pathname={pathname} onNavigate={() => setMobileOpen(false)} demo={readOnlyDemo} />
          </div>
          {!readOnlyDemo ? <div className="flex flex-col gap-2 border-t border-[#19241f]/10 p-4">
            <Link
              href="/report-bug"
              onClick={() => setMobileOpen(false)}
              className="flex items-center rounded-xl p-2 text-[#66736c] hover:bg-[#19241f]/6 hover:text-[#19241f]"
            >
              <Bug className="mr-2" aria-hidden="true" />
              Report a bug
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex items-center rounded-xl p-2 transition-colors",
                pathname === "/settings"
                  ? "bg-[#19241f] text-white"
                  : "text-[#66736c] hover:bg-[#19241f]/6 hover:text-[#19241f]",
              )}
            >
              <Settings className="mr-2" aria-hidden="true" />
              Settings
            </Link>
          </div> : null}
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
