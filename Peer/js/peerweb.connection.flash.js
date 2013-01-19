/**
 * @author Marten Schälicke
 */

peerWeb.supportFor.flash = !!swfobject && swfobject.getFlashPlayerVersion().major > 10;

peerWeb.namespace("Connection.Flash");
peerWeb.Connection.Flash = function(config){
    "use strict";
};
