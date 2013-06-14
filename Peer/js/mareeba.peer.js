(function(Mareeba, $, BigInteger){
    "use strict";
    Mareeba.namespace("Peer");
    /**
     * Hauptklasse von Mareeba.
     * Diese implementiert den lokalen Peer und steuert übergreifende Logik.
     * Als Singleton implementiert, so dass sich nur ein Peer pro BrowserTab erzeugen lässt.
     * @author Marten Schälicke
     * @constructor
     */
    Mareeba.Peer = function(config){
        var conMng, docMng, storage, peer = this,
        //private Methods
        generateID;

        /**
         * Dient der Erzeugung und Speicherung der PeerID.
         * Versucht die ID über random.org zu Erzeugen, andernfalls wird die Methode "getRandomHexNumber" der Mareeba Bibliothek verwendet.
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
             * Erzeugt die ID mittels der Mareeba-Bibliothek.
             */
            chooseRandomID = function(){
                var id = Mareeba.getRandomHexNumber(40);
                setID(id);
            };

            /**
             * Speichert die erzeugte PeerID und ruft den Callback auf.
             * @param {String} id die erzeugte PeerID
             */
            setID = function(id){
                Mareeba.log("Peer ID is set to: "+id, "info");
                peer.id = id;
                storage.setPeerID(id);
                callback();
            };

            //check Quota of current IP at random.org
            $.ajax({
                "url": "http://www.random.org/quota/?format=plain",
                "success": function(data){
                    var quota = parseInt(data, 10);
                    Mareeba.log("Random.org Quota is: "+quota, "info");
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
            usable, supportFor = Mareeba.supportFor,

            continueInit = function(){
                if(storage.isUsable() && peer.id !== null){
                    peer.numID = BigInteger.parse(peer.id, 16);

                    config.messageHandler.init({"peer": peer, "storeMessage" : function(refCode, msg){storage.storeMessage(refCode, msg);}, "deleteMessage" : function(refCode){return storage.deleteMessage(refCode);}});
                    config.networkMessageHandler.init(config);
                    config.publicMessageHandler.init(config);
                    config.connectionManager.init({"peer": peer, "storage": storage, "messageHandler": config.messageHandler, "onConnectivityChange": config.updateConnectivityInfo || function(){}});
                    config.documentManager.init(config);

                    Mareeba.log("Waiting for Connections.", "info");
                    config.onReady();
                }
            };

            config = config || {};
            config.messageHandler        = config.messageHandler        || Mareeba.MessageHandler;
            config.networkMessageHandler = config.networkMessageHandler || Mareeba.MessageHandler.Network;
            config.publicMessageHandler  = config.publicMessageHandler  || Mareeba.MessageHandler.Public;
            conMng  = config.connectionManager     = config.connectionManager     || Mareeba.ConnectionManager;
            docMng  = config.documentManager       = config.documentManager       || Mareeba.DocumentManager;
            storage = config.storage               = config.storage               || Mareeba.Storage;
            config.peer = peer;

            Mareeba.log("Initialisiere Peer.", "info");
            Mareeba.log("Check requirements", "info");
            usable = !!Mareeba.Storage && !!Mareeba.Connection.WebSocket;
            if(usable){
                Mareeba.log("Storage: "+!!Mareeba.Storag, "info");
                Mareeba.log("WebSockets: "+!!Mareeba.Connection.WebSocket, "info");
                Mareeba.log("WebRTC (with DataChannel): "+!!Mareeba.Connection.WebRTC, "info");
                storage.init({"onReady":continueInit, "defaultHelper": config.defaultHelper});
                peer.id = storage.getPeerID();
                if(peer.id === null){
                    generateID(continueInit);
                }
                else{
                    Mareeba.log("Peer ID loaded: "+peer.id, "info");
                }
                continueInit();
            }
            else{
                Mareeba.log("Minimum requirements are not met:", "info");
                Mareeba.log("WebStorage and IndexedDB: "+!!Mareeba.Storage, "info");
                Mareeba.log("WebSockets: "+!!Mareeba.Connection.WebSocket, "info");
            }
        }());

        Mareeba.Peer = peer;
        return peer;
    };
}(Mareeba, jQuery, BigInteger));
