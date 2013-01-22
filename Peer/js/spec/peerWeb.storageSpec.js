describe("Storage", function(){
    var storage, 
    peerID,
    spy, spy2;
    
    beforeEach(function(){
        storage = new peerWeb.Storage();
        peerID = storage.getPeerID();
    });
    
    afterEach(function(){
        storage.setPeerID(peerID);
    });
    
    it("should get the same back like it is saved", function(){
        var test = "234", test2 = "qwertzui";
        storage.setPeerID(test);
        expect(storage.getPeerID()).toEqual(test);
        
        storage.storeMessage(test, test2);
        expect(storage.getMessage(test)).toEqual(test2);
    });
    
    it("should delete Messages", function(){
        var test = "234", test2 = "qwertzui";
        
        storage.storeMessage(test, test2);
        storage.deleteMessage(test);
        expect(storage.deleteMessage(test)).not.toBeDefined();
    });
    
    /*it("should call the filter method", function(){
        spy = jasmine.createSpy('filter');
        spy2 = jasmine.createSpy('callback');
        
        storage.getPeers(spy, spy2);
        
        expect(spy).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });*/ // brauch wegen der IndexedDB mehr Zeit bei der Anfrage
    
});