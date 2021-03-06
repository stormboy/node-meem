var util = require("util");
var meem = require("../meem");


/*****************************************
 * LoopbackBinary
 *****************************************/
var LoopbackBinary = exports.LoopbackBinary = 
function LoopbackBinary(def) {
	meem.Meem.call(this, def, this._getProperties(def.properties), this._getFacets());
	this.value = false;		// the binary value
};
util.inherits(LoopbackBinary, meem.Meem);

LoopbackBinary.prototype._getProperties = function(config) {
	var properties = {};
	return properties;
};

/**
 * Define the facets for this Meem.
 */
LoopbackBinary.prototype._getFacets = function() {
	var self = this;

	var handleBinaryIn = function(message) {
		if (self.value != message.value) {
			self.value = message.value;
			// send value to output facet
			self.sendMessage("binaryOut", {
				value: self.value
			});
		}
	};

	var handleBinaryOutRequest = function(request) {
		request.respond({
			value: self.value
		});
	};

	var facets = {
		binaryIn: {
			type: "org.meemplex.Binary", 
			direction: meem.Direction.IN, 
			description: "a description for the input",
			handleMessage: handleBinaryIn
		},
		binaryOut: {
			type: "org.meemplex.Binary", 
			direction: meem.Direction.OUT, 
			description: "a description for the output",
			handleContentRequest: handleBinaryOutRequest
		}
	};
	return facets;
};

/*****************************************
 * LoopbackLinear
 *****************************************/
var LoopbackLinear = exports.LoopbackLinear = 
function LoopbackLinear(def) {
	meem.Meem.call(this, def, this._getProperties(def.properties), this._getFacets());
	this.value = 0;		// the linear value
	//this.unit = undefined;
};
util.inherits(LoopbackLinear, meem.Meem);

LoopbackLinear.prototype._getProperties = function(config) {
	var properties = {};
	return properties;
};

/**
 * Define the facets for this Meem.
 */
LoopbackLinear.prototype._getFacets = function() {
	var self = this;

	var handleLinearIn = function(message) {
		if (self.value != message.value) {
			self.value = message.value;
			if (message.unit) {
				self.unit = message.unit; 
			}
			else if (self.unit !== undefined){
				delete self.unit;
			}

			// send value to output facet
			self.sendMessage("linearOut", message);
		}
	};

	var handleLinearOutRequest = function(request) {
		var message = { value: self.value };
		if (self.unit !== undefined) {
			message.unit = self.unit;
		}
		request.respond(message);
	};

	var facets = {
		linearIn: {
			type: "org.meemplex.Linear", 
			direction: meem.Direction.IN, 
			description: "a description for the input",
			handleMessage: handleLinearIn
		},
		linearOut: {
			type: "org.meemplex.Linear", 
			direction: meem.Direction.OUT, 
			description: "a description for the output",
			handleContentRequest: handleLinearOutRequest
		}
	};
	return facets;
};

/************************************************************************************
 * BinaryTimer
 * def includes id, type, property values
 ************************************************************************************/
var BinaryTimer = exports.BinaryTimer = 
function BinaryTimer(def) {
	//def.facets = this._getFacets();
	//def.properties = this._getProperties(def.properties);
	meem.Meem.call(this, def, this._getProperties(def.properties), this._getFacets());

	this.value = false;		// the binary value
	this._sendToggle();
};
util.inherits(BinaryTimer, meem.Meem);

BinaryTimer.prototype._getProperties = function(config) {
	var properties = {
		interval: {
			description: "time beteen binary toggles, in milliseconds",
			type: Number,
			value: 5000
		}
	};
	return properties;
};

/**
 * Define the facets for this Meem.
 */
BinaryTimer.prototype._getFacets = function() {
	var self = this;

	var handleBinaryIn = function(message) {
		if (self.value != message.value) {
			self.value = message.value;
			self._resetTimer();
			// send value to output facet
			self.sendMessage("binaryOut", {
				value: self.value
			});
		}
	};

	var handleBinaryOutRequest = function(request) {
		request.respond({
			value: self.value
		});
	};

	var facets = {
		binaryIn: {
			type: "org.meemplex.Binary", 
			direction: meem.Direction.IN, 
			description: "a description for the input",
			handleMessage: handleBinaryIn
		},
		binaryOut: {
			type: "org.meemplex.Binary", 
			direction: meem.Direction.OUT, 
			description: "a description for the output",
			handleContentRequest: handleBinaryOutRequest
		}
	};
	return facets;
};

BinaryTimer.prototype._sendToggle = function() {
	this.value = !this.value;
	this.sendMessage("binaryOut", {
		value: this.value
	});
	this._resetTimer();
};

BinaryTimer.prototype._resetTimer = function() {
	if (this.timer) {
		clearTimeout(this.timer);
	}
	var self = this;
	var interval = this.getProperty("interval").value;
	this.timer = setTimeout(function() {
		self._sendToggle();
	}, interval);
};

/************************************************************************************
 * BinaryScheduler
 ************************************************************************************/
var BinaryScheduler = exports.BinaryScheduler = 
function BinaryScheduler(def) {
	meem.Meem.call(this, def);
	console.log("created: " + this.constructor.name);
	
	this.on("property", function(name, value) {
		switch(name) {
		case "schedule":
			// TODO parse schedule
			break;
		}
	});
};
util.inherits(BinaryScheduler, meem.Meem);


/************************************************************************************
 * LinearAnimator
 ************************************************************************************/
var LinearAnimator = exports.LinearAnimator = 
function LinearAnimator(def) {
	meem.Meem.call(this, def);
	console.log("created: " + this.constructor.name);
};
util.inherits(LinearAnimator, meem.Meem);


/************************************************************************************
 * LinearScheduler
 ************************************************************************************/
var LinearScheduler = exports.LinearScheduler = 
function LinearScheduler(def) {
	// extends Meem
	meem.Meem.call(this, def);
	console.log("created: " + this.constructor.name);
};
util.inherits(LinearScheduler, meem.Meem);

/**
 * Allows binary control of many other Binary controls.
 * Provides lineat outbound facets for a count of Meems with either of the 2 binary states.
 */
var GroupBinary = exports.GroupBinary = 
function GroupBinary(def) {
	// extends Meem
	meem.Meem.call(this, def);
	console.log("created: " + this.constructor.name);
};
util.inherits(GroupBinary, meem.Meem);
