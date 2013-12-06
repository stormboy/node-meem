
var schema = {
	
	"org.meemplex.Binary" : {
		"valueChange": {
			"value": Boolean,
			"timestamp" : Date		// optional
		}
	},
	
	"org.meemplex.Linear" : {
		"valueChange": {
			"value": Number,
			"unit": String, 		// if unit not provided, treated as scalar
			"timestamp" : Date		// optional
		}
	},
	
	"org.meemplex.Category" : {
		"add": {
			"entries": {
				"type": "array",
        		"items": {"$ref": "CategoryEntry"},		// array of category entries
        		"required": true
        	}
		},
		"remove": {
			"entries": Array,		// array of category entries
		},
		"rename": {
			"entries": Array,		// array of category entry maps
		}
	},
	
	"org.meemplex.Scene" : {},			// named scenes sent to this facet. A scene contains participants and desired values on those participants

	"org.meemplex.Schedule" : {},		// for one-off and ongoing schedules

	"org.meemplex.light.Rgb" : {},
};

var Unary = exports.Unary = function() {
	
};

var Binary = exports.Binary = function(name, direction) {
	this.name = name;
	this.direction = direction;
	this.type = "org.meemplex.Binary";
};

Binary.marshal = function(value) {
	return {
		"value" : value
	};
};

/**
 * (value true), (value false), (value #t) or (value #f)
 */
Binary.unmarshal = function(expression) {
};

function Linear(name, direction, unit) {
	this.name = name;
	this.direction = direction;
	this.unit = typeof unit !== 'undefined' ? unit : "nil";
	this.type = "org.meemplex.Linear";
}

Linear.marshal = function(value, unit) {
	return {
		"value" : value,
		"unit" : unit,
	};
};

/**
 * (value 10 Hz), (value 200 W), (value 100 C) or (value 24 sec)
 */
Linear.unmarshal = function(expression) {
	return JSON.parse(expression);
};




var Category = exports.Category = function(name, direction) {
	this.name = name;
	this.direction = direction;
	this.type = "org.meemplex.Category";
};

/**
 * examples: 
 * { "add" : [ {name: "name1", entry: "meemId1"}, {name: "name2", entry: "meemId2"}, {name: "name3", entry: "meemId3"} ] }
 * { "remove" : [ {name: "name1", entry: "meemId1"}, {name: "name2", entry: "meemId2"}, {name: "name3", entry: "meemId3"} ] }
 * { "rename" : [ {from: "name1", to: "new name 1"}, {from: "name2", to: "new name 2"}, {from: "name3", to: "new name 3"} ] }
 */

/**
 * examples:
 * (add (("name1" "meemId1") ("name2" "meemId2") ("name3" "meemId3")))
 * (remove (("name1" "meemId1") ("name2" "meemId2") ("name3" "meemId3")))
 * (rename (("name1" "new name 1") ("name2" "new name 2") ("name3" "new name 3")))
 */

