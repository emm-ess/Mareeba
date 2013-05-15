peerWeb.namespace("MessageHandler");
/**
 * Main Class for Handling Messages
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.MessageHandler = function(){
    "use strict";
    var serviceHndl = {}, conMng,
    peerID = peerWeb.Peer.id,
    
    handleMessage = function(msg, con){
        if(!!serviceHndl[msg.head.service]){
            serviceHndl[msg.head.service].handleMessage(msg, con);
        }
        else{
            peerWeb.log("recieved request for unknown service: "+msg.head.service, "warn");
        }
    },
    
    answer = function(msg, con, code){
        msg.head.code = code;
        msg.head.to = msg.head.from;
        msg.head.from = peerID;
        con.sendMsg(msg);
    },
    
    forward = function(msg, con){
        conMng.route(msg);
    },
    
    send = function(msg){
        conMng.send(msg);
    },
    
    setServiceHandler = function(handler, service){
        serviceHndl[service] = handler;
    },
    
    getServiceHandler = function(service){
        return serviceHndl[service];
    },
    
    setConnectionManager = function(tempConMng){
        conMng = tempConMng;
    },
    
    that = {
        "setServiceHandler" : setServiceHandler,
        "getServiceHandler" : getServiceHandler,
        "setConnectionManager" : setConnectionManager,
        "handleMessage" : handleMessage,
        "answer" : answer,
        "forward" : forward,
        "send" : send
    };
    
    return that;
};