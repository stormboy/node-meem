var MeemFactory = require("./meemfactory");
var MeemStore = require("./meemstore");
var MeemBus = require("./meembus");
//var uuid = require('node-uuid');
var crypto = require('crypto');

var TRACE = true;
var DETAIL = false;


var MeemServer = function(options) {
	options = options || {};
	
	this.subsystems = {};
	this.meems = {};
	this.meemStore = new MeemStore(options.meemstore || {});

	this.meemBus = new MeemBus(options);

	var namespaces = options.namespaces || {
		"org.meemplex.core" : require("./meems/core"),
		"org.meemplex.demo" : require("./meems/demo")
	};

	this.meemFactory = new MeemFactory(namespaces, this.meemBus);

};

/**
 * start server
 */
MeemServer.prototype.start = function() {
	var self = this;

	
	// load subsystems/meems
	this.meemStore.getMeems(function(err, defs) {
		if (err) {
			console.log("MeemServer: error loading meems from meemstore: " + err);
			return;
		}
		for (var i=0; i<defs.length; i++) {
			self.addMeem(defs[i]);
			// TODO start subsystems
		}
	});

};

/**
 * stop server
 */ 
MeemServer.prototype.stop = function() {
	
	// persist meems
	for (var id in this.meem) {
		var meem = this.meem[id];
		this.meemStore.persistMeem(meem, function(err, def) {
			if (err) {
				console.log("MeemServer: error persisting meem: " + err);
				return;
			}
		});
	}
	
	// close meemBus
	//this.meemBus.close();
};

MeemServer.prototype.addMeem = function(meemSpec, cb) {
	if (this.meems[meemSpec.id]) {
		if (typeof cb !== "undefined") {
			cb(new Error("meem already created: " + meemSpec.id));
		}
		return;
	}
	if (TRACE && DETAIL) {
		console.log("MeemServer: creating Meem: " + JSON.stringify(meemSpec.id));
	}
	
	var self = this;
	
	var meem = this.meemFactory.create(meemSpec);
	this.meems[meem.id] = meem;
	
	if (meem.isSubsystem) {
		this.subsystems[meem.id] = meem;
		meem.on("createMeem", function(def, callback) {
			self.addMeem(def);
		});
		meem.on("destroyMeem", function(meemId, callback) {
			self.destroyMeem(meemId);
		});
	}
	
	if (meem.persistent) {
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
	}
	else {
		if (typeof cb !== "undefined") {
			cb(null, meem);
		}
	}
};

MeemServer.prototype.destroyMeem = function(meemId, cb) {
	// TODO implement destroyMeem()
};

MeemServer.prototype.locateMeem = function(meemId, callback) {
	var self = this;
	var meem = this.meems[meemId];
	if (!meem) {
		this.meemStore.getMeem(meemId, function(err, def) {
			if (err) {
				console.log("MeemServer: error loading meem from meemstore: " + err);
				callback(err);
				return;
			}
			self.addMeem(def, callback);
		});
	}
	else {
		if (typeof callback !== "undefined") {
			callback(null, meem);
		}
	}
};

MeemServer.prototype.addSubsystem = function(spec, cb) {
	var self = this;
	spec.subsystem = true;
	this.addMeem(spec, function(err, subsystem) {
		if (err) {
			console.log("MeemServer: problem creating subsystem meem: " + err);
			return;
		}
		self.subsystems[subsystem.id] = subsystem;
		subsystem.on("createMeem", function(meemDef, callback) {
			self.addMeem(meemDef);
		});
		subsystem.on("destroyMeem", function(meemId, callback) {
			self.addMeem(meemDef);
		});
	});
};

MeemServer.prototype.removeSubsystem = function(subsystemSpec, cb) {
};

module.exports = MeemServer;