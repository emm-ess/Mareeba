peerWeb.namespace("ConnectionManager");
/**
 * Verwaltet Verbindungen und behandelt Anfragen
 * @author Marten Schälicke
 * @constructor
 * @param {peerWeb.Peer} peer Referenz auf den lokalen Peer
 * @param {peerWeb.Storage} storage Speichermodul von peerWeb
 */
peerWeb.ConnectionManager = function(config){
    "use strict";
    var that = this, 
    peer = config.peer, storage = config.storage,
    defaultConfig = {}, l = 6,
    leafSet = {left: [], right: []}, rConnections = [], superPeers = [], friends = [], newConnections = [], 
    amountConPeers = 0, amountConSuperPeers = 0,
    buildConnection = peerWeb.ConnectionFactory.buildConnection,
    networkMsgHndl,

    /**
     * checks if peer is already connected to a certain other peer
     */
    isConnectedTo = function(fPeerID){
        var i, j, tempDesc, connections = [newConnections, leafSet.left, leafSet.right, superPeers, rConnections];
        for(i = 0; i < connections.length; i += 1){
            for(j = 0; j < connections[i].length; j += 1){
                tempDesc = connections[i][j].getDescription();
                if(tempDesc !== undefined && tempDesc.id === fPeerID){
                    return true;
                }
            }
        }
        return false;
    },
    
    getConnectionTo = function(fPeerID){
        var i, j, tempDesc, tempCon, connections = [newConnections, leafSet.left, leafSet.right, superPeers, rConnections];
        for(i = 0; i < connections.length; i += 1){
            for(j = 0; j < connections[i].length; j += 1){
                tempCon = connections[i][j];
                tempDesc = tempCon.getDescription();
                if(tempDesc !== undefined && tempDesc.id === fPeerID){
                    return tempCon;
                }
            }
        }
        return null;
    },
    
    /**
     * updates the Info about connections
     */
    updateConInfo = function(){
        var connections = leafSet.left.length+leafSet.right.length+rConnections.length+friends.length;
        config.onConnectivityChange(connections, superPeers.length, newConnections.length);
    },
    
    /**
     * prüft, wie viele freie Verbindungen verfügbar sind und versucht gegebenenfalls entsprechende Knoten zu finden.
     * führt daher u.U. zu einem nodeLookup
     * @see nodeLookup 
     */
    checkMinimumConnections = function(){
        if(amountConPeers === 0 && amountConSuperPeers === 0){
            return;
        }
        if(leafSet.left.length === 0 && leafSet.right.length === 0){
            networkMsgHndl.initNodeLookup(peer.id);
        }
        else if(leafSet.left.length < l/2){
            
        }
        else if(leafSet.right.length < l/2){
            
        }
    };
    
    /**
     * Routing-Algorithmus.
     * Wählt den nächsten passenden Peer aus und schickt die Nachricht an diesen.
     * @param {Object} msg weiterzuleitende Nachricht
     * @param {peerWeb.Connection} con Verbindung über die die Nachricht geschickt wurde
     * @param {Function} callback Funktion die im Falle einer Antwort aufgerufen werden soll
     */ 
    this.route = function(msg){
        var closestCon, closestDist, targetID, allCon, couldSend = false;
        targetID = BigInteger.parse(msg.head.to, 16);
        if(msg.head.from === peer.id){
            closestDist = peerWeb.BIGGESTID;
        }
        else{
            closestDist = targetID.subtract(peer.numID).abs();
        }
        allCon = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
        closestCon = that.getNearestConnection(targetID, allCon, closestDist);
        if(closestCon !== undefined){
            couldSend = closestCon.send(msg);
        }
        return couldSend;
    };
    
    /**
     * erster Schritt des Routings wenn der lokale Peer der Sender ist.
     * schickt die Nachricht an den nächsten SuperPeer
     * @param {Object} msg weiterzuleitende Nachricht
     * @param {Function} callback Funktion die im Falle einer Antwort aufgerufen werden soll
     */
    this.send = function(msg){
        var closestCon, targetID = BigInteger.parse(msg.head.to, 16), allCon, couldSend = false;
        closestCon = that.getNearestConnection(targetID, superPeers);
        if(closestCon !== undefined){
            couldSend = closestCon.send(msg);
        }
        if(!couldSend){
            allCon = leafSet.left.concat(leafSet.right, rConnections, friends);
            closestCon = that.getNearestConnection(targetID, allCon);
            if(closestCon !== undefined){
                couldSend = closestCon.send(msg);
            }
            else{
                peerWeb.log("couldn't send Message towards ID: "+msg.head.to, "log");
            }
        }
        return couldSend;
    };
    
    this.getNearestConnection = function(targetID, connections, currentDistance){
        var tempDist, closestDist, closestCon;
        if(typeof targetID === BigInteger){
            targetID = BigInteger.parse(targetID, 16);
        }
        if(typeof connections !== Array){
            connections = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
        }
        if(typeof currentDistance !== BigInteger){
            closestDist = peerWeb.BIGGESTID;
        }
        else{
            closestDist = currentDistance;
        }
        connections.forEach(function(element){
            tempDist = targetID.subtract(element.getNumID()).abs();
            if(tempDist.compare(closestDist) < 0){
                closestDist = tempDist;
                closestCon = element;
            }
        });
        return closestCon;
    };
    
    this.getNearestPeer = function(targetID){
        var peerArr = that.getNearestPeers(targetID, null, 1);
        return peerArr[0];
    };
    
    this.getNearestPeers = function(targetID, resultList, amount){
        var temp, tempResult = [], result = [], i, l, tempDist;
        targetID = BigInteger.parse(targetID, 16);
        temp = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
        for(i = 0, l = temp.length; i < l; i += 1){
            tempDist = targetID.subtract(temp[i].getNumID());
            result.push( [tempDist, temp[i].getDescription()] );
        }
        
        if(typeof resultList === Array){
            for(i = 0, l = resultList.length; i < l; i += 1){
                temp = BigInteger.parse(resultList[i].id, 16);
                tempDist = targetID.subtract(temp).abs();
                result.push( [tempDist, resultList[i]] );
            }
        }
        
        //let's have only unique values
        temp = {};
        for(i = 0, l = result.length; i < l; i += 1){
            if(temp.hasOwnProperty(result[i][1].id)) {
                continue;
            }
            tempResult.push(result[i]);
            temp[result[i][1].id] = 1;
        }
        
        tempResult.sort(function(a, b){
           return a[0].compareAbs(b[0]);
        });
        
        if(typeof amount === Number){
            if(tempResult.length > amount){
                tempResult = tempResult.splice(0, amount);
            }
        }
        
        //use result again
        result = [];
        tempResult.forEach(function(element){
            result.push(element[1]);
        });
        return result;
    };
    
    this.newPeerDiscovered = function(peerDesc){
        var tempConnection;
        if(!isConnectedTo(peerDesc.id)){
            //check if it is possible to connect
            if(peerDesc.ws !== undefined){
                peerWeb.log("new SuperPeer discovered (has ID: "+peerDesc.id+")", "info");
                tempConnection = buildConnection(peerDesc, defaultConfig);
                newConnections.push(tempConnection);
            } else if(!!peerDesc.webrtc && !!that.peerDescription.webrtc){
                peerWeb.log("new Peer discovered (has ID: "+peerDesc.id+")", "info");
                tempConnection = buildConnection(peerDesc, defaultConfig);
                newConnections.push(tempConnection);
            }
        }
    };
    
    this.peerDescriptionRecieved = function(peerDesc, con, numID){
        var dist, removedCon;
        if(numID === undefined){
            numID = BigInteger.parse(peerDesc.id, 16);
        }
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
        updateConInfo();
    };
    
    this.pcDescriptionRecieved = function(fPeerID, PCDesc){
        var config, peerDesc, tempConnection;
        if(isConnectedTo(fPeerID) && PCDesc.type === "answer"){//self initiated
            getConnectionTo(fPeerID).gotAnswer(PCDesc);
        }
        else{//other initiated
            config = defaultConfig;
            config.offer = PCDesc;
            peerDesc = {
                id: fPeerID,
                webrtc: true
            };
            tempConnection = buildConnection(peerDesc, config);
            newConnections.push(tempConnection);
        }
    };
    
    this.iceProcess = function(fPeerID, ICEmsg){
        getConnectionTo(fPeerID).gotIceMsg(ICEmsg);
    };
    
    /**
     * entfernt geschlossene oder sich in dem Prozess der Schließung befindene Verbindungen aus der Routing-Tabelle.
     * Anschließend wird checkMinimumConnections aufgerufen, um ein entsprechendes Defizit auszugeleichen.
     * @see checkMinimumConnections
     */
    this.connectionClosed = function(){
        var i, 
        checkConnections = function(part, partname){
            var i, removed = 0;
            for(i = 0, l = part.length; i < l; i += 1){
                if(part[i].getReadyState() === 2 || part[i].getReadyState() === 3){
                    part[i].close();
                    part.splice(i, 1);
                    i -= 1;
                    l -= 1;
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
        updateConInfo();
        checkMinimumConnections();
    };
    
    /**
     * Initierungscode
     */
    (function(){
        var initSuperPeersConnections = function(superPeers){
            peerWeb.log("got all saved SuperPeers ("+superPeers.length+")", "info");
            var tempConnection, i;
            for(i = 0; i < superPeers.length; i += 1){
                tempConnection = buildConnection({ws: superPeers[i].wsAddress}, defaultConfig);
                newConnections.push(tempConnection);
            }
            updateConInfo();
            peerWeb.log("allready started trying to connect to to all saved SuperPeers", "info");
        };
        
        that.peerDescription = {
            "id" : peer.id
        };
        if(peerWeb.supportFor.webrtc){
            that.peerDescription.webrtc = true;
        }
        defaultConfig.connectionManager = that;
        defaultConfig.messageHandler = config.messageHandler;
        config.messageHandler.setConnectionManager(that);
        networkMsgHndl = config.messageHandler.getServiceHandler("network");
        networkMsgHndl.setConnectionManager(that);
        leafSet.longDistLeft = (BigInteger.ZERO).subtract(peer.numID); 
        leafSet.longDistRight = (peerWeb.BIGGESTID).subtract(peer.numID);
        peerWeb.log("request all saved SuperPeers", "info");
        storage.getAllSuperPeers(initSuperPeersConnections);
    })();
};