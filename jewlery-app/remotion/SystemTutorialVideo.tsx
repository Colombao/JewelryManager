import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  TUTORIAL_FRAMES_PER_STEP,
  TUTORIAL_INTRO_FRAMES,
  TUTORIAL_OUTRO_FRAMES,
  type SystemTutorialProps,
  type TutorialStep,
} from "./tutorialShared";

export type { SystemTutorialProps };

function TutorialIntro({
  videoTitle,
  subtitle,
  introAudio,
}: Pick<SystemTutorialProps, "videoTitle" | "subtitle" | "introAudio">) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 25], [24, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        opacity,
      }}
    >
      <Audio src={staticFile(introAudio)} volume={1} />
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 14,
          background: "linear-gradient(135deg, #60a5fa, #2563eb)",
          marginBottom: 32,
          transform: `translateY(${y}px)`,
        }}
      />
      <h1
        style={{
          color: "#f8fafc",
          fontSize: 64,
          fontWeight: 700,
          textAlign: "center",
          margin: 0,
          transform: `translateY(${y}px)`,
          lineHeight: 1.15,
        }}
      >
        {videoTitle}
      </h1>
      <p
        style={{
          color: "#94a3b8",
          fontSize: 28,
          marginTop: 24,
          textAlign: "center",
          maxWidth: 900,
          transform: `translateY(${y}px)`,
        }}
      >
        {subtitle}
      </p>
      <p
        style={{
          color: "#64748b",
          fontSize: 20,
          marginTop: 48,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}
      >
        Tutorial
      </p>
    </AbsoluteFill>
  );
}

function StepSlide({
  step,
  stepIndex,
  durationInFrames,
}: {
  step: TutorialStep;
  stepIndex: number;
  durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 15, durationInFrames - 15, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const panelX = interpolate(frame, [0, 20], [-30, 0], {
    extrapolateRight: "clamp",
  });
  const imageScale = interpolate(frame, [0, 25], [0.96, 1], {
    extrapolateRight: "clamp",
  });

  const screenshotSrc = step.screenshot ? staticFile(step.screenshot) : null;

  return (
    <AbsoluteFill
      style={{
        background: "#f1f5f9",
        opacity,
        flexDirection: "row",
        display: "flex",
      }}
    >
      <Audio src={staticFile(step.audio)} volume={1} />
      <div
        style={{
          width: "42%",
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          transform: `translateX(${panelX}px)`,
        }}
      >
        <p
          style={{
            color: "#2563eb",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: 2,
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Passo {stepIndex + 1}
        </p>
        <h2
          style={{
            color: "#0f172a",
            fontSize: 44,
            fontWeight: 700,
            marginTop: 12,
            marginBottom: 0,
            lineHeight: 1.2,
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            color: "#475569",
            fontSize: 22,
            lineHeight: 1.5,
            marginTop: 20,
          }}
        >
          {step.description}
        </p>
        {step.tips && step.tips.length > 0 && (
          <ul style={{ marginTop: 28, paddingLeft: 24 }}>
            {step.tips.map((tip) => (
              <li
                key={tip}
                style={{
                  color: "#334155",
                  fontSize: 18,
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}
              >
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: "40px 48px 40px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 24px 48px rgba(15,23,42,0.18)",
            border: "1px solid #e2e8f0",
            background: "#fff",
            transform: `scale(${imageScale})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {screenshotSrc ? (
            <Img
              src={screenshotSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                backgroundColor: "#fff",
              }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#94a3b8", fontSize: 22 }}>Print não encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TutorialOutro({
  videoTitle,
  outroAudio,
}: {
  videoTitle: string;
  outroAudio: string;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <Audio src={staticFile(outroAudio)} volume={1} />
      <h2 style={{ color: "#f8fafc", fontSize: 48, margin: 0 }}>{videoTitle}</h2>
      <p style={{ color: "#94a3b8", fontSize: 24, marginTop: 16 }}>
        Tour completo pelo sistema
      </p>
    </AbsoluteFill>
  );
}

export const SystemTutorialVideo: React.FC<SystemTutorialProps> = ({
  videoTitle,
  subtitle,
  introAudio,
  outroAudio,
  steps,
  introDurationInFrames = TUTORIAL_INTRO_FRAMES,
  stepDurationsInFrames,
  outroDurationInFrames = TUTORIAL_OUTRO_FRAMES,
}) => {
  let cursor = introDurationInFrames;

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={introDurationInFrames}>
        <TutorialIntro
          videoTitle={videoTitle}
          subtitle={subtitle}
          introAudio={introAudio}
        />
      </Sequence>

      {steps.map((step, index) => {
        const durationInFrames =
          stepDurationsInFrames?.[index] ?? TUTORIAL_FRAMES_PER_STEP;
        const from = cursor;
        cursor += durationInFrames;

        return (
          <Sequence
            key={`${step.title}-${index}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <StepSlide
              step={step}
              stepIndex={index}
              durationInFrames={durationInFrames}
            />
          </Sequence>
        );
      })}

      <Sequence from={cursor} durationInFrames={outroDurationInFrames}>
        <TutorialOutro videoTitle={videoTitle} outroAudio={outroAudio} />
      </Sequence>
    </AbsoluteFill>
  );
};
