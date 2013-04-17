peerWeb.namespace("ConnectionFactory");

peerWeb.ConnectionFactory.buildConnection = function(peerDesc, config){
    "use strict";
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
    if(typeof peerWeb.Connection[type].prototype.send !== "function"){
        peerWeb.Connection[type].prototype.__proto__ = new peerWeb.Connection();
        peerWeb.Connection[type].prototype.constructor = peerWeb.Connection[type];
    }
    connection = new peerWeb.Connection[type](peerDesc, config);
    return connection;
};
