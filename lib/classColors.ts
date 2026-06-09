export type ClassColor =
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "orange"
  | "yellow"
  | "pink"
  | "gray";

export const classColorOptions = [
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

export function getClassColor(color: string | null | undefined) {
  return (
    classColorOptions.find((option) => option.value === color) ??
    classColorOptions[0]
  );
}