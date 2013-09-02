(function(Mareeba){
    "use strict";
    Mareeba.namespace("MessageHandler.Public");
    /**
     * message handler for public service.
     * handles messages of/for document manager (sending, receiving documents)
     * @namespace Mareeba.MessageHandler.Public
     * @type {Mareeba.MessageHandler}
     */
    Mareeba.MessageHandler.Public = (function(){
        var
        /**
         * @type {Mareeba.DocumentManager}
         * @memberOf Mareeba.MessageHandler.Public~ */
        docMng, 
        
        /**
         * @type {Mareeba.MessageHandler.Network}
         * @memberOf Mareeba.MessageHandler.Public~ */
        netMsgHndl, 
        
        /**
         * @type {Mareeba.MessageHandler}
         * @memberOf Mareeba.MessageHandler.Public~ */
        msgHndl, 
        
        /**
         * @type {Mareeba.ID}
         * @memberOf Mareeba.MessageHandler.Public~ */
        peerID,

        /**
         * stores documents in network
         * @param {Object} doc document to be saved
         * @memberOf Mareeba.MessageHandler.Public
         */
        initValueStore = function(doc){
            var nodeLookupCallback = function(msg){
                var storeMsg = {
                    "head" : {
                        "service": "public",
                        "action": "valueStore"
                    },
                    "body": doc
                };
                Mareeba.log("Store Document with titleID: "+doc.titleID+" on "+msg.body.resultList.length+" peers", "log");
                msg.body.resultList.forEach(function(element){
                    storeMsg.head.to = element.id;
                    msgHndl.send(storeMsg);
                });
            };
            netMsgHndl.initNodeLookup(doc.titleID, nodeLookupCallback);
        },

        /**
         * handles valueStore requests
         * @param {Mareeba.PublicMessage} msg valueStore request
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public~
         */
        valueStoreRequest = function(msg, con){
            Mareeba.log("recieved valueStore Request Message", "log");
            var doc = new Mareeba.Document(msg.body);
            docMng.adddDocument(doc);
            msg.body = "";
            msgHndl.answer(msg, con);
        },

        /**
         * handles valueStores reponses
         * @param {Mareeba.PublicMessage} msg valueStore response
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public~
         */
        valueStoreResponse = function(msg, con){
            Mareeba.log("recieved valueStore Response Message", "log");
            msgHndl.deleteMessage(msg.head.refCode);
        },

        /**
         * handles valueStore messages.
         * decides whether local peer is responsible or is to forward
         * @param {Mareeba.PublicMessage} msg valueStore message
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public~
         */
        valueStore = function(msg, con){
            if(msg.head.to === peerID){
                if(msg.head.code === undefined){
                    valueStoreRequest(msg, con);
                }
                else{
                    valueStoreResponse(msg, con);
                }
            }
            else{
                msgHndl.forward(msg);
            }
        },

        /**
         * searches for a given ID in the network. If not found calls the callback with undefined.
         * @param {String} id ID of document to look for
         * @param {Function} callback
         * @memberOf Mareeba.MessageHandler.Public
         */
        initValueLookup = function(id, callback){
            var msg = {
                head: {
                    "to": id,
                    "service": "public",
                    "action": "valueLookup"
                },
                body: {
                    "id" : id
                }
            };
            Mareeba.log("Search Document with ID: "+id+" in Network.", "log");
            msgHndl.send(msg, callback);
        },

        /**
         * handles valueLookup requests
         * @param {Mareeba.PublicMessage} msg valueLookup request
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public~
         */
        valueLookupRequest = function(msg, con){
            Mareeba.log("recieved valueLookup Request Message", "log");
            var storageResult = function(doc){
                if(doc === undefined){
                    msgHndl.answer(msg, con, 404);
                }
                else {
                    msg.body = doc;
                    msgHndl.answer(msg, con, 200);
                }
            };
            docMng.getDocument(msg.body.id, storageResult);
        },

        /**
         * handles valueLookup responses
         * @param {Mareeba.PublicMessage} msg valueLookup response
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public~
         */
        valueLookupResponse = function(msg, con){
            Mareeba.log("recieved valueLookup Response Message", "log");
            var refCode = msg.head.refCode, doc,
            callback = msgHndl.getCallback(refCode);
            if(msg.head.code === 200){
                doc = new Mareeba.Document(msg.body);
                callback(doc);
            }
            else{
                callback(undefined);
            }
            msgHndl.deleteMessage(refCode);
            msgHndl.deleteCallback(refCode);
        },

        /**
         * handles valueLookup messages.
         * @param {Mareeba.PublicMessage} valueLookup message
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public~
         */
        valueLookup = function(msg, con){
            if(msg.head.code === undefined){
                valueLookupRequest(msg, con);
            }
            else{
                valueLookupResponse(msg, con);
            }
        },

        /**
         * forwards message to the corresponding handler method based on action-field in message header
         * @param {Mareeba.PublicMessage} msg received public service message
         * @param {Mareeba.Connection} con connection via which the message was received
         * @memberOf Mareeba.MessageHandler.Public
         */
        handleMessage = function(msg, con){
            switch(msg.head.action){
                case "valueStore":
                    valueStore(msg, con);
                break;
                case "valueLookup":
                    valueLookup(msg, con);
                break;
                default:
                    //unknown or unimplemented message. log those to determine if it is an attack
                    Mareeba.log("recieved Message for unknown action of public service: "+msg.head.action, "warn");
                break;
            }
        },

        /**
         * initializes the public message handler
         * @param {Object} config configurationobject
         * @memberOf Mareeba.MessageHandler.Public
         */
        init = function(config){
            peerID = config.peer.id;
            docMng = config.documentManager || Mareeba.DocumentManager;
            msgHndl = config.messageHandler || Mareeba.MessageHandler;
            msgHndl.setServiceHandler(Mareeba.MessageHandler.Public, "public");
            netMsgHndl = msgHndl.getServiceHandler("network");
        };

        return {
            "initValueStore" : initValueStore,
            "initValueLookup" : initValueLookup,
            "handleMessage" : handleMessage,
            "init" : init
        };
    }());
}(Mareeba));
