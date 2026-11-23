/** Visual sampling only; never creates a strike or writes game state. */
export function sampleReview(profile, name, elapsed) {
  const clip = profile.clips[name];
  const durations =
    profile.timings?.[name] ?? clip.map(() => 1000 / (name === "move" ? 6 : 8));
  const duration = durations.reduce((a, b) => a + b, 0),
    time = Math.max(0, elapsed) % (duration + 350);
  let end = 0,
    slot = clip.length - 1;
  for (let i = 0; i < clip.length; i++) {
    end += durations[i];
    if (time < end) {
      slot = i;
      break;
    }
  }
  const impacts = (profile.impacts?.[name] ?? []).map((i) =>
    durations.slice(0, i).reduce((a, b) => a + b, 0),
  );
  const reached = impacts.filter((t) => t <= time),
    last = reached.at(-1);
  return {
    index: clip[slot],
    slot,
    time,
    duration,
    phase: Math.min(1, time / duration),
    impacts,
    impactCount: reached.length,
    impactAge: last === undefined ? -1 : time - last,
  };
}
