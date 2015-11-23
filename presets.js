"use strict";
var _ = require("lodash"),
  chalk = require("chalk"),
  fs = require("fs"),
  config = require("./config");

var Presets = function() {};
// Presets.prototype.setActive = function(p) {
//   this.active = p;
// }
// Presets.prototype.getActive = function() {
//   return this.active;
// }
Presets.prototype.init = function() {
  var path = config.get("presets");
  var str = fs.readFileSync(path);
  this.data = null;
  try {
    this.data = JSON.parse(str);
    console.log(chalk.dim("Presets: " + path + " (" + _.keys(this.data).length + ")"));
  }
  catch (err) {
    console.log(chalk.red("Could not parse presets"));
    console.log(err);
  }
}
Presets.prototype.get = function(key) {
  return this.data[key];
}
Presets.prototype.getKeys = function() {
  return _.keys(this.data);
}
Presets.prototype.getOutputParams = function(preset) {
  var humanOut = "";
  var outFormat = "--bits " + preset.bitDepth +" ";
  var sox = "rate " + preset.sampleRate +" "
  humanOut = preset.bitDepth +"@" + preset.sampleRate;
  if (preset.autoGain) {
    sox += "gain -nh";
    humanOut +=". Autogain";
  }

  return {
    human: humanOut,
    sox: sox,
    format: outFormat
  }
}
module.exports = new Presets();