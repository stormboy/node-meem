var util         = require('util');
var EventEmitter = require("events").EventEmitter;
var NeDB         = require('nedb');

/**
 * Persistent store for Meem definitions and content
 */
var MeemStore = function(options) {
	EventEmitter.call(this);

	var dbPath = options.path || (__dirname+'/../data/');
	this.db = {};
	this.db.meems     = new NeDB({ filename: dbPath + 'meems.db' });

	this._init();
};

util.inherits(MeemStore, EventEmitter);

MeemStore.prototype._init = function() {
	var self = this;
	this.db.meems.loadDatabase(function (err) { 
		self.db.meems.ensureIndex({ fieldName: 'id', unique: true });
	});

	this.emit("ready");
};

MeemStore.prototype.close = function() {
        this.db.meems.close();
};

/**
 * Persist a meem definition and content in the database
 */
MeemStore.prototype.persistMeem = function(meem, cb) {
	if (!meem.persistent) {
		// not to be persisted
		return;
	}
	var timestamp = new Date();
	var self = this;
	self.db.meems.find({ id: meem.id}, function(err, docs) {
		if (err) {
			console.log("!!! error persisting meem: " + err);
			return;
		}
		var meemDoc = meem.getDefinition();
		meemDoc.updated = timestamp;
		if (docs.length == 0) {
			self.db.meems.insert(meemDoc, function (err, newDoc) {
				if (typeof cb != 'undefined') {
					cb(err, newDoc);
				}
			});
		}
		else {
			var doc = docs[0];
			self.db.meems.update({ id: meem.id}, { $set: meemDoc }, {}, function(err, numReplaced, upsert) {
				if (typeof cb != 'undefined') {
					cb(err, meemDoc);
				}
			});
		}
	});
};

/**
 * Get all Meems
 */
MeemStore.prototype.getMeems = function(cb) {
	this.db.meems.find({}, function(err, docs) {
		cb(err, docs);
	});
};

MeemStore.prototype.getMeem = function(id, cb) {
	this.db.meems.find({ id: id }, function(err, docs) {
		if (docs.length > 0) {
			cb(null, docs[0]);
		}
		else {
			cb(new Error("Meem " + id + " not found"));
		}
	});
};

MeemStore.prototype.removeMeem = function(id, cb) {
	this.db.meems.remove({ id: id }, {}, function (err, numRemoved) {
		if (typeof cb !== 'undefined') {
			cb(err, numRemoved);
		}
	});
}

module.exports = MeemStore;
