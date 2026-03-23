"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type ClassItem = {
  id: string;
  name: string;
  created_at: string;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  async function fetchClasses(currentUserId: string) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching classes:", error);
      return;
    }

    setClasses(data ?? []);
  }

  async function handleAddClass() {
    if (!userId) return;

    const className = prompt("Enter class name:");

    if (className === null) return;

    const trimmedClassName = className.trim();

    if (!trimmedClassName) return;

    const { error } = await supabase.from("classes").insert({
      user_id: userId,
      name: trimmedClassName,
    });

    if (error) {
      console.error("Error adding class:", error);
      return;
    }

    await fetchClasses(userId);
  }

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);
      await fetchClasses(user.id);
    }

    loadPage();
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex h-1/12 items-center justify-center border border-green-500">
        <h1 className="text-2xl font-semibold">Classes</h1>
      </div>

      {/* Classes Grid Area */}
      <div className="h-11/12 overflow-y-auto border border-purple-500 p-4">
        <div className="grid grid-cols-5 gap-4">
          {/* Always-visible Add Class square */}
          <button
            onClick={handleAddClass}
            className="aspect-square border rounded-lg bg-gray-500 flex items-center justify-center font-medium"
          >
            + Add Class
          </button>

          {/* Class squares */}
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className="aspect-square border rounded-lg bg-gray-500 flex items-center justify-center font-medium"
            >
              <div className="flex h-full items-center justify-center text-center font-medium">
                {classItem.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}