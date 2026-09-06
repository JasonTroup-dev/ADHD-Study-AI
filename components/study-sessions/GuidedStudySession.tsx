"use client";

import InputBar from "@/components/ai-tutor/InputBar";
import TutorWorkspace from "@/components/ai-tutor/TutorWorkspace";
import { applyAssignmentProblemLabels } from "@/lib/ai/studyTutorContext";
import {
  ASSIGNMENT_FILE_ACCEPT,
  STUDY_FILE_ACCEPT,
} from "@/lib/files/uploadConstraints";

import {
  GuidedSessionContextHeader,
} from "./guided-session/GuidedSessionContext";
import { shouldDisableTutorComposer } from "./guided-session/domain";
import { SessionCompletionBanner } from "./guided-session/SessionCompletionBanner";
import type { GuidedStudySessionProps } from "./guided-session/types";
import { useGuidedStudySession } from "./guided-session/useGuidedStudySession";

export function GuidedStudySession(props: GuidedStudySessionProps) {
  const controller = useGuidedStudySession(props);
  const assignment = controller.assignment;
  const hasReadableAssignmentContext = Boolean(
    assignment?.hasExtractedText
    || assignment?.materials.some((material) => material.hasExtractedText),
  );
  const displayMessages = controller.messages.map((message) => ({
    ...message,
    content: applyAssignmentProblemLabels(
      message.content,
      assignment?.problemIndex ?? [],
    ),
  }));

  return (
    <TutorWorkspace
      messages={displayMessages}
      isLoading={controller.isTutorLoading}
      onAskTutor={shouldDisableTutorComposer(controller) ? undefined : controller.setSelectedQuote}
      emptyTitle={controller.isTutorLoading ? "Tutor is thinking..." : "What are you working on?"}
      conversationHeader={<GuidedSessionContextHeader controller={controller} />}
      composerHeader={<SessionCompletionBanner controller={controller} />}
      composer={
        <InputBar
          input={controller.input}
          setInput={controller.setInput}
          selectedQuote={controller.selectedQuote}
          onRemoveQuote={() => controller.setSelectedQuote(null)}
          handleSend={() => void controller.sendMessage()}
          onStopResponse={controller.isTutorLoading && !controller.isContextLoading
            ? controller.stopTutorResponse
            : undefined}
          files={[]}
          onFilesSelected={(files) => {
            if (hasReadableAssignmentContext) {
              void controller.uploadStudyMaterials(files);
            } else {
              void controller.uploadAssignmentFile(files[0] ?? null);
            }
          }}
          onRemoveFile={() => undefined}
          accept={hasReadableAssignmentContext ? STUDY_FILE_ACCEPT : ASSIGNMENT_FILE_ACCEPT}
          multiple={hasReadableAssignmentContext}
          attachmentDisabled={!assignment || controller.isContextLoading}
          attachmentLabel={hasReadableAssignmentContext ? "Add study materials" : "Add assignment file"}
          placeholder={hasReadableAssignmentContext ? "Ask about the assignment" : "Describe the problem or what feels confusing"}
          status={controller.isCompleting
            ? "Saving session..."
            : controller.isUploading
              ? "Uploading assignment..."
              : "Tutor is thinking..."}
          error={controller.tutorError ?? controller.contextError}
          notice={controller.uploadNotice}
          disabled={shouldDisableTutorComposer(controller)}
        />
      }
    />
  );
}
