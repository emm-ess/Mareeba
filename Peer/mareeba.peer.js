(function(Mareeba, BigInteger){
    "use strict";
    Mareeba.namespace("Peer");
    /**
     * Mainclass of Mareeba
     * @author Marten Schälicke
     * @class
     */
    Mareeba.Peer = function(config){
        var conMng, docMng, storage, peer = this,
        //private Methods
        generateID;

        /**
         * creates ID for local peer.
         * uses random.org if available (quota) or a Mareeba.getRandomHexNumber()
         * @param {function} callback
         */
        generateID = function(callback){
            var getIDFromRandomOrg, chooseRandomID, setID;

            /**
             * get 20 random bytes from random.org
             */
            getIDFromRandomOrg = function(){
                Mareeba.ajaxGet({
                    "url": "http://www.random.org/integers/?num=20&min=0&max=255&col=1&base=16&format=plain&rnd=new",
                    "success": function(data){
                        var id = data.replace(/\s/g, "");
                        setID(id);
                    },
                    "error": chooseRandomID
                });
            };

            /**
             * create ID via Mareeba
             */
            chooseRandomID = function(){
                var id = Mareeba.getRandomHexNumber(40);
                setID(id);
            };

            /**
             * save ID and call the callback
             * @param {string} id created ID
             */
            setID = function(id){
                Mareeba.log("Peer ID is set to: "+id, "info");
                peer.id = id;
                storage.setPeerID(id);
                callback();
            };

            //check Quota of current IP at random.org
            Mareeba.ajaxGet({
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
         * initializes the peer
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
}(Mareeba, BigInteger));
