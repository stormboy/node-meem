/**
 *	- Schedule: cron entries
 *	- messages: json objects
 *	- destinations: topics
 */

var util = require("util")
  , meem = require("../meem")
  , CronJob = require('cron').CronJob;

var Scheduler = exports.Scheduler = function Scheduler(def) {
	meem.Meem.call(this, def, this._getProperties(def.properties), this._getFacets());
	
	var self = this;
	
	this.job = null;
	
	this.on("connect", function(meembus) {
		self.meembus = meembus;
	});
	
	this.on("property", function(name, value) {
		switch(name) {
		case "schedule":
			// TODO recreate job
			self._resetJob();
			break;
		case "path":
		case "message":
			break;
		}
	});

	self._resetJob();
};
util.inherits(Scheduler, meem.Meem);

Scheduler.prototype._getProperties = function(config) {
	var properties = {
		schedule: {
			description: "cron schedule",
			type: String,
			value: "*/10 * * * * *"
		},
		path: {
			description: "The facet path to send messages to",
			type: String,
			value: "/meem/test"
		},
		message: {
			description: "The message to send",
			type: String,
			value: "{ \"value\": \"hi\"}"
		}
	};
	return properties;
};

/**
 * Define the facets for this Meem.
 */
Scheduler.prototype._getFacets = function() {
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

Scheduler.prototype._resetJob = function() {
	var self = this;
	if (this.job) {
		this.job.stop();
	}
	var cronTime = this.getPropertyValue("schedule");
	var path = this.getPropertyValue("path");
	var message = JSON.parse(this.getPropertyValue("message"));

	console.log("resetting job : " + cronTime + " : " + path + " : " + this.getPropertyValue("message"));
	
	this.job = new CronJob(cronTime, function() {
			console.log("running job");
			self.meembus.sendMessage(path, message);
		}, function () {
		    // This function is executed when the job stops
			console.log("job complete");
		}
	);
	this.job.start();
};
