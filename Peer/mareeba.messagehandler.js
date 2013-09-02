(function(Mareeba){
    "use strict";
    Mareeba.namespace("MessageHandler");
    /**
     * main object for handling messages
     * @namespace Mareeba.MessageHandler
     * @type {Mareeba.MessageHandler}
     */
    Mareeba.MessageHandler = (function(){
        var 
        /**
         * @type {Object}
         * @memberOf Mareeba.MessageHandler~ */
        serviceHndl = {}, 
        
        /**
         * @type {Mareeba.ConnectionManager}
         * @memberOf Mareeba.MessageHandler~ */
        conMng, 
        
        /**
         * @type {Mareeba.ID}
         * @memberOf Mareeba.MessageHandler~ */
        peerID,
        
        /**
         * @type {String}
         * @memberOf Mareeba.MessageHandler~ */
        protocolVersion = "0.1",
        
        /**
         * @type {Object}
         * @memberOf Mareeba.MessageHandler~ */
        responseCallbacks = {},
        
        /**
         * @type {Function}
         * @memberOf Mareeba.MessageHandler~ */
        storeMsg, 
        
        /**
         * @type {Function}
         * @memberOf Mareeba.MessageHandler~ */
        deleteMsg,

        /**
         * checks mandatory fields of messages and creates them if needed.
         * @param {Mareeba.Message} msg message to be send
         * @returns {Mareeba.Message} verified message
         * @memberOf Mareeba.MessageHandler~
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
         * @param {Mareeba.Message} msg incoming message
         * @param {Mareeba.Connection} con connection which received the message
         * @memberOf Mareeba.MessageHandler
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
         * @param {Mareeba.Message} msg answer
         * @param {Mareeba.Connection} con connection on which message will be send
         * @param {Number} code answercode
         * @returns {Boolean} could message be send
         * @memberOf Mareeba.MessageHandler
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
         * @param {Mareeba.Message} msg message to be send
         * @returns {Boolean} could message be send
         * @memberOf Mareeba.MessageHandler
         */
        forward = function(msg){
            msg = buildMandatoryFields(msg);
            return conMng.route(msg);
        },

        /**
         * sends message.
         * @param {Mareeba.Message} msg message to be send
         * @param {Function} [callback] function to be called when response is received
         * @param {Mareeba.Connection} [con] used if message should be send via certain connection
         * @memberOf Mareeba.MessageHandler
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
         * @param {Mareeba.MessageHandler} handler handler for messages on this service
         * @param {String} service name of service
         * @memberOf Mareeba.MessageHandler
         */
        setServiceHandler = function(handler, service){
            serviceHndl[service] = handler;
        },

        /**
         * returns the handler of given servicename
         * @param {String} service servicename
         * @returns {Mareeba.MessageHandler} servicehandler
         * @memberOf Mareeba.MessageHandler
         */
        getServiceHandler = function(service){
            return serviceHndl[service];
        },

        /**
         * returns the callback corresponding to given refCode
         * @param {String} refCode referencecode identifying request message
         * @returns {Function} corresponding callback
         * @memberOf Mareeba.MessageHandler
         */
        getCallback = function(refCode){
            return responseCallbacks[refCode];
        },

        /**
         * deletes a registered callback
         * @param {String} refCode referenxwcode identifying request message 
         * @memberOf Mareeba.MessageHandler
         */
        deleteCallback = function(refCode){
            if(typeof(responseCallbacks[refCode]) ===  "function"){
                delete responseCallbacks[refCode];
            }
        },

        /**
         * deletes message
         * @param {String} refCode referenxwcode identifying message
         * @memberOf Mareeba.MessageHandler
         */
        deleteMessage = function(refCode){
            deleteCallback(refCode);
            deleteMsg(refCode);
        },

        /**
         * initializes message handler
         * @param {Object} config configurationobject
         * @memberOf Mareeba.MessageHandler
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
