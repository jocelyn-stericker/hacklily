var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
var Dragon = require("../build/Release/lib");

var PACKAGED = false;

// Report crashes to our server.
require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
var mainWindow = null;

app.on('before-quit', function() {
    Dragon.quit();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    console.log('Everything is closed');
    app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    console.log('ready');
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    if (PACKAGED) {
      mainWindow.loadUrl('file://' + __dirname + '/static/index.html');
    } else {
      mainWindow.loadUrl('http://127.0.0.1:4800');
    }

    // Open the devtools.
    mainWindow.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow.destroy();
        mainWindow = null;
    });
});
