(function(Mareeba){
    "use strict";
    /** @namespace Mareeba.ConnectionFactory */
    Mareeba.namespace("ConnectionFactory");
    /**
	 * builds a connection regarding to the given peer description
     * @param {Mareeba.PeerDescription} peerDescription of far peer
     * @param {Object} configurationobject
     * @returns {(Mareeba.Connection.WebSocket|Mareeba.Connection.WebRTC)} created connection
     * @throws No usable connectiontype specified
     * @memberOf Mareeba.ConnectionFactory
     */
    Mareeba.ConnectionFactory.buildConnection = function(peerDesc, config){
        var type, connection;
        if(!!peerDesc.webrtc){
            type = "WebRTC";
        }
        else if(!!peerDesc.ws){
            type = "WebSocket";
        }
        else{
            throw {
                name: "Error",
                message: "No usable connectiontype specified"
            };
        }
        if(typeof Mareeba.Connection[type].prototype.send !== "function"){
            Mareeba.Connection[type].prototype.__proto__ = new Mareeba.Connection();
            Mareeba.Connection[type].prototype.constructor = Mareeba.Connection[type];
        }
        connection = new Mareeba.Connection[type](peerDesc, config);
        return connection;
    };
}(Mareeba));