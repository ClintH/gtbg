var _ = require("lodash"),
  chalk = require("chalk"),
  path = require("path"),
  fs = require("fs"),
  util = require("./util");

var Config = function() {};
Config.prototype.init = function() {
  var paths = [path.join(__dirname, "config.json"), "gtbg-config.json"];
  this.data = {};
  for (var i=0;i<paths.length;i++) {
    var err = util.layerOnData(paths[i], this.data);
    if (err && i === 0)
      console.log(chalk.red("Could not load: " + err + " (" + paths[i] + ")"));
  }
};
Config.prototype.layerArgs = function(args) {
  var me = this;
  _.forIn(this.data, function(v,k) {
    if (typeof(args[k]) !== "undefined") {
      me.data[k] = args[k];
    }
  });
};
Config.prototype.setDefault = function(k,v) {
  if (typeof(this.data[k]) == 'undefined')
      this.data[k] = v;
};
Config.prototype.set = function(key, value) {
  this.data[key] = value;
};
Config.prototype.get = function(key) {
  return this.data[key];
};
Config.prototype.getKeys = function() {
  return _.keys(this.data);
};
module.exports = new Config();
