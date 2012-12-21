/**
 * @author Marten Schälicke
 */

peerWeb.namespace("Storage");
peerWeb.Storage = function(){
    "use strict";
    
    this.getPeerID = function(){
        return localStorage.getItem("peerID");
    };
    this.setPeerID = function(id){
        return localStorage.setItem("peerID", id);
    };
};