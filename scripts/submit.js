loggedOutRedirect = "/login.html?denied=true";

document.getElementById("addon-form").addEventListener("submit", async function(ev) {
  ev.preventDefault();

  const formData = new FormData(ev.target);
  const data = {
    "name": formData.get("name"),
    "description": formData.get("description"),
    "type": Number(ev.target.querySelector("select#type").value),
    "license": Number(ev.target.querySelector("select#license").value),
    "images": await Promise.all(Array.from(ev.target.querySelector("input[type='file']#images").files).map((file) => {return getBase64(file).then((result) => result)}))
  };
  try {
    data["file"] = await getBase64(ev.target.querySelector("input[type='file']#addon").files[0]);
  }
  catch {
    alert("Error converting add-on to Base64. Please check if you have provided a valid add-on archive.");
  }

  let response;
  try {
    if (Object.values(data).includes("")) throw new Error("Not all fields have been filled in.");

    response = await fetch("http://localhost:3000/submit-add-ons", {
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
  catch(err) {
    alert("There was an error submitting this add-on: " + err.message);
    return;
  }
});
