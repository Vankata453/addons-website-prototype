function getBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getURLParameter(key) {
  return new URL(window.location).searchParams.get(key);
}

function setURLParameter(key, value) {
  const url = new URL(window.location);
  url.searchParams.set(key, value);
  window.history.pushState({}, "", url);
}

let loggedInAction = function() {}; // Specfies a function to be executed, if the user is logged-in.
let loggedOutAction = function() {}; // Specfies a function to be executed, if the user isn't logged-in.

document.addEventListener("DOMContentLoaded", async function() {
  let response;
  try {
    response = await fetch("http://localhost:3000/user", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${sessionStorage.getItem("accessToken")}`
      }
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch (err) {
    loggedOutAction();
    return;
  }
  const responseData = await response.json();

  if (responseData.id) {
    // User is logged-in
    const loginLink = document.getElementById("nav-login");
    loginLink.removeAttribute("href");
    loginLink.textContent = `Welcome, ${responseData.username}!`;
    loggedInAction(responseData.id);
  }
  else {
    loggedOutAction();
  }
});

// Add-on data

const addonTypes = {
  1: "Worldmap",
  2: "World",
  3: "Levelset"
}
const addonLicenses = {
  1: { name: "GPLv3.0", url: "https://www.gnu.org/licenses/gpl-3.0.html" },
  2: { name: "2" },
  3: { name: "3" },
  4: { name: "4" },
  5: { name: "5" }
}
