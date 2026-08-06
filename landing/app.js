/**
 * Landing entry — delegates to simpleBoot (single render path).
 */
import { bootSimpleLanding } from "./simpleBoot.js";

bootSimpleLanding({
  bootOwner: "landing/app.js",
  content: "./assets/data/content.js",
  renderPage: "./renderPage.js"
});
