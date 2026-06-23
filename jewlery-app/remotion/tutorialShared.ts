export const TUTORIAL_FPS = 30;
export const TUTORIAL_WIDTH = 1920;
export const TUTORIAL_HEIGHT = 1080;
export const TUTORIAL_INTRO_FRAMES = 90;
export const TUTORIAL_OUTRO_FRAMES = 90;
export const TUTORIAL_FRAMES_PER_STEP = 150;
export const TUTORIAL_STEP_PADDING_FRAMES = 20;
export const TUTORIAL_MIN_SEGMENT_FRAMES = 60;

export type TutorialStep = {
  title: string;
  description: string;
  screenshot: string | null;
  tips?: string[];
  narration: string;
  audio: string;
};

export type SystemTutorialProps = {
  videoTitle: string;
  subtitle: string;
  introNarration: string;
  introAudio: string;
  outroNarration: string;
  outroAudio: string;
  steps: TutorialStep[];
  introDurationInFrames?: number;
  stepDurationsInFrames?: number[];
  outroDurationInFrames?: number;
};

export function framesFromAudioSeconds(
  seconds: number,
  fps: number = TUTORIAL_FPS
) {
  return Math.max(
    TUTORIAL_MIN_SEGMENT_FRAMES,
    Math.ceil(seconds * fps) + TUTORIAL_STEP_PADDING_FRAMES
  );
}

export function tutorialDurationInFrames(
  stepCount: number,
  stepDurations?: number[],
  introFrames = TUTORIAL_INTRO_FRAMES,
  outroFrames = TUTORIAL_OUTRO_FRAMES
) {
  const stepsTotal = stepDurations?.length
    ? stepDurations.reduce((sum, frames) => sum + frames, 0)
    : stepCount * TUTORIAL_FRAMES_PER_STEP;

  return introFrames + stepsTotal + outroFrames;
}
