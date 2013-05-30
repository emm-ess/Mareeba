(function(peerWeb, $, BigInteger){
    "use strict";
    peerWeb.namespace("Peer");
    /**
     * Hauptklasse von peerWeb.
     * Diese implementiert den lokalen Peer und steuert übergreifende Logik.
     * Als Singleton implementiert, so dass sich nur ein Peer pro BrowserTab erzeugen lässt.
     * @author Marten Schälicke
     * @constructor
     */
    peerWeb.Peer = function(config){
        var conMng, docMng, storage, peer = this, gui,
        //private Methods
        generateID;

        /**
         * Dient der Erzeugung und Speicherung der PeerID.
         * Versucht die ID über random.org zu Erzeugen, andernfalls wird die Methode "getRandomHexNumber" der peerWeb Bibliothek verwendet.
         * @param {Function} callback die zum Ende des Vorgangs aufzurufende Methode
         */
        generateID = function(callback){
            var getIDFromRandomOrg, chooseRandomID, setID;

            /**
             * Fragt 20 Bytes von dem Dienst random.org per AJAX ab und nutzt diese als PeerID
             */
            getIDFromRandomOrg = function(){
                $.ajax({
                    "url": "http://www.random.org/integers/?num=20&min=0&max=255&col=1&base=16&format=plain&rnd=new",
                    "success": function(data){
                        var id = data.replace(/\s/g, "");
                        setID(id);
                    },
                    "error": chooseRandomID
                });
            };

            /**
             * Erzeugt die ID mittels der peerWeb-Bibliothek.
             */
            chooseRandomID = function(){
                var id = peerWeb.getRandomHexNumber(40);
                setID(id);
            };

            /**
             * Speichert die erzeugte PeerID und ruft den Callback auf.
             * @param {String} id die erzeugte PeerID
             */
            setID = function(id){
                peerWeb.log("Peer ID is set to: "+id, "info");
                peer.id = id;
                storage.setPeerID(id);
                callback();
            };

            //check Quota of current IP at random.org
            $.ajax({
                "url": "http://www.random.org/quota/?format=plain",
                "success": function(data){
                    var quota = parseInt(data, 10);
                    peerWeb.log("Random.org Quota is: "+quota, "info");
                    if(quota >= 0){
                        getIDFromRandomOrg();
                    }
                    else{
                        chooseRandomID();
                    }
                },
                "error": chooseRandomID
            });
        };


        /**
         * Initierungscode
         *
         * prüft die Mindestanforderungen an den Browser und erzeugt alle nötigen Objekte.
         */
        (function(){
            var
            usable, supportFor = peerWeb.supportFor,

            setGUICallbacks = function(){
                var guiConfig = {};
                guiConfig.newDocument = function(documentData){
                    var document = new peerWeb.Document(documentData);
                    docMng.addOwnDocument(document);
                };
                guiConfig.documentSearch = docMng.searchDocument;
                guiConfig.documentSearchByID = docMng.searchDocumentByID;
                guiConfig.getAllIndexEntries = storage.getAllIndexEntries;
                gui.setConfig(guiConfig);
            },

            continueInit = function(){
                if(storage.isUsable() && peer.id !== null){
                    peer.numID = BigInteger.parse(peer.id, 16);

                    config.messageHandler.init({"peer": peer, "storeMessage" : function(refCode, msg){storage.storeMessage(refCode, msg);},
                    "deleteMessage" : function(refCode){return storage.deleteMessage(refCode);}});
                    config.networkMessageHandler.init(config);
                    config.publicMessageHandler.init(config);
                    config.connectionManager.init({"peer": peer, "storage": storage, "messageHandler": config.messageHandler, "onConnectivityChange": gui.updateConnectivityInfo});
                    config.documentManager.init(config);

                    peerWeb.log("Waiting for Connections.", "info");
                    setGUICallbacks();
                    gui.peerReady();
                }
            };

            config = config || {};
            config.messageHandler        = config.messageHandler        || peerWeb.MessageHandler;
            config.networkMessageHandler = config.networkMessageHandler || peerWeb.MessageHandler.Network;
            config.publicMessageHandler  = config.publicMessageHandler  || peerWeb.MessageHandler.Public;
            conMng  = config.connectionManager     = config.connectionManager     || peerWeb.ConnectionManager;
            docMng  = config.documentManager       = config.documentManager       || peerWeb.DocumentManager;
            storage = config.storage               = config.storage               || peerWeb.Storage;
            config.peer = peer;

            gui = new peerWeb.GUI();
            peerWeb.log("Initialisiere Peer.", "info");
            peerWeb.log("Check requirements", "info");
            usable = !!peerWeb.Storage && !!peerWeb.Connection.WebSocket;
            if(usable){
                peerWeb.log("WebStorage: "+supportFor.webstorage, "info");
                peerWeb.log("indexedDB: "+supportFor.indexeddb, "info");
                peerWeb.log("WebSockets: "+!!peerWeb.Connection.WebSocket, "info");
                peerWeb.log("WebRTC (with DataChannel): "+supportFor.webrtc, "info");
                storage.init({"onReady":continueInit});
                peer.id = storage.getPeerID();
                if(peer.id === null){
                    generateID(continueInit);
                }
                else{
                    peerWeb.log("Peer ID loaded: "+peer.id, "info");
                }
                continueInit();
            }
            else{
                peerWeb.log("Minimum requirements are not met:", "info");
                peerWeb.log("WebStorage: "+supportFor.webstorage, "info");
                peerWeb.log("indexedDB: "+supportFor.indexeddb, "info");
                peerWeb.log("WebSockets: "+supportFor.websocket, "info");
            }
        }());

        peerWeb.Peer = peer;
        return peer;
    };
}(peerWeb, jQuery, BigInteger));
