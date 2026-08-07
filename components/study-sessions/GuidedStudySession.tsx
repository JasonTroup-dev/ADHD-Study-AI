"use client";

import InputBar from "@/components/ai-tutor/InputBar";
import TutorWorkspace from "@/components/ai-tutor/TutorWorkspace";
import {
  ASSIGNMENT_FILE_ACCEPT,
  STUDY_FILE_ACCEPT,
} from "@/lib/files/uploadConstraints";

import {
  GuidedSessionContextHeader,
  MissingContextActions,
} from "./guided-session/GuidedSessionContext";
import { SessionCompletionBanner } from "./guided-session/SessionCompletionBanner";
import type { GuidedStudySessionProps } from "./guided-session/types";
import { useGuidedStudySession } from "./guided-session/useGuidedStudySession";

export function GuidedStudySession(props: GuidedStudySessionProps) {
  const controller = useGuidedStudySession(props);
  const assignment = controller.assignment;

  return (
    <TutorWorkspace
      messages={controller.messages}
      isLoading={controller.isTutorLoading}
      emptyTitle={controller.isTutorLoading ? "Tutor is thinking..." : "What are you working on?"}
      messageActions={(message) =>
        message.id.startsWith("missing-context-") &&
        assignment &&
        !assignment.hasExtractedText ? (
          <MissingContextActions controller={controller} />
        ) : null
      }
      conversationHeader={<GuidedSessionContextHeader controller={controller} />}
      composerHeader={<SessionCompletionBanner controller={controller} />}
      composer={
        <InputBar
          input={controller.input}
          setInput={controller.setInput}
          handleSend={() => void controller.sendMessage()}
          files={[]}
          onFilesSelected={(files) => {
            if (assignment?.hasExtractedText) {
              void controller.uploadStudyMaterials(files);
            } else {
              void controller.uploadAssignmentFile(files[0] ?? null);
            }
          }}
          onRemoveFile={() => undefined}
          accept={assignment?.hasExtractedText ? STUDY_FILE_ACCEPT : ASSIGNMENT_FILE_ACCEPT}
          multiple={Boolean(assignment?.hasExtractedText)}
          attachmentDisabled={!assignment || controller.isContextLoading}
          attachmentLabel={assignment?.hasExtractedText ? "Add study materials" : "Add assignment file"}
          placeholder={assignment?.hasExtractedText ? "Ask about the assignment" : "Describe the problem or what feels confusing"}
          status={controller.isUploading ? "Uploading assignment..." : "Tutor is thinking..."}
          error={controller.tutorError ?? controller.contextError}
          notice={controller.uploadNotice}
          disabled={controller.isTutorLoading || controller.isUploading || controller.completionUnlocked}
        />
      }
    />
  );
}
