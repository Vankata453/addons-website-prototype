let userID;
const editID = getURLParameter("edit");

loggedInAction = function(id) { userID = id; loadData(); };
loggedOutAction = function() { window.location.href = "/login.html?denied=true"; loadData(); };

async function loadData() {
  if (editID) {
    // Get data of add-on to edit.
    let response;
    try {  
      response = await fetch(`http://localhost:3000/add-ons?id=${editID}`, {
        method: "GET"
      });
  
      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData["error"] ? responseData["error"] : responseData);
      }
    }
    catch (err) {
      alert("There was an error getting add-on data: " + err.message);
      return;
    }
    const addonData = (await response.json())[0];

    // Check if current user is allowed to edit this add-on.
    if (addonData.author != userID) {
      alert("You don't have permission to edit this add-on.");
      return;
    }

    // Fill out add-on submission fields with current data.
    const addonForm = document.getElementById("addon-form");
    addonForm.querySelector("input[name='name']").value = addonData.name;
    addonForm.querySelector("input[name='description']").value = addonData.description;
    addonForm.querySelector("select#type").value = addonData.type;
    addonForm.querySelector("select#license").value = addonData.license;
    addonForm.querySelector("select#earliest-version").value = addonData.versionSupport;
    displayImagePreviews(addonData.images);

    // Make additions to the page.
    document.getElementById("title-text").textContent = `Edit add-on \"${addonData.name}\"`;
    document.getElementById("create-revision").classList.remove("hidden");
  }
}

document.getElementById("addon-form").addEventListener("submit", async function(ev) {
  ev.preventDefault();

  const formData = new FormData(ev.target);
  const data = {
    "name": formData.get("name"),
    "description": formData.get("description"),
    "type": Number(ev.target.querySelector("select#type").value),
    "license": Number(ev.target.querySelector("select#license").value),
    "versionSupport": ev.target.querySelector("select#earliest-version").value,
    "images": Array.from(imagePreviewsDiv.children).map((image) => image.getAttribute("src"))
  };
  try {
    data["file"] = await getBase64(ev.target.querySelector("input[type='file']#addon").files[0]);
  }
  catch {
    alert("Error converting add-on to Base64. Please check if you have provided a valid add-on archive.");
    return;
  }

  if (editID) { // An edit is being performed.
    data.updateFor = editID;
    data.revision = {
      title: ev.target.querySelector("div#create-revision input#revision-title").value,
      description: ev.target.querySelector("div#create-revision input#revision-description").value
    }
  }

  let response;
  try {
    if (Object.values(data).includes("")) throw new Error("Not all fields have been filled in.");
    if (data.revision) if (!data.revision.title) throw new Error("No revision title specified.");

    response = await fetch(`http://localhost:3000/${editID ? "edit-add-on" : "submit-add-ons"}`, {
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
    alert(`There was an error ${editID ? "editing" : "submitting"} this add-on: ${err.message}`);
    return;
  }
});

const imagePreviewsDiv = document.getElementById("image-previews");

// Function to display image previews.
function displayImagePreviews(images) {
  for (image of images) {
    const img = document.createElement("img");
    img.setAttribute("src", image);
    imagePreviewsDiv.appendChild(img);
  }
}

// Add new images.
document.getElementById("images").addEventListener("change", async function(ev) {
  const newImages = await Promise.all(Array.from(ev.target.files).map((file) => { return getBase64(file).then((result) => result) }));
  
  // Display previews of new images.
  displayImagePreviews(newImages);

  ev.target.value = null; // Clear all images from select field.
});

// Remove images.
imagePreviewsDiv.addEventListener("click", async function(ev) {
  if (ev.target.nodeName == "IMG") {
    ev.target.remove();
  }
});
