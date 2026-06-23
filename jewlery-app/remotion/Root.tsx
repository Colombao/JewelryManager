import { Composition } from "remotion";
import {
  catalogDurationInFrames,
  defaultCatalogProps,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from "./catalogShared";
import { ProductCatalogVideo } from "./ProductCatalogVideo";
import { SystemTutorialVideo } from "./SystemTutorialVideo";
import { defaultTutorialProps } from "./tutorialData";
import {
  tutorialDurationInFrames,
  TUTORIAL_FPS,
  TUTORIAL_HEIGHT,
  TUTORIAL_WIDTH,
} from "./tutorialShared";
import { resolveTutorialMetadata } from "./tutorialTiming";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProductCatalog"
        component={ProductCatalogVideo}
        durationInFrames={catalogDurationInFrames(
          defaultCatalogProps.products.length
        )}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultCatalogProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: catalogDurationInFrames(props.products.length),
        })}
      />
      <Composition
        id="SystemTutorial"
        component={SystemTutorialVideo}
        durationInFrames={tutorialDurationInFrames(
          defaultTutorialProps.steps.length
        )}
        fps={TUTORIAL_FPS}
        width={TUTORIAL_WIDTH}
        height={TUTORIAL_HEIGHT}
        defaultProps={defaultTutorialProps}
        calculateMetadata={async ({ props }) => resolveTutorialMetadata(props)}
      />
    </>
  );
};
