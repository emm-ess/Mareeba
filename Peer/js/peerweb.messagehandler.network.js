peerWeb.namespace("MessageHandler.Network");
/**
 * Wrapper für WebRTC basierte p2p-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.MessageHandler.Network = function(config){
    "use strict";
    
    /**
     * leitet die Nachricht an die entsprechende Methode weiter.
     * verwendet dafür das "action"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    this.handleMessage = function(msg, con){
        switch(msg.head.action){
            case "peerDescription":
                peerDescription(msg, con);
            break;
            case "nodeLookup":
                nodeLookup(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved Message for unknown action of network service: "+msg.head.action, "warn");
            break;
        }
    };
};