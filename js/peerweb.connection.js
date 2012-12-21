/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Connection");
peerWeb.Connection = function(config){
    "use strict";
    var webrtc = peerWeb.Connection.WebRTC,
    flash = peerWeb.Connection.Flash,
    websocket = peerWeb.Connection.WebSocket,
    connection;
    
    config = config || {};
    
    if(config.onerror === undefined){
        config.onerror = function(err){peerWeb.log(err, "error");};
    }
    if(config.onclose === undefined){
        config.onclose = function(msg){peerWeb.log(msg, "warn");};
    }

    if(config.onmessage === undefined){
        config.onmessage = function(msg){peerWeb.log(msg, "log");};
    }

    if(config.onopen === undefined){
        config.onopen = function(msg){peerWeb.log(msg, "log");};
    }
    
    
    //private
    (function(){
        var protocol = config.connectTo.split(":")[0];
        switch(protocol){
            case "ws":
            case "wss":
                connection = new websocket(config);
                break;
            default:
                peerWeb.log("cannot determine connection type: "+protocol, "warn");
                break;
        }
    })();
    
    //public
    this.send = function(msg){connection.send(msg);};
};