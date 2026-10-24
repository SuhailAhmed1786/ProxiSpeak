export const PROXIMITY_DISTANCE = 100;

export const getAudioVolume = (distance) => {
  if (!Number.isFinite(distance) || distance >= PROXIMITY_DISTANCE) {
    return 0;
  }

  return Math.max(0, Math.min(1, 1 - distance / PROXIMITY_DISTANCE));
};