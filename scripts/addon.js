document.addEventListener("DOMContentLoaded", async function() {
  // Fetch add-on data.
  let response;
  try {
    response = await fetch(`http://localhost:3000/add-ons?id=${getURLParameter("id")}`, {
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

  // Load add-on data.
  document.title = `${addon.name ? addon.name : "Add-on"} - ` + document.title;
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
});
