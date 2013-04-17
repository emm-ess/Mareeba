peerWeb.supportFor.websocket = window.WebSocket !== undefined;

peerWeb.namespace("Connection.WebSocket");
/**
 * Implementierung der Connection für WebSocket-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config Konfigurationsobjekt enthält Eventhandler
 */
peerWeb.Connection.WebSocket = function(__peerDesc, __config){
    "use strict";
    /**
     * Initierungscode
     */
    peerWeb.Connection.WebSocket.parent.init.call(this, __peerDesc, __config);
    peerWeb.log("Trying to connect to: "+this._peerDesc.ws, "info");
    this._connection = new WebSocket(this._peerDesc.ws);
    this._connection.onerror = this._config.onerror;
    this._connection.onclose = this._config.onclose;
    this._connection.onmessage = $.proxy(this._config.onmessage, this);
    this._connection.onopen = $.proxy(this._config.onopen, this);
    
};
peerWeb.Connection.WebSocket.parent = peerWeb.Connection.prototype;
peerWeb.Connection.WebSocket.prototype = (function(){
    "use strict";
    var
    /**
     * verschickt Nachrichten an den Verbindungspartner
     * @param {String} msg zu verschickende Nachricht als JSON-String
     */
    send = function(msg){
        this._connection.send(msg);
    },
    
    /**
     * gibt den aktuellen Status der zu grundeliegenden Verbindung wieder
     * @return {int} readyState Status der Verbindung
     */
    getReadyState = function(){
        return this._connection.readyState;
    },
    
    close = function(){
        this._connection.onclose = function(){};
        this._connection.close();
        this._connection = null;
        this._config = null;
    };
    
    return {
        _send: send,
        getReadyState: getReadyState,
        close: close
    }
})();
