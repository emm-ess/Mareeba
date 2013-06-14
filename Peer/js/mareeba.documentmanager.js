(function(Mareeba, CryptoJS){
    "use strict";
    Mareeba.namespace("DocumentManager");
    /**
     * Verwaltet im lokalen Knoten gespeicherte Dokumente, sowie die vom Nutzer im Netzwerk abgelegten Dokumente.
     * @author Marten Schälicke
     * @constructor
     * @param {Mareeba.Peer} peer Referenz auf den lokalen Peer
     * @param {Mareeba.Storage} storage Speichermodul von Mareeba
     */
    Mareeba.DocumentManager = (function(config){
        var
        peer, storage,
        docMsgHndl,

        /**
         * nimmt ein Document entgegen und speichert dies lokal sowie im Netzwerk
         * @param {Mareeba.Document} doc zu verwaltendes Dokument
         */
        addOwnDocument = function(doc){
            var data = doc.getDataObject();
            Mareeba.log("should manage new users document with titleID: "+data.titleID, "log");
            docMsgHndl.initValueStore(data);
            storage.saveDocument(data);
        },

        addDocument = function(doc){
            var data = doc.getDataObject();
            storage.saveDocument(data);
        },

        newDocument = function(documentData){
            var document = new Mareeba.Document(documentData);
            addOwnDocument(document);
        },

        getDocument = function(id, callback){
            storage.getDocument(id, function(doc){
                if(doc !== undefined){
                    doc = new Mareeba.Document(doc);
                    callback(doc);
                }
                else {
                    callback(undefined);
                }
            });
        },

        /**
         * initiert die Suche nach einem Dokument mit bestimmter ID.
         * schaut, ob eine lokale Kopie vorhanden ist und schickt andernfalls eine valueLookup-Nachricht
         * @param {String} id ID nach der gesucht wird.
         * @param {Function} callback Methode die bei Fund oder Nichtfund aufgerufen wird.
         */
        searchDocumentByID = function(id, callback){
            getDocument(id, function(doc){
                if(doc !== undefined){
                    callback(doc);
                }
                else{
                    docMsgHndl.initValueLookup(id, callback);
                }
            });
        },

        /**
         * initiert die Suche nach einem Dokument mit bestimmten Titel.
         * bildet die potentielle ID des Artikels, schaut, ob eine lokale Kopie vorhanden ist und schickt andernfalls eine valueLookup-Nachricht
         * @param {String} title Titel nach dem gesucht wird.
         * @param {Function} callback Methode die bei Fund oder Nichtfund aufgerufen wird.
         */
        searchDocument = function(title, callback){
            var potID = CryptoJS.SHA1(title).toString(CryptoJS.enc.Hex);
            searchDocumentByID(potID, callback);
        },

        init = function(config){
            peer = config.peer;
            storage = config.storage;
            docMsgHndl = config.messageHandler.getServiceHandler("public");
            Mareeba.newDocument        = Mareeba.newDocument        || newDocument;
            Mareeba.searchDocument     = Mareeba.searchDocument     || searchDocument;
            Mareeba.searchDocumentByID = Mareeba.searchDocumentByID || searchDocumentByID;
        };

        return {
            "addOwnDocument" : addOwnDocument,
            "addDocument" : addDocument,
            "getDocument" : getDocument,
            "searchDocumentByID" : searchDocumentByID,
            "searchDocument" : searchDocument,
            "init" : init
        };
    }());
}(Mareeba, CryptoJS));