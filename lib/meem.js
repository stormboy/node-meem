var Facet = require("./facet").Facet;
var Direction = require("./facet").Direction;
var Property = require("./property").Property;
var util = require("util");
var EventEmitter = require("events").EventEmitter;

/***************************************************
 * Meem has
 * - id (uuid)
 * - facets : for communication with other meems
 * - configuration properties
 * - content (values of properties)
 ***************************************************/
/**
 * TODO output facet that provides this meem's facets.
 */

var Meem = function(def, properties, facets, content) {
	EventEmitter.call(this);

	this.id = def.id;
	this.type = def.type;					// combination of namespace and type name, e.g. "org.meemplex.zigbee.BinarySwitch"
	this.description = def.description;
	this.persistent = (typeof def.persistent === "undefined") ? true : def.persistent;
	this.facetDefs = facets || def.facets;

	this.inFacets = {};			// inputs to this meem
	this.outFacets = {};		// outputs from this meem
	this.properties = {};		// properties available for configuration 
	this.content = {};			// persisted content (including property values)
	this.dependencies = {};		// dependencies on other meems

	this._createFacets(facets || def.facets);
	this._createProperties(properties || def.properties);
	this.setContent(content || def.content);			// put settings and values in Meem

//	this.emit("facets:in", this.inFacets);
//	this.emit("facets:out", this.outFacets);
//	this.emit("properties", this.properties);
};
util.inherits(Meem, EventEmitter);

Meem.prototype.persist = function() {
	if (this.persistent) {
		var self = this;
		this.emit("persist", function(err, def) {
			if (!err) {
				self.emit("persisted");
			}
		});
	}
};

/**
 * Connect to meemBus
 */
Meem.prototype.connect = function(meemBus) {
	var self = this;
	for (var name in this.inFacets) {
		var facet = this.inFacets[name];
		var topic   = "/meem/" + this.id + "/in/" + facet.name;
		meemBus.onMessage(topic, facet.handleMessage);	// listen for incoming messages
	}

	// subscribe to outbound facet content requests
	for (var name in this.outFacets) {
		var facet = this.outFacets[name];
		this._connectOutFacet(meemBus, facet);
	}
	
	// TODO connect dependencies, inbound and outbound
	
	this.emit("connect", meemBus);
};

Meem.prototype._connectOutFacet = function(meemBus, facet) {
	var topic   = "/meem/" + this.id + "/out/" + facet.name;
	meemBus.onRequest(topic, function(request) {
		facet.handleContentRequest(request);	// listen for content request on outbound facet
	});
	facet.on("message", function(message) {
		meemBus.sendMessage(topic, message);
	});
};

Meem.prototype.disconnect = function(meemBus) {
	for (var name in this.inFacets) {
		var facet = this.inFacets[name];
		var topic   = "/meem/" + this.id + "/in/" + facet.name;
		meemBus.removeListener(topic, facet.handleMessage);
	}

	// subscribe to outbound facet content requests
	for (var name in this.outFacets) {
		var facet = this.outFacets[name];
		var topic   = "/meem/" + this.id + "/out/" + facet.name + "?";
		meemBus.removeListener(topic, facet.handleContentRequest);
		facet.removeAllListeners("message");
	}
};

Meem.prototype._createFacets = function(facetDefs) {

	for (var name in facetDefs) {
		var def = facetDefs[name];
		def.name = name;
		//console.log("Meem: got facet def: " + JSON.stringify(def));
		var facet = this._createFacet(def);
		switch(facet.direction) {
		case Direction.IN:
			this.inFacets[name] = facet;
			break;
		case Direction.OUT:
			this.outFacets[name] = facet;
			break;
		default:
			console.log("Meem: invalid direction: " + facet.direction);
		}
	}
	
	var self = this;
	
	// Add MeemDefinition facet
	var handleMeemDefinitionRequest = function(request) {
		request.respond(self.getDefinition());
	};
	var def = {
		name: "meemDefinition",
		type: "org.meemplex.MeemDefinition", 
		direction: Direction.OUT, 
		description: "Meem definition",
		handleContentRequest: handleMeemDefinitionRequest
	};
	this.facetDefs[def.name] = def;			// add facet def to facetsDefs
	this.outFacets[def.name] = this._createFacet(def);
	
	// TODO add outbound properties facet

	// add inbound property facet
	var handleInProperty = function(message) {
		self.setPropertyValue(message.name, message.value);
	};
	def = {
		name: "propertiesIn",
		type: "org.meemplex.Properties", 
		direction: Direction.IN, 
		description: "Meem properties",
		handleMessage: handleInProperty
	};
	this.facetDefs[def.name] = def;			// add facet def to facetsDefs
	this.inFacets[def.name]  = this._createFacet(def);

	// add outbound property facet
	var handlePropertyRequest = function(request) {
		request.respond({
			type: "properties",			// message type
			properties: self.properties
		});
	};
	def = {
		name: "propertiesOut",
		type: "org.meemplex.Properties", 
		direction: Direction.OUT, 
		description: "Meem properties output",
		handleContentRequest: handlePropertyRequest
	};
	this.facetDefs[def.name] = def;			// add facet def to facetsDefs
	this.outFacets[def.name]  = this._createFacet(def);

	// TODO add inbound and outbound lifecycle facets

	// TODO add inbound and outbound dependency Facets
};

Meem.prototype._createFacet = function(def) {
	// if (TRACE) {
		// console.log("Meem: creating facet: " + def.name);
	// }
	var facet = new Facet(def.name, def.type, def.direction, def.description);
	if (def.handleMessage) {
		facet.handleMessage = def.handleMessage;
	}
	if (def.handleContentRequest) {
		facet.handleContentRequest = def.handleContentRequest;
	}
	return facet;
};

Meem.prototype._createProperties = function(propDefs) {
	for (var name in propDefs) {
		var def = propDefs[name];
		def.name = name;
		this.properties[name] = this._createProperty(def);
	}
	return this.properties;
};

Meem.prototype._createProperty = function(def) {
	var property = new Property(def.name, def.type, def.description, def.value);
	return property;
};

Meem.prototype.getDefinition = function() {
	return {
		id          : this.id,
		type        : this.type,
		description : this.description,
		facets      : this.facetDefs,
		properties  : this.properties,
		content     : this.content,
	};
};

/**
 * Send a message on an outbound facet.
 */
Meem.prototype.sendMessage = function(facetName, message) {
	var facet = this.getFacet(facetName);
	if (facet) {
		facet.handleMessage(message);
	}
};

Meem.prototype.getFacet = function(name) {
	var facet = this.inFacets[name];
	if (!facet) {
		facet = this.outFacets[name];
	}
	return facet;
};

/**
 * Configuration properties.
 */
Meem.prototype.getProperties = function() {
	return this.properties;
};

Meem.prototype.getProperty = function(name) {
	return this.properties[name];
};

Meem.prototype.getPropertyValue = function(name) {
	if (this.properties[name]) {
		return this.content[name] || this.properties[name].value;	// use default value if content not set
	}
	else {
		return;
	}
};

Meem.prototype.setPropertyValue = function(name, value) {
	var property = this.getProperty(name);
	if (typeof property != 'undefined') {
		this.setContentValue(name, value);
	}
};

/**
 * Persisted content.
 */
Meem.prototype.getContent = function() {
	return this.content;
};

Meem.prototype.setContent = function(content) {
	if (typeof content !== 'undefined' && content) {
		// update property values
		for (var name in content) {
			this.setContentValue(name, content[name]);
		}
	}
};

Meem.prototype.getContentValue = function(name) {
	return this.content[name];
};

Meem.prototype.setContentValue = function(name, value) {
	var previousValue = this.content[name];
	this.content[name] = value;
	
	var property = this.getProperty(name);
	if (typeof property != 'undefined') {
		property.value = value;		// TODO do not store value in content AND property definition
		if (this.emit) {
			this.emit("property", name, value, previousValue);			// emit event to signal property change
		}
		// send to output facet
		this.getFacet("propertiesOut").handleMessage({
			type: "propertyChange",		// message type
			property: {
				name: name,
				value: value,
				type: property.type
			}
		});
	}
	else {
		if (this.emit) {
			this.emit("content", name, value, previousValue);			// emit event to signal content change
		}
	}
};

/***************************************************
 * Exports
 ***************************************************/

exports.Meem = Meem;
exports.Facet = Facet;
exports.Property = Property;
exports.Direction = Direction;
