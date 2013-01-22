peerWeb.namespace("DocumentManager");
/**
 * Verwaltet im lokalen Knoten gespeicherte Dokumente, sowie die vom Nutzer im Netzwerk abgelegten Dokumente.
 * @author Marten Schälicke
 * @constructor
 * @param {peerWeb.Peer} peer Referenz auf den lokalen Peer
 * @param {peerWeb.Storage} storage Speichermodul von peerWeb
 */
peerWeb.DocumentManager = function(peer, storage){
    "use strict";
    var that = this;
    
    /**
     * nimmt ein Document entgegen und speichert dies lokal sowie im Netzwerk
     * @param {peerWeb.Document} doc zu verwaltendes Dokument
     */
    this.registerOwnDocument = function(doc){
        var data = doc.getDataObject();
        peerWeb.log("should manage new users document with titleID: "+data.titleID, "log");
        peer.storeInNetwork(data);
        storage.saveDocument(data);
    };
    
    /**
     * initiert die Suche nach einem Dokument mit bestimmten Titel. 
     * bildet die potentielle ID des Artikels, schaut, ob eine lokale Kopie vorhanden ist und schickt andernfalls eine valueLookup-Nachricht
     * @param {String} title Titel nach dem gesucht wird.
     * @param {Function} callback Methode die bei Fund oder Nichtfund aufgerufen wird.
     */
    this.searchArticle = function(title, callback){
        var potID = CryptoJS.SHA1(title).toString(CryptoJS.enc.Hex);
        that.searchArticleByID(potID, callback);
    };
    
    /**
     * initiert die Suche nach einem Dokument mit bestimmter ID. 
     * schaut, ob eine lokale Kopie vorhanden ist und schickt andernfalls eine valueLookup-Nachricht
     * @param {String} id ID nach der gesucht wird.
     * @param {Function} callback Methode die bei Fund oder Nichtfund aufgerufen wird.
     */
    this.searchArticleByID = function(id, callback){
        var networkResult = function(doc){
            if(doc !== undefined){
                storage.saveDocument(doc);
                doc = new peerWeb.Document(doc);
            }
            callback(doc);
        },
        storageResult = function(doc){
            if(doc !== undefined){
                doc = new peerWeb.Document(doc);
                callback(doc);
            }
            else {
                peer.searchInNetwork(id, networkResult);
            }
        };
        storage.getDocument(id, storageResult);
    };
};