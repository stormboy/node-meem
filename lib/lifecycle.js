
var LifecycleStates = exports.State = {
	unknown: "unknown",
	missing: "missing",
	loaded: "loaded",
	ready: "ready"
};

var LifecycleTransition = exports.Transition = {
	loaded_ready: "loaded_ready",
	ready_loaded: "ready_loaded"
};