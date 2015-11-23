"use strict";
var inquirer = require("inquirer"),
  fs = require("fs"),
  config = require("./config"),
  strings = require("./strings"),
  presets = require("./presets");

module.exports = function(complete) {

var preset = null;

var dirValidate = function(v) {
  try {
    var s = fs.statSync(v);
    if (!s.isDirectory()) return "Not a valid path";
  } catch (e) {
    if (e.code =="ENOENT") {
      return "Path does not exist";
    }
    return "Error " + e.message;
  }
  return true; 
}

function chooseSliceLen() {
  inquirer.prompt({
    type: "input",
    name: "sliceLength",
    message: "Slice length (in audio samples)",
    default: function() {
      return preset.sliceLength;
    },
    validate: function(v) {
      if (v === "auto") return true;
      var p = 0;
      try {
        p = parseInt(v);
      } catch (e) {}
      if (p == v) return true;
      return false;
    }
  }, function(a) {
    config.set("sliceLength", a.sliceLength);
    complete(preset);
  })
}
function chooseOutput() {
   inquirer.prompt({
    type: "input",
    name: "outputPath",
    message: "Output path",
    default: function() {
      return config.get("outputPath");
    }
  }, function(a) {
    config.set("outputPath", a.outputPath);
    if (preset.sliceLength) {
      chooseSliceLen();
    } else complete(preset);
  })
}

function chooseSamples() {
   inquirer.prompt({
    type: "input",
    name: "samples",
    message: "Source sample path",
    default: function() {
      return config.get("samples");
    },
    validate: dirValidate
  }, function(a) {
    config.set("samples", a.samples);
    chooseOutput();
  })
}

function start() {
  var choices = [];
  var opts = presets.getKeys();
  opts.forEach(function(key) {
    var preset = presets.get(key);
    var choice = {
      value: "p-" + key,
      name: preset.machine + ": " + preset.description + " (" + key +")"
    }
    choices.push(choice);
  });
  choices.push(new inquirer.Separator());
  choices.push({value:"exit", name: "Exit"});

  inquirer.prompt({
    type: "list",
    name: "preset",
    message: "Which preset?",
    choices: choices
  }, function(a) {
    if (strings.startsWith(a.preset,"p-")) {
      preset = presets.get(a.preset.substr(2));
      chooseSamples(); 
      return;
    }
      console.log(a.preset);

  })
}

start();
}