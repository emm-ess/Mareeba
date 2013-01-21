peerWeb.supportFor.websocket = window.WebSocket !== undefined;

peerWeb.namespace("Connection.WebSocket");
/**
 * Implementierung der Connection für WebSocket-Verbindungen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config Konfigurationsobjekt enthält Eventhandler
 */
peerWeb.Connection.WebSocket = function(config){
    "use strict";
    var connection;
    
    /**
     * Initierungscode
     */
    (function(){
        peerWeb.log("Trying to connect to: "+config.connectTo, "info");
        connection = new WebSocket(config.connectTo);
        connection.onerror = config.onerror;
        connection.onclose = config.onclose;
        connection.onmessage = config.onmessage;
        connection.onopen = config.onopen;
    })();
    
    /**
     * verschickt Nachrichten an den Verbindungspartner
     * @param {String} msg zu verschickende Nachricht als JSON-String
     */
    this.send = function(msg){
        connection.send(msg);
    };
    /**
     * gibt den aktuellen Status der zu grundeliegenden Verbindung wieder
     * @return {int} readyState Status der Verbindung
     */
    this.getReadyState = function(){
        return connection.readyState;
    };
};