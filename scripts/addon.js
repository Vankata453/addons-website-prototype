let addonID = getURLParameter("id");
let version = getURLParameter("version");
let userID;

loggedInAction = async function(id) { // If the user is logged-in, allow them to write a review, only if they haven't authored one already.
  userID = id; // Save user ID globally.
  // Check for review from the current user.
  let response;
  try {
    response = await fetch(`http://localhost:3000/reviews?author=${id}&for=${addonID}`, {
      method: "GET"
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    alert("Error fetching add-on review of current user: " + err.message);
  }
  const review = (await response.json())[0];

  if (review) {
    const reviewDoneDiv = document.getElementById("review-done");
    reviewDoneDiv.appendChild((await generateReviewDivs([review], false))[0]);
    reviewDoneDiv.classList.add("shown");
  }
  else {
    // If the current user doesn't have a review, show the form for creating one.
    document.getElementById("review-form").classList.add("shown");
  }

  loadData();
}
loggedOutAction = function() { // If the user is logged out, prevent them from writing reviews.
  document.getElementById("review-login").classList.add("shown");

  loadData();
}

async function loadData() {
  // Fetch add-on data.
  let response;
  try {
    response = await fetch(`http://localhost:3000/add-ons?id=${addonID}${version ? `&version=${version}` : ""}`, {
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
  const addon = (await response.json())[0];

  // If the current user owns the add-on, show special action buttons.
  if (addon.author == userID) {
    const editBtn = document.getElementById("edit");
    editBtn.classList.remove("hidden");
    editBtn.addEventListener("click", function() {
      window.location.href = `/submit.html?edit=${addon.id}`;
    })
  }

  // Load add-on data.
  document.title = `${addon.name ? addon.name : "Add-on"} - ${document.title}`;
  document.getElementById("addon-title").textContent = addon.name;
  
  try {
    response = await fetch(`http://localhost:3000/user?id=${addon.author}`, {
      method: "GET"
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    alert("Error fetching add-on author data: " + err.message);
  }
  const author = await response.json();

  const addonAuthorLink = document.querySelector("#addon-author a");
  addonAuthorLink.textContent = author.username;
  addonAuthorLink.setAttribute("href", `/user.html?id=${author.id}`);

  document.getElementById("addon-description").textContent = addon.description;
  document.getElementById("addon-type").textContent = addonTypes[addon.type];
  const addonLicense = addonLicenses[addon.license];
  const addonLicenseLink = document.getElementById("addon-license");
  addonLicenseLink.textContent = addonLicense.name;
  if (addonLicense.url) addonLicenseLink.setAttribute("href", addonLicense.url);

  // Load add-on revisions.
  const revisionsDropdown = document.getElementById("revisions-content");

  version = version ? version : addon.revisions.length; // If no version to be loaded is specified, set the value to the latest one.

  for (let revisionId = addon.revisions.length - 1; revisionId >= 0; revisionId--) {
    const revision = addon.revisions[revisionId];
    const revisionAnchor = document.createElement("a");

    const revisionVersion = revisionId + 1;
    const revisionURL = new URL(window.location);
    revisionURL.searchParams.set("version", revisionVersion);
    revisionAnchor.setAttribute("href", revisionURL);
    if (revisionVersion == version) {
      revisionAnchor.classList.add("selected");

      const revisionCheckIcon = document.createElement("i");
      revisionCheckIcon.className = "fa fa-check";

      revisionAnchor.appendChild(revisionCheckIcon);
    }
    revisionAnchor.innerHTML += `[v${revisionVersion}, ${revision.versionSupport}] ${revision.title} (${new Date(revision.submittedOn * 1000).toLocaleDateString()})`;
    if (revision.description) revisionAnchor.setAttribute("title", revision.description); // Show revision description on hover, if it exists.

    revisionsDropdown.appendChild(revisionAnchor);
  }

  // Load images.
  const addonImages = document.getElementById("addon-images");
  if (addon.images[0]) {
    document.getElementById("main-addon-info").style.backgroundImage = `url('${addon.images[0]}')`;
    for (image of addon.images) {
      const div = document.createElement("div");
      const img = document.createElement("img");

      img.setAttribute("src", image);

      div.appendChild(img);
      addonImages.appendChild(div);
    }
  }

  // Load slideshow carousel.
  $("#addon-images").slick({
    slidesToShow: 4,
    autoplay: true,
    autoplaySpeed: 5000,
    dots: true,
    //arrows: true
  });

  // Load reviews
  const reviewsList = document.getElementById("review-list");
  try {
    response = await fetch(`http://localhost:3000/reviews?for=${addon.id}`, {
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
    text.textContent = "This add-on has not recieved any reviews yet.";
    reviewsList.appendChild(text);
    reviewsList.classList.add("empty");
  }
  else {
    (await generateReviewDivs(reviews, false)).forEach((reviewDiv) => reviewsList.appendChild(reviewDiv));
  }
};

// Submitting a review
document.getElementById("review-form").addEventListener("submit", async function(ev) {
  ev.preventDefault();

  const data = {
    "body": ev.target.querySelector("textarea#review").value,
    "rating": Number(ev.target.querySelector("select#rating").value),
    "for": addonID
  };

  let response;
  try {
    if (!data.rating) throw new Error("Add-on rating not provided.");

    response = await fetch("http://localhost:3000/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sessionStorage.getItem("accessToken")}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    alert("There was an error submitting review: " + err.message);
    return;
  }

  window.location.reload();
});
