(function(Mareeba){
    "use strict";
    Mareeba.namespace("Connection");
    /**
     * Connection (Wrapper) to hide differences between used connections.
     * Provides functionalities which are the same for all kinds of connections. 
     * @author Marten Schälicke
     * @class
     */
    Mareeba.Connection = function(){
        return this;
    };

    Mareeba.Connection.prototype = (function(){
        var conManager,

		/**
		 * Strinigfies the message if necessary and sends it
		 * @param {String} msg message to be send
		 * @return {Boolean} could message be send
		 */
        send = function(msg){
            var couldSend = false;
            if(typeof msg !== String){
                msg = JSON.stringify(msg);
            }
            couldSend = this._send(msg);
            Mareeba.log("Message send to Peer: "+this._peerDesc.id+" --- "+msg, "debug");
            return couldSend;
        },
		
		/**
		 * initializing the connection. sets callbacks
		 * @param {PeerDescription} __peerDesc Description of far Peer if already known
		 * @param {Object} __config Configurationobject containing callbacks
		 */
        init = function(__peerDesc, __config){
            var that = this;
            if(__config === null || __config === undefined){
                throw {
                    name: "Error",
                    message: "no config Element"
                };
            }
            this.msgHndl = __config.messageHandler;
            __config.onerror = function(err){Mareeba.log(err, "error");};

            __config.onclose = function(e){
                Mareeba.log(e, "log");
                __config.connectionClosed();
            };

            __config.onmessage = function(msg){
                Mareeba.log("Message recieved: "+msg.data, "debug");
                msg = JSON.parse(msg.data);
                that.msgHndl.handleMessage(msg, that);
            };

            __config.onopen = function(e){
                Mareeba.log("Connection open", "log");
                var descriptionMsg = {
                    head: {
                        "service": "network",
                        "action": "peerDescription"
                    },
                    body: {
                        "peerDescription": __config.peerDescription
                    }
                };
                that.msgHndl.send(descriptionMsg, null, that);
            };

            this._config = __config;
            this._peerDesc = __peerDesc;
        },

        /**
         * sets the description of far peer.
         * @param {PeerDescription} __peerDesc Description of far peer
         * @param {BigInteger} numID numerical ID of far Peer [optional]
         */
        setDescription = function(__peerDesc, __NumID){
            this._peerDesc = __peerDesc;
            if(__NumID === "undefined"){
                this._numID = BigInteger.parse(__peerDesc.id, 16);
            }
            else{
                this._numID = __NumID;
            }
        },

        /**
         * returns the description of the far peer
         * @return {PeerDescription} peer description of far peer
         */
        getDescription = function(){
            return this._peerDesc;
        },

        /**
         * returns the numerical ID of the far peer
         * @return {BigInteger} numID numerical ID of far peer
         */
        getNumID = function(){
            return this._numID;
        };

        return {
            init: init,
            send: send,
            setDescription: setDescription,
            getDescription: getDescription,
            getNumID: getNumID
        };
    }());
}(Mareeba));