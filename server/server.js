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
    req.body.images,
    req.body.file
  ];
  if (!content.every(fieldAvailable)) {
    res.status(400).jsonp({ error: "Not enough information: Missing fields." });
    return;
  }

  // Check if a valid add-on type integer has been given.
  if (!Number.isInteger(req.body.type) || req.body.type <= 0 || req.body.type > 3) {
    res.status(400).jsonp({ error: "Invalid add-on type integer given." });
  }
  // Check if a valid add-on license integer has been given.
  if (!Number.isInteger(req.body.license) || req.body.license <= 0 || req.body.license > 5) {
    res.status(400).jsonp({ error: "Invalid add-on license integer given." });
  }
  // Check if add-on author has submitted any non-verified add-ons in the past 30 minutes.
  const date = new Date();
  const cooldown = server.db["__wrapped__"]["submit-add-ons"].some(function(addon) {
    return addon.author === userResponse.id && date.getTime() / 1000 - addon.submittedOn < 1800;
  });
  if (cooldown) {
    res.status(400).jsonp({ error: "A user can submit add-ons in an interval of 30 minutes." });
    return;
  }
  // Set character limit of name to 50 characters and description limit to 200.
  if (req.body.name.length > 50 || req.body.description.length > 200) {
    res.status(400).jsonp({ error: "Name exceeds character limit of 50, or description exceeds character limit of 200." });
    return;
  }
  // If submitted images are more than 10, throw error.
  if (req.body.images.length > 10) {
    res.status(400).jsonp({ error: "More than 10 images for a single add-on are not accepted." });
    return;
  }
  // Check if each image fits 5MB size limit and is a valid image.
  for (image of req.body.images) {
    if (!image.startsWith("data:image/png;base64,")) {
      res.status(400).jsonp({ error: "One of the submitted images is not a valid image." });
      return;
    }
    if (base64GetMBSize(image) > 5) {
      res.status(400).jsonp({ error: "One of the submitted images exceeds the 5MB size limit." });
      return;
    }
  }
  // Check if given add-on file is a valid ".zip" archive and fits within the 20MB size limit.
  if (!req.body.file.startsWith("data:application/x-zip-compressed;base64,")) {
    res.status(400).jsonp({ error: "Submitted add-on file is not a valid '.zip' archive." });
    return;
  }
  if (base64GetMBSize(req.body.file) > 20) {
    res.status(400).jsonp({ error: "Submitted add-on file exceeds the 20MB size limit." });
    return;
  }
  // Assign author of add-on (the current user).
  req.body["author"] = userResponse.id;
  // Assign submission date.
  req.body["submittedOn"] = date.getTime() / 1000;

  next();
});

router.render = function(req, res) {
  // Apply additional actions, when getting all available add-ons.
  if (req.url.startsWith('/add-ons')) {
    // Getting add-ons also returns their rating, which is dynamically calculated.
    const reviews = server.db["__wrapped__"]["reviews"];
    for (addon of res.locals.data) {
      let ratings = reviews.filter((review) => review.for == addon.id).map((review) => review.rating);
      addon.rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
    // Provide query options into a variable.
    const query = new URLSearchParams(req.url.slice(req.url.indexOf("?") + 1));
    // Allow sorting add-ons by rating in query.
    if (query.get("_sort") == "rating") {
      const ascending = query.get("_order") != "desc";
      res.locals.data.sort(function(aObj, bObj) {
        const a = aObj.rating ? aObj.rating : 0;
        const b = bObj.rating ? bObj.rating : 0;
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

  const addon = (content.addonVerified ? server.db.get("add-ons") : server.db.get("submit-add-ons")).find({ id: content.addonId }).value();
  const image = addon.images[content.imageId];
  res.send(image);
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
      return user;
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
