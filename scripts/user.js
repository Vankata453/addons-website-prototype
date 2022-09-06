document.addEventListener("DOMContentLoaded", loadData);

let userData;

async function loadData() {
  window.addEventListener("hashchange", updateNavbar);

  updateNavbar();

  let response;
  try {
    response = await fetch(`http://localhost:3000/user?id=${getURLParameter("id")}`, {
      method: "GET"
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    alert("Error fetching user data: " + err.message);
    return;
  }
  userData = await response.json();

  // Display username
  document.getElementById("user-username").textContent = userData.username;

  // User add-ons
  const addonsList = document.getElementById("addon-list");
  try {
    response = await fetch(`http://localhost:3000/add-ons?author=${userData.id}`, {
      method: "GET"
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    alert("Error fetching add-on data: " + err.message);
  }
  const addons = await response.json();

  // if (addons.length < 4) {
  //   addonsList.style.gridTemplateColumns = `repeat(${addons.length}, 1fr)`;
  // }

  if (addons.length < 1) {
    const text = document.createElement("p");
    text.textContent = "This user does not author any add-ons.";
    addonsList.appendChild(text);
    addonsList.classList.add("empty");
  }
  else {
    for (addon of addons) {
      const addonDiv = document.createElement("div");
      const addonTitle = document.createElement("h3");
      const addonDesc = document.createElement("p");
      const addonRatingDiv = generateRatingDiv(addon);

      if (addon.images[0]) addonDiv.style.backgroundImage = `url('${addon.images[0]}')`;
      addonTitle.textContent = addon.name;
      addonDesc.textContent = addon.description;

      addonDiv.appendChild(addonTitle);
      addonDiv.appendChild(addonDesc);
      addonDiv.appendChild(addonRatingDiv);
      addonDiv.classList.add("addon");
      addonDiv.id = addon.id;
      addonDiv.addEventListener("click", function(ev) {
        let target = ev.target;
        while (target) {
          if (target.classList.contains("addon")) break;
          target = target.parentElement; // If a child element of the add-on div has been pressed.
        }
        window.location.href = `/addon.html?id=${target.id}`;
      });

      addonsList.appendChild(addonDiv);
    }
  }

  // User reviews
  const reviewsList = document.getElementById("review-list");
  try {
    response = await fetch(`http://localhost:3000/reviews?author=${userData.id}`, {
      method: "GET"
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    alert("Error fetching reviews data: " + err.message);
  }
  const reviews = await response.json();

  if (reviews.length < 1) {
    const text = document.createElement("p");
    text.textContent = "This user has not reviewed any add-ons yet.";
    reviewsList.appendChild(text);
    reviewsList.classList.add("empty");
  }
  else {
    for (review of reviews) {
      const reviewDiv = document.createElement("div");
      const reviewAddonTitle = document.createElement("a");
      const reviewRating = document.createElement("h3");
      const reviewBody = document.createElement("p");

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
      reviewRating.textContent = review.rating;
      reviewBody.textContent = review.body;

      reviewDiv.appendChild(reviewAddonTitle);
      reviewDiv.appendChild(reviewRating);
      reviewDiv.appendChild(reviewBody);
  
      reviewsList.appendChild(reviewDiv);
    }
  }

  // User about section
  const aboutList = document.getElementById("about-list");

  const joinedText = document.createElement("p");
  const joinDate = new Date(userData.joinedOn * 1000);
  joinedText.textContent = `Joined ${joinDate.toLocaleDateString()}.`;
  aboutList.appendChild(joinedText);
}

function updateNavbar() {
  // User navigation bar
  const userNav = document.getElementById("user-nav");
  Array.from(userNav.querySelectorAll("a")).map((anchor) => anchor.style.textDecoration = "none");
  if (window.location.hash && window.location.hash != "#home") {
    userNav.querySelector(`a[href='${window.location.hash}']`).style.textDecoration = "underline";
    Array.from(document.querySelectorAll("div[id^='user-data-']")).map((div) => div.style.display = "none");
    document.getElementById(`user-data-${window.location.hash.split("#")[1]}`).style.display = "block";
  }
  else {
    userNav.querySelector(`a[href='#home']`).style.textDecoration = "underline";
    Array.from(document.querySelectorAll("div[id^='user-data-']")).map((div) => div.style.display = "block");
  }
}
