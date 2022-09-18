const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("denied") == "true") { // Access to another page has been denied, because the user is not logged-in.
  document.getElementById("no-access-text").classList.remove("hidden");
}

document.getElementById("login-form").addEventListener("submit", async function(ev) {
  ev.preventDefault();

  const formData = new FormData(ev.target);
  const data = {
    "email": formData.get("email"),
    "password": formData.get("password")
  };
  
  let response;
  try {
    if (Object.values(data).includes("")) throw new Error("Email or password not provided.");

    response = await fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch(err) {
    alert("There was an error logging in: " + err.message);
    return;
  }

  const responseData = await response.json();
  sessionStorage.setItem("accessToken", responseData.accessToken);

  window.location.href = "/browse.html";
});

document.getElementById("register-form").addEventListener("submit", async function(ev) {
  ev.preventDefault();

  const formData = new FormData(ev.target);
  const data = {
    "username": formData.get("username"),
    "email": formData.get("email"),
    "password": formData.get("password")
  };
  const passwordConfirm = formData.get("password-confirm");
  
  let response;
  try {
    if (Object.values(data).includes("") || passwordConfirm == "") throw new Error("Username, email, or passwords not provided.");
    if (data.password != passwordConfirm) throw new Error("Passwords don't match.");

    response = await fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const responseData = await response.json();
      throw new Error(responseData["error"] ? responseData["error"] : responseData);
    }
  }
  catch(err) {
    alert("There was an error registering: " + err.message);
    return;
  }

  const responseData = await response.json();
  sessionStorage.setItem("accessToken", responseData.accessToken);

  window.location.href = "/browse.html";
});
