window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

peerWeb.supportFor.indexeddb = window.indexedDB !== undefined;
peerWeb.supportFor.webstorage = window.indexedDB !== undefined;

peerWeb.namespace("Storage");
/**
 * StorageWrapper der einen einfachen Zugriff auf alle Speichermöglichkeiten schafft.
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config Konfigurtionsobjekt
 */
peerWeb.Storage = function(config){
    "use strict";
    var that = this, db, usable = false;
    
    /**
     * Initialierungscode
     * öffnet die IndexedDB und richtet die benötigten Speicher ein. Prüft zudem, ob es neue Einträge in der Datei defaultHelpers.json gibt.
     * setzt das Flag, ob die erforderlichen Speicherorte und somit das Speichermodul von peerWeb genutzt werden kann.
     * ruft zudem den in dem Konfigurationsobjekt gespeicherten Callback für onReady auf.
     */
(function(){
        var openIndexedDB, checkRequiredContent, ready;
        indexedDB.onerror = function(e){
            peerWeb.log("IndexedDB Error: "+e.target.errorCode, "error");
        };
        
        ready = function(){
            usable = true;
            peerWeb.log("Storage fully initialised", "info");
            config.onReady();
        };
        
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
                
                if(!db.objectStoreNames.contains("employee")){
                    db.createObjectStore("peers", { keyPath: "id", autoIncrement: true });
                }
                if(!db.objectStoreNames.contains("iceServers")){
                    db.createObjectStore("iceServers", { keyPath: "url" });
                }
                if(!db.objectStoreNames.contains("index")){
                    db.createObjectStore("index", { keyPath: "titleID" });
                }
                if(!db.objectStoreNames.contains("pubDocuments")){
                    db.createObjectStore("pubDocuments", { keyPath: "titleID" });
                }
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
   })();
    
    /**
     * gibt zurück, ob alle gebrauchten Speichermöglichkeiten geladen werden konnten und das Speichermodul nutzbar ist.
     * @return {bool} usable Benutzbarkeit des Storagemoduls
     */
    this.isUsable = function(){
        return usable;
    };
    
    /**
     * Getter für die lokale PeerID
     * @return {String} peerID die ID des lokalen Peers
     * @return null wenn keine PeerID gefunden werden konnte
     */
    this.getPeerID = function(){
        return localStorage.getItem("peerID");
    };
    /**
     * schreibt den gegebenen String als lokale PeerID in die Datenbank
     * @param {String} peerID lokale PeerID
     * @return {bool} couldSave
     */
    this.setPeerID = function(id){
        return localStorage.setItem("peerID", id);
    };
    
    /**
     * schreibt die gegebene Nachricht in den SessionStorage
     * @param {String} key ReferenzCode der Nachricht
     * @param {String} value die Nachricht selber
     */
    this.storeMessage = function(key, value){
        return sessionStorage.setItem("msg-"+key, value);
    };
    /**
     * gibt für einen Referenzcode die abgelegte Nachricht zurück.
     * @param {String} key ReferenzCode der Nachricht
     * @return {String} msg die Nachricht
     * @return null wenn kein Eintrag gefunden werden konnte
     */
    this.getMessage = function(key){
        return sessionStorage.getItem("msg-"+key);
    };
    /**
     * löscht die zu dem gegebenen Referenzcode gehörende Nachricht
     * @param {String} key ReferenzCode der Nachricht
     * @return {String} msg die Nachricht
     */
    this.deleteMessage = function(key){
        return sessionStorage.removeItem("msg-"+key);
    };
    
    /**
     * gibt eine gefilterte Liste von Peers an den Callback
     * @param {Function} filter Filterfunktion zum aussortieren nicht benötigter Peers
     * @param {Function} callback die aufzurufende Funktion
     */
    this.getPeers = function(filter, callback){
        var peerStore = db.transaction("peers").objectStore("peers"),
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
    /**
     * gibt alle gespeicherten Peers an den Callback
     * @param {Function} callback die aufzurufende Funktion
     */
    this.getAllPeers = function(callback){
        var peerStore = db.transaction("peers").objectStore("peers"),
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
    /**
     * gibt alle gespeicherten SuperPeers an den Callback
     * @param {Function} callback die aufzurufende Funktion
     */
    this.getAllSuperPeers = function(callback){
        var filter = function(curValue, resultSet){
            if(curValue.wsAddress !== undefined){
                resultSet.push(curValue);
            }
        };
        that.getPeers(filter, function(result){callback(result);});
    };
    
    /**
     * speichert das gegebene Objekt in die Datenbank und fügt einen Eintrag in den Index hinzu.
     * @param {Object} doc Data-Objekt des Dokuments
     */
    this.saveDocument = function(doc){
        var trans = db.transaction(["index", "pubDocuments"], "readwrite"),
        indexStore = trans.objectStore("index"), 
        pubDocStore = trans.objectStore("pubDocuments"),
        indexEntry = {
            "titleID" : doc.titleID,
            "title": doc.title
        };
        trans.oncomplete = function(event) {
            peerWeb.log("Document saved and index updated.", "info");
        };
        trans.onerror = db.onerror;
        pubDocStore.add(doc);
        indexStore.add(indexEntry);
    };
    
    /**
     * lädt das Dokument mit der gegebenen ID aus der IndexedDB.
     * übergibt undefined wenn Dokument nicht gefunden wurde.
     * @param {String} id
     * @param {Function} callback Funktion, welche anschließend aufgerufen wird.
     */
    this.getDocument = function(id, callback){
        var request = db.transaction("pubDocuments").objectStore("pubDocuments").get(id);
        request.onsuccess = function(event){
            var result = request.result;
            callback(result);
        };
    };
    
    /**
     * lädt alle lokalen Indexeinträge und übergibt diese dem callback
     * @param {Function} callback
     */
    this.getAllIndexEntries = function(callback){
        var indexStore = db.transaction("index").objectStore("index"),
        indecies = [];
        indexStore.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                indecies.push(cursor.value);
                cursor.continue();
            }
            else {
                //peerWeb.log("got all Peers in indexedDB", "log");
                callback(indecies);
            }
        };
    };
};