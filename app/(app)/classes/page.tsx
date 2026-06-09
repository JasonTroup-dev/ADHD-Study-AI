"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {  type ClassColor ,} from "@/lib/classColors"
import ClassCard from "@/components/classes/ClassCard";
import AddClassModal from "@/components/classes/AddClassModal";


type ClassItem = {
  id: string;
  name: string;
  created_at: string;
  class_code: string;
  prof_name: string;
  color: ClassColor;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchClasses(currentUserId: string) {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, created_at, class_code, prof_name, color")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching classes:", error);
      return;
    }

    setClasses(data ?? []);
  }

  async function handleAddClass(newClass: {
    name: string;
    classCode: string;
    professorName: string;
    color: ClassColor;
  }) {
    if (!userId) return;

    const { error } = await supabase.from("classes").insert({
      user_id: userId,
      name: newClass.name,
      class_code: newClass.classCode,
      prof_name: newClass.professorName,
      color: newClass.color,
    });

    if (error) {
      console.error("Error adding class:", error);
      return;
    }

    setIsModalOpen(false);
    await fetchClasses(userId);
  }

  async function handleDeleteClass(classId: string, name: string) {
      if (!userId) {
          alert("You must be logged in to delete a class.");
          return;
      }

      const confirmed = window.confirm(
          `Delete "${name}"? This will also delete the study materials for this class.`
      );

      if (!confirmed) return;

      const { data, error } = await supabase
          .from("classes")
          .delete()
          .eq("id", classId)
          .eq("user_id", userId)
          .select("id");

      if (error) {
          console.error("Error deleting class:", error);
          alert("Could not delete this class.");
          return;
      }

      if (!data || data.length === 0) {
          console.error("No class deleted. Possible RLS/user_id mismatch.");
          alert("No class was deleted. Check RLS or user ownership.");
          return;
      }

      setClasses((prev) => prev.filter((classItem) => classItem.id !== classId));
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
    <div className="min-h-screen w-full bg-gray-100">
      <div className="mx-auto w-full max-w-screen-2xl px-6 py-8 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-semibold">Classes</h1>
            <p className="text-xl py-2 text-gray-600">Organize your courses, notes, flashcards, and study sessions</p>
          </div>

          <div className="pt-2">
            <Button 
              variant="default" 
              size="default"
              onClick={() => setIsModalOpen(true)}
              >
                  + Add Class
            </Button>
          </div>

        </div>

        {/* Classes Display Area */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Class Card Item */}
          {classes.map((classItem) => (
            <ClassCard
              key={classItem.id}
              id={classItem.id}
              name={classItem.name}
              classCode={classItem.class_code}
              professorName={classItem.prof_name}
              color={classItem.color}
              onDelete={handleDeleteClass}
            />
          ))}
          
          
        </div>
      </div>


      <AddClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateClass={handleAddClass}
      />
                
    </div>
  );
}