(function(Mareeba){
    "use strict";
    Mareeba.namespace("MessageHandler.Public");
    /**
     * Wrapper für WebRTC basierte p2p-Verbindungen
     * @author Marten Schälicke
     */
    Mareeba.MessageHandler.Public = (function(){
        var
        docMng, netMsgHndl, msgHndl, peerID,

        /**
         * löst einen nodeLookupvorgang aus, dem sich ein valueStore anschließt.
         * Speichert somit ein Datum im Netzwerk.
         * @param {Object} doc das zu speichernde Dokument
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

        valueStoreRequest = function(msg, con){
            Mareeba.log("recieved valueStore Request Message", "log");
            var doc = JSON.parse(msg.body);
            doc = new Mareeba.Document(doc);
            docMng.adddDocument(doc);
            msg.body = "";
            msgHndl.answer(msg, con);
        },

        valueStoreResponse = function(msg, con){
            Mareeba.log("recieved valueStore Response Message", "log");
            msgHndl.deleteMessage(msg.head.refCode);
        },

        /**
         * verarbeitet valueStore-Nachrichten,
         * speichert deren Body in der Datenbank
         * @param {Object} msg eingegangene Nachricht
         * @param {Mareeba.Connection} con Verbindung über die diese geschickt wurde
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
         * sucht die übergebene ID im Netzwerk, ruft den callback auf, wenn gefunden (mit document) oder nicht (mit undefined).
         * @param {String} id
         * @param {Function} callback
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
         * verarbeitet valueLookup-Nachrichten
         * antwortet mit 200 und dem dokument im body, falls dies vorhanden ist; sonst mit 404
         * @param {Object} msg eingegangene Nachricht
         * @param {Mareeba.Connection} con Verbindung über die diese geschickt wurde
         */
        valueLookup = function(msg, con){
            if(msg.head.code === undefined){
                valueLookupRequest(msg, con);
            }
            else{
                valueLookupResponse(msg, con);
            }
        },

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
