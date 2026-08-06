import { escapeHtml, renderImage } from "./utils.js";
import { renderIcon } from "./icons.js";

/**
 * Reusable horizontal slider.
 * @param {object} options
 * @param {Array<{title: string, text: string, image: string, alt: string}>} options.slides
 * @param {string} [options.ariaLabel]
 * @returns {string}
 */
export function renderCarousel({ slides, ariaLabel = "Слайдер" }) {
  const slideHtml = slides
    .map(function (slide, index) {
      return (
        '<article class="carousel__slide" aria-roledescription="слайд">' +
        '<div class="slide-card card">' +
        renderImage({ src: slide.image, alt: slide.alt, priority: index === 0 }) +
        '<div class="slide-card__body">' +
        '<h3 class="u-h3">' +
        escapeHtml(slide.title) +
        "</h3>" +
        '<p class="u-body-sm">' +
        escapeHtml(slide.text) +
        "</p>" +
        "</div>" +
        "</div>" +
        "</article>"
      );
    })
    .join("");

  return (
    '<div class="carousel" data-carousel aria-roledescription="карусель" aria-label="' +
    escapeHtml(ariaLabel) +
    '">' +
    '<div class="carousel__viewport">' +
    '<div class="carousel__track">' +
    slideHtml +
    "</div>" +
    "</div>" +
    '<div class="carousel__controls">' +
    '<button type="button" class="carousel__btn carousel__btn--prev card card--chip" data-carousel-prev aria-label="Предыдущий слайд">' +
    renderIcon("chevron-left") +
    "</button>" +
    '<div class="carousel__dots" data-carousel-dots role="tablist" aria-label="Выбор слайда"></div>' +
    '<button type="button" class="carousel__btn carousel__btn--next card card--chip" data-carousel-next aria-label="Следующий слайд">' +
    renderIcon("chevron-right") +
    "</button>" +
    "</div>" +
    "</div>"
  );
}

/** @param {ParentNode} [root=document] */
export function initCarousels(root) {
  const scope = root || document;

  function bindTap(el, handler) {
    if (!el) {
      return;
    }
    el.addEventListener("click", handler);
    el.addEventListener(
      "touchend",
      function (event) {
        event.preventDefault();
        handler(event);
      },
      { passive: false }
    );
  }

  scope.querySelectorAll("[data-carousel]").forEach(function (carouselRoot) {
    if (carouselRoot.dataset.carouselReady === "true") {
      return;
    }
    carouselRoot.dataset.carouselReady = "true";

    const track = carouselRoot.querySelector(".carousel__track");
    const slides = Array.from(carouselRoot.querySelectorAll(".carousel__slide"));
    const prevBtn = carouselRoot.querySelector("[data-carousel-prev]");
    const nextBtn = carouselRoot.querySelector("[data-carousel-next]");
    const dotsWrap = carouselRoot.querySelector("[data-carousel-dots]");
    const viewport = carouselRoot.querySelector(".carousel__viewport");

    if (!track || slides.length === 0 || !dotsWrap || !viewport) {
      return;
    }

    let index = 0;
    let startX = 0;
    let deltaX = 0;
    let dragging = false;

    slides.forEach(function (_, i) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", "Слайд " + (i + 1));
      dot.addEventListener("click", function () {
        goTo(i);
      });
      dotsWrap.appendChild(dot);
    });

    const dots = Array.from(dotsWrap.querySelectorAll(".carousel__dot"));

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      dots.forEach(function (dot, di) {
        dot.classList.toggle("is-active", di === index);
      });
    }

    if (prevBtn) {
      bindTap(prevBtn, function () {
        goTo(index - 1);
      });
    }
    if (nextBtn) {
      bindTap(nextBtn, function () {
        goTo(index + 1);
      });
    }

    viewport.addEventListener("pointerdown", function (e) {
      dragging = true;
      startX = e.clientX;
      deltaX = 0;
      track.style.transition = "none";
      viewport.setPointerCapture(e.pointerId);
    });

    viewport.addEventListener("pointermove", function (e) {
      if (!dragging) {
        return;
      }
      deltaX = e.clientX - startX;
      track.style.transform = "translateX(calc(-" + index * 100 + "% + " + deltaX + "px))";
    });

    function endDrag() {
      if (!dragging) {
        return;
      }
      dragging = false;
      track.style.transition = "";
      if (Math.abs(deltaX) > 60) {
        goTo(index + (deltaX < 0 ? 1 : -1));
      } else {
        goTo(index);
      }
    }

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
  });
}
