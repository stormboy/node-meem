
var Subsystem = function(doc, meemStore, meemFactory) {
	this.id = doc.id;
	this.name = doc.name;
	this.description = doc.desc;
	this.meems = {};
	
	this.meemStore = meemStore;
	this.meemFactory = meemFactory;
	
	this._loadMeems(doc.meems);		// doc.meems is an array of meem ids
};

Subsystem.prototype.start = function(meem) {
	
};

Subsystem.prototype.stop = function(meem) {
	
};

Subsystem.prototype.addMeem = function(meem) {
	
};

Subsystem.prototype.getMeem = function(id) {
	
};

Subsystem.prototype.removeMeem = function(id) {
	// stop meem
	// remove from persistent store
};

Subsystem.prototype._loadMeems = function(meemIds) {
	var self = this;
	for (var i=0; i<meemIds.length; i++) {
		this.meemStore.getMeem(i, function(err, def) {
			if (err) {
				return;
			}
			var meem = self.meemFactory.create(def);
			self.meems[meem.id] = meem;
		});
	}
};
