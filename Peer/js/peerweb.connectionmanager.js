/**
 * @author Marten Schälicke
 */

peerWeb.namespace("ConnectionManager");
peerWeb.ConnectionManager = function(peer, storage){
    "use strict";
    var Connection = peerWeb.Connection,
    that = this, defaultConfig = {}, l = 6,
    leafSet = {left: [], right: []}, rConnections = [], superPeers = [], friends = [], newConnections = [], 
    amountConPeers = 0, amountConSuperPeers = 0, peerDescr,
    handleRequest, handleResponse,
    handleNetworkRequest, handleNetworkResponse;
    
    //init-code
    (function(){
        var initSuperPeersConnections = function(superPeers){
            peerWeb.log("got all saved SuperPeers ("+superPeers.length+")", "info");
            var tempConnection, tempConfig, i;
            for(i = 0; i < superPeers.length; i += 1){
                tempConfig = defaultConfig;
                tempConfig.connectTo = superPeers[i].wsAddress;
                tempConnection = new Connection(tempConfig);
                newConnections.push(tempConnection);
            }
            peerWeb.log("allready started trying to connect to to all saved SuperPeers", "info");
        };
        peerDescr = {
            "ID" : peer.ID
        };
        if(peerWeb.supportFor.webrtc){
            peerDescr.webrtc = true;
        }
        defaultConfig.ownPeerDescr = peerDescr;
        defaultConfig.conManager = that;
        defaultConfig.storeMessage = function(refCode, msg){
            storage.storeMessage(refCode, msg);
        };
        leafSet.longDistLeft = (BigInteger.ZERO).subtract(peer.numID); 
        leafSet.longDistRight = (BigInteger.parse("ffffffffffffffffffffffffffffffffffffffff", 16)).subtract(peer.numID);
        peerWeb.log("request all saved SuperPeers", "info");
        storage.getAllSuperPeers(initSuperPeersConnections);
    })();
    
    //private
    handleNetworkRequest = function(msg, con){
        var peerDescription = function(msg, con){
            var peerDesc = msg.body.peerDescription, dist, removedCon;
            peerDesc.numID = BigInteger.parse(peerDesc.ID, 16);
            con.setDescription(peerDesc);
            //check if superpeer
            if(peerDesc.ws !== "undefined" || peerDesc.ajax !== "undefined"){
                superPeers.push(con);
                amountConSuperPeers += 1;
                peerWeb.log("recieved peerDescription Message, moved connection to SuperPeers.", "log");
            }
            else {
                //check if connection belongs to leafset, is a friend or just a connection of part R
                dist =  peerDesc.numID.subtract(peer.numID);
                //check left leafset
                if(dist > leafSet.longDistleft && dist < 0){
                    leafSet.left.push(con);
                    if(leafSet.left.length > l/2){
                        leafSet.left.sort(function(a, b){
                            return a.getDescription().numID.compare(b.getDescription().numID) * -1;
                        });
                        removedCon = leafSet.left.splice(l/2, 1)[0];
                        rConnections.push(removedCon);
                        leafSet.longDistLeft = peerDesc.numID.subtract(leafSet.left[l/2].getDescription().numID);
                    }
                    peerWeb.log("recieved peerDescription Message, moved connection to left leafSet.", "log");
                }
                else if(dist > 0 && dist < leafSet.longDistRight ){
                    leafSet.right.push(con);
                    if(leafSet.right.length > l/2){
                        leafSet.right.sort(function(a, b){
                            return a.getDescription().numID.compare(b.getDescription().numID);
                        });
                        removedCon = leafSet.right.splice(l/2, 1)[0];
                        rConnections.push(removedCon);
                        leafSet.longDistRight = peerDesc.numID.subtract(leafSet.right[l/2].getDescription().numID);
                    }
                    peerWeb.log("recieved peerDescription Message, moved connection to right leafSet.", "log");
                }
                else {
                    rConnections.push(con);
                    peerWeb.log("recieved peerDescription Message, moved connection to normal.", "log");
                }
                amountConPeers += 1;
            }
            newConnections = peerWeb.removeFromArray(con, newConnections);
            con.sendNodeLookup(peerDescr.ID);
        },
        nodeLookup = function(msg, con){
            var result = [], i, tempDescr;
            for(i in connections){
                if(typeof connections[i].getDescription === "function"){ //to make sure it's a connection
                    tempDescr = {
                        "ID": i,
                        "descr": connections[i].getDescription()
                    };
                    result.push(tempDescr);
                }
                }
            msg.body = result;
            con.sendResponse(msg);
            peerWeb.log("recieved nodeLookup Message", "log");
        };
        
        switch(msg.head.action){
            case "peerDescription":
                peerDescription(msg, con);
            break;
            case "nodeLookup":
                nodeLookup(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved Message for unknown action of network service: "+msg.head.action, "warn");
            break;
        }
    };
    
    handleNetworkResponse = function(msg, con){
        switch(msg.head.action){
            case "peerDescription":
            break;
            case "nodeLookup":
                peerWeb.log("recieved response for Node Lookup", "log");
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved response for unknown action of network service: "+msg.head.action, "warn");
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
            if(typeof connections[i].getReadyState === "function" && (connections[i].getReadyState() === 2 || connections[i].getReadyState() === 3)){
                connections[i] = undefined;
                amountConPeers -= 1;
                peerWeb.log("Connection removed", "log");
            }
        }
    };
    
    handleResponse = function(msg, con){
        if(msg.head.code === 200){
            storage.deleteMessage(msg.head.refCode);
        }
        switch(msg.head.service){
            case "network": handleNetworkResponse(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved response for unknown service: "+msg.head.service, "warn");
            break;
        }
    };
    
    handleRequest = function(msg, con){
        switch(msg.head.service){
            case "network": handleNetworkRequest(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved request for unknown service: "+msg.head.service, "warn");
            break;
        }
        msg.head.code = 200;
        con.sendResponse(msg);
    };
    
    this.handleMessage = function(msg, con){
        if(msg.head.code !== undefined){
            //response
            handleResponse(msg, con);
        }
        else {
            handleRequest(msg, con);
        }
    }
};