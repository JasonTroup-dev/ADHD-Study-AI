"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Clock3 } from "lucide-react"
import Link from "next/link";
import { Trash2 } from "lucide-react";


type ClassColor =
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "orange"
  | "yellow"
  | "pink"
  | "gray";

const classColorOptions = [
  {
    name: "Blue",
    value: "blue",
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-800",
    accent: "bg-blue-500",
    icon: "text-blue-500",
  },
  {
    name: "Purple",
    value: "purple",
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-800",
    accent: "bg-purple-500",
    icon: "text-purple-500",
  },
  {
    name: "Green",
    value: "green",
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-800",
    accent: "bg-green-500",
    icon: "text-green-500",
  },
  {
    name: "Red",
    value: "red",
    bg: "bg-red-100",
    border: "border-red-300",
    text: "text-red-800",
    accent: "bg-red-500",
    icon: "text-red-500",
  },
  {
    name: "Orange",
    value: "orange",
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-800",
    accent: "bg-orange-500",
    icon: "text-orange-500",
  },
  {
    name: "Yellow",
    value: "yellow",
    bg: "bg-yellow-100",
    border: "border-yellow-300",
    text: "text-yellow-800",
    accent: "bg-yellow-500",
    icon: "text-yellow-500",
  },
  {
    name: "Pink",
    value: "pink",
    bg: "bg-pink-100",
    border: "border-pink-300",
    text: "text-pink-800",
    accent: "bg-pink-500",
    icon: "text-pink-500",
  },
  {
    name: "Gray",
    value: "gray",
    bg: "bg-gray-100",
    border: "border-gray-300",
    text: "text-gray-800",
    accent: "bg-gray-500",
    icon: "text-gray-500",
  },
] satisfies {
  name: string;
  value: ClassColor;
  bg: string;
  border: string;
  text: string;
  accent: string;
  icon: string;
}[];

function getClassColor(color: string | null | undefined) {
  return classColorOptions.find((option) => option.value === color) ?? classColorOptions[0];
}

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
  const [createClassColor, setCreateClassColor] = useState<ClassColor>("blue");


    {/* Modal Variables */}
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createClassName, setCreateClassName] = useState("");
  const [createCourseCode, setCreateCourseCode] = useState("");
  const [createInstructor, setCreateInstructor] = useState("");
  


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

  async function handleAddClass() {
    if (!userId) return;

    if (createClassName === null) return;

    const trimmedClassName = createClassName.trim();

    if (!trimmedClassName) return;



    if (createCourseCode === null) return;

    const trimmedCourseCode = createCourseCode.trim();

    if (!trimmedCourseCode) return;



    if (createInstructor === null) return;

    const trimmedInstructor = createInstructor.trim();

    if (!trimmedInstructor) return;



    const { error } = await supabase.from("classes").insert({
      user_id: userId,
      name: trimmedClassName,
      class_code: trimmedCourseCode,
      prof_name: trimmedInstructor,
      color: createClassColor
    });

    if (error) {
      console.error("Error adding class:", error);
      return;
    }

    setIsModalOpen(false);
    setCreateClassName("");
    setCreateCourseCode("");
    setCreateInstructor("");
    setCreateClassColor("blue")

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
            <h1 className="text-4xl font-medium">Classes</h1>
            <p className="text-xl text-gray-600 py-2">Organize your courses, notes, flashcards, and study sessions</p>
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
          {classes.map((classItem) => {
            const colorOption = getClassColor(classItem.color);

            return (

              <div
                key={classItem.id} 
                className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg lg:col-span-4"
              >
                <span aria-hidden="true" className={`absolute left-0 top-0 h-full w-1.5 ${colorOption.accent}`}/>
                <div className="flex justify-between items-center">
                  <header className="text-xl font-semibold">{classItem.name}</header>
                  
                  <Trash2
                    className="ml-2 h-5 w-5 cursor-pointer text-gray-500 hover:text-red-600"
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDeleteClass(classItem.id, classItem.name);
                    }}
                  />
                </div>

                <div className="flex">
                  {classItem.class_code}
                  <p className="mx-2">*</p>
                  {classItem.prof_name}
                </div>

                <div className={`my-6 rounded-2xl ${colorOption.bg} px-4 py-4`}>

                  <div className="flex items-center gap-2">
                    <Clock3 className={`h-4 w-4 ${colorOption.icon}`} />

                    <p className="text-lg font-semibold text-black">
                    Problem Set 7
                    </p>
                  </div>

                  <p className="pl-6 text-sm text-gray-600">
                    Due May 15
                  </p>

                </div>

                <div className="">
                  <div className="flex justify-between">
                    <p>Course Progress</p>
                    <p className="font-semibold">68%</p>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-300">
                    <div 
                      className="h-full rounded-full bg-black"
                      style={{ width: `68%` }}>
                    </div>
                  </div>

                  <div className="my-6 h-px w-full bg-gray-300"></div>

                  <div>
                    <div className="flex divide-x divide-gray-200">
                      <div className="flex-1 text-center">
                        <p className="font-bold">45</p>
                        <p>Flashcards</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-bold">12</p>
                        <p>Notes</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-bold">8</p>
                        <p>Sessions</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex justify-center pt-6">
                  <Link 
                    href={`/classes/${classItem.id}`}
                    className="w-full">
                    <Button 
                      variant="ghost" 
                      size="default"
                      className="w-full border"
                      >
                        Continue Studying
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
          
          
        </div>
      </div>


      {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Create New Class</h2>
                        </div>

                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="text-gray-500 hover:text-gray-900"
                        >
                            ✕
                        </button>
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="text-sm font-medium">Class Name</label>
                      <input
                          type="text"
                          value={createClassName}
                          onChange={(e) => setCreateClassName(e.target.value)}
                          className="mt-1 w-full rounded-lg border px-3 py-2"
                          placeholder="e.g., Organic Chemistry"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium">Course Code</label>
                      <input
                          type="text"
                          value={createCourseCode}
                          onChange={(e) => setCreateCourseCode(e.target.value)}
                          className="mt-1 w-full rounded-lg border px-3 py-2"
                          placeholder="e.g., CHEM 3331"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium">Instructor</label>
                      <input
                          type="text"
                          value={createInstructor}
                          onChange={(e) => setCreateInstructor(e.target.value)}
                          className="mt-1 w-full rounded-lg border px-3 py-2"
                          placeholder="e.g., Dr.Smith"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="text-sm font-medium">Class Color</label>
                      <div className="mt-3 flex items-center gap-3">
                        {classColorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setCreateClassColor(color.value)}
                            aria-label={`Choose ${color.name}`}
                            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                              createClassColor === color.value
                                ? "ring-2 ring-gray-900 ring-offset-2"
                                : "hover:scale-105"
                            }`}
                          >
                            <span className={`h-6 w-6 rounded-full ${color.accent}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <Button
                        variant="ghost" 
                        size="default"
                        className="border mr-2"
                        onClick={() => setIsModalOpen(false)}
                      >
                        Cancel
                      </Button>

                      <Button
                        variant="default" 
                        size="default"
                        className=""
                        onClick={handleAddClass}>
                        Create Class
                      </Button>
                    </div>
                  </div>
                </div>
            )}
    </div>
  );
}