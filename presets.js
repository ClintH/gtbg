"use strict";
var _ = require("lodash"),
  chalk = require("chalk"),
  fs = require("fs"),
  path = require("path"),
  util = require("./util"),
  config = require("./config");

var Presets = function() {};
Presets.prototype.init = function() {
  var paths = [path.join(__dirname, "presets.json"), "gtbg-presets.json", config.get("presets")];
  this.data = {};
  for (var i=0;i<paths.length;i++) {
    var err = util.layerOnData(paths[i], this.data);
    if (err && i == 0)
      console.log(chalk.red("Could not load: " + err));
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