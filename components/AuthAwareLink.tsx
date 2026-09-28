"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

type AuthAwareLinkProps = {
  authenticatedLabel: string;
  className: string;
  unauthenticatedLabel: string;
};

export function AuthAwareLink({
  authenticatedLabel,
  className,
  unauthenticatedLabel,
}: AuthAwareLinkProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setIsAuthenticated(Boolean(data.session));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Link
      href={isAuthenticated ? "/dashboard" : "/login"}
      className={className}
    >
      {isAuthenticated ? authenticatedLabel : unauthenticatedLabel}
      <ArrowRight className="size-4" />
    </Link>
  );
}
