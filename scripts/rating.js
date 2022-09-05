// Constant data variables
const ratingStarsLayouts = {
  "0.5": [1, 0, 0, 0, 0],
  "1.0": [2, 0, 0, 0, 0],
  "1.5": [2, 1, 0, 0, 0],
  "2.0": [2, 2, 0, 0, 0],
  "2.5": [2, 2, 1, 0, 0],
  "3.0": [2, 2, 2, 0, 0],
  "3.5": [2, 2, 2, 1, 0],
  "4.0": [2, 2, 2, 2, 0],
  "4.5": [2, 2, 2, 2, 1],
  "5.0": [2, 2, 2, 2, 2]
}
const ratingStarImages = {
  0: "/res/img/star_empty.png",
  1: "/res/img/star_half.png",
  2: "/res/img/star_full.png"
}

// Functions
async function generateRatingDiv(addon) {
  const addonRatingDiv = document.createElement("div");
  
  if (addon.rating) {
    const addonRating = document.createElement("h3");
    addonRating.textContent = addon.rating.toFixed(1);

    const starsToDisplay = (Math.round(addon.rating * 2) / 2).toFixed(1);
    const ratingLayout = ratingStarsLayouts[starsToDisplay];
    for (let i = 0; i < 5; i++) {
      const starImg = document.createElement("img");
      starImg.setAttribute("src", ratingStarImages[ratingLayout[i]]);
      addonRatingDiv.appendChild(starImg);
    }

    addonRatingDiv.appendChild(addonRating);
    addonRatingDiv.classList.add("rating");
  }

  return addonRatingDiv;
}
