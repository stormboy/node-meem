var meem = require("./meem");

var Meem = meem.Meem;

var TRACE = true;
var DETAIL = false;


/**
 * Creates meems.
 */

var MeemFactory = function(namespaces, meemBus) {
	this._ns = namespaces;
	this._meemBus = meemBus;
};


MeemFactory.prototype.addNamespace = function(name, types) {
	this._ns[name] = types;
};

MeemFactory.prototype.create = function(def) {
	if (TRACE) {
		console.log("MeemFactory: creating meem: " + def.id + " : " + def.type + " : " + JSON.stringify(def.properties));
	}
	var meem = null;
	
	// lookup class 
	var cls = this._getClass(def.type);
	if (cls) {
		if (TRACE && DETAIL) {
			console.log("MeemFactory: got class: " + cls.name);
		}
		meem = new cls(def);
	}
	else {
		meem = new Meem(def);
	}
	
	if (meem instanceof Meem) {
		meem.connect(this._meemBus);
	}
	else {
		console.log("MeemFactory: object is not a Meem");
	}
	
	return meem;
};

MeemFactory.prototype._getClass = function(type) {
	var terms = type.split(".");
	var className = terms.pop();
	var ns = terms.join(".");
	
	//console.log("ns : cls = " + ns + " : " + className)
	
	var namespace = this._ns[ns];
	
	//console.log("namespace for " + ns + " : " + namespace);
	
	return namespace[className];
};


module.exports = MeemFactory;
