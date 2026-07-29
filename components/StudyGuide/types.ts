export type GeneratedStudyGuide = {
  title: string;
  content: string;
  originalFileName: string;
};

export type SavedStudyGuide = GeneratedStudyGuide & {
  id: string;
  createdAt: string;
};
