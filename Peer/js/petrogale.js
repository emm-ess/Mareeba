var Petrogale = (function(window, document, $, Mareeba){
    "use strict";
    var baseURL = "http://localhost/peerWeb/development/Peer/",
    aClickFunction, onLocationChange,  indexScreen, documentSearchButtonClick, newDocumentButtonClick,
    peerReady, updateConnectivityInfo;

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
        Mareeba.log("new Browser location: "+newLoc, "log");
        exactLoc = newLoc.split("-");
        $('#main section').hide();
        if(exactLoc[0] === "document"){
            $('#document-screen').html('<h2>Load Document</h2>');
            $('#document-screen').show();
            Mareeba.documentSearchByID( exactLoc[1], function(doc){
                if(doc !== undefined){
                    $('#document-screen').html(doc.toHTML());
                }
                else{
                    $('#document-screen').html('<h2>The document couldn\'t be found.</h2>');
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
        document.title = state.title+" | Petrogale";
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
        Mareeba.getAllIndexEntries(showIndecies);
    };

    /**
     * nimmt den Suchbegriff entgegen und leitet ihn weiter
     */
    documentSearchButtonClick = function(event){
        event.preventDefault();
        $('#inner-overlay').html('<h2>searching</h2>');
        $('#overlay').fadeIn('slow');
        Mareeba.searchDocument( $('#search-document-title').val().trim(), function(doc){
            if(doc !== undefined){
                $('#search-screen').html(doc.toHTML());
            }
            else{
                $('#search-screen').html('<h2>The document couldn\'t be found.</h2>');
            }
            var state = {
                title: "Suche",
                url: "search"
            };
            history.pushState(state, "Search", "search");
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
            Mareeba.newDocument(document);
            alert("The document will be saved and available in just a moment.");
        }
        else {
            alert("The title or content is missing.");
        }
    };

    /**
     * Entfernt den Overlay
     */
    peerReady = function(){
        Mareeba.setLogDisplay(null);
        $('#overlay').fadeOut('slow');
    };

    /**
     * updates the the number of connections shown
     */
    updateConnectivityInfo = function(peerCons, superPeerCons, openingCons){
        if(peerCons + superPeerCons === 1){
            $('#con-info').html("activ connection: Peers: "+peerCons+" SuperPeers: "+superPeerCons+" ("+openingCons+" on the way)");
        }
        else{
            $('#con-info').html("activ connections: Peers: "+peerCons+" SuperPeers: "+superPeerCons+" ("+openingCons+" on the way)");
        }
    };

    /**
     * Initierungscode
     */
    (function(){
        $('#inner-overlay').html("<h2>initialising petrogale</h2><div id=\"startlogarea\"></div>");
        Mareeba.setLogDisplay(function(msg){
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
    }());

    $(document).ready(function(){
        var peer = new Mareeba.Peer({
            onReady : peerReady,
            updateConnectivityInfo : updateConnectivityInfo,
            defaultHelper : baseURL+"defaultHelpers.json"
        });
    });
}(window, document, jQuery, Mareeba));

