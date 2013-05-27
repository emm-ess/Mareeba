peerWeb.namespace("GUI");
/**
 * Nimmt Eingaben des Users entgegen und manipuliert das DOM entsprechend.
 * @author Marten Schälicke
 * @constructor
 */
peerWeb.GUI= function(){
    "use strict";
    var config, baseURL = peerWeb.baseURL, 
    onLocationChange, documentSearchButtonClick, newDocumentButtonClick, indexScreen,
    aClickFunction;
    
    /**
     * verhindert das lden der Seite, bei Klick auf einen Link, obwohl die URL im Browser verändert wird.
     */
    aClickFunction = function(event){
        if(this.href.indexOf(baseURL) === 0){
            var state = {
                title: this.title,
                url: this.href.slice(baseURL.length)
            };
            event.preventDefault();
            history.pushState(state, this.title, this.href);
            onLocationChange(state);
        }
    };
    
    /**
     * erzeugt den Indexscreen.
     * holt dazu Daten aus der Datenbank und zeigt diese an.
     */
    indexScreen = function(){
        var showIndecies = function(indecies){
            var indexList = "";
            indecies.forEach(function(element){
                indexList += "<li><a href=\"document-"+element.titleID+"\" title=\""+element.title+"\">"+element.title+"</a></li>";
            });
            $('#a-z-result').html('<ul>'+indexList+'</ul>');
            $('#a-z-result a').click(aClickFunction);
        };
        config.getAllIndexEntries(showIndecies);
    };
    
    /**
     * passt die GUI entsprechend der URL im Browser an
     * @param {Object} newLoc URL ab dem Wurzelverzeichnis von peerWeb
     */
    onLocationChange = function(state){
        var exactLoc, newLoc;
        state = state || history.state;
        if(state === null || state === undefined){
            $('header nav li').removeClass('active');
            $('li a[href=home]').parent().addClass('active');
            $('#main section').hide();
            $('#home-screen').show();
            return;
        }
        newLoc = state.url;
        peerWeb.log("new Browser location: "+newLoc, "log");
        exactLoc = newLoc.split("-");
        $('#main section').hide();
        if(exactLoc[0] === "document"){
            $('#document-screen').html('<h2>Lade Dokument</h2>');
            $('#document-screen').show();
            config.documentSearchByID( exactLoc[1], function(doc){
                if(doc !== undefined){
                    $('#document-screen').html(doc.toHTML());
                }
                else{
                    $('#document-screen').html('<h2>Es wurde kein entsprechendes Dokument gefunden.</h2>');
                }
            });
        }
        else{
            $('header nav li').removeClass('active');
            $('li a[href='+newLoc+']').parent().addClass('active');
            $('#'+newLoc+'-screen').show();
            if(newLoc === "a-z"){
                indexScreen();
            }
        }
        document.title = state.title+" | peerWeb";
    };
    
    /**
     * nimmt den Suchbegriff entgegen und leitet ihn weiter
     */
    documentSearchButtonClick = function(event){
        event.preventDefault();
        $('#inner-overlay').html('<h2>suche</h2>');
        $('#overlay').fadeIn('slow');
        config.documentSearch( $('#search-document-title').val().trim(), function(doc){
            if(doc !== undefined){
                $('#search-screen').html(doc.toHTML());
            }
            else{
                $('#search-screen').html('<h2>Es wurde kein entsprechendes Dokument gefunden.</h2>');
            }
            var state = {
                title: "Suche",
                url: "search"
            };
            history.pushState(state, "Suche", "search");
            $('#overlay').fadeOut('slow');
            onLocationChange(state);
        });
    };
    
    /**
     * nimmt die Eingaben zu einem neuen Artikel auf und leitet sie weiter.
     */
    newDocumentButtonClick = function(event){
        event.preventDefault();
        var document = {
            title: $('#new-document-title').val().trim(),
            content: $('#new-document-content').val().trim()
        };
        if(document.title !== "" && document.content !== ""){
            config.newDocument(document);
            alert("Das Dokument wurde gespeichert und ist nun im Netzwerk verfügbar.");
        }
        else {
            alert("Der Titel oder der Inhalt wurde nicht angegeben.");
        }
    };
    
    /**
     * Entfernt den Overlay
     */
    this.peerReady = function(){
        peerWeb.setLogDisplay(null);
        $('#overlay').fadeOut('slow');
    };
    
    /**
     * erlaubt es das Konfigurationsobjekt nachträglich zu setzen
     */
    this.setConfig = function(conf){
        config = conf;
    };
    
    /**
     * updates the the number of connections shown
     */
    this.updateConnectivityInfo = function(peerCons, superPeerCons, openingCons){
        if(peerCons + superPeerCons === 1){
            $('#con-info').html("aktive Verbindung: Peers: "+peerCons+" SuperPeers: "+superPeerCons+" ("+openingCons+" im Aufbau)");
        }
        else{
            $('#con-info').html("aktive Verbindungen: Peers: "+peerCons+" SuperPeers: "+superPeerCons+" ("+openingCons+" im Aufbau)");
        }
    };
    
    /**
     * Initierungscode
     */
    (function(){
        $('#inner-overlay').html("<h2>initializiere peerWeb</h2><div id=\"startlogarea\"></div>");
        peerWeb.setLogDisplay(function(msg){
            $('#startlogarea').append("<p>"+msg+"</p>");
        });
        $('a').click(aClickFunction);
        window.addEventListener('popstate', function(event) {
            onLocationChange(event.state);
        });
        if(document.URL !== baseURL){
            var state = {
                title: "peerWeb",
                url: document.URL.slice(baseURL.length)
            };
            history.pushState(state, state.title, document.URL);
        }
        $('input#new-document-button').click(newDocumentButtonClick);
        $('input#document-search-button').click(documentSearchButtonClick);
    })();
};