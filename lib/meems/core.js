var util = require("util");
var meem = require("../meem");

/************************************************************************************
 * Category Meem
 ************************************************************************************/
var Category = exports.Category = function Category(def) {
	meem.Meem.call(this, def);
	console.log("created: " + this.constructor.name);
};
util.inherits(Category, meem.Meem);
