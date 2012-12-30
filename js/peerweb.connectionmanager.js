/**
 * @author Marten Schälicke
 */

peerWeb.namespace("ConnectionManager");
peerWeb.ConnectionManager = function(storage){
    "use strict";
    var Connection = peerWeb.Connection,
    that = this, connections = {}, newConnections = [], defaultConfig = {},
    amountConPeers = 0,
    handleNetworkRequest;
    
    //init-code
    (function(){
        var initSuperPeersConnections = function(superPeers){
            peerWeb.log("got all saved SuperPeers ("+superPeers.length+")", "info");
            var tempConnection, tempConfig, i;
            for(i = 0; i < superPeers.length; i++){
                tempConfig = defaultConfig;
                tempConfig.connectTo = superPeers[i].wsAddress;
                tempConnection = new Connection(tempConfig);
                newConnections.push(tempConnection);
            }
            peerWeb.log("allready started trying to connect to to all saved SuperPeers", "info");
        };
        peerWeb.log("request all saved SuperPeers", "info");
        defaultConfig.ownPeerID = storage.getPeerID();
        defaultConfig.conManager = that;
        defaultConfig.storeMessage = function(refCode, msg){
            storage.storeMessage(refCode, msg);
        };
        storage.getAllSuperPeers(initSuperPeersConnections);
    })();
    
    //private
    handleNetworkRequest = function(msg, con){
        switch(msg.head.action){
            case "peerIdentity":
                newConnections = peerWeb.removeFromArray(con, newConnections);
                connections[msg.head.from] = con;
                amountConPeers += 1;
                peerWeb.log("recieved peerIdentity Message, moved connection from newly createt to normal.", "log");
            break;
        }
    };
    
    //public
    this.connectionClosed = function(){
        var i;
        for(i = 0; i < newConnections.length; i += 1){
            if(newConnections[i].getReadyState() === 2 || newConnections[i].getReadyState() === 3){
                newConnections.splice(i, 1);
                i -= 1;
                peerWeb.log("Connection removed from newly created ones, remaining: "+newConnections.length, "log");
            }
        }
        for(i in connections){
            if(typeof i.getReadyState === "function" && (i.getReadyState() === 2 || i.getReadyState() === 3)){
                connections[i] = undefined;
                amountConPeers -= 1;
                peerWeb.log("Connection removed", "log");
            }
        }
    };
    
    this.handleResponse = function(msg, con){
        if(msg.head.code === 200){
            storage.deleteMessage(msg.head.refCode);
        }
    };
    
    this.handleRequest = function(msg, con){
        switch(msg.head.service){
            case "network": handleNetworkRequest(msg, con);
            break;
        }
        msg.head.code = 200;
        con.sendResponse(msg);
    };
    
    this.get
};