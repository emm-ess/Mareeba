/**
 * @author Marten Schälicke
 */

peerWeb.namespace("ConnectionManager");
peerWeb.ConnectionManager = function(peer, storage){
    "use strict";
    var Connection = peerWeb.Connection,
    that = this, defaultConfig = {}, l = 6,
    leafSet = {left: [], right: []}, rConnections = [], superPeers = [], friends = [], newConnections = [], 
    amountConPeers = 0, amountConSuperPeers = 0,
    handleRequest, handleResponse,
    handleNetworkRequest, handleNetworkResponse,
    nodeLookup,
    checkMinimumConnections, routeMessage;
    
    //init-code
    (function(){
        var initSuperPeersConnections = function(superPeers){
            peerWeb.log("got all saved SuperPeers ("+superPeers.length+")", "info");
            var tempConnection, tempConfig, i;
            for(i = 0; i < superPeers.length; i += 1){
                tempConfig = defaultConfig;
                tempConfig.connectTo = superPeers[i].wsAddress;
                tempConnection = new Connection(that, tempConfig);
                newConnections.push(tempConnection);
            }
            peerWeb.log("allready started trying to connect to to all saved SuperPeers", "info");
        };
        
        that.peerDescription = {
            "ID" : peer.ID
        };
        if(peerWeb.supportFor.webrtc){
            that.peerDescription.webrtc = true;
        }
        defaultConfig.storeMessage = function(refCode, msg){
            storage.storeMessage(refCode, msg);
        };
        leafSet.longDistLeft = (BigInteger.ZERO).subtract(peer.numID); 
        leafSet.longDistRight = (peerWeb.BIGGESTID).subtract(peer.numID);
        peerWeb.log("request all saved SuperPeers", "info");
        storage.getAllSuperPeers(initSuperPeersConnections);
    })();
    
    //private    
    routeMessage = function(msg, con){
        var tempDist, closestCon, closestDist, targetID, allCon;
        targetID = BigInteger.parse(msg.head.to, 16);
        if(msg.head.from === peer.ID){
            closestDist = peerWeb.BIGGESTID;
        }
        else{
            closestDist = targetID.subtract(peer.numID).abs();
        }
        allCon = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
        allCon.forEach(function(element){
            tempDist = targetID.subtract(element.getNumID()).abs();
            if(tempDist < closestDist){
                closestDist = tempDist;
                closestCon = element;
            }
        });
        if(closestCon !== undefined){
            closestCon.send(msg);
        }
        else{
            handleRequest(msg, con);
        }
    };
    
    nodeLookup = function(msg, con){
        peerWeb.log("recieved nodeLookup Message for: "+msg.body.id, "log");
        var temp, tempResult = [], result = [], i, tempDist, targetID = BigInteger.parse(msg.body.id, 16), resultList = msg.body.resultList;
        temp = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
        for(i = 0; i < temp.length; i += 1){
            tempDist = targetID.subtract(temp[i].getNumID()).abs();
            tempResult.push( [tempDist, temp[i].getDescription()] );
        }
        for(i = 0; i < resultList.length; i += 1){
            temp = BigInteger.parse(resultList[i].ID, 16);
            tempDist = targetID.subtract(temp).abs();
            tempResult.push( [tempDist, resultList[i]] );
        }
        tempResult.sort(function(a, b){
            return a[0].compare(b[0]);
        });
        if(tempResult.length > l){
            tempResult = tempResult.splice(0, l);
        }
        tempResult.forEach(function(element){
            result.push(element[1]);
        });
        msg.body.resultList = result;
        if(result[0] === that.peerDescription){
            con.sendResponse(msg);
        }
        else{
            if(msg.head === undefined){
                msg.head = {
                    to: msg.body.id,
                    from: peer.ID,
                    service: "network",
                    action: "nodeLookup"
                };
            }
            routeMessage(msg);
        }
    };
    
    handleNetworkRequest = function(msg, con){
        var peerDescription = function(msg, con){
            var peerDesc = msg.body.peerDescription, dist, removedCon,
            numID = BigInteger.parse(peerDesc.ID, 16);
            con.setDescription(peerDesc, numID);
            //check if superpeer
            if(peerDesc.ws !== undefined || peerDesc.ajax !== undefined){
                superPeers.push(con);
                amountConSuperPeers += 1;
                peerWeb.log("recieved peerDescription Message, moved connection to SuperPeers.", "log");
            }
            else {
                //check if connection belongs to leafset, is a friend or just a connection of part R
                dist =  numID.subtract(peer.numID);
                //check left leafset
                if(dist > leafSet.longDistleft && dist < 0){
                    leafSet.left.push(con);
                    if(leafSet.left.length > l/2){
                        leafSet.left.sort(function(a, b){
                            return a.getNumID().compare(b.getNumID()) * -1;
                        });
                        removedCon = leafSet.left.splice(l/2, 1)[0];
                        rConnections.push(removedCon);
                        leafSet.longDistLeft = leafSet.left[l/2].getNumID().substract(peer.numID);
                    }
                    peerWeb.log("recieved peerDescription Message, moved connection to left leafSet.", "log");
                }
                else if(dist > 0 && dist < leafSet.longDistRight ){
                    leafSet.right.push(con);
                    if(leafSet.right.length > l/2){
                        leafSet.right.sort(function(a, b){
                            return a.getNumID().compare(b.getNumID());
                        });
                        removedCon = leafSet.right.splice(l/2, 1)[0];
                        rConnections.push(removedCon);
                        leafSet.longDistRight = leafSet.right[l/2].getNumID().subtract(peer.numID);
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
            checkMinimumConnections();
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
    
    checkMinimumConnections = function(){
        var msg = {};
        if(amountConPeers === 0 && amountConSuperPeers === 0){
            return;
        }
        if(leafSet.left.length === 0 && leafSet.right.length === 0){
            msg.body = {
                id: peer.ID,
                resultList: []
            };
            nodeLookup(msg);
        }
        else if(leafSet.left.length < l/2){
            
        }
        else if(leafSet.right.length < l/2){
            
        }
    };
    
    //public
    this.connectionClosed = function(){
        var i, 
        checkConnections = function(part, partname){
            var i, removed = 0;
            for(i = 0; i < part.length; i += 1){
                if(part[i].getReadyState() === 2 || part[i].getReadyState() === 3){
                    part.splice(i, 1);
                    i -= 1;
                    removed += 1;
                    peerWeb.log("Connection removed from "+partname+", remaining: "+part.length, "log");
                }
            }
            return removed;
        };
        
        checkConnections(newConnections, "new connections");
        amountConPeers += checkConnections(leafSet.left, "left LeafSet");
        amountConPeers += checkConnections(leafSet.right, "right LeafSet");
        amountConSuperPeers -= checkConnections(superPeers, "SuperPeers");
        amountConPeers += checkConnections(rConnections, "part two (R)");
        peerWeb.log("Remainig Connections to Peers: "+amountConPeers+", remaining Connections to SuperPeers: "+amountConSuperPeers, "log");
        checkMinimumConnections();
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
        if(msg.head.code !== undefined || msg.head.from === peer.ID){
            //response
            handleResponse(msg, con);
        }
        else {
            handleRequest(msg, con);
        }
    };
};