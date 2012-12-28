/**
 * @author Marten Schälicke
 */

peerWeb.namespace("ConnectionManager");
peerWeb.ConnectionManager = function(storage){
    "use strict";
    var Connection = peerWeb.Connection,
    that = this, connections = [], defaultConfig = {};
    
    //init-code
    (function(){
        var initSuperPeersConnections = function(superPeers){
            peerWeb.log("got all saved SuperPeers ("+superPeers.length+")", "info");
            var tempConnection, tempConfig, i;
            for(i = 0; i < superPeers.length; i++){
                tempConfig = defaultConfig;
                tempConfig.connectTo = superPeers[i].wsAddress;
                tempConnection = new Connection(tempConfig);
                connections.push(tempConnection);
            }
            peerWeb.log("allready started trying to connecto to all saved SuperPeers", "info");
        };
        peerWeb.log("request all saved SuperPeers", "info");
        defaultConfig.ownPeerID = storage.getPeerID();
        defaultConfig.manager = that;
        storage.getAllSuperPeers(initSuperPeersConnections);
    })();
    
    //public
    this.connectionClosed = function(){
        var i;
        for(i = 0; i < connections.length; i++){
            if(connections[i].getReadyState() === 2 || connections[i].getReadyState() === 3){
                connections.splice(i, 1);
                i--;
            }
        }
        peerWeb.log("Connection removed, remaining Connections: "+connections.length, "log");
    }
};