(function(Mareeba, window){
    "use strict";
    if(!!window.WebSocket){
        Mareeba.namespace("Connection.WebSocket");
        /**
         * Wrapper for WebSocket based connections
         * @class Mareeba.Connection.WebSocket
         * @extends Mareeba.Connection
         * @param {Mareeba.PeerDescription} peerDescription of far peer
         * @param {Object} configurationobject
         */
        Mareeba.Connection.WebSocket = function(__peerDesc, __config){
            Mareeba.Connection.WebSocket.parent.init.call(this, __peerDesc, __config);
            Mareeba.log("Trying to connect to: "+this._peerDesc.ws, "info");
            /**
             * @private
             * @type {WebSocket}
             * @memberOf Mareeba.Connection.WebSocket#
             */
            this._connection = new WebSocket(this._peerDesc.ws);
            this._connection.onerror = this._config.onerror;
            this._connection.onclose = this._config.onclose;
            this._connection.onmessage = this._proxy(this._config.onmessage);
            this._connection.onopen = this._proxy(this._config.onopen);
        };
        
        Mareeba.Connection.WebSocket.parent = Mareeba.Connection.prototype;
        
        Mareeba.Connection.WebSocket.prototype = (function(){
            var
            /**
             * sends the given message via websocket.
             * @method _send
             * @private
             * @param {String} msg message to be send
             * @returns {Boolean} could message be send
             * @memberOf Mareeba.Connection.WebSocket#
             */
            send = function(msg){
                return this._connection.send(msg);
            },
            
            /**
             * proxies functions
             * @method _proxy
             * @private
             * @param  {Function} func function to be proxied
             * @memberOf Mareeba.Connection.WebSocket#
             */
            proxy = function(func){
                var self = this;
                return function(){
                    return func.apply(self, arguments);
                };
            },

            /**
             * returns the readyState of the underlying connection.
             * @returns {Number} readyState
             * @memberOf Mareeba.Connection.WebSocket#
             */
            getReadyState = function(){
                return this._connection.readyState;
            },

            /**
             * closes the connection and frees ressources.
             * @memberOf Mareeba.Connection.WebSocket#
             */
            close = function(){
                this._connection.onclose = function(){};
                this._connection.close();
                this._connection = null;
                this._config = null;
            };

            return {
                _send: send,
                _proxy: proxy,
                getReadyState: getReadyState,
                close: close
            }
        }());
    }
}(Mareeba, window));