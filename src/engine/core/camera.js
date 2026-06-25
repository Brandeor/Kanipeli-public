import { clamp } from "./geometry.js";

export function sideScrollerCameraTargetX({
  subject,
  levelWidth,
  viewportWidth,
  lookAhead = 0,
  hintLookX = 0,
  subjectViewportOffset = 0.42,
}) {
  return clamp(
    subject.x + lookAhead + hintLookX - viewportWidth * subjectViewportOffset,
    0,
    Math.max(0, levelWidth - viewportWidth)
  );
}

export function snapCameraX(targetX) {
  return Math.round(targetX);
}

export function smoothCameraX(currentX, targetX, smoothing = 0.18) {
  const nextX = currentX + (targetX - currentX) * smoothing;
  return Math.round(Math.abs(targetX - nextX) < 0.5 ? targetX : nextX);
}
