(function(Mareeba){
    "use strict";
    Mareeba.namespace("MessageHandler");
    /**
     * main object for handling messages
     * @author Marten Schälicke
     */
    Mareeba.MessageHandler = (function(){
        var serviceHndl = {}, conMng, peerID,
        protocolVersion = "0.1",
        responseCallbacks = {},
        storeMsg, deleteMsg,

        /**
         * checks mandatory fields of messages and creates them if needed.
         * @param {object} msg message to be send
         * @returns {object} verified message
         */
        buildMandatoryFields = function(msg){
            if(msg.head.protocolVersion === undefined){
                msg.head.protocolVersion = protocolVersion;
            }
            if(msg.head.from === undefined){
                msg.head.from = peerID;
            }
            if(msg.head.refCode === undefined){
                msg.head.refCode = Mareeba.getRandomHexNumber(40);
            }
            if(msg.head.date === undefined){
                msg.head.date = new Date().getTime();
            }
            return msg;
        },

        /**
         * forwards messages based on service-field in message header to corresponding message (service) handler
         * @param {object} msg incoming message
         * @param {Mareeba.Connection} con connection which received the message
         */
        handleMessage = function(msg, con){
            if(!!serviceHndl[msg.head.service]){
                serviceHndl[msg.head.service].handleMessage(msg, con);
            }
            else{
                Mareeba.log("recieved message for unknown service: "+msg.head.service, "warn");
            }
        },

        /**
         * answers request by sending them directly back on the incoming connection.
         * @param {object} msg answer
         * @param {Mareeba.Connection} con connection on which message will be send
         * @param {number} code answercode
         * @returns {boolean} could message be send
         */
        answer = function(msg, con, code){
            msg.head.code = code;
            msg.head.to = msg.head.from;
            msg.head.from = peerID;
            msg = buildMandatoryFields(msg);
            return con.send(msg);
        },

        /**
         * forwards message to next peer.
         * @param {object} msg message to be send
         * @returns {boolean} could message be send
         */
        forward = function(msg){
            msg = buildMandatoryFields(msg);
            return conMng.route(msg);
        },

        /**
         * sends message.
         * @param {object} msg message to be send
         * @param {function} [callback] function to be called when response is received
         * @param {Mareeba.Connection} [con] used if message should be send via certain connection
         */
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

        /**
         * register serviceHandler for certain service
         * @param {object} handler handler for messages on this service
         * @param {string} service name of service
         */
        setServiceHandler = function(handler, service){
            serviceHndl[service] = handler;
        },

        /**
         * returns the handler of given servicename
         * @param {string} service servicename
         * @returns {object} servicehandler
         */
        getServiceHandler = function(service){
            return serviceHndl[service];
        },

        /**
         * returns the callback corresponding to given refCode
         * @param {string} refCode referenzcode identifying request message
         * @returns {function} corresponding callback
         */
        getCallback = function(refCode){
            return responseCallbacks[refCode];
        },

        /**
         * deletes a registered callback
         * @param {string} refCode referenzcode identifying request message
         */
        deleteCallback = function(refCode){
            if(typeof(responseCallbacks[refCode]) ===  "function"){
                delete responseCallbacks[refCode];
            }
        },

        /**
         * deletes message
         * @param {string} refCode referenzcode identifying message
         */
        deleteMessage = function(refCode){
        	deleteCallback(refCode);
            deleteMsg(refCode);
        },

        /**
         * initializes message handler
         * @param {object} config configurationobject
         */
        init = function(config){
            peerID = config.peer.id;
            conMng = config.connectionManager || Mareeba.ConnectionManager;
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
}(Mareeba));
