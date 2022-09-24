var jsonServer = require("json-server");
var auth = require("json-server-auth");
var jwt = require("./node_modules/json-server-auth/node_modules/jsonwebtoken/index.js");
var server = jsonServer.create();
var router = jsonServer.router("db.json");
var middlewares = jsonServer.defaults();

const JWT_SECRET_KEY = require("./node_modules/json-server-auth/dist/constants").JWT_SECRET_KEY;

server.db = router.db;
server.use(middlewares);
server.use(jsonServer.bodyParser);

// CONSTANT VARIABLES

const allowedAddonVersions = ["0.7.0"];

// USER MANAGEMENT

// Registration back-end
server.post("/register", function(req, res, next) {
  // Throw error on empty username
  if (!fieldAvailable(req.body.username)) {
    res.status(400).jsonp({ error: "No username provided." });
    return;
  }
  // Limit username to 50 characters.
  if (req.body.username.length > 50) {
    res.status(400).jsonp({ error: "Username cannot be longer than 50 characters." });
    return;
  }
  // Detect if username is taken
  const usernameExists = server.db["__wrapped__"]["users"].some(function(user) {
    return user.username === req.body.username;
  });
  if (usernameExists) {
    res.status(400).jsonp({ error: "Username is taken. Please choose a different username." });
    return;
  }
  // Assign join date of new user
  const date = new Date();
  req.body["joinedOn"] = date.getTime() / 1000;

  next();
});

// Get the current user from a token.
server.get("/user", auth, function(req, res, next) {
  if (req.query.id) { // If a public user is being fetched without authorization.
    const user = server.db.get("users").find({ id: Number(req.query.id) }).value();

    if (user) {
      res.json({ username: user.username, joinedOn: user.joinedOn, id: user.id }); // Only expose public data for user.
    }
    else {
      res.status(400).jsonp({ error: "Couldn't find user." });
    }
    return;
  }

  // Attempt to fetch authorized user.
  const response = getUserFromToken(req.header("Authorization"));

  if (response.error) {
    res.status(401).jsonp(response);
  }
  else {
    res.json(response);
  }
});

// ADD-ON MANAGEMENT

// Add-on submission back-end
server.post("/submit-add-ons", function(req, res, next) {
  // Check if the current user is authorized.
  const userResponse = getUserFromToken(req.header("Authorization"));
  if (userResponse.error) {
    res.status(401).jsonp(userResponse);
    return;
  }

  // Check availability of all fields
  const content = [
    req.body.name,
    req.body.description,
    req.body.type,
    req.body.license,
    req.body.versionSupport,
    req.body.images,
    req.body.file
  ];
  if (!content.every(fieldAvailable)) {
    res.status(400).jsonp({ error: "Not enough information: Missing fields." });
    return;
  }

  // Check if add-on author has submitted any non-verified add-ons in the past 30 minutes.
  const date = new Date();
  const cooldown = server.db["__wrapped__"]["submit-add-ons"].some(function(addon) {
    return addon.author === userResponse.id && date.getTime() / 1000 - addon.submittedOn < 1800;
  });
  if (cooldown) {
    return { error: "A user can submit add-ons in an interval of 30 minutes." };
  }
  // Check validity of add-on fields.
  const invalidField = checkAddonFields(req.body);
  if (invalidField) {
    res.status(400).jsonp(invalidField);
    return;
  }

  // Save versionSupport.
  const versionSupport = req.body.versionSupport;
  delete req.body.versionSupport;
  // Assign all add-on data in a version 1 entry.
  req.body = { "versions": [req.body] };
  // Assign author of add-on (the current user).
  req.body.author = userResponse.id;
  // Assign initial revision.
  req.body.revisions = { title: "Initial revision", submittedOn: date.getTime() / 1000, versionSupport: versionSupport };

  next();
});

// Add-on editing back-end
server.post("/edit-add-on", function(req, res, next) {
  // Check if the current user is authorized.
  const userResponse = getUserFromToken(req.header("Authorization"));
  if (userResponse.error) {
    res.status(401).jsonp(userResponse);
    return;
  }
  // Check if add-on to be edited is specified, and if so, check if it exists.
  if (!req.body.updateFor) {
    res.status(400).jsonp({ error: "Add-on to be edited not specified." });
    return;
  }
  req.body.updateFor = Number(req.body.updateFor);
  const addon = server.db.get("add-ons").find({ id: req.body.updateFor }).value();
  if (!addon) {
    res.status(400).jsonp({ error: "Specified add-on does not exist." });
    return;
  }
  // Check if the current user owns the add-on to be edited.
  if (addon.author != userResponse.id) {
    res.status(401).jsonp({ error: "You do not have permission to edit this add-on." });
    return;
  }

  // Check availability of all other fields
  const content = [
    req.body.name,
    req.body.description,
    req.body.type,
    req.body.license,
    req.body.versionSupport,
    req.body.images,
    req.body.file,
    req.body.revision
  ];
  if (!content.every(fieldAvailable)) {
    res.status(400).jsonp({ error: "Not enough information: Missing fields." });
    return;
  }
  if (!fieldAvailable(req.body.revision.title)) {
    res.status(400).jsonp({ error: "Revision title not provided." });
    return;
  }

  // Check if this add-on does not have a pending edit.
  const pendingEdit = server.db.get("edit-add-on").find({ updateFor: req.body.updateFor }).value();
  if (pendingEdit) {
    res.status(400).jsonp({ error: "Add-on currently has a pending edit. No edits can be requested, while other pending edits are taking place." });
    return;
  }
  // Check validity of other add-on fields.
  const invalidField = checkAddonFields(req.body);
  if (invalidField) {
    res.status(400).jsonp(invalidField);
    return;
  }

  // Add add-on versionSupport to the revision.
  req.body.revision.versionSupport = req.body.versionSupport;
  delete req.body.versionSupport;
  // If the revision description field is empty, do not add it as an entry.
  if (req.body.revision.description == "") delete req.body.revision.description;
  // Add revision submission date.
  req.body.revision.submittedOn = new Date().getTime() / 1000;

  next();
});

function checkAddonFields(data) {
  // Check if a valid add-on type integer has been given.
  if (!Number.isInteger(data.type) || data.type <= 0 || data.type > 3) {
    return { error: "Invalid add-on type integer given." };
  }
  // Check if a valid add-on license integer has been given.
  if (!Number.isInteger(data.license) || data.license <= 0 || data.license > 5) {
    return { error: "Invalid add-on license integer given." };
  }
  // Check if a valid earliest supported version is provided.
  if (!allowedAddonVersions.includes(data.versionSupport)) {
    return { error: "Invalid add-on versionSupport (earliest supported version) integer given." };
  }
  // Set character limit of name to 50 characters and description limit to 200.
  if (data.name.length > 50 || data.description.length > 200) {
    return { error: "Name exceeds character limit of 50, or description exceeds character limit of 200." };
  }
  // If submitted images are more than 10, throw error.
  if (data.images.length > 10) {
    return { error: "More than 10 images for a single add-on are not accepted." };
  }
  // Check if each image fits 5MB size limit and is a valid image.
  for (image of data.images) {
    if (!image.startsWith("data:image/png;base64,")) {
      return { error: "One of the submitted images is not a valid image." };
    }
    if (base64GetMBSize(image) > 5) {
      return { error: "One of the submitted images exceeds the 5MB size limit." };
    }
  }
  // Check if given add-on file is a valid ".zip" archive and fits within the 20MB size limit.
  if (!data.file.startsWith("data:application/x-zip-compressed;base64,")) {
    return { error: "Submitted add-on file is not a valid '.zip' archive." };
  }
  if (base64GetMBSize(data.file) > 20) {
    return { error: "Submitted add-on file exceeds the 20MB size limit." };
  }
}

router.render = function(req, res) {
  // Apply additional actions, when getting all available add-ons.
  if (req.url.startsWith('/add-ons')) {
    // Provide query options into a variable.
    const query = new URLSearchParams(req.url.slice(req.url.indexOf("?") + 1));
    // For each add-on being returned, only expose a specfied version of it in the response.
    // If no version is specified, expose only the latest one.
    const versionQuery = query.get("version");
    for (addon of res.locals.data) {
      const versionId = versionQuery ? versionQuery - 1 : addon.versions.length - 1;
      const addonVersion = addon.versions[versionId];
      delete addon.versions;
      if (addonVersion) {
        // Add add-on version data directly to main add-on response data.
        for (versionKey of Object.keys(addonVersion)) {
          addon[versionKey] = addonVersion[versionKey];
        }
      }
      else {
        addon.error = "Cannot find specified add-on version.";
      }
      // Additionally, get add-on submission date from first revision and "versionSupport" from chosen version revision.
      // Copy them as main properties.
      addon.submittedOn = addon.revisions[0].submittedOn;
      if (addon.revisions[versionId]) addon.versionSupport = addon.revisions[versionId].versionSupport;
    }
    // Getting add-ons also returns their rating, which is dynamically calculated.
    const reviews = server.db["__wrapped__"]["reviews"];
    for (addon of res.locals.data) {
      let ratings = reviews.filter((review) => review.for == addon.id).map((review) => review.rating);
      addon.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
    // Allow sorting add-ons by rating in query.
    if (query.get("_sort") == "rating") {
      const ascending = query.get("_order") != "desc";
      res.locals.data.sort(function(aObj, bObj) {
        const a = aObj.rating ? aObj.rating : 0;
        const b = bObj.rating ? bObj.rating : 0;
        return ascending ? a - b : b - a;
      });
    }
    else if (query.get("_sort") == "versionSupport") { // Allow sorting add-ons by "versionSupport" in query.
      const ascending = query.get("_order") != "desc";
      res.locals.data.sort(function(aObj, bObj) {
        const a = allowedAddonVersions.indexOf(aObj.versionSupport);
        const b = allowedAddonVersions.indexOf(bObj.versionSupport);
        return ascending ? a - b : b - a;
      });
    }
    // Easier to manage pagination for add-ons.
    const page = query.get("__page");
    if (page) {
      const limit = query.get("__limit") ? query.get("__limit") : 10;
      const fullData = res.locals.data;
      res.locals.data = res.locals.data.slice((page - 1) * limit, page * limit);
      if (res.locals.data.length) {
        res.setHeader("Pagination-Previous-Page", fullData.indexOf(res.locals.data[0]) > 0); // First item in paginated data isn't first in full data.
        res.setHeader("Pagination-Next-Page", fullData.indexOf(res.locals.data[res.locals.data.length - 1]) < fullData.length - 1); // Last item in paginated data isn't last in full data.
        res.setHeader("Access-Control-Expose-Headers", "Pagination-Previous-Page, Pagination-Next-Page"); // Expose the custom header values for pagination.
      }
    }
  }
  res.jsonp(res.locals.data);
}

// Get an add-on's image in Base64.
server.get("/image", function(req, res, next) {
  const content = {
    "addonId": req.query.addonId ? Number(req.query.addonId) : null,
    "addonVerified": req.query.addonVerified ? req.query.addonVerified === "true" : null,
    "imageId": req.query.imageId ? Number(req.query.imageId) : null
  };

  // Check availability of all fields
  if (!Object.values(content).every(fieldAvailable)) {
    res.status(400).jsonp({ error: "Not enough information: Missing fields." });
    return;
  }

  content.addonVersion = req.query.addonVersion ? Number(req.query.addonVersion) : null;

  const addon = (content.addonVerified ? server.db.get("add-ons") : server.db.get("submit-add-ons")).find({ id: content.addonId }).value();
  const version = addon.versions[content.addonVersion ? content.addonVersion - 1 : addon.versions.length - 1];
  if (!version) {
    res.status(400).jsonp({ error: "Provided add-on version does not exist." });
    return;
  }
  const image = version.images[content.imageId - 1];
  if (image) {
    res.send(image);
  }
  else {
    res.status(400).jsonp({ error: "Add-on image not found." });
  }
});

// REVIEW MANAGEMENT

// Review submission back-end
server.post("/reviews", function(req, res, next) {
  // Check if the current user is authorized.
  const userResponse = getUserFromToken(req.header("Authorization"));
  if (userResponse.error) {
    res.status(401).jsonp(userResponse);
    return;
  }

  if (fieldAvailable(req.body.body)) {
    // Convert review body to string, if it exists.
    req.body.body = String(req.body.body);
    // Check if review body is within a 200 characters limit.
    if (req.body.body.length > 200) {
      res.status(400).jsonp({ error: "Review body should have a maximum of 200 characters." });
      return;
    }
  }
  else {
    // Delete the review body from the request, if it does not have a valid value.
    delete req.body.body;
  }
  // Check if add-on to-be-reviewed is specified.
  if (!fieldAvailable(req.body.for)) {
    res.status(400).jsonp({ error: "Add-on to-be-reviewed not specified." });
    return;
  }
  // Check if current user does not already have a review of the add-on.
  if (server.db.get("reviews").find({ author: userResponse.id, for: req.body.for }).value()) {
    res.status(400).jsonp({ error: "A user can only review a certain add-on once." });
    return;
  }
  // Check if the current user has not reviewed any add-ons in the past 10 minutes.
  const date = new Date();
  const cooldown = server.db["__wrapped__"]["reviews"].some(function(review) {
    return review.author === userResponse.id && date.getTime() / 1000 - review.submittedOn < 600;
  });
  if (cooldown) {
    res.status(400).jsonp({ error: "A user can author reviews in an interval of 10 minutes." });
    return;
  }
  // Check if a valid rating is provided.
  if (!req.body.rating) {
    res.status(400).jsonp({ error: "No rating provided." });
    return;
  }
  const ratingFixed = req.body.rating.toFixed(1);
  if (req.body.rating < 0.5 || req.body.rating > 5 || (!ratingFixed.endsWith(".0") && !ratingFixed.endsWith(".5"))) {
    res.status(400).jsonp({ error: "Invalid rating provided." });
    return;
  }
  // Add review author and submission date.
  req.body.author = userResponse.id;
  req.body.submittedOn = date.getTime() / 1000;

  next();
});

// Additional utilities

function fieldAvailable(field) {
  return (typeof field === "string" ? field != "" : true) && field != undefined && field != null;
}

function base64GetMBSize(file) {
  var stringLength = file.slice(",").length;

  var sizeInBytes = 4 * Math.ceil((stringLength / 3)) * 0.5624896334383812;
  return sizeInBytes / 1000000;
}

function getUserFromToken(authToken) {
  const token = authToken ? authToken.replace("Bearer ", "") : null;

  if (token) {
    try {
      const data = jwt.verify(token, JWT_SECRET_KEY);

      let user = server.db.get("users").find({ email: data.email }).value();
      return { username: user.username, joinedOn: user.joinedOn, id: user.id };
    }
    catch (error) {
      return { error: error.message };
    }
  }
  else {
    return { error: "User not authorized." };
  }
}

// Server initialization

// const rules = auth.rewriter({
//   "add-ons": 444,
//   "submit-add-ons": 420,
//   "reviews": 644,
//   "users": 400
// });

// server.use(rules);
server.use(auth);
server.use(router);
server.listen(3000, function() {
  console.log("JSON Server is running");
});
