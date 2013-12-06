/***************************************************
 * Property
 ***************************************************/
var Property = 
function(name, type, description, value, editable) {
	this.name = name;
	this.type = type;
	this.description = description;
	this.value = value;			// default value
	this.editable = (typeof editable === "undefined") ? true : editable;
};

Property.prototype.setName = function(name) {
	this.name = name;
	this.emit("name", name);
};

Property.prototype.setDescription = function(description) {
	this.description = description;
	this.emit("description", description);
};

Property.prototype.getValue = function() {
	return this.value;
};

Property.prototype.setValue = function(value) {
	this.value = value;
	this.emit("value", value);
};

Property.prototype.getDefinition = function() {
	return {
		name        : this.name,
		type        : this.type,
		description : this.description,
		editable    : this.editable,
	};
};


exports.Property = Property;
