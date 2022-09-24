## How to run?

To run this testing server for the SuperTux Add-ons website:

1. Create a file named "db.json" in this directory, containing the following fields:

```
{
  "add-ons": [],
  "submit-add-ons": [],
  "edit-add-on": [],
  "reviews": [],
  "users": []
}
```

2. Make sure to install all required dependencies, using `npm install` with NPM.

3. Run "server.js" with Node.js, like so: `node server.js`.
