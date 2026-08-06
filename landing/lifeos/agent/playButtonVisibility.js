/**
 * playButtonVisibility — analysis only (no DOM).
 */

/**
 * @param {Element | null} root
 * @returns {{ applied: boolean, score: number, level: string, reasons: string[] }}
 */
export function applyPlayButtonVisibilityBoost(root) {
  const result = scorePlayButtonVisibility(root);
  return Object.assign({ applied: false, mode: "analysis_only" }, result);
}

/**
 * @param {Element | null} root
 * @returns {{ score: number, level: string, reasons: string[] }}
 */
export function scorePlayButtonVisibility(root) {
  const mount = root || document.getElementById("app");
  const reasons = [];
  let score = 70;

  if (!mount) {
    return { score: 0, level: "LOW", reasons: ["no_mount"] };
  }

  const playButton = mount.querySelector(".play-button");
  if (!playButton) {
    reasons.push("missing_play_button");
    score = 20;
  }

  const level = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";
  return { score: score, level: level, reasons: reasons };
}

export const BOOST_CLASS = "play-button-visibility-boost";
