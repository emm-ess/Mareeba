/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Connection");
peerWeb.Connection = function(config){
    "use strict";
    var that = this, connection,
    sendIdentityMessage;  
    
    sendIdentityMessage = function(){
        var identityMessage = {
            head: {
                "service": "network",
                "action": "peerIdentity"
            },
            body: {}
        };
        that.sendRequest(identityMessage);
    };
    
    
    //init-code
    (function(){
        var protocol;
        if(config === null || config === undefined){
            throw {
                name: "Error",
                message: "no config Element"
            };
        }
        config.onerror = function(err){peerWeb.log(err, "error");};
        
        config.onclose = function(msg){
            peerWeb.log(msg, "log");
            config.conManager.connectionClosed();
        };
        
        config.onmessage = function(msg){
            peerWeb.log("Message recieved: "+msg.data, "log");
            msg = JSON.parse(msg.data);
            if(msg.head.code !== undefined){
                //response
                config.conManager.handleResponse(msg, that);
            }
            else {
                config.conManager.handleRequest(msg, that);
            }
        };
        
        config.onopen = function(msg){
            peerWeb.log(msg, "log");
            sendIdentityMessage();
        };
        
        peerWeb.Connection.prototype.ownPeerID = config.ownPeerID;
        protocol = config.connectTo.split(":")[0];
        switch(protocol){
            case "ws":
            case "wss":
                connection = new peerWeb.Connection.WebSocket(config);
                break;
            default:
                peerWeb.log("cannot determine connection type: "+protocol, "warn");
                break;
        }
    })();
    
    //public
    this.sendRequest = function(msg){
        var refCode = peerWeb.getRandomHexNumber(40);
        if(typeof msg === String){
            msg = JSON.parse(msg);
        }
        msg.head.protocolVersion = this.protocolVersion;
        msg.head.from = this.ownPeerID;
        msg.head.refCode = refCode;
        msg.head.date = new Date().getTime();
        msg = JSON.stringify(msg);
        peerWeb.log("Request send: "+msg, "log");
        connection.send(msg);
        config.storeMessage(refCode, msg);
    };
    
    //public
    this.sendResponse = function(msg){
        if(typeof msg === String){
            msg = JSON.parse(msg);
        }
        if(msg.head.from !== undefined){
            msg.head.to = msg.head.from;
        }
        msg.head.protocolVersion = this.protocolVersion;
        msg.head.from = this.ownPeerID;
        msg.head.date = new Date().getTime();
        msg = JSON.stringify(msg);
        peerWeb.log("Response send send: "+msg, "log");
        connection.send(msg);
    };
    
    this.sendNodeLookup = function(lookupID){
        var lookupMessage = {
            head: {
                "service": "network",
                "action": "nodeLookup"
            },
            body: {
                "id": lookupID
            }
        };
        that.sendRequest(lookupMessage);
    };
    
    this.getReadyState = function(){
        return connection.getReadyState();
    };
    
    this.getDescription = function(){
        return connection.getDescription();
    };
};
peerWeb.Connection.prototype.protocolVersion = "0.1";
