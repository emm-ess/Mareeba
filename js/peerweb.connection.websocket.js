/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Connection.WebSocket");
peerWeb.Connection.WebSocket = function(config){
    "use strict";
    var connection;
    
    //init-code
    (function(){
        peerWeb.log("Trying to connect to: "+config.connectTo, "info");
        connection = new WebSocket(config.connectTo);
        connection.onerror = config.onerror;
        connection.onclose = config.onclose;
        connection.onmessage = config.onmessage;
        connection.onopen = config.onopen;
    })();
    
    this.send = function(msg){
        connection.send(msg);
    };
    
    this.getReadyState = function(){
        return connection.readyState;
    };
};