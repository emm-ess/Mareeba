(function(peerWeb){
    "use strict";
    peerWeb.namespace("DocumentManager");
    /**
     * Verwaltet im lokalen Knoten gespeicherte Dokumente, sowie die vom Nutzer im Netzwerk abgelegten Dokumente.
     * @author Marten Schälicke
     * @constructor
     * @param {peerWeb.Peer} peer Referenz auf den lokalen Peer
     * @param {peerWeb.Storage} storage Speichermodul von peerWeb
     */
    peerWeb.DocumentManager = function(config){
        var that = this,
        peer = peerWeb.peer, storage = config.storage,
        docMsgHndl;
        
        /**
         * nimmt ein Document entgegen und speichert dies lokal sowie im Netzwerk
         * @param {peerWeb.Document} doc zu verwaltendes Dokument
         */
        this.addOwnDocument = function(doc){
            var data = doc.getDataObject();
            peerWeb.log("should manage new users document with titleID: "+data.titleID, "log");
            docMsgHndl.initValueStore(data);
            storage.saveDocument(data);
        };
        
        this.addDocument = function(doc){
            var data = doc.getDataObject();
            storage.saveDocument(data);
        };
        
        this.getDocument = function(id, callback){
            storage.getDocument(id, function(doc){
                if(doc !== undefined){
                    doc = new peerWeb.Document(doc);
                    callback(doc);
                }
                else {
                    callback(undefined);
                }
            });
        };
        
        /**
         * initiert die Suche nach einem Dokument mit bestimmten Titel. 
         * bildet die potentielle ID des Artikels, schaut, ob eine lokale Kopie vorhanden ist und schickt andernfalls eine valueLookup-Nachricht
         * @param {String} title Titel nach dem gesucht wird.
         * @param {Function} callback Methode die bei Fund oder Nichtfund aufgerufen wird.
         */
        this.searchDocument = function(title, callback){
            var potID = CryptoJS.SHA1(title).toString(CryptoJS.enc.Hex);
            that.searchDocumentByID(potID, callback);
        };
        
        /**
         * initiert die Suche nach einem Dokument mit bestimmter ID. 
         * schaut, ob eine lokale Kopie vorhanden ist und schickt andernfalls eine valueLookup-Nachricht
         * @param {String} id ID nach der gesucht wird.
         * @param {Function} callback Methode die bei Fund oder Nichtfund aufgerufen wird.
         */
        this.searchDocumentByID = function(id, callback){
            that.getDocument(id, function(doc){
                if(doc !== undefined){
                    callback(doc);
                }
                else{
                    docMsgHndl.initValueLookup(id, callback);
                }
            });
        };
        
        (function(){
            docMsgHndl = config.messageHandler.getServiceHandler("public");
            docMsgHndl.setDocumentManager(that);
        })();
    };
})(peerWeb);
