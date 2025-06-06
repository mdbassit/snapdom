/**
 * Prepares a deep clone of an element, inlining pseudo-elements and generating CSS classes.
 * @module prepare
 */

import { generateCSSClasses} from '../utils/cssTools.js';
import { deepClone } from './clone.js';
import { inlinePseudoElements } from '../modules/pseudo.js';

/**
 * Prepares a clone of an element for capture, inlining pseudo-elements and generating CSS classes.
 *
 * @param {Element} element - Element to clone
 * @param {boolean} [compress=false] - Whether to compress style keys
 * @returns {Promise<Object>} Object containing the clone, generated CSS, and style cache
 */

export async function prepareClone(element, compress = false, embedFonts = false) {
  const styleMap = new Map();
  const styleCache = new WeakMap();
  const nodeMap = new Map();
  let clone;

  try {
    clone = deepClone(element, styleMap, styleCache, nodeMap, compress);
  } catch (e) {
    console.warn("deepClone failed:", e);
    throw e;
  }

  try {
    await inlinePseudoElements(element, clone, styleMap, styleCache, compress, embedFonts);
  } catch (e) {
    console.warn("inlinePseudoElements failed:", e);
  }

    let classCSS = "";

  if (compress) {
    const keyToClass = generateCSSClasses(styleMap);
    classCSS = Array.from(keyToClass.entries())
      .map(([key, className]) => `.${className}{${key}}`)
      .join("");
    for (const [node, key] of styleMap.entries()) {
      if (node.tagName === "STYLE") continue;
      const className = keyToClass.get(key);
      if (className) node.classList.add(className);
      const bgImage = node.style?.backgroundImage;
      node.removeAttribute("style");
      if (bgImage && bgImage !== "none") node.style.backgroundImage = bgImage;
    }
  } else {
    for (const [node, key] of styleMap.entries()) {
      if (node.tagName === "STYLE") continue;
      node.setAttribute("style", key.replace(/;/g, "; "));
    }
  }
  // Simulate scroll with transform if requested
  
    for (const [cloneNode, originalNode] of nodeMap.entries()) {
      const scrollX = originalNode.scrollLeft;
      const scrollY = originalNode.scrollTop;
      const hasScroll = scrollX || scrollY;

      if (hasScroll && cloneNode instanceof HTMLElement) {
        // Hide scrollbars
        cloneNode.style.overflow = "hidden";
        cloneNode.style.scrollbarWidth = "none"; // Firefox
        cloneNode.style.msOverflowStyle = "none"; // IE10+

        // Wrap content in inner div with translate
        const inner = document.createElement("div");
        inner.style.transform = `translate(${-scrollX}px, ${-scrollY}px)`;
        inner.style.willChange = "transform";
        inner.style.display = "inline-block";
        inner.style.width = "100%";

        while (cloneNode.firstChild) {
          inner.appendChild(cloneNode.firstChild);
        }
        cloneNode.appendChild(inner);
      }
    }

  return { clone, classCSS, styleCache };
}
