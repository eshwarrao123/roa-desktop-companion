const { app } = require("electron");
console.log("[test] process.type:", process.type);
console.log("[test] app:", typeof app);
app.whenReady().then(() => {
  console.log("[test] App ready!");
  app.quit();
});
