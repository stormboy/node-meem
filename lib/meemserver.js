var MeemFactory = require("./meemfactory");
var MeemStore = require("./meemstore");
var MeemBus = require("./meembus");
//var uuid = require('node-uuid');
var crypto = require('crypto');

var MeemServer = function(options) {
	options = options || {};
	
	this.subsystems = {};
	this.meemStore = new MeemStore(options.store || {});

	this.meemBus = new MeemBus(options);

	var namespaces = options.namespaces || {
		"org.meemplex.core" : require("./meems/core"),
		"org.meemplex.demo" : require("./meems/demo")
	};

	this.meemFactory = new MeemFactory(namespaces, this.meemBus);

};

MeemServer.prototype.start = function() {
	var self = this;

	// TODO start server
	
	// load subsystems/meems
	this.meemStore.getMeems(function(err, defs) {
		if (err) {
			console.log("error loading meems from meemstore: " + err);
			return;
		}
		for (var i=0; i<defs.length; i++) {
			var meem = self.meemFactory.create(defs[i]);
			self.subsystems[meem.id] = meem;		// TODO use subsystems. For now, track individual meems.
			// TODO start subsystems
		}
	});

};

MeemServer.prototype.stop = function() {
	// TODO stop server
	
	// persist meems
	for (var id in this.subsystems) {
		var meem = this.subsystems[id];
		this.meemStore.persistMeem(meem, function(err, def) {
			if (err) {
				console.log("error persisting meem: " + err);
				return;
			}
		});
	}
	
	// close meemBus
	//this.meemBus.close();
};

MeemServer.prototype.addMeem = function(meemSpec, cb) {
	var meem = this.meemFactory.create(meemSpec);
	this.subsystems[meem.id] = meem;
	this.meemStore.persistMeem(meem, function(err, def) {
		if (typeof cb != "undefined") {
			cb(err, meem);
		}
	});
	meem.on("persist", function(callback) {
		self.meemStore.persistMeem(meem, function(err, def) {
			if (typeof callback != "undefined") {
				callback(err, def);
			}
		});
	});
};

MeemServer.prototype.addSubsystem = function(subsystem) {
};

module.exports = MeemServer;