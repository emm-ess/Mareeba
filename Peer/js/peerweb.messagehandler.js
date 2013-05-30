(function(peerWeb){
    "use strict";
    peerWeb.namespace("MessageHandler");
    /**
     * Main Class for Handling Messages
     * @author Marten Schälicke
     */
    peerWeb.MessageHandler = (function(){
        var serviceHndl = {}, conMng, peerID,
        protocolVersion = "0.1",
        responseCallbacks = {},
        storeMsg, deleteMsg,

        /**
         * prüft eine Nachricht auf erforderliche Felder und setzt diese bei Fehlen
         * @param {Object} msg zu verschickende Nachricht
         * @param {Function} callback Funktion, die bei Antwort aufgerufen werden soll
         */
        buildMandatoryFields = function(msg){
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
                peerWeb.log("recieved message for unknown service: "+msg.head.service, "warn");
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
            if(typeof callback === "function"){
                responseCallbacks[refCode] = callback;
            }
        },

        setServiceHandler = function(handler, service){
            serviceHndl[service] = handler;
        },

        getServiceHandler = function(service){
            return serviceHndl[service];
        },

        getCallback = function(refCode){
            return responseCallbacks[refCode];
        },

        deleteCallback = function(refCode){
            if(typeof(responseCallbacks[refCode]) ===  "function"){
                delete responseCallbacks[refCode];
            }
        },

        deleteMessage = function(refCode){
            deleteMsg(refCode);
        },

        init = function(config){
            peerID = config.peer.id;
            conMng = config.connectionManager || peerWeb.ConnectionManager;
            storeMsg = config.storeMessage;
            deleteMsg = config.deleteMessage;
        };

        return {
            "setServiceHandler" : setServiceHandler,
            "getServiceHandler" : getServiceHandler,
            "handleMessage" : handleMessage,
            "answer" : answer,
            "forward" : forward,
            "send" : send,
            "deleteMessage" : deleteMessage,
            "getCallback" : getCallback,
            "deleteCallback" : deleteCallback,
            "init": init
        };
    }());
}(peerWeb));
