"use strict";
var inquirer = require("inquirer"),
  child_process = require("child_process"),
  opener = require("opener"),
  chalk = require("chalk"),
  path = require("path"),
  os = require("os"),
  config = require("./config");

var Sox = function() {};
Sox.prototype.fullPath = function() {
  return path.join(config.get("soxPath"), this.bin());
}

Sox.prototype.bin = function() {
 if (os.platform() == "win32") {
    return "sox.exe";
  } else {
    return "sox";
  }
}

Sox.prototype.exists  = function() {
  var r = child_process.spawnSync(this.fullPath());
  var exists = true;

  if (r.error) {
    if (r.error.code == "ENOENT") {
      exists = false;
    } else {
      console.dir(r.error);
      var q = {
        type: "list",
        name: "choice",
        message: "I had some difficulty checking whether SoX was installed",
        choices : [
            { name: "Continue", value: "continue" },
            { name: "Exit", value:"exit"}
        ]
      }
      inquirer.prompt(q, function(a) {
        switch (a.choice) {
          case "exit":
            exists = false;
            break;
          case "continue":
            exists = true;
            break;
        }
      });
    }
  }
  return exists;
}

Sox.prototype.install = function() {
  var choices = [
      { name: "Open SoX homepage to download it", value: "www" },
      { name: "I'm pretty sure I've installed it", value: "setLocation" },
      { name: "Exit", value:"exit"}
  ];

  if (os.platform() == "darwin") {
    choices.unshift({ 
      name: "Install (requires the Brew package manager)", 
      value: "install" 
    });
  } else if (os.platform() == "win32") {
    choices.unshift({ 
      name: "Install (requires Chocolately package manager)", 
      value: "install" 
    }); 
  }

  var q = {
    type: "list",
    name: "installOpt",
    message: "What to do?",
    choices : choices
  }

  console.log(chalk.red("Can't find the program 'SoX', which is necessary for Gtbg to run."));
  console.log("SoX path: " + this.fullPath());
  inquirer.prompt(q, function(a) {
    switch (a.installOpt) {
      case "www":
        var url = "http://sourceforge.net/projects/sox/files/sox/14.4.2/";
        opener(url);
        console.log("Please download and unzip to somewhere in your path or where you want to run gtbg from");
        break;
      case "install":
        var cmd = null;
        if (os.platform() == "darwin") {
          cmd = "brew install sox";
        } else if (os.platform() == "win32") {
          cmd ="choco install sox";
        } else {
          console.log("Please use your platform's package manager to install SoX.");
          return;
        }
        console.log("Attempting to run: " + cmd);
        console.log("If it doesn't work, please run it yourself and try gtbg again.");
        child_process.execSync(cmd);
        break;
      case "setLocation":
        console.log("Please edit 'config.json' and set 'soxPath' to SoX's path.")
        console.log("The file should be located here: " + path.join(__dirname, "config.json"));
        break;
      default:
        break;
    }
  })
};

module.exports = new Sox();