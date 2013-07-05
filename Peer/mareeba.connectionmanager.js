(function(Mareeba, BigInteger){
    "use strict";
    Mareeba.namespace("ConnectionManager");
    /**
     * manages connections and routing of messages.
     * @author Marten Schälicke
     */
    Mareeba.ConnectionManager = (function(){
        var
        peer, storage, peerDescription,
        defaultConfig = {}, l = 6,
        leafSet = {left: [], right: []}, rConnections = [], superPeers = [], friends = [], newConnections = [],
        amountConPeers = 0, amountConSuperPeers = 0,
        buildConnection = Mareeba.ConnectionFactory.buildConnection, onConnectivityChange,
        networkMsgHndl,

        /**
         * checks if peer is already connected to a certain other peer
         * @param {string} fPeerID ID of far peer
         * @returns {boolean} is already connected
         */
        isConnectedTo = function(fPeerID){
            var i, j, length, tempDesc, connections = [newConnections, leafSet.left, leafSet.right, superPeers, rConnections];
            for(i = 0; i < 5; i += 1){
                for(j = 0, length = connections[i].length; j < length; j += 1){
                    tempDesc = connections[i][j].getDescription();
                    if(tempDesc !== undefined && tempDesc.id === fPeerID){
                        return true;
                    }
                }
            }
            return false;
        },

        /**
         * returns the connection to a specific peer. returns null if not connected.
         * @param {string} fPeerID ID of far peer
         * @returns {(Mareeba.Connection|null)}
         */
        getConnectionTo = function(fPeerID){
            var i, j, length, tempDesc, tempCon, connections = [newConnections, leafSet.left, leafSet.right, superPeers, rConnections];
            for(i = 0; i < 5; i += 1){
                for(j = 0, length = connections[i].length; j < length; j += 1){
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
            onConnectivityChange(connections, superPeers.length, newConnections.length);
        },

        /**
         * checks if number of connections is enough. otherwise initiates nodeLookup.
         * @see Mareeba.MessageHandler.Network.initNodeLookup
         */
        checkMinimumConnections = function(){
            if(amountConPeers === 0 && amountConSuperPeers === 0){
                return;
            }
            if(leafSet.left.length === 0 && leafSet.right.length === 0){
                networkMsgHndl.initNodeLookup(peer.id);
            }
            else if(leafSet.left.length < l/2){
                //TODO
            }
            else if(leafSet.right.length < l/2){
                //TODO
            }
        },
        
        /**
         * returns the connection which endpoint is closest to given ID or null.
         * @param {(BigInteger|string)} targetID
         * @param {array} [connections=leafset+rConnections+superPeers+friends] array of connection in which to search
         * @param {BigInteger} [currentDistance=Mareeba.BIGGESTID]
         * @returns {(Mareeba.Connection|null)} nearest connection
         */
        getNearestConnection = function(targetID, connections, currentDistance){
            var tempDist, closestDist, closestCon = null;
            if(typeof targetID === BigInteger){
                targetID = BigInteger.parse(targetID, 16);
            }
            if(typeof connections !== Array){
                connections = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
            }
            if(typeof currentDistance !== BigInteger){
                closestDist = Mareeba.BIGGESTID;
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
        },

        /**
         * routing algorithm.
         * selects next peer and send him the message. returns whether the message could be send or not (no connection or already nearest).
         * @param {object} msg message to be send
         * @returns {boolean} could message be send
         */
        route = function(msg){
            var closestCon, closestDist, targetID, allCon, couldSend = false;
            targetID = BigInteger.parse(msg.head.to, 16);
            if(msg.head.from === peer.id){
                closestDist = Mareeba.BIGGESTID;
            }
            else{
                closestDist = targetID.subtract(peer.numID).abs();
            }
            allCon = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
            closestCon = getNearestConnection(targetID, allCon, closestDist);
            if(closestCon !== null){
                couldSend = closestCon.send(msg);
            }
            return couldSend;
        },

        /**
         * first routing step if local peer is sender.
         * sends the message to closest connected SuperPeer. If none is available the message is forwarded to the closest connected peer.
         * returns whether the message could be send or not (no connection or already nearest).
         * @param {object} msg message to be send
         * @returns {boolean} could message be send
         */
        send = function(msg){
            var closestCon, targetID = BigInteger.parse(msg.head.to, 16), allCon, couldSend = false;
            closestCon = getNearestConnection(targetID, superPeers);
            if(closestCon !== undefined){
                couldSend = closestCon.send(msg);
            }
            if(!couldSend){
                allCon = leafSet.left.concat(leafSet.right, rConnections, friends);
                closestCon = getNearestConnection(targetID, allCon);
                if(closestCon !== undefined){
                    couldSend = closestCon.send(msg);
                }
                else{
                    Mareeba.log("couldn't send Message towards ID: "+msg.head.to, "log");
                }
            }
            return couldSend;
        },

        /**
         * returns the peerdescriptions (as an array) of the closest connected peers and SuperPeers.
         * @param {(string|BigInteger)} targetID ID to which peers should be close
         * @param {PeerDescription[]} [resultList] list of already known close peers
         * @param {number} [amount=l] number of peers to be returned
         * @returns {PeerDescription[]} known closest peers to targetID
         */
        getNearestPeers = function(targetID, resultList, amount){
            var temp, tempResult = [], result = [], i, length, tempDist;
            targetID = BigInteger.parse(targetID, 16);
            temp = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
            for(i = 0, length = temp.length; i < length; i += 1){
                tempDist = targetID.subtract(temp[i].getNumID());
                result.push( [tempDist, temp[i].getDescription()] );
            }

            if(typeof resultList === Array){
                for(i = 0, length = resultList.length; i < length; i += 1){
                    temp = BigInteger.parse(resultList[i].id, 16);
                    tempDist = targetID.subtract(temp).abs();
                    result.push( [tempDist, resultList[i]] );
                }
            }

            //let's have only unique values
            temp = {};
            for(i = 0, length = result.length; i < length; i += 1){
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
        },

        /**
         * returns the closest known peer to a given ID.
         * @param {(string|BigInteger)} targetID ID to which peer should be close
         * @returns {PeerDescription} known closest peer to targetID
         */
        getNearestPeer = function(targetID){
            var peerArr = getNearestPeers(targetID, null, 1);
            return peerArr[0];
        },

        /**
         * callback if a new peer is discovered.
         * connects to peer if possible.
         * @param {PeerDescription} peerDesc peerDescription of discovered peer.
         */
        newPeerDiscovered = function(peerDesc){
            var tempConnection;
            if(!isConnectedTo(peerDesc.id)){
                //check if it is possible to connect
                if(peerDesc.ws !== undefined){
                    Mareeba.log("new SuperPeer discovered (has ID: "+peerDesc.id+")", "info");
                    tempConnection = buildConnection(peerDesc, defaultConfig);
                    newConnections.push(tempConnection);
                } else if(!!peerDesc.webrtc && !!peerDescription.webrtc){
                    Mareeba.log("new Peer discovered (has ID: "+peerDesc.id+")", "info");
                    tempConnection = buildConnection(peerDesc, defaultConfig);
                    newConnections.push(tempConnection);
                }
            }
        },

        /**
         * sets the peerDescription to the corresponding connection to peer.
         * sorts the connection in the routing table.
         * @param {PeerDescription} peerDesc received peerDescription
         * @param {Mareeba.Connection} con connection to peer (sender of peerConnection)
         */
        peerDescriptionRecieved = function(peerDesc, con){
            var dist, removedCon,
                numID = BigInteger.parse(peerDesc.id, 16);
            con.setDescription(peerDesc, numID);
            if(peerDesc.ws !== undefined || peerDesc.ajax !== undefined){
                superPeers.push(con);
                amountConSuperPeers += 1;
                Mareeba.log("recieved peerDescription Message, moved connection to SuperPeers.", "log");
            }
            else {
                //check if connection belongs to leafset, is a friend or just a connection of part R
                dist =  numID.subtract(peer.numID);
                //check left leafset
                if(leafSet.longDistleft < dist && dist < 0){
                    leafSet.left.push(con);
                    if(leafSet.left.length > l/2){
                        leafSet.left.sort(function(a, b){
                            return a.getNumID().compare(b.getNumID()) * -1;
                        });
                        removedCon = leafSet.left.splice(l/2, 1)[0];
                        rConnections.push(removedCon);
                        leafSet.longDistLeft = leafSet.left[l/2].getNumID().substract(peer.numID);
                    }
                    Mareeba.log("recieved peerDescription Message, moved connection to left leafSet.", "log");
                }
                else if(0 < dist && dist < leafSet.longDistRight ){
                    leafSet.right.push(con);
                    if(leafSet.right.length > l/2){
                        leafSet.right.sort(function(a, b){
                            return a.getNumID().compare(b.getNumID());
                        });
                        removedCon = leafSet.right.splice(l/2, 1)[0];
                        rConnections.push(removedCon);
                        leafSet.longDistRight = leafSet.right[l/2].getNumID().subtract(peer.numID);
                    }
                    Mareeba.log("recieved peerDescription Message, moved connection to right leafSet.", "log");
                }
                else {
                    rConnections.push(con);
                    Mareeba.log("recieved peerDescription Message, moved connection to normal.", "log");
                }
                amountConPeers += 1;
            }
            newConnections = Mareeba.removeFromArray(con, newConnections);
            checkMinimumConnections();
            updateConInfo();
        },

        /**
         * handles received peerconnection descriptions.
         * Initializes a new peer connection if peerconnection description is a offer (initialzed by sender) and new connection possible
         * or
         * forwards the answer (send by farpeer as reaction of sended offer by local peer) to the corresponding webRTC connection.
         * @param {string} fPeerID ID of peerconnection description sender
         * @param {object} PCDesc received peerconnection description
         */
        pcDescriptionRecieved = function(fPeerID, PCDesc){
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
        },

        iceProcess = function(fPeerID, ICEmsg){
            getConnectionTo(fPeerID).gotIceMsg(ICEmsg);
        },

        /**
         * removes closed or closing connections from the routing table.
         * calls checkMinimumConnections for creating new connections is needed.
         * @see checkMinimumConnections
         */
        connectionClosed = function(){
            var i,
            checkConnections = function(part, partname){
                var i, length, removed = 0;
                for(i = 0, length = part.length; i < length; i += 1){
                    if(part[i].getReadyState() === 2 || part[i].getReadyState() === 3){
                        part[i].close();
                        part.splice(i, 1);
                        i -= 1;
                        length -= 1;
                        removed += 1;
                        Mareeba.log("Connection removed from "+partname+", remaining: "+part.length, "log");
                    }
                }
                return removed;
            };

            checkConnections(newConnections, "new connections");
            amountConPeers += checkConnections(leafSet.left, "left LeafSet");
            amountConPeers += checkConnections(leafSet.right, "right LeafSet");
            amountConSuperPeers -= checkConnections(superPeers, "SuperPeers");
            amountConPeers += checkConnections(rConnections, "part two (R)");
            Mareeba.log("Remainig Connections to Peers: "+amountConPeers+", remaining Connections to SuperPeers: "+amountConSuperPeers, "log");
            updateConInfo();
            checkMinimumConnections();
        },

        /**
         * initialzes the connection manager.
         * sets default PeerDescription for local peer and callbacks.
         * @param {object} config configurationobject
         */
        init = function(config){
            var initSuperPeersConnections = function(superPeers){
                Mareeba.log("got all saved SuperPeers ("+superPeers.length+")", "info");
                var tempConnection, i, length;
                for(i = 0, length = superPeers.length; i < length; i += 1){
                    tempConnection = buildConnection({ws: superPeers[i].wsAddress}, defaultConfig);
                    newConnections.push(tempConnection);
                }
                updateConInfo();
                Mareeba.log("allready started trying to connect to to all saved SuperPeers", "info");
            };
            peer = config.peer;
            storage = config.storage;
            onConnectivityChange = config.onConnectivityChange;
            peerDescription = {
                "id" : peer.id
            };
            if(!!Mareeba.Connection.WebRTC){
                peerDescription.webrtc = true;
            }
            defaultConfig.messageHandler = config.messageHandler;
            defaultConfig.peerDescription = peerDescription;
            defaultConfig.connectionClosed = connectionClosed;
            networkMsgHndl = config.messageHandler.getServiceHandler("network");
            leafSet.longDistLeft = (BigInteger.ZERO).subtract(peer.numID);
            leafSet.longDistRight = (Mareeba.BIGGESTID).subtract(peer.numID);
            Mareeba.log("request all saved SuperPeers", "info");
            storage.getAllSuperPeers(initSuperPeersConnections);
        };

        return {
            "iceProcess" : iceProcess,
            "pcDescriptionRecieved" : pcDescriptionRecieved,
            "peerDescriptionRecieved" : peerDescriptionRecieved,
            "newPeerDiscovered" : newPeerDiscovered,
            "getNearestPeers" : getNearestPeers,
            "getNearestPeer" : getNearestPeer,
            "send" : send,
            "route" : route,
            "init" : init
        };
    }());
}(Mareeba, BigInteger));
