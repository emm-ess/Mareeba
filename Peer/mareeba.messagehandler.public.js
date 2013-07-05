(function(Mareeba){
    "use strict";
    Mareeba.namespace("MessageHandler.Public");
    /**
     * message handler for public service.
     * handles messages of/for document manager (sending, receiving documents)
     * @author Marten Schälicke
     */
    Mareeba.MessageHandler.Public = (function(){
        var
        docMng, netMsgHndl, msgHndl, peerID,

        /**
         * stores documents in network
         * @param {object} doc document to be saved
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
         * @param {object} msg valueStore request
         * @param {Mareeba.Connection} con connection via which the message was received
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
         * @param {object} msg valueStore response
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        valueStoreResponse = function(msg, con){
            Mareeba.log("recieved valueStore Response Message", "log");
            msgHndl.deleteMessage(msg.head.refCode);
        },

        /**
         * handles valueStore messages.
         * decides whether local peer is responsible or is to forward
         * @param {object} msg valueStore message
         * @param {Mareeba.Connection} con connection via which the message was received
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
         * @param {string} id ID of document to look for
         * @param {function} callback
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
         * @param {object} msg valueLookup request
         * @param {Mareeba.Connection} con connection via which the message was received
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
         * @param {object} msg valueLookup response
         * @param {Mareeba.Connection} con connection via which the message was received
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
         * @param {object} valueLookup message
         * @param {Mareeba.Connection} con connection via which the message was received
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
         * @param {object} msg received public service message
         * @param {Mareeba.Connection} con connection via which the message was received
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
         * @param {object} config configurationobject
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
