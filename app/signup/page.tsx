import { AuthForm } from "@/components/AuthForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account | ADHD Study AI",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}
