peerWeb.namespace("MessageHandler.Network");
/**
 * 
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.MessageHandler.Network = function(config){
    "use strict";
    var 
    conMng,
    msgHndl = config.messageHandler,
    peerID = peerWeb.Peer.id,
    
    initNodeLookup = function(id, callback){
        var nearestPeers = conMng.getNearestPeers(id, []),
        msg = {
            "head": {
                "service": "network",
                "action" : "nodeLookup",
                "to" : id
            },
            "body" : {
                "id" : id,
                "resultList" : nearestPeers.slice(0,6)
            }
        };
        msgHndl.send(msg, callback);
    },
    
    /**
     * 
     */
    nodeLookupResponse = function(msg, con){
        peerWeb.log("recieved nodeLookupResponse Message for: "+msg.body.id, "log");
        var i, l, 
        resultList = msg.body.resultList, 
        peerDesc;
        for(i = 0, l = resultList.length; i < l; i += 1){
            peerDesc = resultList[i];
            if(peerDesc.id !== peerID){
                conMng.newPeerDiscovered(peerDesc);
            }
        }
    },
    
    /**
     * Suche nach nächsten Peers zur gesuchten ID (wird im Body der Nachricht übergeben)
     * ordnet alle Peers und die in der Nachricht übergebenen nach Entfernung zum Datum und schreibt die nächsten 6 Peers in die Liste im Body der Nachricht.
     * Ist der lokale Peer der nähste Peer wird die Nachricht an den Absender zurück geschickt, andernfalls wird sie weitergeroutet @see routeMessage
     * @param {Object} msg nodeLookup-Nachricht, welche behandelt wird
     * @param {peerWeb.Connection} con Verbindung über die die Nachricht geschickt wurd
     */
    nodeLookup = function(msg, con){
        peerWeb.log("recieved nodeLookup Message for: "+msg.body.id, "log");
        if(msg.head.code !== undefined){
            var oldList = msg.body.resultList,
            nearestPeers = conMng.getNearestPeers(msg.body.id, msg.body.resultList);
            
            msg.body.resultList = nearestPeers.slice(0,6);
            if(nearestPeers[0] === peerID){
                msgHndl.answer(msg, con);
            }
            else{
                msgHndl.forward(msg, con);
            }
        }
        else{
            nodeLookupResponse(msg, con);
        }
    },
    
    /**
     * verarbeitet peerDesciption-Nachrichten verbundener Knoten.
     * ordnet den Sender entsprechend seiner Entfernung bzw. ob er ein SuperPeer oder Freund ist, in den entsprechenden Teil der Routing-Tabelle ein.
     * @param {Object} msg peerDescription-Nachricht, welche behandelt wird
     * @param {peerWeb.Connection} con Verbindung über die die Nachricht geschickt wurde
     */
    peerDescription = function(msg, con){
        peerWeb.log("recieved peerDescription Message", "log");
        if(msg.head.code !== undefined){
            var peerDesc = msg.body.peerDescription,
            numID = BigInteger.parse(peerDesc.id, 16);
            con.setDescription(peerDesc, numID);
            msgHndl.answer(msg, con);
            conMng.peerDescriptionRecieved(peerDesc, con, numID);
        }
    },
    
    pcDescription = function(msg){
        if(msg.head.to === peerID){
            conMng.pcDescriptionRecieved(msg.head.from, msg.body);
        }
    },
    
    iceProcess = function(msg){
        if(msg.head.to === peerID){
            conMng.iceProcess(msg.head.from, msg.body);
        }
    },
    
    /**
     * leitet die Nachricht an die entsprechende Methode weiter.
     * verwendet dafür das "action"-Feld im Header der Nachricht
     * @param {Object} msg eingegangene Nachricht
     * @param {peerWeb.Connection} con Verbindung über die diese geschickt wurde
     */
    handleMessage = function(msg, con){
        switch(msg.head.action){
            case "nodeLookup":
                nodeLookup(msg, con);
            break;
            case "peerDescription":
                peerDescription(msg, con);
            break;
            case "pcDescription":
                pcDescription(msg);
            break;
            case "iceProcess":
                iceProcess(msg);
            break;
            default:
                //unknown or unimplemented message. log those to determine if it is an attack
                peerWeb.log("recieved Message for unknown action of network service: "+msg.head.action, "warn");
            break;
        }
    },
    
    setConnectionManager = function(tempConMng){
        conMng = tempConMng;
    },
    
    that = {
        "setConnectionManager" : setConnectionManager,
        "initNodeLookup" : initNodeLookup,
        "handleMessage" : handleMessage
    };
    
    (function(){
        msgHndl.setServiceHandler(that, "network");
    })();
    
    return that;
};