(function(Mareeba, window, $){
    "use strict";
    window.indexedDB      = window.indexedDB      || window.mozIndexedDB         || window.webkitIndexedDB  || window.msIndexedDB;
    window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    window.IDBKeyRange    = window.IDBKeyRange    || window.webkitIDBKeyRange    || window.msIDBKeyRange;

    if(!!window.indexedDB && !!window.indexedDB){
        Mareeba.namespace("Storage");
        /**
         * StorageWrapper der einen einfachen Zugriff auf alle Speichermöglichkeiten schafft.
         * @author Marten Schälicke
         */
        Mareeba.Storage = (function(){
            var db, usable = false,
            indexedDB = window.indexedDB,
            readwrite =  window.IDBTransaction.READ_WRITE || "readwrite", //used as fallback for old API-Version

            /**
             * gibt zurück, ob alle gebrauchten Speichermöglichkeiten geladen werden konnten und das Speichermodul nutzbar ist.
             * @return {bool} usable Benutzbarkeit des Storagemoduls
             */
            isUsable = function(){
                return usable;
            },

            /**
             * Getter für die lokale PeerID
             * @return {String} peerID die ID des lokalen Peers
             * @return null wenn keine PeerID gefunden werden konnte
             */
            getPeerID = function(){
                return localStorage.getItem("peerID");
            },
            /**
             * schreibt den gegebenen String als lokale PeerID in die Datenbank
             * @param {String} peerID lokale PeerID
             * @return {bool} couldSave
             */
            setPeerID = function(id){
                return localStorage.setItem("peerID", id);
            },

            /**
             * schreibt die gegebene Nachricht in den SessionStorage
             * @param {String} key ReferenzCode der Nachricht
             * @param {String} value die Nachricht selber
             */
            storeMessage = function(key, value){
                return sessionStorage.setItem("msg-"+key, value);
            },
            /**
             * gibt für einen Referenzcode die abgelegte Nachricht zurück.
             * @param {String} key ReferenzCode der Nachricht
             * @return {String} msg die Nachricht
             * @return null wenn kein Eintrag gefunden werden konnte
             */
            getMessage = function(key){
                return sessionStorage.getItem("msg-"+key);
            },
            /**
             * löscht die zu dem gegebenen Referenzcode gehörende Nachricht
             * @param {String} key ReferenzCode der Nachricht
             * @return {String} msg die Nachricht
             */
            deleteMessage = function(key){
                return sessionStorage.removeItem("msg-"+key);
            },

            /**
             * gibt eine gefilterte Liste von Peers an den Callback
             * @param {Function} filter Filterfunktion zum aussortieren nicht benötigter Peers
             * @param {Function} callback die aufzurufende Funktion
             */
            getPeers = function(filter, callback){
                var peerStore = db.transaction("peers").objectStore("peers"),
                peers = [];
                peerStore.openCursor().onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        filter(cursor.value, peers);
                        cursor.continue();
                    }
                    else {
                        //Mareeba.log("got all Peers in indexedDB", "log");
                        callback(peers);
                    }
                };
            },

            /**
             * gibt alle gespeicherten Peers an den Callback
             * @param {Function} callback die aufzurufende Funktion
             */
            getAllPeers = function(callback){
                var peerStore = db.transaction("peers").objectStore("peers"),
                peers;
                peerStore.openCursor().onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        peers.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        //Mareeba.log("got all Peers in indexedDB", "log");
                        callback(peers);
                    }
                };
            },

            /**
             * gibt alle gespeicherten SuperPeers an den Callback
             * @param {Function} callback die aufzurufende Funktion
             */
            getAllSuperPeers = function(callback){
                var filter = function(curValue, resultSet){
                    if(curValue.wsAddress !== undefined){
                        resultSet.push(curValue);
                    }
                };
                getPeers(filter, function(result){callback(result);});
            },

            /**
             * speichert das gegebene Objekt in die Datenbank und fügt einen Eintrag in den Index hinzu.
             * @param {Object} doc Data-Objekt des Dokuments
             */
            saveDocument = function(doc){
                var trans = db.transaction(["index", "pubDocuments"], readwrite),
                indexStore = trans.objectStore("index"),
                pubDocStore = trans.objectStore("pubDocuments"),
                indexEntry = {
                    "titleID" : doc.titleID,
                    "title": doc.title
                };
                trans.oncomplete = function(event) {
                    Mareeba.log("Document saved and index updated.", "info");
                };
                trans.onerror = db.onerror;
                pubDocStore.put(doc);
                indexStore.put(indexEntry);
            },

            /**
             * lädt das Dokument mit der gegebenen ID aus der IndexedDB.
             * übergibt undefined wenn Dokument nicht gefunden wurde.
             * @param {String} id
             * @param {Function} callback Funktion, welche anschließend aufgerufen wird.
             */
            getDocument = function(id, callback){
                var request = db.transaction("pubDocuments").objectStore("pubDocuments").get(id);
                request.onsuccess = function(event){
                    var result = request.result;
                    callback(result);
                };
            },

            /**
             * lädt alle lokalen Indexeinträge und übergibt diese dem callback
             * @param {Function} callback
             */
            getAllIndexEntries = function(callback){
                var indexStore = db.transaction("index").objectStore("index"),
                indecies = [];
                indexStore.openCursor().onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        indecies.push(cursor.value);
                        cursor.continue();
                    }
                    else {
                        //Mareeba.log("got all Peers in indexedDB", "log");
                        callback(indecies);
                    }
                };
            },

            /**
             * Initialierungscode
             * öffnet die IndexedDB und richtet die benötigten Speicher ein. Prüft zudem, ob es neue Einträge in der Datei defaultHelpers.json gibt.
             * setzt das Flag, ob die erforderlichen Speicherorte und somit das Speichermodul von Mareeba genutzt werden kann.
             * ruft zudem den in dem Konfigurationsobjekt gespeicherten Callback für onReady auf.
             */
            init = function(config){
                var
                ready = function(){
                    usable = true;
                    Mareeba.log("Storage fully initialised", "info");
                    config.onReady();
                },

                checkRequiredContent = function(){
                    var defaultHelper, defaultPeersLoaded = false, defaultTurnStunLoaded = false,
                    loadDefaultPeers, loadDefaultTurnStun, saveDefaults;

                    loadDefaultPeers = function(event) {
                        var cursor = event.target.result,
                        wsAddress;
                        if (cursor) {
                            wsAddress = cursor.value.wsAddress;
                            defaultHelper.superPeers = Mareeba.removeFromArray(wsAddress, defaultHelper.superPeers);
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
                            defaultHelper.iceServers = Mareeba.removeFromArray(url, defaultHelper.iceServers);
                            cursor.continue();  //continue marked as failure, but isn't
                        }
                        else {
                            defaultTurnStunLoaded = true;
                            saveDefaults();
                        }
                    };

                    saveDefaults = function(){
                        if(defaultPeersLoaded && defaultTurnStunLoaded){
                            Mareeba.log("DefaultHelpers filtered, begin to save.", "info");
                            var trans = db.transaction(["peers", "iceServers"], readwrite),
                            peerStore = trans.objectStore("peers"),
                            turnStunStore = trans.objectStore("iceServers"),
                            i, tempObject;
                            trans.oncomplete = function(event) {
                                Mareeba.log("DefaultHelpers saved.", "info");
                                ready();
                            };
                            trans.onerror = db.onerror;
                            for (i = 0; i < defaultHelper.superPeers.length; i+=1) {
                                tempObject = {
                                    "wsAddress": defaultHelper.superPeers[i]
                                };
                                peerStore.put(tempObject);
                            }
                            for (i = 0; i < defaultHelper.iceServers.length; i+=1) {
                                tempObject = {
                                    "url": defaultHelper.iceServers[i]
                                };
                                turnStunStore.put(tempObject);
                            }
                        }
                    };

                    Mareeba.log("Checking IndexedDB storage.", "info");
                    Mareeba.ajaxGet({
                        "url": config.defaultHelper,
                        "success": function(data){
                            var trans = db.transaction(["peers", "iceServers"]),
                            peerStore = trans.objectStore("peers"),
                            turnStunStore = trans.objectStore("iceServers");
                            Mareeba.log("DefaultHelpers loaded", "info");
                            defaultHelper = data;
                            peerStore.openCursor().onsuccess = loadDefaultPeers;
                            turnStunStore.openCursor().onsuccess = loadDefaultTurnStun;
                        },
                        "error": function(textStatus){
                            Mareeba.log("Couldn't load defaultHelpers: "+textStatus, "info");
                        }
                    });
                },

                openIndexedDB = function() {
                    Mareeba.log("Trying to open IndexedDB.", "info");
                    var version = 2,
                    doUpgrade = function(versionChangeTransaction){
                        if(!db.objectStoreNames.contains("peers")){
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
                    },
                    request = indexedDB.open("Mareeba", version);

                    request.onsuccess = function(e) {
                        db = e.target.result;
                        Mareeba.log("IndexedDB opened.", "info");
                        if(db.version !== version){
                            // This version of chrome doesn't support the new API.
                            var versionChangeRequest = db.setVersion(version.toString());
                            versionChangeRequest.onsuccess = function (e) {
                                var versionChangeTransaction = versionChangeRequest.result;
                                doUpgrade(versionChangeTransaction);
                                versionChangeTransaction.oncomplete = function(event) {
                                    checkRequiredContent();
                                };
                            };
                        }
                        else{
                            checkRequiredContent();
                        }
                    };

                    request.onerror = function(e){
                        Mareeba.log("Opening IndexedDB Error: "+e.target.errorCode, "error");
                    };

                    // This event is only implemented in recent browsers
                    request.onupgradeneeded = function(e) {
                        // Update object stores and indices ....
                        db = e.target.result;
                        Mareeba.log("IndexedDB opened. - Upgrade needed.", "info");
                        doUpgrade(e.target.transaction);
                        //checkRequiredContent();
                    };
                };

                indexedDB.onerror = function(e){
                    Mareeba.log("IndexedDB Error: "+e.target.errorCode, "error");
                };

                Mareeba.getAllIndexEntries = getAllIndexEntries;

                //init
                openIndexedDB();
            };

            return {
               "isUsable" : isUsable,
               "getPeerID" : getPeerID,
               "setPeerID" : setPeerID,
               "storeMessage" : storeMessage,
               "getMessage" : getMessage,
               "deleteMessage" : deleteMessage,
               "getPeers" : getPeers,
               "getAllPeers" : getAllPeers,
               "getAllSuperPeers" : getAllSuperPeers,
               "saveDocument" : saveDocument,
               "getDocument" : getDocument,
               "getAllIndexEntries" : getAllIndexEntries,
               "init" : init
            };
        }());
    }
}(Mareeba, window, jQuery));
