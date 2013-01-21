peerWeb.namespace("GUI");
/**
 * Nimmt Eingaben des Users entgegen und manipuliert das DOM entsprechend.
 * @author Marten Schälicke
 * @constructor
 */
peerWeb.GUI= function(){
    "use strict";
    var config, baseURL, 
    onLocationChange, articleSearchButtonClick, newArticleButtonClick;
    
    /**
     * passt die GUI entsprechend der URL im Browser an
     * @param {String} newLoc URL ab dem Wurzelverzeichnis von peerWeb
     */
    onLocationChange = function(newLoc){
        if(newLoc === null || newLoc === undefined){
            $('#content nav li').removeClass('active');
            $('li a[href=home]').parent().addClass('active');
            $('#main section').hide();
            $('#home-screen').show();
            return;
        }
        peerWeb.log("new Browser location: "+newLoc, "log");
        $('#content nav li').removeClass('active');
        $('li a[href='+newLoc+']').parent().addClass('active');
        $('#main section').hide();
        $('#'+newLoc+'-screen').show();
    };
    
    /**
     * nimmt den Suchbegriff entgegen und leitet ihn weiter
     */
    articleSearchButtonClick = function(event){
        event.preventDefault();
        $('#inner-overlay').html('<h2>suche</h2>');
        $('#overlay').fadeIn('slow');
        config.articleSearch( $('#search-article-title').val().trim(), function(doc){
            if(doc !== undefined){
                $('#article-search-result').html(doc.toHTML());
                $('#overlay').fadeOut('slow');
            }
            else{
                $('#article-search-result').html('<h2>Es wurde kein entsprechender Artikel gefunden.');
                $('#overlay').fadeOut('slow');
            }
        });
    };
    
    /**
     * nimmt die Eingaben zu einem neuen Artikel auf und leitet sie weiter.
     */
    newArticleButtonClick = function(event){
        event.preventDefault();
        var article = {
            title: $('#new-article-title').val().trim(),
            content: $('#new-article-content').val().trim()
        };
        if(article.title !== "" && article.content !== ""){
            config.newArticle(article);
            alert("Der Artikel wurde gespeichert und ist nun im Netzwerk verfügbar.");
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
     * Initierungscode
     */
    (function(){
        $('#inner-overlay').html("<h2>initializiere peerWeb</h2><div id=\"startlogarea\"></div>");
        peerWeb.setLogDisplay(function(msg){
            $('#startlogarea').append("<p>"+msg+"</p>");
        });
        baseURL = window.location.href;
        $('a').click(function(event){
            var state = this.href.slice(baseURL.length);
            event.preventDefault();
            history.pushState(state, this.title, this.href);
            onLocationChange(state);
        });
        window.addEventListener('popstate', function(event) {
            onLocationChange(event.state);
        });
        $('button#new-article-button').click(newArticleButtonClick);
        $('button#article-search-button').click(articleSearchButtonClick);
    })();
};