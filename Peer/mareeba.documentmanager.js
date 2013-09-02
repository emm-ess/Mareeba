(function(Mareeba, CryptoJS){
    "use strict";
    Mareeba.namespace("DocumentManager");
    /**
     * Manages documents stored at local peer and answers requests regarding documents of user and other peers.
     * @namespace Mareeba.DocumentManager
     * @type {Mareeba.DocumentManager}
     */
    Mareeba.DocumentManager = (function(){
        var
        /**
         * @memberOf Mareeba.DocumentManager~
         * @type {Mareeba.Peer} */ 
        peer,
        
        /**
         * @memberOf Mareeba.DocumentManager~
         * @type {Mareeba.Storage} */ 
        storage,
        
        /**
         * @memberOf Mareeba.DocumentManager~
         * @type {Mareeba.MessageHandler.Public} */ 
        docMsgHndl,

        /**
         * saves document locally and in network.
         * @param {Mareeba.Document} doc document to be saved
         * @memberOf Mareeba.DocumentManager 
         */
        addOwnDocument = function(doc){
            var data = doc.getDataObject();
            Mareeba.log("should manage new users document with titleID: "+data.titleID, "log");
            docMsgHndl.initValueStore(data);
            storage.saveDocument(data);
        },

        /**
         * saves document locally
         * @param {Mareeba.Document} doc document to be saved
         * @memberOf Mareeba.DocumentManager 
         */
        addDocument = function(doc){
            var data = doc.getDataObject();
            storage.saveDocument(data);
        },

        /**
         * creates new document and saves it locally and in network.
         * @param {Object} documentData new document's data
         * @memberOf Mareeba.DocumentManager 
         */
        newDocument = function(documentData){
            var document = new Mareeba.Document(documentData);
            addOwnDocument(document);
        },

        /**
         * returns document for given id to the given callback
         * @param {Mareeba.ID} id ID of document
         * @param {getDocCallback} callback function for getting result
         * @memberOf Mareeba.DocumentManager 
         */
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
         * looks for document (ID given) locally and in the network.
         * @param {Mareeba.ID} id ID of document
         * @param {getDocCallback} callback function for getting result
         * @memberOf Mareeba.DocumentManager 
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
         * looks for a document (title given) locally and in the network
         * @param {String} title title of document
         * @param {getDocCallback} callback function for getting result
         * @memberOf Mareeba.DocumentManager 
         */
        searchDocument = function(title, callback){
            var potID = CryptoJS.SHA1(title).toString(CryptoJS.enc.Hex);
            searchDocumentByID(potID, callback);
        },

        /**
         * Callback for requested documents
         * @callback getDocCallback
         * @param {?Mareeba.Document} requested document
         * @memberOf Mareeba.DocumentManager 
         */

        /**
         * initialzes document manager
         * @param {Object} config configurationobject
         * @memberOf Mareeba.DocumentManager 
         */
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