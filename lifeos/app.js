/**
 * LifeOS entry — absolute paths for stable mobile hosting.
 */
import { bootSimpleLanding } from "/landing/simpleBoot.js";

bootSimpleLanding({
  bootOwner: "lifeos/app.js",
  content: "/landing/assets/data/content.js",
  renderPage: "/landing/renderPage.js"
});
