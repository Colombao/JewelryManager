import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { staticFile } from "remotion";
import {
  framesFromAudioSeconds,
  tutorialDurationInFrames,
  type SystemTutorialProps,
} from "./tutorialShared";

export async function resolveTutorialMetadata(props: SystemTutorialProps) {  const introDurationInSeconds = await getAudioDurationInSeconds(
    staticFile(props.introAudio)
  );
  const introDurationInFrames = framesFromAudioSeconds(introDurationInSeconds);

  const stepDurationsInFrames: number[] = [];
  for (const step of props.steps) {
    const seconds = await getAudioDurationInSeconds(staticFile(step.audio));
    stepDurationsInFrames.push(framesFromAudioSeconds(seconds));
  }

  const outroDurationInSeconds = await getAudioDurationInSeconds(
    staticFile(props.outroAudio)
  );
  const outroDurationInFrames = framesFromAudioSeconds(outroDurationInSeconds);

  const durationInFrames = tutorialDurationInFrames(
    props.steps.length,
    stepDurationsInFrames,
    introDurationInFrames,
    outroDurationInFrames
  );

  return {
    durationInFrames,
    props: {
      ...props,
      introDurationInFrames,
      stepDurationsInFrames,
      outroDurationInFrames,
    },
  };
}