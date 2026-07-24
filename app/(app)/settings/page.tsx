"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  Check,
  Clock3,
  LoaderCircle,
  RotateCcw,
  UserRound,
} from "lucide-react";

import SignOutButton from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_STUDY_PREFERENCES,
  FOCUS_MINUTE_OPTIONS,
  getDisplayName,
  getStudyPreferences,
  toStudyPreferencesMetadata,
  type FocusMinutes,
  type StudyPreferences,
} from "@/lib/userSettings";

type SettingsSnapshot = {
  displayName: string;
  preferences: StudyPreferences;
};

const EMPTY_SNAPSHOT: SettingsSnapshot = {
  displayName: "",
  preferences: DEFAULT_STUDY_PREFERENCES,
};

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [preferences, setPreferences] = useState<StudyPreferences>(
    DEFAULT_STUDY_PREFERENCES,
  );
  const [savedSnapshot, setSavedSnapshot] =
    useState<SettingsSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (error || !user) {
        setNotice({
          kind: "error",
          message: "We couldn’t load your settings. Please refresh and try again.",
        });
        setIsLoading(false);
        return;
      }

      const snapshot = {
        displayName: getDisplayName(user.user_metadata),
        preferences: getStudyPreferences(user.user_metadata),
      };

      setEmail(user.email ?? "");
      setDisplayName(snapshot.displayName);
      setPreferences(snapshot.preferences);
      setSavedSnapshot(snapshot);
      setIsLoading(false);
    }

    void loadSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const hasChanges =
    displayName.trim() !== savedSnapshot.displayName ||
    preferences.focusMinutes !== savedSnapshot.preferences.focusMinutes ||
    preferences.breakReminders !== savedSnapshot.preferences.breakReminders;

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || email[0]?.toUpperCase() || "S";

  function resetChanges() {
    setDisplayName(savedSnapshot.displayName);
    setPreferences(savedSnapshot.preferences);
    setNotice(null);
  }

  function setFocusMinutes(focusMinutes: FocusMinutes) {
    setPreferences((current) => ({ ...current, focusMinutes }));
    setNotice(null);
  }

  async function saveSettings() {
    const nextSnapshot = {
      displayName: displayName.trim(),
      preferences,
    };

    setIsSaving(true);
    setNotice(null);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: nextSnapshot.displayName,
        study_preferences: toStudyPreferencesMetadata(
          nextSnapshot.preferences,
        ),
      },
    });

    if (error) {
      setNotice({
        kind: "error",
        message: "Your changes weren’t saved. Please try again.",
      });
      setIsSaving(false);
      return;
    }

    setDisplayName(nextSnapshot.displayName);
    setSavedSnapshot(nextSnapshot);
    setNotice({
      kind: "success",
      message: "Settings saved. Your next study session is ready to go.",
    });
    setIsSaving(false);
  }

  return (
    <div className="min-h-full bg-gray-100">
      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-700">Your space</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-gray-950">
              Settings
            </h1>
            <p className="mt-2 max-w-2xl text-base text-gray-600">
              Make study sessions feel more natural for the way you focus.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isSaving || !hasChanges}
              onClick={resetChanges}
            >
              <RotateCcw aria-hidden="true" />
              Reset
            </Button>
            <Button
              type="button"
              disabled={isLoading || isSaving || !hasChanges}
              onClick={() => void saveSettings()}
            >
              {isSaving ? (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Check aria-hidden="true" />
              )}
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>

        {notice ? (
          <div
            role={notice.kind === "error" ? "alert" : "status"}
            className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
              notice.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6">
          <section
            aria-labelledby="profile-heading"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <UserRound className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="profile-heading"
                    className="text-lg font-semibold text-gray-950"
                  >
                    Profile
                  </h2>
                  <p className="text-sm text-gray-500">
                    The basics attached to your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr] md:items-start">
              <div
                aria-hidden="true"
                className="flex size-20 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-purple-700 text-2xl font-semibold text-white shadow-sm"
              >
                {isLoading ? "…" : initials}
              </div>

              <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    maxLength={80}
                    placeholder={isLoading ? "Loading..." : "How should we greet you?"}
                    disabled={isLoading || isSaving}
                    onChange={(event) => {
                      setDisplayName(event.target.value);
                      setNotice(null);
                    }}
                  />
                  <p className="text-xs leading-5 text-gray-500">
                    Used for a more personal experience across the app.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    placeholder={isLoading ? "Loading..." : ""}
                  />
                  <p className="text-xs leading-5 text-gray-500">
                    Your sign-in email can’t be changed here yet.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="focus-heading"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Clock3 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="focus-heading"
                    className="text-lg font-semibold text-gray-950"
                  >
                    Focus sessions
                  </h2>
                  <p className="text-sm text-gray-500">
                    Choose a pace that feels achievable before you begin.
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <h3 className="font-medium text-gray-950">
                    Default focus length
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    This becomes the starting timer on Guided Study Sessions.
                  </p>
                </div>

                <fieldset
                  disabled={isLoading || isSaving}
                  className="grid grid-cols-4 gap-2"
                >
                  <legend className="sr-only">Default focus length</legend>
                  {FOCUS_MINUTE_OPTIONS.map((minutes) => {
                    const isSelected =
                      preferences.focusMinutes === minutes;

                    return (
                      <button
                        key={minutes}
                        type="button"
                        aria-pressed={isSelected}
                        className={`min-w-14 rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                          isSelected
                            ? "border-gray-950 bg-gray-950 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        onClick={() => setFocusMinutes(minutes)}
                      >
                        {minutes}m
                      </button>
                    );
                  })}
                </fieldset>
              </div>

              <div className="flex items-center justify-between gap-6 px-6 py-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-950">
                      Break reminders
                    </h3>
                    <BellRing
                      className="size-4 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                    Keep a gentle break cue visible when you start a guided
                    session.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-label="Break reminders"
                  aria-checked={preferences.breakReminders}
                  disabled={isLoading || isSaving}
                  onClick={() => {
                    setPreferences((current) => ({
                      ...current,
                      breakReminders: !current.breakReminders,
                    }));
                    setNotice(null);
                  }}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                    preferences.breakReminders
                      ? "bg-gray-950"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1 left-0 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      preferences.breakReminders
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="session-heading"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="session-heading"
                  className="text-lg font-semibold text-gray-950"
                >
                  Account session
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  Finished studying on this device? Sign out securely.
                </p>
              </div>
              <SignOutButton />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
