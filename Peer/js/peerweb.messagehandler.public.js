peerWeb.namespace("MessageHandler.Public");
/**
 * Wrapper für WebRTC basierte p2p-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.MessageHandler.Public = function(config){
    "use strict";
    var
    docMng, netMsgHndl,
    msgHndl = config.messageHandler,
    peerID = peerWeb.Peer.id,
    
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
            peerWeb.log("Store Document with titleID: "+doc.titleID+" on "+msg.body.resultList.length+" peers", "log");
            msg.body.resultList.forEach(function(element){
                storeMsg.head.to = element.id;
                msgHndl.send(storeMsg);
            });
        };
        netMsgHndl.nodeLookup(doc.titleID, nodeLookupCallback);
    },
    
    /**
     * verarbeitet valueStore-Nachrichten,
     * speichert deren Body in der Datenbank
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    valueStore = function(msg, con){
        if(msg.head.to === peerID){
            var doc = JSON.parse(msg.body);
            doc = new peerWeb.Document(doc);
            docMng.adddDocument(doc);
            msg.body = "";
            msgHndl.answer(msg, con);
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
        var valueLookupCallback = function(msg){
            if(msg.head.code !== 200){
                callback(undefined);
            }
            else{
                callback(msg.body);
            }
        },
        msg = {
            head: {
                "to": id,
                "service": "public",
                "action": "valueLookup"
            },
            body: {
                "id" : id
            }
        };
        peerWeb.log("Search Document with ID: "+id+" in Network.", "log");
        msgHndl.send(msg, valueLookupCallback);
    },
    
    /**
     * verarbeitet valueLookup-Nachrichten
     * antwortet mit 200 und dem dokument im body, falls dies vorhanden ist; sonst mit 404
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    valueLookup = function(msg, con){
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
                peerWeb.log("recieved Message for unknown action of public service: "+msg.head.action, "warn");
            break;
        }
    },
    
    setDocumentManager = function(tempDocMng){
        docMng = tempDocMng;
    },
    
    that = {
        "setDocumentManager" : setDocumentManager,
        "initValueStore" : initValueStore,
        "initValueLookup" : initValueLookup,
        "handleMessage" : handleMessage
    };
    
    (function(){
        msgHndl.setServiceHandler(that, "public");
        netMsgHndl = msgHndl.getServiceHandler("network");
    })();
    
    return that;
};