peerWeb.namespace("MessageHandler");
/**
 * Main Class for Handling Messages
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.MessageHandler = function(config){
    "use strict";
    var serviceHndl = {}, conMng,
    peerID = peerWeb.Peer.id,
    protocolVersion = "0.1",
    responseCallbacks = {},
    storeMsg = config.storeMessage,
    
    
    /*
    handleResponse = function(msg, con){
        var refCode = msg.head.refCode;
        if(typeof(responseCallbacks[refCode]) ===  "function"){
            responseCallbacks[refCode](msg, con);
            responseCallbacks[refCode] = undefined;
        }
    };*/
    /**
     * prüft eine Nachricht auf erforderliche Felder und setzt diese bei Fehlen
     * @param {Object} msg zu verschickende Nachricht
     * @param {Function} callback Funktion, die bei Antwort aufgerufen werden soll
     */
    buildMandatoryFields = function(msg, that){
        if(msg.head.protocolVersion === undefined){
            msg.head.protocolVersion = protocolVersion;
        }
        if(msg.head.from === undefined){
            msg.head.from = peerID;
        }
        if(msg.head.refCode === undefined){
            msg.head.refCode = peerWeb.getRandomHexNumber(40);
        }
        if(msg.head.date === undefined){
            msg.head.date = new Date().getTime();
        }
        return msg;
    },
    
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
        msg = buildMandatoryFields(msg);
        con.send(msg);
    },
    
    forward = function(msg){
        msg = buildMandatoryFields(msg);
        conMng.route(msg);
    },
    
    send = function(msg, callback, con){
        var save, refCode;
        save = msg.head.refCode === undefined;
        msg = buildMandatoryFields(msg);
        refCode = msg.head.refCode;
        if(con !== undefined){
            con.send(msg);
        }
        else{
            conMng.send(msg);
        }
        if(save){
            storeMsg(refCode, msg);
        }
        if(callback !== undefined){
            responseCallbacks[refCode] = callback;
        }
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