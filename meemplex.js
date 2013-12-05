/**
 * MQTT paths
 * 
 * Device path:
 * 	/{subsystem_type}/{subsystem_id}/{device_path}/{direction}/{facet_paths}
 * 
 * e.g.
 * 	/hue/abcd1234/light/1/in/switch
 * 	/hue/abcd1234/light/1/out/switch
 * 
 * e.g. Zigbee
 * 	/zigbee/{pan_id}/{node_address}/{endpoint}/{direction}/{cluster_id}
 * 
 * 	/zigbee/abcdef/123a/2/in/6             (on/off switch control)
 * 	/zigbee/abcdef/123a/2/out/6            (on/off switch state)
 * 
 * e.g. UPnP
 * 	/upnp/{subsys_id}/{device_id}/{direction}/{facet}
 * 
 *  /nest/{thermostat_id}/{direction}/{facet}
 *  
 * e.g. scene
 *  /function/home/scene/scene_id/switch

 */


var meem = require("./");
var config = require("./config");

var meemServer = new meem.MeemServer(config);

meemServer.start();
