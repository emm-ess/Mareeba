/**
 * @author Marten Schälicke
 */
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

peerWeb.namespace("Storage");
peerWeb.Storage = function(config){
    "use strict";
    var that = this, db, usable = false,
    openIndexedDB, checkRequiredContent, ready;
    
    indexedDB.onerror = function(e){
        peerWeb.log("IndexedDB Error: "+e.target.errorCode, "error");
    };
    
    ready = function(){
        //check all needed dependencies
        usable = true;
        peerWeb.log("Storage fully initialised", "info");
        config.onReady();
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
            
            db.createObjectStore("peers", { keyPath: "id", autoIncrement: true });
            db.createObjectStore("iceServers", { keyPath: "url" });
            //checkRequiredContent();
        };
    };
    
    checkRequiredContent = function(){
        var defaultHelper, defaultPeersLoaded = false, defaultTurnStunLoaded = false,
        loadDefaultPeers, loadDefaultTurnStun, saveDefaults;
        
        loadDefaultPeers = function(event) {
            var cursor = event.target.result,
            wsAddress;
            if (cursor) {
                wsAddress = cursor.value.wsAddress;
                defaultHelper.superPeers = peerWeb.removeFromArray(wsAddress, defaultHelper.superPeers);
                cursor.continue();  //continue marked as failure, but isn't
            }
            else {
                defaultPeersLoaded = true;
                saveDefaults();
            }
        };
        
        loadDefaultTurnStun = function(event) {
            var cursor = event.target.result,
            url;
            if (cursor) {
                url = cursor.value.url;
                defaultHelper.iceServers = peerWeb.removeFromArray(url, defaultHelper.iceServers);
                cursor.continue();  //continue marked as failure, but isn't
            }
            else {
                defaultTurnStunLoaded = true;
                saveDefaults();
            }
        };
        
        saveDefaults = function(){
            if(defaultPeersLoaded && defaultTurnStunLoaded){
                peerWeb.log("DefaultHelpers filtered, begin to save.", "info");
                var trans = db.transaction(["peers", "iceServers"], "readwrite"),
                peerStore = trans.objectStore("peers"), 
                turnStunStore = trans.objectStore("iceServers"),
                i = 0, tempObject;
                trans.oncomplete = function(event) {
                    peerWeb.log("DefaultHelpers saved.", "info");
                    ready();
                };
                trans.onerror = db.onerror;
                for (i = 0; i < defaultHelper.superPeers.length; i++) {
                    tempObject = {
                        "wsAddress": defaultHelper.superPeers[i]
                    };
                    peerStore.add(tempObject);
                }
                for (i = 0; i < defaultHelper.iceServers.length; i++) {
                    tempObject = {
                        "url": defaultHelper.iceServers[i]
                    };
                    turnStunStore.add(tempObject);
                }
            }
        };
        
        peerWeb.log("Checking IndexedDB storage.", "info");
        $.ajax({
            "url": "defaultHelpers.json",
            "dataType": "json",
            "cache": false,
            "success": function(data){
                var trans = db.transaction(["peers", "iceServers"], "readonly"),
                peerStore = trans.objectStore("peers"), 
                turnStunStore = trans.objectStore("iceServers");
                peerWeb.log("DefaultHelpers loaded", "info");
                defaultHelper = data;
                peerStore.openCursor().onsuccess = loadDefaultPeers;
                turnStunStore.openCursor().onsuccess = loadDefaultTurnStun;
            },
            "error": function(jqXHR, textStatus, errorThrown){
                peerWeb.log("Couldn't load defaultHelpers: "+textStatus, "info");
            }
        });
    };
    
    //init
   openIndexedDB();
    
    //public
    this.isUsable = function(){
        return usable;
    };
    
    this.getPeerID = function(){
        return localStorage.getItem("peerID");
    };
    this.setPeerID = function(id){
        return localStorage.setItem("peerID", id);
    };
    
    this.storeMessage = function(key, value){
        return sessionStorage.setItem("msg-"+key, value);
    };
    this.getMessage = function(key){
        return sessionStorage.getItem("msg-"+key);
    };
    this.deleteMessage = function(key){
        return sessionStorage.removeItem("msg-"+key);
    };
    
    this.getPeers = function(filter, callback){
        var peerStore = db.transaction(["peers"], "readonly").objectStore("peers"),
        peers = [];
        peerStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                filter(cursor.value, peers);
                cursor.continue();
            }
            else {
                //peerWeb.log("got all Peers in indexedDB", "log");
                callback(peers);
            }
        };
    };
    this.getAllPeers = function(callback){
        var peerStore = db.transaction(["peers"], "readonly").objectStore("peers"),
        peers;
        peerStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                peers.push(cursor.value);
                cursor.continue();
            }
            else {
                //peerWeb.log("got all Peers in indexedDB", "log");
                callback(peers);
            }
        };
    };
    this.getAllSuperPeers = function(callback){
        var filter = function(curValue, resultSet){
            if(curValue.wsAddress !== undefined){
                resultSet.push(curValue);
            }
        };
        that.getPeers(filter, function(result){callback(result);});
    };
};