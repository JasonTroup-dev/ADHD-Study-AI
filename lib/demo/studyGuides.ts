import type { SavedStudyGuide } from "@/components/StudyGuide/types";

export const demoStudyGuides: SavedStudyGuide[] = [
  {
    id: "demo-guide-cell-membranes",
    title: "Cell Membranes and Transport",
    originalFileName: "week-7-cell-membranes.pdf",
    createdAt: "2026-10-12T18:30:00.000Z",
    content: `# Cell Membranes and Transport

## Big picture

The plasma membrane is a selectively permeable boundary. Its phospholipid bilayer separates the cell from its environment while proteins control communication, recognition, and the movement of materials.

## Core concepts

### Membrane structure

- Phospholipids have hydrophilic heads and hydrophobic tails.
- Cholesterol helps stabilize membrane fluidity.
- Membrane proteins act as channels, carriers, receptors, enzymes, and anchors.

### Passive transport

Passive transport moves substances down their concentration gradient without direct cellular energy.

- **Simple diffusion:** small nonpolar molecules cross the bilayer directly.
- **Facilitated diffusion:** channels or carriers help polar molecules and ions cross.
- **Osmosis:** water moves across a selectively permeable membrane toward the side with more dissolved solute.

### Active transport

Active transport moves substances against a gradient and requires energy. Primary active transport uses ATP directly, while secondary active transport uses energy stored in another ion gradient.

## Knowledge check

1. Why can oxygen cross the membrane more easily than sodium ions?
2. What happens to an animal cell in a hypotonic solution?
3. How does the sodium-potassium pump differ from a channel protein?

## Quick review plan

Draw one membrane, label its major parts, and add one example each of simple diffusion, facilitated diffusion, osmosis, and active transport.`,
  },
  {
    id: "demo-guide-working-memory",
    title: "Working Memory Models",
    originalFileName: "cognitive-psychology-notes.docx",
    createdAt: "2026-10-10T16:00:00.000Z",
    content: `# Working Memory Models

## Big picture

Working memory is a limited-capacity system that temporarily holds and manipulates information needed for reasoning, comprehension, and learning.

## Baddeley and Hitch model

- **Central executive:** directs attention and coordinates the other systems.
- **Phonological loop:** briefly maintains verbal and auditory information.
- **Visuospatial sketchpad:** maintains visual and spatial information.
- **Episodic buffer:** integrates information across working memory and long-term memory.

## Evidence to remember

Dual-task studies show that two tasks interfere more when they rely on the same subsystem. The word-length effect and articulatory suppression provide evidence for the phonological loop.

## Learning applications

Reduce unnecessary cognitive load, group information into meaningful chunks, and combine concise verbal explanations with relevant visuals.

## Knowledge check

1. Which component allocates attention?
2. Why does repeating an irrelevant sound disrupt verbal rehearsal?
3. Give one study strategy that protects working-memory capacity.`,
  },
  {
    id: "demo-guide-industrialization",
    title: "Industrialization: Primary Sources",
    originalFileName: "factory-testimony-source.pdf",
    createdAt: "2026-10-08T20:15:00.000Z",
    content: `# Industrialization: Primary Sources

## Historical context

Industrialization shifted production toward mechanized factories, accelerated urban growth, and changed relationships among workers, owners, families, and governments.

## Source-analysis framework

For each source, identify:

1. **Author and audience** — who produced it, and for whom?
2. **Purpose** — what response was the author trying to create?
3. **Context** — what labor, political, or economic conditions shaped it?
4. **Limits** — whose experience is missing or difficult to verify?

## Perspective cues

- Factory owners may emphasize productivity, discipline, or economic opportunity.
- Workers may emphasize hours, safety, wages, and loss of control.
- Reformers may select vivid examples to build support for regulation.

## Knowledge check

Compare two accounts of factory life. Identify one shared fact, one disagreement, and one reason their perspectives differ.`,
  },
];

export function getDemoStudyGuide(guideId: string) {
  return demoStudyGuides.find((guide) => guide.id === guideId);
}
