peerWeb.namespace("ConnectionManager");
/**
 * Verwaltet Verbindungen und behandelt Anfragen
 * @author Marten Schälicke
 * @constructor
 * @param {peerWeb.Peer} peer Referenz auf den lokalen Peer
 * @param {peerWeb.Storage} storage Speichermodul von peerWeb
 */
peerWeb.ConnectionManager = function(peer, storage){
    "use strict";
    var that = this, defaultConfig = {}, l = 6,
    leafSet = {left: [], right: []}, rConnections = [], superPeers = [], friends = [], newConnections = [], 
    amountConPeers = 0, amountConSuperPeers = 0,
    responseCallbacks = {},
    handleRequest, handleResponse,
    handleNetworkRequest, handleNetworkResponse,
    nodeLookup, handleNodeLookupResponse, peerDescription, handlePCDescription, handleIceProcess,
    handlePublicRequest, handlePublicResponse,
    valueStore, valueLookup,
    checkMinimumConnections, isConnectedTo, getConnectionTo, updateConInfo, routeMessage, sendMessage,
    buildConnection = peerWeb.ConnectionFactory.buildConnection;
    
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
            peerWeb.log("allready started trying to connect to to all saved SuperPeers", "info");
        };
        
        that.peerDescription = {
            "id" : peer.id
        };
        if(peerWeb.supportFor.webrtc){
            that.peerDescription.webrtc = true;
        }
        defaultConfig.storeMessage = function(refCode, msg, callback){
            storage.storeMessage(refCode, msg);
            if(callback !== undefined){
                responseCallbacks[refCode] = callback;
            }
        };
        defaultConfig.connectionManager = that;
        leafSet.longDistLeft = (BigInteger.ZERO).subtract(peer.numID); 
        leafSet.longDistRight = (peerWeb.BIGGESTID).subtract(peer.numID);
        peerWeb.log("request all saved SuperPeers", "info");
        storage.getAllSuperPeers(initSuperPeersConnections);
    })();
    
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
    };
    
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
    };
    
    /**
     * updates the Info about connections
     */
    updateConInfo = function(){
        var connections = superPeers.length+leafSet.left.length+leafSet.right.length+rConnections.length+friends.length;
        peer.updateConnectivityInfo(connections, newConnections.length);
    };
    
    /**
     * Routing-Algorithmus.
     * Wählt den nächsten passenden Peer aus und schickt die Nachricht an diesen.
     * @param {Object} msg weiterzuleitende Nachricht
     * @param {peerWeb.Connection} con Verbindung über die die Nachricht geschickt wurde
     * @param {Function} callback Funktion die im Falle einer Antwort aufgerufen werden soll
     */ 
    routeMessage = function(msg, con, callback){
        var tempDist, closestCon, closestDist, targetID, allCon;
        targetID = BigInteger.parse(msg.head.to, 16);
        if(msg.head.from === peer.id){
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
            closestCon.sendMsg(msg, callback);
        }
        else{
            handleRequest(msg, con);
        }
    };
    
    /**
     * erster Schritt des Routings wenn der lokale Peer der Sender ist.
     * schickt die Nachricht an den nächsten SuperPeer
     * @param {Object} msg weiterzuleitende Nachricht
     * @param {Function} callback Funktion die im Falle einer Antwort aufgerufen werden soll
     */
    this.sendMessage = function(msg, callback){
        var tempDist, closestCon, closestDist, targetID;
        targetID = BigInteger.parse(msg.head.to, 16);
        closestDist = peerWeb.BIGGESTID;
        msg.head.from = peer.id;
        superPeers.forEach(function(element){
            tempDist = targetID.subtract(element.getNumID()).abs();
            if(tempDist < closestDist){
                closestDist = tempDist;
                closestCon = element;
            }
        });
        if(closestCon !== undefined){
            closestCon.sendMsg(msg, callback);
        }
        else{
            routeMessage(msg, undefined, callback);
        }
    };
    
    /**
     * Suche nach nächsten Peers zur gesuchten ID (wird im Body der Nachricht übergeben)
     * ordnet alle Peers und die in der Nachricht übergebenen nach Entfernung zum Datum und schreibt die nächsten 6 Peers in die Liste im Body der Nachricht.
     * Ist der lokale Peer der nähste Peer wird die Nachricht an den Absender zurück geschickt, andernfalls wird sie weitergeroutet @see routeMessage
     * @param {Object} msg nodeLookup-Nachricht, welche behandelt wird
     * @param {peerWeb.Connection} con Verbindung über die die Nachricht geschickt wurde
     * @parm {Function} callback Funktion die bei einer Antwort auf den nodeLookup aufgerufen werden soll
     */
    nodeLookup = function(msg, con, callback){
        peerWeb.log("recieved nodeLookup Message for: "+msg.body.id, "log");
        var temp, tempResult = new Array(), result = [], i, l, tempDist, targetID = BigInteger.parse(msg.body.id, 16), resultList = msg.body.resultList;
        temp = leafSet.left.concat(leafSet.right, rConnections, superPeers, friends);
        for(i = 0, l = temp.length; i < l; i += 1){
            tempDist = targetID.subtract(temp[i].getNumID());
            result.push( [tempDist, temp[i].getDescription()] );
        }
        for(i = 0, l = resultList.length; i < l; i += 1){
            temp = BigInteger.parse(resultList[i].id, 16);
            tempDist = targetID.subtract(temp).abs();
            result.push( [tempDist, resultList[i]] );
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
        if(tempResult.length > l){
            tempResult = tempResult.splice(0, l);
        }
        //use result again
        result = [];
        tempResult.forEach(function(element){
            result.push(element[1]);
        });
        msg.body.resultList = result;
        if(result[0].id === that.peerDescription.id){
            msg.head.code = "200";
            msg.head.to = msg.head.from;
            msg.head.from = that.peerDescription.id;
            con.sendMsg(msg);
        }
        else{
            if(msg.head === undefined){
                msg.head = {
                    to: msg.body.id,
                    service: "network",
                    action: "nodeLookup"
                };
            }
            that.sendMessage(msg, callback);
        }
    };
    
    /**
     * 
     */
    handleNodeLookupResponse = function(msg){
        var i, peerDesc, tempConnection;
        for(i = 0; i < msg.body.resultList.length; i += 1){
            if(msg.body.resultList[i].id !== that.peerDescription.id && !isConnectedTo(msg.body.resultList[i].id)){
                peerDesc = msg.body.resultList[i];
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
        }
    };
    
    /**
     * verarbeitet peerDesciption-Nachrichten verbundener Knoten.
     * ordnet den Sender entsprechend seiner Entfernung bzw. ob er ein SuperPeer oder Freund ist, in den entsprechenden Teil der Routing-Tabelle ein.
     * @param {Object} msg peerDescription-Nachricht, welche behandelt wird
     * @param {peerWeb.Connection} con Verbindung über die die Nachricht geschickt wurde
     */
    peerDescription = function(msg, con){
        var peerDesc = msg.body.peerDescription, dist, removedCon,
        numID = BigInteger.parse(peerDesc.id, 16);
        con.setDescription(peerDesc, numID);
        //sende response
        msg.head.code = 200;
        con.sendMsg(msg);
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
        updateConInfo();
    };
    
    handlePCDescription = function(msg){
        var config, tempConnection, peerDesc;
        if(msg.head.to === peer.id){
            if(isConnectedTo(msg.head.from) && msg.body.type === "answer"){//self initiated
                getConnectionTo(msg.head.from).gotAnswer(msg.body);
                peerWeb.log("Other Peer answered (has ID: "+msg.head.from+")", "info");
            }
            else{//other initiated
                config = defaultConfig;
                config.offer = msg.body;
                peerDesc = {
                    id: msg.head.from,
                    webrtc: true
                };
                peerWeb.log("Other Peer initiated Connection (has ID: "+peerDesc.id+")", "info");
                tempConnection = buildConnection(peerDesc, config);
                newConnections.push(tempConnection);
            }
        }
    };
    
    handleIceProcess = function(msg){
        if(msg.head.to === peer.id){
            getConnectionTo(msg.head.from).gotIceMsg(msg.body);
        }
    };
    
    /**
     * leitet die Nachricht an die entsprechende Methode weiter.
     * verwendet dafür das "action"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handleNetworkRequest = function(msg, con){
        switch(msg.head.action){
            case "peerDescription":
                peerDescription(msg, con);
            break;
            case "nodeLookup":
                nodeLookup(msg, con);
            break;
            case "pcDescription":
                handlePCDescription(msg, con);
            break;
            case "iceProcess":
                handleIceProcess(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved Message for unknown action of network service: "+msg.head.action, "warn");
            break;
        }
    };
    
    /**
     * leitet die Antwort an die entsprechende Methode weiter.
     * verwendet dafür das "action"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handleNetworkResponse = function(msg, con){
        switch(msg.head.action){
            case "peerDescription":
                peerWeb.log("recieved response for peerDescription", "log");
            break;
            case "nodeLookup":
                peerWeb.log("recieved response for nodeLookup", "log");
                handleNodeLookupResponse(msg);
            break;
            case "pcDescription":
                
            break;
            case "iceProcess":
                
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved response for unknown action of network service: "+msg.head.action, "warn");
            break;
        }
    };
    
    /**
     * verarbeitet valueStore-Nachrichten,
     * speichert deren Body in der Datenbank
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    valueStore = function(msg, con){
        storage.saveDocument(msg.body);
        msg.body = "";
        msg.head.code = 200;
        msg.head.to = msg.head.from;
        msg.head.from = that.peerDescription.id;
        con.sendMsg(msg);
    };
    
    /**
     * verarbeitet valueLookup-Nachrichten
     * antwortet mit 200 und dem dokument im body, falls dies vorhanden ist; sonst mit 404
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    valueLookup = function(msg, con){
        var storageResult = function(doc){
            if(doc === undefined){
                msg.head.code = 404;
            }
            else {
                msg.head.code = 200;
                msg.body = doc;
            }
            msg.head.to = msg.head.from;
            msg.head.from = that.peerDescription.id;
            con.sendMsg(msg);
        };
        storage.getDocument(msg.body.id, storageResult);
    };
    
    /**
     * leitet die Nachricht an die entsprechende Methode weiter.
     * verwendet dafür das "action"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handlePublicRequest = function(msg, con){
        switch(msg.head.action){
            case "valueStore":
                valueStore(msg, con);
            break;
            case "valueLookup":
                valueLookup(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved request for unknown action of public service: "+msg.head.action, "warn");
            break;
        }
    };

    /**
     * leitet die Antwort an die entsprechende Methode weiter.
     * verwendet dafür das "action"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handlePublicResponse = function(msg, con){
        switch(msg.head.action){
            case "valueStore":
                peerWeb.log("recieved response for valueStore", "log");
            break;
            case "valueLookup":
                peerWeb.log("recieved response for valueLookup", "log");
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved response for unknown action of public service: "+msg.head.action, "warn");
            break;
        }
    };
    
    /**
     * prüft, wie viele freie Verbindungen verfügbar sind und versucht gegebenenfalls entsprechende Knoten zu finden.
     * führt daher u.U. zu einem nodeLookup
     * @see nodeLookup 
     */
    checkMinimumConnections = function(){
        var msg = {};
        if(amountConPeers === 0 && amountConSuperPeers === 0){
            return;
        }
        if(leafSet.left.length === 0 && leafSet.right.length === 0){
            msg.body = {
                id: peer.id,
                resultList: []
            };
            nodeLookup(msg);
        }
        else if(leafSet.left.length < l/2){
            
        }
        else if(leafSet.right.length < l/2){
            
        }
    };
    
    /**
     * Leitet eine eingegangene Antwort an den entsprechenden Dienst weiter.
     * verwendet hierzu das "service"-Feld im Header der Nachricht
     * 
     * Ruft einen optionalen Callback auf
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handleResponse = function(msg, con){
        var refCode = msg.head.refCode;
        if(msg.head.code === 200){
            storage.deleteMessage(refCode);
        }
        switch(msg.head.service){
            case "network": handleNetworkResponse(msg, con);
            break;
            case "public": handlePublicResponse(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved response for unknown service: "+msg.head.service, "warn");
            break;
        }
        if(typeof(responseCallbacks[refCode]) ===  "function"){
            responseCallbacks[refCode](msg, con);
            responseCallbacks[refCode] = undefined;
        }
    };
    
    /**
     * Leitet eine eingegangene Anfrage an den entsprechenden Dienst weiter.
     * verwendet hierzu das "service"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handleRequest = function(msg, con){
        switch(msg.head.service){
            case "network": handleNetworkRequest(msg, con);
            break;
            case "public": handlePublicRequest(msg, con);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved request for unknown service: "+msg.head.service, "warn");
            break;
        }
    };
    
    /**
     * Prüft, ob es sich bei einer eingegangenen Nachricht um eine Antwort oder eine Anfrage handelt.
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    this.handleMessage = function(msg, con){
        if(msg.head.code !== undefined || msg.head.from === peer.id){
            //response
            handleResponse(msg, con);
        }
        else {
            handleRequest(msg, con);
        }
    };
    
    /**
     * löst einen nodeLookupvorgang aus, dem sich ein valueStore anschließt.
     * Speichert somit ein Datum im Netzwerk.
     * @param {Object} doc das zu speichernde Dokument
     */
    this.storeInNetwork = function(doc){
        var nodeLookupCallback = function(msg){
            var storeMsg = {
                "head" : {
                    "service": "public",
                    "action": "valueStore"
                },
                "body": doc
            };
            peerWeb.log("Store Document with titleID: "+doc.titleID+" on "+msg.body.resultList.length+" peers", "log");
            msg.body.resultList.forEach(function(element){
                storeMsg.head.to = element.id;
                sendMessage(storeMsg);
            });
        }, 
        msg = {
            body : {
                id: doc.titleID,
                resultList: []
            }
        };
        nodeLookup(msg, undefined, nodeLookupCallback);
    };
    
    /**
     * sucht die übergebene ID im Netzwerk, ruft den callback auf, wenn gefunden (mit document) oder nicht (mit undefined).
     * @param {String} id
     * @param {Function} callback
     */
    this.searchInNetwork = function(id, callback){
        var valueLookupCallback = function(msg){
            if(msg.head.code !== 200){
                callback(undefined);
            }
            else{
                callback(msg.body);
            }
        },
        msg = {
            head: {
                "to": id,
                "service": "public",
                "action": "valueLookup"
            },
            body: {
                "id" : id
            }
        };
        peerWeb.log("Search Document with ID: "+id+" in Network.", "log");
        sendMessage(msg, valueLookupCallback);
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
            for(i = 0; i < part.length; i += 1){
                if(part[i].getReadyState() === 2 || part[i].getReadyState() === 3){
                    part[i].close();
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
        updateConInfo();
    };
};