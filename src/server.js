const { PORT } = require("./config/env");
const app = require("./app");
const { createUsersTable } = require("./features/users/users.repository");

createUsersTable()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  });
