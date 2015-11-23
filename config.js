"use strict";
var _ = require("lodash"),
  chalk = require("chalk"),
  fs = require("fs"),
  util = require("./util");

var Config = function() {};
Config.prototype.init = function() {
  var path = "config.json";
  this.data = {};
  var err = this.layerOn(path);
  if (err)
    console.log(chalk.red("Could not load: " + err));
}
Config.prototype.layerArgs = function(args) {
  var me = this;
  _.forIn(this.data, function(v,k) {
    if (typeof(args[k]) !== "undefined") {
      me.data[k] = args[k];
    }
  });
}
Config.prototype.setDefault = function(k,v) {
  if (typeof(this.data[k]) == 'undefined')
      this.data[k] = v;
}

Config.prototype.layerOn = function(f) {
  var exists = util.fileExists(f);
  if (exists !== null) return exists;
  var str = fs.readFileSync(f);
  var o = null;
  try {
    o = JSON.parse(str);
    _.merge(this.data, o);
  }
  catch (err) {
    return err;
  }
  return null;
}
Config.prototype.set = function(key, value) {
  this.data[key] = value;
}
Config.prototype.get = function(key) {
  return this.data[key];
}
Config.prototype.getKeys = function() {
  return _.keys(this.data);
}
module.exports = new Config();