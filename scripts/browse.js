document.addEventListener("DOMContentLoaded", reloadAddons);

// Reload add-ons, when the sorting dropdown's value changes.
const selectSort = document.getElementById("sort-by");
selectSort.addEventListener("change", reloadAddons);
// Get and apply initial URL query parameter for sorting, if it exists.
const sortURLQuery = getURLParameter("sort");
if (sortURLQuery) selectSort.value = sortURLQuery;

// Constant data variables
const sortQueries = {
  "downloads": "_sort=downloads&_order=desc",
  "rating": "_sort=rating&_order=desc",
  "latest": "_sort=submittedOn&_order=desc",
  "oldest": "_sort=submittedOn&_order=asc"
};

// Dynamic data variables
const cachedUsernames = {}; // Store cached usernames of add-on authors.
const pagination = {
  page: (function() {
    const pageQuery = getURLParameter("page");
    return pageQuery ? pageQuery : 1;
  })(),
  prevPage: false,
  nextPage: false,
  goToPrevPage: function() {
    if (!this.prevPage) return;
    this.page--;
    setURLParameter("page", this.page);
    reloadAddons();
  },
  goToNextPage: function() {
    if (!this.nextPage) return;
    this.page++;
    setURLParameter("page", this.page);
    reloadAddons();
  },
  prevPageBtn: document.getElementById("prev-page"),
  nextPageBtn: document.getElementById("next-page")
};

// Set event listeners to previous and next page buttons.
pagination.prevPageBtn.addEventListener("click", function() { pagination.goToPrevPage() });
pagination.nextPageBtn.addEventListener("click", function() { pagination.goToNextPage() });

// Functions
async function reloadAddons() {
  // Set URL query parameter for sorting.
  setURLParameter("sort", selectSort.value);

  let response;
  try {
    response = await fetch(`http://localhost:3000/add-ons?__page=${pagination.page}&__limit=20&${sortQueries[selectSort.value]}`, {
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

  // Determine if previous and/or next pages are available.
  pagination.prevPage = response.headers.get("Pagination-Previous-Page") == "true";
  pagination.nextPage = response.headers.get("Pagination-Next-Page") == "true";

  pagination.prevPageBtn.disabled = !pagination.prevPage;
  pagination.nextPageBtn.disabled = !pagination.nextPage;

  // List add-ons on page.
  const addons = await response.json();

  const list = document.getElementById("addon-list");
  list.innerHTML = "";

  for (addon of addons) {
    const addonDiv = document.createElement("div");
    const addonTitle = document.createElement("h3");
    const addonDesc = document.createElement("p");
    const addonRatingDiv = generateRatingDiv(addon.rating);
    const addonAuthor = document.createElement("p");
    
    if (addon.images[0]) addonDiv.style.backgroundImage = `url('${addon.images[0]}')`;
    addonTitle.textContent = addon.name;
    addonDesc.textContent = addon.description;

    if (!cachedUsernames[addon.author]) {
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
        alert("Error fetching add-on data: " + err.message);
      }
      cachedUsernames[addon.author] = (await response.json()).username;
    }

    addonAuthor.textContent = `By: ${cachedUsernames[addon.author]}`;

    addonDiv.appendChild(addonTitle);
    addonDiv.appendChild(addonDesc);
    addonDiv.appendChild(addonRatingDiv);
    addonDiv.appendChild(addonAuthor);
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

    list.appendChild(addonDiv);
  }
}
