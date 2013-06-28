(function(Mareeba){
    "use strict";
    Mareeba.namespace("MessageHandler.Network");
    /**
     * message handler for network service.
     * handles messages of/for connection manager and for establishing and  maintaining connections.
     * @author Marten Schälicke
     */
    Mareeba.MessageHandler.Network = (function(){
        var
        conMng, msgHndl, peerID,

        /**
         * initializes a nodeLookup
         * @param {string} id ID to look for
         * @param {function} [callback]
         */
        initNodeLookup = function(id, callback){
            var nearestPeers = conMng.getNearestPeers(id, null, 6),
            msg = {
                "head": {
                    "service": "network",
                    "action" : "nodeLookup",
                    "to" : id
                },
                "body" : {
                    "id" : id,
                    "resultList" : nearestPeers
                }
            };
            msgHndl.send(msg, callback);
        },

        /**
         * handles responses of nodeLookups
         * @param {object} msg nodeLookup response
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        nodeLookupResponse = function(msg, con){
            Mareeba.log("recieved nodeLookupResponse Message for: "+msg.body.id, "log");
            var i, l,
            resultList = msg.body.resultList,
            peerDesc, callback;
            for(i = 0, l = resultList.length; i < l; i += 1){
                peerDesc = resultList[i];
                if(peerDesc.id !== peerID){
                    conMng.newPeerDiscovered(peerDesc);
                }
            }
            callback = msgHndl.getCallback(msg.head.refCode);
            if(typeof(callback) ===  "function"){
                callback(msg);
            }
            msgHndl.deleteMessage(msg.head.refCode);
        },

        /**
         * answers nodeLookups
         * @param {object} msg nodeLookup request
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        nodeLookupRequest = function(msg, con){
            Mareeba.log("recieved nodeLookup Request Message for: "+msg.body.id, "log");
            var nearestPeers = conMng.getNearestPeers(msg.body.id, msg.body.resultList, 6);

            msg.body.resultList = nearestPeers;
            if(nearestPeers[0] === peerID){
                msgHndl.answer(msg, con);
            }
            else{
                msgHndl.forward(msg, con);
            }
        },

        /**
         * decides whether message is a nodeLookup request or response
         * @param {object} msg nodeLookup message
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        nodeLookup = function(msg, con){
            if(msg.head.code === undefined && msg.head.to !== peerID){
                nodeLookupRequest(msg, con);
            }
            else{
                nodeLookupResponse(msg, con);
            }
        },

        /**
         * handles peerDescription messages
         * @param {object} msg peerDescription message
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        peerDescription = function(msg, con){
            if(msg.head.code === undefined){
                Mareeba.log("recieved peerDescription (as Request) Message", "log");
                var peerDesc = msg.body.peerDescription;
                conMng.peerDescriptionRecieved(peerDesc, con);
                msgHndl.answer(msg, con, 200);
            }
            else{
                msgHndl.deleteMessage(msg.head.refCode);
                Mareeba.log("recieved peerDescription (as Response) Message", "log");
            }
        },

        /**
         * handles peerConnectionDescription messages (gives them to connectionmanager or forwards them)
         * @param {object} msg peerConnectionDescription message
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        pcDescription = function(msg){
            if(msg.head.to === peerID){
                conMng.pcDescriptionRecieved(msg.head.from, msg.body);
            }
            else{
                msgHndl.forward(msg);
            }
        },

        /**
         * handles iceProcess messages (gives them to connectionmanager or forwards them)
         * @param {object} msg iceProcess message
         * @param {Mareeba.Connection} con connection via which the message was received
         */
        iceProcess = function(msg){
            if(msg.head.to === peerID){
                conMng.iceProcess(msg.head.from, msg.body);
            }
            else{
                msgHndl.forward(msg);
            }
        },

        /**
         * forwards message to the corresponding handler method based on action-field in message header
         * @param {object} msg received network service message
         * @param {Mareeba.Connection} con connection via which the message was received
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
                    Mareeba.log("recieved Message for unknown action of network service: "+msg.head.action, "warn");
                break;
            }
        },

        /**
         * initializes the network message handler
         * @param {object} config configurationobject
         */
        init = function(config){
            peerID = config.peer.id;
            conMng = config.connectionManager || Mareeba.ConnectionManager;
            msgHndl = config.messageHandler || Mareeba.MessageHandler;
            msgHndl.setServiceHandler(Mareeba.MessageHandler.Network, "network");
        };

        return {
            "initNodeLookup" : initNodeLookup,
            "handleMessage" : handleMessage,
            "init" : init
        };
    }());
}(Mareeba));
