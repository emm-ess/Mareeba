/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Peer");
peerWeb.Peer = function(){
    "use strict";
    var that = this,
    conManager, storage, peer, gui,
    //private Methods
    generateID, getIDFromRandomOrg, chooseRandomID, setID;
    
    generateID = function(callback){
        //check Quota of current IP at random.org
        $.ajax({
            "url": "http://www.random.org/quota/?format=plain",
            "success": function(data){
                var quota = parseInt(data);
                peerWeb.log("Random.org Quota is: "+quota, "info");
                if(quota >= 0){
                    getIDFromRandomOrg(callback);
                }
                else{
                    chooseRandomID(callback);
                }
            },
            "error": chooseRandomID(callback)
        });
    };
    
    getIDFromRandomOrg = function(callback){
        $.ajax({
            "url": "http://www.random.org/integers/?num=20&min=0&max=255&col=1&base=16&format=plain&rnd=new",
            "success": function(data){
                var id = data.replace(/\s/g, "");
                setID(id, callback);
            },
            "error": chooseRandomID
        });
    };
    
    chooseRandomID = function(callback){
        var id = peerWeb.getRandomHexNumber(40);
        setID(id, callback);
    };
    
    setID = function(id, callback){
        peerWeb.log("Peer ID is set to: "+id, "info");
        peer.ID = id;
        storage.setPeerID(id);
        callback();
    };
    
    //making sure initialcode is only called once, using singletonpattern
    peerWeb.Peer = function(){
        return peer;
    };
    peerWeb.Peer.prototype = this;
    peer = new peerWeb.Peer();
    peer.constructor = peerWeb.Peer;
    
    //initialiserungscode
    (function(){
        var continueInit = function(){
            if(storage.isUsable() && peer.ID !== null){
                peer.numID = BigInteger.parse(peer.ID, 16);
                conManager = new peerWeb.ConnectionManager(that, storage);
                peerWeb.log("Waiting for Connections.", "info");
                gui.peerReady();
            }
        },
        usable, supportFor = peerWeb.supportFor;
        
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
    
    return peer;
};