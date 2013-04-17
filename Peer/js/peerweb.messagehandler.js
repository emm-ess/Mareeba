peerWeb.namespace("MessageHandler");
/**
 * Wrapper für WebRTC basierte p2p-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.MessageHandler = function(config){
    "use strict";
    var netMsgHndl = config.networkMessageHandler,
    pubMsgHndl = config.publicMessageHandler;
    
    this.handleMessage = function(msg, con){
        switch(msg.head.service){
            case "network": netMsgHndl.handleMessage(msg, con);
            break;
            case "public": pubMsgHndl.handleMessage(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved request for unknown service: "+msg.head.service, "warn");
            break;
        }
    };
};