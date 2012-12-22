/**
 * @author Marten Schälicke
 */
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

peerWeb.namespace("Storage");
peerWeb.Storage = function(){
    "use strict";
    var db,
    openIndexedDB, checkRequiredContent;
    
    indexedDB.onerror = function(e){
        peerWeb.log("IndexedDB Error: "+e.target.errorCode, "error");
    };
    
    //request IndexedDB, alter DB if needed
    openIndexedDB = function() {
        peerWeb.log("Trying to open IndexedDB.", "info");
        var version = 1, 
        request = indexedDB.open("peerWeb", version);

        request.onsuccess = function(e) {
            db = e.target.result;
            peerWeb.log("IndexedDB opened.", "info");
            checkRequiredContent();
        };

        request.onerror = function(e){
            peerWeb.log("Opening IndexedDB Error: "+e.target.errorCode, "error");
        };
        
        // This event is only implemented in recent browsers
        request.onupgradeneeded = function(e) { 
            // Update object stores and indices .... 
            db = e.target.result;
            peerWeb.log("IndexedDB opened. - Upgrade needed.", "info");
            
            //for the moment only used for superpeers
            db.createObjectStore("peers", { keyPath: "wsAddress" });
            checkRequiredContent();
        };
    };
    
    checkRequiredContent = function(){
        peerWeb.log("Checking IndexedDB storage.", "info");
    };
    
    //init
   openIndexedDB();
    
    //public
    this.getPeerID = function(){
        return localStorage.getItem("peerID");
    };
    this.setPeerID = function(id){
        return localStorage.setItem("peerID", id);
    };
};