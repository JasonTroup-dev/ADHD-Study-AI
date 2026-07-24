"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
};

type MessageTone = "error" | "success";

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("error");

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace("/dashboard");
        router.refresh();
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMessageTone("error");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        setMessageTone(error ? "error" : "success");
        setMessage(
          error
            ? error.message
            : "Account created. Check your email if confirmation is enabled."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f3ea] text-[#19241f]">
      <div className="mx-auto grid min-h-screen min-w-0 max-w-[100rem] lg:grid-cols-[minmax(0,1.06fr)_minmax(29rem,0.94fr)]">
        <section className="relative hidden min-h-screen overflow-hidden bg-[#1c2b24] px-12 py-10 text-[#fffaf0] lg:flex lg:flex-col xl:px-16 xl:py-12">
          <div
            aria-hidden="true"
            className="absolute -left-24 bottom-24 size-64 rounded-full border border-[#fffaf0]/10"
          />
          <div
            aria-hidden="true"
            className="absolute -left-10 bottom-36 size-40 rounded-full border border-[#fffaf0]/10"
          />
          <div
            aria-hidden="true"
            className="absolute -right-16 top-36 size-40 rotate-12 rounded-[2.5rem] bg-[#d76543]"
          />
          <div
            aria-hidden="true"
            className="absolute -right-6 top-[19rem] size-28 rounded-full bg-[#ddc56f]"
          />

          <Link
            href="/"
            className="relative z-10 inline-flex w-fit items-center gap-3 font-semibold tracking-[-0.02em]"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-[#fffaf0] text-[#19241f]">
              <Brain className="size-5" strokeWidth={1.8} />
            </span>
            ADHD Study AI
          </Link>

          <div className="relative z-10 my-auto max-w-xl py-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#fffaf0]/15 bg-white/5 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#e9dfc7]">
              <Sparkles className="size-3.5 text-[#ed9b79]" strokeWidth={2} />
              Built for the way you focus
            </div>

            <h2 className="mt-7 text-balance text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.055em] xl:text-[4.15rem]">
              Your next step is already waiting.
            </h2>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-[#c4cec8]">
              Come back to a study space that turns the pile into one clear,
              doable thing at a time.
            </p>

            <div className="mt-10 max-w-lg rotate-[-0.7deg] rounded-[1.75rem] border border-[#fffaf0]/10 bg-[#fdf9f0] p-3 text-[#19241f] shadow-[0_28px_70px_-36px_rgba(0,0,0,0.75)]">
              <div className="rounded-[1.25rem] border border-[#19241f]/10 bg-[#fffdf8] p-5 xl:p-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9e3f28]">
                      Start here
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                      Review chapter notes
                    </p>
                    <p className="mt-1 text-sm text-[#66736c]">
                      Biology / Cell respiration
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e9dfc7] px-3 py-1.5 text-xs font-semibold text-[#526159]">
                    <Clock3 className="size-3.5" />
                    20 min
                  </span>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e9dfc7]">
                  <div className="h-full w-[38%] rounded-full bg-[#d76543]" />
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#526159]">
                    <span className="flex size-6 items-center justify-center rounded-full bg-[#e5eddf] text-[#4d765f]">
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                    One step, then the next
                  </span>
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#19241f] text-white">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-sm text-[#aebbb4]">
            <ShieldCheck className="size-4 text-[#ddc56f]" />
            Your study space stays private and secure.
          </div>
        </section>

        <section className="flex min-h-screen min-w-0 flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.02em] lg:hidden"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-[#19241f] text-[#fffaf0]">
                <Brain className="size-[18px]" strokeWidth={1.8} />
              </span>
              ADHD Study AI
            </Link>

            <div className="ml-auto flex items-center gap-3 text-sm text-[#66736c]">
              <span className="hidden sm:inline">
                {isSignUp ? "Already have an account?" : "New here?"}
              </span>
              <Link
                href={isSignUp ? "/login" : "/signup"}
                className="rounded-full border border-[#19241f]/15 bg-[#fffaf0] px-4 py-2 font-semibold text-[#26382f] transition-colors hover:bg-[#eee7d8]"
              >
                {isSignUp ? "Sign in" : "Create account"}
              </Link>
            </div>
          </div>

          <div className="mx-auto flex w-full min-w-0 max-w-[27rem] flex-1 flex-col justify-center py-14 sm:py-16">
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[#e5eddf] text-[#3e6a53]">
              {isSignUp ? (
                <Sparkles className="size-5" strokeWidth={1.9} />
              ) : (
                <Brain className="size-5" strokeWidth={1.9} />
              )}
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9e3f28]">
              {isSignUp ? "Set up your study space" : "Welcome back"}
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-[2.7rem]">
              {isSignUp
                ? "Make studying feel lighter."
                : "Pick up where you left off."}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-[#66736c]">
              {isSignUp
                ? "Create an account and turn your class material into a clear, manageable plan."
                : "Sign in and we'll bring you straight back to your next doable step."}
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div>
                <Label htmlFor="email" className="mb-2.5 text-[#32443a]">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-xl border-[#19241f]/15 bg-[#fffdf8] px-4 text-[#19241f] shadow-none placeholder:text-[#87928c] focus-visible:border-[#4d765f] focus-visible:ring-[#4d765f]/15"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2.5 text-[#32443a]">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 rounded-xl border-[#19241f]/15 bg-[#fffdf8] px-4 pr-12 text-[#19241f] shadow-none placeholder:text-[#87928c] focus-visible:border-[#4d765f] focus-visible:ring-[#4d765f]/15"
                    placeholder={
                      isSignUp
                        ? "Choose a secure password"
                        : "Enter your password"
                    }
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-[#78847d] transition-colors hover:text-[#19241f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#4d765f]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="size-[18px]" />
                    ) : (
                      <Eye className="size-[18px]" />
                    )}
                  </button>
                </div>
                {isSignUp && (
                  <p className="mt-2 text-xs leading-5 text-[#78847d]">
                    Use at least 6 characters.
                  </p>
                )}
              </div>

              {message && (
                <div
                  className={
                    messageTone === "success"
                      ? "flex items-start gap-2.5 rounded-xl border border-[#4d765f]/20 bg-[#e5eddf] px-4 py-3 text-sm leading-6 text-[#31503f]"
                      : "flex items-start gap-2.5 rounded-xl border border-[#9e3f28]/15 bg-[#f3d7c9]/65 px-4 py-3 text-sm leading-6 text-[#7c3524]"
                  }
                  role={messageTone === "error" ? "alert" : "status"}
                >
                  {messageTone === "success" ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  )}
                  <span>{message}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#19241f] px-5 text-[15px] font-semibold text-white shadow-[0_12px_28px_-16px_rgba(25,36,31,0.9)] transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-[#2d4037] focus-visible:ring-[#4d765f]/25"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    {isSignUp ? "Creating your space..." : "Signing you in..."}
                  </>
                ) : (
                  <>
                    {isSignUp ? "Create my account" : "Continue to my dashboard"}
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-7 flex items-center justify-center gap-2 text-center text-xs leading-5 text-[#78847d]">
              <ShieldCheck className="size-3.5 shrink-0" />
              Secure sign in. No streak pressure, ever.
            </p>
          </div>

          <p className="text-center text-xs leading-5 text-[#87928c]">
            By continuing, you agree to use ADHD Study AI responsibly.
          </p>
        </section>
      </div>
    </main>
  );
}
