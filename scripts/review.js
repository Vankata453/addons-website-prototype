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
function generateRatingDiv(rating) {
  const addonRatingDiv = document.createElement("div");
  
  if (rating) {
    const addonRating = document.createElement("h3");
    addonRating.textContent = rating.toFixed(1);

    const starsToDisplay = (Math.round(rating * 2) / 2).toFixed(1);
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

async function generateReviewDivs(reviews, showAddonTitle = true, showReviewAuthor = true) {
  const reviewsArray = [];

  for (review of reviews) {
    const reviewDiv = document.createElement("div");
    const reviewAddonTitle = document.createElement("a");
    const reviewRatingDiv = generateRatingDiv(review.rating);
    const reviewBody = document.createElement("p");
    const reviewAuthor = document.createElement("a");
    const reviewDate = document.createElement("p");

    if (showAddonTitle) {
      try {
        response = await fetch(`http://localhost:3000/add-ons?id=${review.for}`, {
          method: "GET"
        });

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData["error"] ? responseData["error"] : responseData);
        }
      }
      catch (err) {
        alert("Error fetching data of add-on from review: " + err.message);
      }
      const reviewedAddon = (await response.json())[0];

      reviewAddonTitle.textContent = reviewedAddon.name;
      reviewAddonTitle.setAttribute("href", `/addon.html?id=${reviewedAddon.id}`);
    }
    
    reviewBody.textContent = review.body;

    if (showReviewAuthor) {
      try {
        response = await fetch(`http://localhost:3000/user?id=${review.author}`, {
          method: "GET"
        });
    
        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData["error"] ? responseData["error"] : responseData);
        }
      }
      catch (err) {
        alert("Error fetching add-on review author data: " + err.message);
      }
      reviewAuthor.textContent = (await response.json()).username;
      reviewAuthor.setAttribute("href", `/user.html?id=${review.author}`);
    }

    reviewDate.textContent = new Date(review.submittedOn * 1000).toLocaleDateString();
    reviewDate.id = "review-date";

    if (showAddonTitle) {
      reviewDiv.appendChild(reviewAddonTitle);
      reviewDiv.appendChild(document.createElement("br"));
      reviewDiv.appendChild(document.createElement("br"));
    }
    reviewDiv.appendChild(reviewRatingDiv);
    reviewDiv.appendChild(reviewBody);
    if (showReviewAuthor) reviewDiv.appendChild(reviewAuthor);
    reviewDiv.appendChild(reviewDate);

    reviewsArray.push(reviewDiv);
  }

  return reviewsArray;
}
