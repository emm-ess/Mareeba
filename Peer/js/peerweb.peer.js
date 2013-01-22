peerWeb.namespace("Peer");
/**
 * Hauptklasse von peerWeb.
 * Diese implementiert den lokalen Peer und steuert übergreifende Logik.
 * Als Singleton implementiert, so dass sich nur ein Peer pro BrowserTab erzeugen lässt.
 * @author Marten Schälicke
 * @constructor
 */
peerWeb.Peer = function(){
    "use strict";
    var conManager, docManager, storage, peer, gui,
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
            peer.ID = id;
            storage.setPeerID(id);
            callback();
        };
        
        //check Quota of current IP at random.org
        $.ajax({
            "url": "http://www.random.org/quota/?format=plain",
            "success": function(data){
                var quota = parseInt(data);
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
    
    //making sure initialcode is only called once, using singletonpattern
    peerWeb.Peer = function(){
        return peer;
    };
    peerWeb.Peer.prototype = this;
    peer = new peerWeb.Peer();
    peer.constructor = peerWeb.Peer;
    
    /**
     * Initierungscode
     * 
     * prüft die Mindestanforderungen an den Browser und erzeugt alle nötigen Objekte.
     */
    (function(){
        var continueInit, setGUICallbacks,
        usable, supportFor = peerWeb.supportFor;
        
        setGUICallbacks = function(){
            var config = {};
            config.newArticle = function(articleData){
                var document = new peerWeb.Document(articleData);
                docManager.registerOwnDocument(document);
            };
            config.articleSearch = docManager.searchArticle;
            config.articleSearchByID = docManager.searchArticleByID;
            config.getAllIndexEntries = storage.getAllIndexEntries;
            gui.setConfig(config);
        };
        
        continueInit = function(){
            if(storage.isUsable() && peer.ID !== null){
                peer.numID = BigInteger.parse(peer.ID, 16);
                conManager = new peerWeb.ConnectionManager(peer, storage);
                docManager = new peerWeb.DocumentManager(peer, storage);
                peerWeb.log("Waiting for Connections.", "info");
                setGUICallbacks();
                gui.peerReady();
            }
        };
        
        gui = new peerWeb.GUI();
        peerWeb.log("Initialisiere Peer.", "info");
        peerWeb.log("Check requirements", "info");
        usable = supportFor.indexeddb && supportFor.webstorage && supportFor.websocket;
        if(usable){
            peerWeb.log("WebStorage: "+supportFor.webstorage, "info");
            peerWeb.log("indexedDB: "+supportFor.indexeddb, "info");
            peerWeb.log("WebSockets: "+supportFor.websocket, "info");
            peerWeb.log("WebRTC (with DataChannel): "+supportFor.webrtc, "info");
            storage = new peerWeb.Storage({onReady:continueInit});
            peer.ID = storage.getPeerID();
            if(peer.ID === null){
                generateID(continueInit);
            }
            else{
                peerWeb.log("Peer ID loaded: "+peer.ID, "info");
            }
            continueInit();
        }
        else{
            peerWeb.log("Minimum requirements are not met:", "info");
            peerWeb.log("WebStorage: "+supportFor.webstorage, "info");
            peerWeb.log("indexedDB: "+supportFor.indexeddb, "info");
            peerWeb.log("WebSockets: "+supportFor.websocket, "info");
        }
    })();
    
    /**
     * reicht das gegebende Objekt an den ConnectionManager weiter, welcher dies im Netzwerk ablegt.
     * @param {Object} data Data-Objekt des zu speichernden Dokuments
     */
    peer.storeInNetwork = function(data){
        conManager.storeInNetwork(data);
    };
    
    /**
     * reicht die Anfrage an den ConnectionManager weiter
     * @param {String} id des gesuchten Dokuments
     */
    peer.searchInNetwork = function(id, callback){
        conManager.searchInNetwork(id, callback);
    };
    
    return peer;
};