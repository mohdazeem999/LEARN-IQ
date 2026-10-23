// LearnIQ Production Entry Point (Root)
// Delegates directly to backend/server.js to ensure full compatibility with
// cloud hosts (like Render) whether the Start Command is configured as:
// - `npm start`
// - `node server.js`
// - `node backend/server.js`

require("./backend/server.js");
