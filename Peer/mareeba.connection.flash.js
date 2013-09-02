(function(Mareeba, swfobject){
    "use strict";
    if(!!swfobject && swfobject.getFlashPlayerVersion().major > 10){
        Mareeba.namespace("Connection.Flash");
        /**
         * Wrapper für Flash p2p-Verbindungen
         * @class Mareeba.Connection.Flash
         * @extends Mareeba.Connection
         * @param {Object} config
         */
        Mareeba.Connection.Flash = function(config){
        };
    }
}(Mareeba, swfobject));