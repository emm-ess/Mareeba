/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Peer");
peerWeb.Peer = function(){
    "use strict";
    var conManager, storage, peer,
    //private Methods
    generateID, getIDFromRandomOrg, chooseRandomID, setID,
    continueInit;
    
    generateID = function(){
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
    
    chooseRandomID = function(){
        var id = peerWeb.getRandomHexNumber(40);
        setID(id);
    };
    
    setID = function(id){
        peerWeb.log("Peer ID is set to: "+id, "info");
        peer.ID = id;
        storage.setPeerID(id);
        continueInit();
    };
    
    continueInit = function(){
        conManager = new peerWeb.ConnectionManager(storage);
    };
    
    //making sure initialcode is only called once, using singletonpattern
    peerWeb.Peer = function(){
        return peer;
    };
    peerWeb.Peer.prototype = this;
    peer = new peerWeb.Peer();
    peer.constructor = peerWeb.Peer;
    
    //initialiserungscode
    peerWeb.log("Initialisiere Peer.", "info");
    storage = new peerWeb.Storage();
    peer.ID = storage.getPeerID();
    if(peer.ID === null){
        generateID();
    }
    else{
        peerWeb.log("Peer ID loaded: "+peer.ID, "info");
        continueInit();
    }
    
    return peer;
};