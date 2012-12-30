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
        that.send(identityMessage);
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
                config.conManager.handleResponse(msg);
            }
            else {
                config.conManager.handleRequest(msg);
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
    this.send = function(msg){
        var refCode;
        if(typeof msg === String){
            msg = JSON.parse(msg);
        }
        msg.head.protocolVersion = this.protocolVersion;
        msg.head.from = this.ownPeerID;
        if(msg.head.code === undefined){
            refCode = peerWeb.getRandomHexNumber(40);
            msg.head.refCode = refCode;
        }
        msg.head.date = new Date().getTime();
        msg = JSON.stringify(msg);
        peerWeb.log("msg send: "+msg, "log");
        connection.send(msg);
        if(refCode !== undefined){
            config.storeMessage(refCode, msg);
        }
    };
    
    this.getReadyState = function(){
        return connection.getReadyState();
    };
};
peerWeb.Connection.prototype.protocolVersion = "0.1";
