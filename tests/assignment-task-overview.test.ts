import { describe, expect, it } from "vitest";

import { getTaskOverview } from "@/lib/assignments/taskOverview";

describe("assignment task overview", () => {
  it("uses analyzed supporting material when no primary assignment file exists", () => {
    const overview = getTaskOverview({
      taskTitle: "Complete problems 11–20",
      primaryFileName: null,
      primaryText: null,
      supportingMaterials: [{
        name: "problem-list.png",
        text: "The assignment contains problems 1 through 30. Complete each problem and show all work.",
      }],
    });

    expect(overview).toContain("Focus on Complete problems 11–20.");
    expect(overview).toContain("Based on problem-list.png:");
    expect(overview).toContain("problems 1 through 30");
  });

  it("directs the student to analyze attached images that have no extracted text", () => {
    const overview = getTaskOverview({
      taskTitle: "Work on assignment",
      primaryFileName: null,
      primaryText: null,
      supportingMaterials: [{ name: "problem-1.png", text: null }],
    });

    expect(overview).toContain("has not been read yet");
    expect(overview).toContain("Analyze the images");
  });

  it("chooses the supporting image that best matches the task range", () => {
    const overview = getTaskOverview({
      taskTitle: "Complete problems 11–20",
      primaryFileName: null,
      primaryText: null,
      supportingMaterials: [
        { name: "problem-1.png", text: "Problem 1 asks about velocity." },
        { name: "problems-11-20.png", text: "Problems 11 through 20 cover acceleration and force." },
      ],
    });

    expect(overview).toContain("Based on problems-11-20.png:");
    expect(overview).toContain("acceleration and force");
  });

  it("asks for material when no assignment context is attached", () => {
    const overview = getTaskOverview({
      taskTitle: "Work on assignment",
      primaryFileName: null,
      primaryText: null,
      supportingMaterials: [],
    });

    expect(overview).toContain("Upload the assignment instructions or supporting materials");
  });
});
