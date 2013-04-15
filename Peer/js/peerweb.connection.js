peerWeb.namespace("Connection");
/**
 * Verwaltet Verbindungen und behandelt Anfragen
 * @author Marten Schälicke
 * @constructor
 * @param {Object} conManager Referenz auf den ConnectionManager um Nachrichten weitergeben zu können
 * @param {Object} config Konfigurationsobjekt, welches u.A. den Verbindungspartner enthält
 */
peerWeb.Connection = function(conManager, config){
    "use strict";
    var that = this, description, numID,
    sendDescription;
    this._connection;
    
    

    /**
     * Initierungscode
     */
    (function(){
        var protocol;
        if(config === null || config === undefined){
            throw {
                name: "Error",
                message: "no config Element"
            };
        }
        config.onerror = function(err){peerWeb.log(err, "error");};
        
        config.onclose = function(msg){
            peerWeb.log(msg, "log");
            conManager.connectionClosed();
        };
        
        config.onmessage = function(msg){
            peerWeb.log("Message recieved: "+msg.data, "log");
            msg = JSON.parse(msg.data);
            conManager.handleMessage(msg, that);
        };
        
        config.onopen = function(msg){
            peerWeb.log(msg, "log");
            sendDescription();
        };
        
        protocol = config.connectTo.split(":")[0];
        switch(protocol){
            case "ws":
            case "wss":
                this._connection = new peerWeb.Connection.WebSocket(config);
                break;
            default:
                peerWeb.log("cannot determine connection type: "+protocol, "warn");
                break;
        }
    })();
    
    //public
    
    
    /**
     * liefert den aktuellen Status der Verbindung zurück.
     * die Verbindungsstati entsprechen denen von WebSockets 
     * @return {int} readyState Verbindungsstatus
     */
    this.getReadyState = function(){
        return connection.getReadyState();
    };
    
    /**
     * setzt die Beschreibung des Verbindungspartners.
     * Aus Performanzgründen kann auch die nummerische Version der ID angegeben werden, bei Nichtangabe wird diese sonst generiert.
     * @param {Object} desc peerDescription des Verbindungspartners
     * @param {BigInteger} numID nummerische Variante der ID des Verbindungspartners (optional)
     */
    this.setDescription = function(desc, tNumID){
        description = desc;
        if(tNumID === "undefined"){
            numID = BigInteger.parse(desc.id, 16);
        }
        else{
            numID = tNumID;
        }
    };
    /**
     * gibt die peerDescription des Verbindungspartners zurück
     * @return {Object} description peerDescription des Verbindungspartners
     */
    this.getDescription = function(){
        return description;
    };
    /**
     * gibt die nummerische Version der ID des Verbindungspartners zurück
     * @return {BigInteger} numID nummerische Variante der ID des Verbindungspartners
     */
    this.getNumID = function(){
        return numID;
    };
};
/**
 * implementierte Protokoll Version von peerWeb
 */
peerWeb.Connection.prototype = (function(){
    "use strict";
    var protocolVersion = "0.1",
    sendDescription, send;
    
    /**
     * sendet die Beschreibung des lokalen Knotens an den Verbindungspartner
     */
    sendDescription = function(){
        var descriptionMsg = {
            head: {
                "service": "network",
                "action": "peerDescription"
            },
            body: {
                "peerDescription": conManager.peerDescription
            }
        };
        send(descriptionMsg);
    };
    
    /**
     * prüft eine Nachricht auf erforderliche Felder und setzt diese bei Fehlen
     * @param {Object} msg zu verschickende Nachricht
     * @param {Function} callback Funktion, die bei Antwort aufgerufen werden soll
     */
    send = function(msg, callback){
        var refCode;
        if(typeof msg === String){
            msg = JSON.parse(msg);
        }
        if(msg.head.protocolVersion === undefined){
            msg.head.protocolVersion = this.protocolVersion;
        }
        if(msg.head.from === undefined){
            msg.head.from = conManager.peerDescription.id;
        }
        if(msg.head.refCode === undefined){
            refCode = peerWeb.getRandomHexNumber(40);
            msg.head.refCode = refCode;
        }
        if(msg.head.date === undefined){
            msg.head.date = new Date().getTime();
        }
        msg = JSON.stringify(msg);
        peerWeb.log("Message send: "+msg, "log");
        this._connection.send(msg);
        if(refCode !== undefined){
            config.storeMessage(refCode, msg, callback);
        }
    };
    
    return {
        send : send
    }
})();
