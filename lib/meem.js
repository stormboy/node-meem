var Facet = require("./facet").Facet;
var Direction = require("./facet").Direction;
var Property = require("./property").Property;
var Lifecycle = require("./lifecycle");
var util = require("util");
var EventEmitter = require("events").EventEmitter;

var ROOT_TOPIC = "/meem/";

/***************************************************
 * Meem has
 * - id (uuid)
 * - facets : for communication with other meems. Messages are passed via Facets.
 * - configuration properties
 * - content (values of properties)
 * - dependencies
 * 
 * Property definition:
 * 		{
 * 			name: "{prop-name}",
 * 			description: "{prop-desc}",
 * 			type: "{value-type}",
 * 			editable: "{boolean}",
 * 			default: "{default-value}",
 * 		}
 * 
 * Facet definition:
 * 		{
 * 			name: "{facet-name}",
 *			type: "{meem-type}", 
 *			direction: {io-direction}, 
 *			description: "{facet-description}",
 *			handleContentRequest: {request-handler-function}
 * 		}
 * 
 * Dependency:
 * 		{
 * 			type: "{dependency-type}"
 * 			facet: "{facet-name}",
 * 			remote {
 * 				meem: "{meem-id}",
 * 				facet: "{facet-name}",		// assumed to be reverse direction to local facet
 * 			},
 * 		}
 * Dependency type: STRONG, WEAK
 * 
 ***************************************************/

var Meem = function(def, properties, facets, content) {
	EventEmitter.call(this);

	this.id = def.id;
	this.type = def.type;					// combination of namespace and type name, e.g. "org.meemplex.zigbee.BinarySwitch"
	this.description = def.description;
	this.persistent = (typeof def.persistent === "undefined") ? true : def.persistent;
	this.facetDefs = {};
	this.inFacets = {};			// inputs to this meem
	this.outFacets = {};		// outputs from this meem
	this.properties = {};		// properties available for configuration 
	this.content = {};			// persisted content (including property values)
	this.dependencies = [];		// an array of dependencies on other meems
	
	this.lifecycleState = Lifecycle.State.unknown;
	
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
 * Connect to meemBus.
 * meemBus is how messages are passed between meems/facets 
 */
Meem.prototype.connect = function(meemBus) {
	var self = this;
	for (var name in this.inFacets) {
		var facet = this.inFacets[name];
		var topic   = ROOT_TOPIC + this.id + "/in/" + facet.name;
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
	var topic = ROOT_TOPIC + this.id + "/out/" + facet.name;
	meemBus.onRequest(topic, facet.handleContentRequest);	// listen for content request on outbound facet
	facet.on("message", function(message) {
		meemBus.sendMessage(topic, message);
	});
};

Meem.prototype.disconnect = function(meemBus) {
	for (var name in this.inFacets) {
		var facet = this.inFacets[name];
		var topic   = ROOT_TOPIC + this.id + "/in/" + facet.name;
		meemBus.removeListener(topic, facet.handleMessage);
	}

	// subscribe to outbound facet content requests
	for (var name in this.outFacets) {
		var facet = this.outFacets[name];
		var topic   = ROOT_TOPIC + this.id + "/out/" + facet.name + "?";
		meemBus.removeListener(topic, facet.handleContentRequest);
		facet.removeAllListeners("message");
	}
};

/**
 * Create the facets as defined in facetDefs
 */
Meem.prototype._createFacets = function(facetDefs) {

	// include system facet definitions
	var systemDefs = getSystemFacets(this);
	for (var name in systemDefs) { facetDefs[name] = systemDefs[name]; }	// copy system facets defs to facetDefs
	
	// create facets from definitions
	for (var name in facetDefs) {
		var def = facetDefs[name];
		def.name = name;
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
		this.facetDefs[def.name] = def;			// add facet def to facetsDefs
	}
};

Meem.prototype._createFacet = function(def) {
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
		this.properties[name] = new Property(def.name, def.type, def.description, def.value);
	}
	return this.properties;
};

/**
 * Get Meem definition.
 */
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
 * Send a message on a facet.  Nominally for sending messages on outbound facets.
 */
Meem.prototype.sendMessage = function(facetName, message) {
	var facet = this.getFacet(facetName);
	if (facet) {
		facet.handleMessage(message);
	}
};

/**
 * Get a named facet
 */
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
		this.sendMessage("propertiesOut", {
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

Meem.prototype._updateLifecycleState = function(state) {
	var self = this;
	if (this.lifecycleState != state) {
		this.lifecycleState = state;
		this.sendMessage("lifecycleOut", {
			type: "lifecycle",
			state: self.lifecycleState
		});
	}
}

Meem.prototype._systemFacets = {
	MeemDefinition: {
		name: "meemDefinition",
		type: "org.meemplex.MeemDefinition", 
		direction: Direction.OUT, 
		description: "Meem definition",
		handleContentRequest: null
	},
	PropertiesIn: {
		name: "propertiesIn",
		type: "org.meemplex.Properties", 
		direction: Direction.IN, 
		description: "Meem properties",
		handleMessage: null
	},
	PropertiesOut: {
		name: "propertiesOut",
		type: "org.meemplex.Properties", 
		direction: Direction.OUT, 
		description: "Meem properties output",
		handleContentRequest: null
	},
	LifecycleIn: {
		name: "lifecycleIn",
		type: "org.meemplex.Lifecycle", 
		direction: Direction.IN, 
		description: "Meem lifecycle facet",
		handleMessage: null
	},
	LifecycleOut: {
		name: "lifecycleOut",
		type: "org.meemplex.Lifecycle", 
		direction: Direction.OUT, 
		description: "Meem lifecycle output",
		handleContentRequest: null
	},
	DependencyIn: {
		name: "dependencyIn",
		type: "org.meemplex.DependencyHandler", 
		direction: Direction.IN, 
		description: "Meem dependency handler",
		handleMessage: null
	},
	DependencyOut: {
		name: "dependencyOut",
		type: "org.meemplex.DependencyHandler", 
		direction: Direction.OUT, 
		description: "Meem dependency output",
		handleContentRequest: null
	}
}

/**
 * Creates system facet definitions
 */
var getSystemFacets = function(meem) {
	var facetDefs = {};
	
	// outbound MeemDefinition facet
	var def = meem._systemFacets.MeemDefinition;
	def.handleContentRequest = function(request) {
		request.respond(meem.getDefinition());
	};
	facetDefs[def.name] = def;
	
	// inbound properties facet
	def = meem._systemFacets.PropertiesIn;
	def.handleMessage = function(message) {
		meem.setPropertyValue(message.name, message.value);
	};
	facetDefs[def.name] = def;

	// outbound properties facet
	def = meem._systemFacets.PropertiesOut;
	def.handleContentRequest = function(request) {
		request.respond({
			type: "properties",			// message type
			properties: meem.properties
		});
	};
	facetDefs[def.name] = def;			// add facet def to facetsDefs

	// lifecycle input facet
	def = meem._systemFacets.LifecycleIn;
	def.handleMessage = function(message) {
		// TODO set lifecycle state
		//meem.setLifecycleState(message.state);
	};
	facetDefs[def.name] = def;			// add facet def to facetsDefs

	// lifecycle output facet
	def = meem._systemFacets.LifecycleOut;
	def.handleContentRequest = function(request) {
		request.respond({
			type: "lifecycle",			// message type
			state: meem.lifecycleState
		});
	};
	facetDefs[def.name] = def;			// add facet def to facetsDefs

	// TODO inbound and outbound dependency Facets
	def = meem._systemFacets.DependencyIn;
	def.handleMessage = function(message) {
		switch(message.type) {
		case "add":
			// TODO add dependencies, and if LC state READY then resolve
			meem.dependencies.concat(message.dependencies);
			break;
		case "remove":
			// TODO remove dependencies
			// match on local facet and remote meem/facet
			break;
		case "update":
			// TODO update dependencies
			break;
		}
	};
	facetDefs[def.name] = def;			// add facet def to facetsDefs

	// lifecycle output facet
	def = meem._systemFacets.DependencyOut;
	def.handleContentRequest = function(request) {
		// give dependencies
		request.respond({
			type: "add",			// message type
			dependencies: meem.dependencies
		});
	};
	facetDefs[def.name] = def;			// add facet def to facetsDefs
	
	return facetDefs;
};


/***************************************************
 * Exports
 ***************************************************/

exports.Meem = Meem;
exports.Facet = Facet;
exports.Property = Property;
exports.Direction = Direction;
