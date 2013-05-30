(function(peerWeb, swfobject){
    "use strict";
    if(!!swfobject && swfobject.getFlashPlayerVersion().major > 10){
        peerWeb.namespace("Connection.Flash");
        /**
         * Wrapper für Flash p2p-Verbindungen
         * @author Marten Schälicke
         * @constructor
         * @param {Object} config
         */
        peerWeb.Connection.Flash = function(config){
            
        };
    }
})(peerWeb, swfobject);