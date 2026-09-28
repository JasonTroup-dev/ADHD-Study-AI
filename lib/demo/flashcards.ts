import type { FlashcardSetEditorInitialSet } from "@/components/flashcard/FlashcardSetEditor";

export type DemoFlashcardSet = FlashcardSetEditorInitialSet & {
  classColor: string;
};

export const demoFlashcardSets: DemoFlashcardSet[] = [
  {
    id: "demo-flashcards-membranes",
    title: "Cell Membranes and Transport",
    description: "Membrane structure and the major transport mechanisms.",
    classId: "demo-bio-210",
    classColor: "green",
    cards: [
      {
        id: "demo-membranes-1",
        question: "What is the main function of the phospholipid bilayer?",
        answer: "It creates a selectively permeable boundary between the cell and its environment.",
        card_order: 1,
      },
      {
        id: "demo-membranes-2",
        question: "How does active transport differ from facilitated diffusion?",
        answer: "Active transport uses cellular energy to move substances against their concentration gradient.",
        card_order: 2,
      },
      {
        id: "demo-membranes-3",
        question: "What drives osmosis across a membrane?",
        answer: "A difference in water concentration caused by unequal solute concentrations.",
        card_order: 3,
      },
    ],
  },
  {
    id: "demo-flashcards-working-memory",
    title: "Working Memory Models",
    description: "Components and applications of Baddeley’s working memory model.",
    classId: "demo-psy-240",
    classColor: "purple",
    cards: [
      {
        id: "demo-memory-1",
        question: "What does the phonological loop temporarily maintain?",
        answer: "Speech-based and auditory information.",
        card_order: 1,
      },
      {
        id: "demo-memory-2",
        question: "What is the central executive responsible for?",
        answer: "Directing attention and coordinating the other working-memory systems.",
        card_order: 2,
      },
    ],
  },
  {
    id: "demo-flashcards-industrialization",
    title: "Industrialization Key Terms",
    description: "People, concepts, and evidence used in the primary-source unit.",
    classId: "demo-hist-115",
    classColor: "orange",
    cards: [
      {
        id: "demo-industry-1",
        question: "What is urbanization?",
        answer: "The growth of cities as populations move from rural areas to urban centers.",
        card_order: 1,
      },
      {
        id: "demo-industry-2",
        question: "Why is author perspective important in factory testimony?",
        answer: "The author’s role and purpose shape which working conditions are emphasized or omitted.",
        card_order: 2,
      },
    ],
  },
];

export const demoFlashcardClasses = [
  { id: "demo-bio-210", name: "Cellular Biology", class_code: "BIO 210" },
  { id: "demo-psy-240", name: "Cognitive Psychology", class_code: "PSY 240" },
  { id: "demo-hist-115", name: "Modern World History", class_code: "HIST 115" },
];

export function getDemoFlashcardSet(setId: string) {
  return demoFlashcardSets.find((set) => set.id === setId) ?? null;
}
