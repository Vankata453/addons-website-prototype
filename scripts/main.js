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

let loggedOutRedirect; // Specfies a path where to force redirect the user, if they are logged out.

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
    if (loggedOutRedirect) {
      window.location.href = loggedOutRedirect;
    }
    return;
  }
  const responseData = await response.json();

  if (responseData.id) {
    // User is logged in
    const loginLink = document.getElementById("nav-login");
    loginLink.removeAttribute("href");
    loginLink.textContent = `Welcome, ${responseData.username}!`;
  }
  else if (loggedOutRedirect) {
    window.location.href = loggedOutRedirect;
  }
});
