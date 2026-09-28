export type GeneratedStudyGuide = {
  title: string;
  content: string;
  originalFileName: string;
};

export type SavedStudyGuide = GeneratedStudyGuide & {
  id: string;
  createdAt: string;
};

export type StudyGuideSummary = Pick<
  SavedStudyGuide,
  "id" | "title" | "originalFileName" | "createdAt"
> & {
  preview: string;
};
