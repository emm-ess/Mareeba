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
    };
};