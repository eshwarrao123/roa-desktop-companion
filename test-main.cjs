const electron = require("electron");
console.log("electron:", electron);
console.log("app:", electron.app);

const gotTheLock = electron.app.requestSingleInstanceLock();
console.log("gotTheLock:", gotTheLock);