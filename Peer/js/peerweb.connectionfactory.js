peerWeb.namespace("ConnectionFactory");

peerWeb.ConnectionFactory.buildConnection = function(peerDescr, config){
    "use strict";
    var type, connection;
    if(!!peerDescr.webrtc){
        type = "WebRTC";
    }
    else if(!!peerDescr.ws){
        type = "WebSocket";
    }
    else{
        throw {
            name: "Error",
            message: "No usable connectiontype specified"
        };
    }
    if(typeof peerWeb.Connection[type].prototype.send !== "function"){
        peerWeb.Connection[type].prototype.__proto__ = new peerWeb.Connection();
        peerWeb.Connection[type].prototype.constructor = peerWeb.Connection[type];
    }
    connection = new peerWeb.Connection[type](peerDescr, config);
    return connection;
};
