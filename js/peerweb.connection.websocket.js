/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Connection.WebSocket");
peerWeb.Connection.WebSocket = function(config){
    "use strict";
    var connection = new WebSocket(config.connectTo);
    
    this.send = function(msg){
        connection.send(msg);
    };
};