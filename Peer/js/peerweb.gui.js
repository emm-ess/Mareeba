peerWeb.namespace("GUI");
/**
 * Nimmt Eingaben des Users entgegen und manipuliert das DOM entsprechend.
 * @author Marten Schälicke
 * @constructor
 * @param {Object} config
 */
peerWeb.GUI= function(config){
    "use strict";
    
    /**
     * Entfernt den Overlay
     */
    this.peerReady = function(){
        peerWeb.setLogDisplay(null);
        $('#overlay').fadeOut('slow');
    };
    
    /**
     * Initierungscode
     */
    (function(){
        $('#inner-overlay').html("<h2>initializiere peerWeb</h2><div id=\"startlogarea\"></div>");
        peerWeb.setLogDisplay(function(msg){
            $('#startlogarea').append("<p>"+msg+"</p>");
        });
        $('a').click(function(e){
            e.preventDefault();
        });
    })();
};