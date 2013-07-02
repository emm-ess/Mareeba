(function(Mareeba, window){
    "use strict";
    if(!!window.WebSocket){
        Mareeba.namespace("Connection.WebSocket");
        /**
         * Wrapper for WebSocket based connections
         * @author Marten Schälicke
         * @class
         * @param {PeerDescription} peerDescription of far peer
         * @param {object} configurationobject
         */
        Mareeba.Connection.WebSocket = function(__peerDesc, __config){
            Mareeba.Connection.WebSocket.parent.init.call(this, __peerDesc, __config);
            Mareeba.log("Trying to connect to: "+this._peerDesc.ws, "info");
            this._connection = new WebSocket(this._peerDesc.ws);
            this._connection.onerror = this._config.onerror;
            this._connection.onclose = this._config.onclose;
            this._connection.onmessage = this.proxy(this._config.onmessage);
            this._connection.onopen = this.proxy(this._config.onopen);
        };
        
        Mareeba.Connection.WebSocket.parent = Mareeba.Connection.prototype;
        
        Mareeba.Connection.WebSocket.prototype = (function(){
            var
            /**
             * sends the given message via websocket.
             * @param {string} msg message to be send
             * @returns {boolean} could message be send
             */
            send = function(msg){
                return this._connection.send(msg);
            },
            
            /**
             * proxies functions
             * @param  {function} func function to be proxied
             */
            proxy = function(func){
            	var self = this;
            	return function(){
            		return func.apply(self, arguments);
            	};
            },

            /**
             * returns the readyState of the underlying connection.
             * @returns {number} readyState
             */
            getReadyState = function(){
                return this._connection.readyState;
            },

            /**
             * closes the connection and frees ressources.
             */
            close = function(){
                this._connection.onclose = function(){};
                this._connection.close();
                this._connection = null;
                this._config = null;
            };

            return {
                _send: send,
                proxy: proxy,
                getReadyState: getReadyState,
                close: close
            }
        }());
    }
}(Mareeba, window));