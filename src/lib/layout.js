/**
 * Page geometry for the JPG to PDF tool. Pure functions so the A4 / Letter /
 * fit-to-image maths can be unit tested without a canvas.
 */

export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  fit: null,
};

export const MARGINS = { none: 0, small: 18, medium: 36 };

/** Positions one image on one page. Inputs are pixels; PDF units are points. */
export function layoutPage(sizeKey, orientation, imageWidth, imageHeight, margin = 0) {
  const widthPt = Math.max(1, Number(imageWidth) || 1) * 0.75;
  const heightPt = Math.max(1, Number(imageHeight) || 1) * 0.75;
  const pad = Math.max(0, Number(margin) || 0);

  if (sizeKey === 'fit') {
    const pageWidth = widthPt + pad * 2;
    const pageHeight = heightPt + pad * 2;
    return { pageWidth, pageHeight, drawWidth: widthPt, drawHeight: heightPt, x: pad, y: pad };
  }

  const [portraitW, portraitH] = PAGE_SIZES[sizeKey] || PAGE_SIZES.a4;
  const landscape =
    orientation === 'landscape' || (orientation === 'auto' && imageWidth > imageHeight);
  const pageWidth = landscape ? portraitH : portraitW;
  const pageHeight = landscape ? portraitW : portraitH;

  // A margin larger than the page would otherwise produce a negative box.
  const boxWidth = Math.max(1, pageWidth - pad * 2);
  const boxHeight = Math.max(1, pageHeight - pad * 2);
  const scale = Math.min(boxWidth / widthPt, boxHeight / heightPt);
  const drawWidth = widthPt * scale;
  const drawHeight = heightPt * scale;

  return {
    pageWidth,
    pageHeight,
    drawWidth,
    drawHeight,
    x: (pageWidth - drawWidth) / 2,
    y: (pageHeight - drawHeight) / 2,
  };
}
