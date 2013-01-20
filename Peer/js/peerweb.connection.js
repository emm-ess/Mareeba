/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Connection");
peerWeb.Connection = function(conManager, config){
    "use strict";
    var that = this, connection, description, numID,
    sendDescription;  
    
    sendDescription = function(){
        var descriptionMsg = {
            head: {
                "service": "network",
                "action": "peerDescription"
            },
            body: {
                "peerDescription": conManager.peerDescription
            }
        };
        that.sendRequest(descriptionMsg);
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
            conManager.connectionClosed();
        };
        
        config.onmessage = function(msg){
            peerWeb.log("Message recieved: "+msg.data, "log");
            msg = JSON.parse(msg.data);
            conManager.handleMessage(msg, that);
        };
        
        config.onopen = function(msg){
            peerWeb.log(msg, "log");
            sendDescription();
        };
        
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
        if(msg.head.protocolVersion === undefined){
            msg.head.protocolVersion = this.protocolVersion;
        }
        if(msg.head.from === undefined){
            msg.head.from = conManager.peerDescription.ID;
        }
        if(msg.head.refCode === undefined){
            refCode = peerWeb.getRandomHexNumber(40);
            msg.head.refCode = refCode;
        }
        if(msg.head.date === undefined){
            msg.head.date = new Date().getTime();
        }
        msg = JSON.stringify(msg);
        peerWeb.log("Message send: "+msg, "log");
        connection.send(msg);
        if(refCode === undefined){
            config.storeMessage(refCode, msg);
        }
    };
    
    this.sendRequest = function(msg){
        that.send(msg);
    };
    
    //public
    this.sendResponse = function(msg){
        that.send(msg);
    };
    
    this.getReadyState = function(){
        return connection.getReadyState();
    };
    
    this.setDescription = function(desc, numID){
        description = desc;
        if(numID === "undefined"){
            numID = BigInteger.parse(desc.ID, 16);
        }
    };
    this.getDescription = function(){
        return description;
    };
    this.getNumID = function(){
        return numID;
    };
};
peerWeb.Connection.prototype.protocolVersion = "0.1";
