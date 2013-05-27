require 'logger'
require_relative 'connectionManager'
require_relative 'connection'
require_relative 'documentManager'
require_relative 'messageHandler'

class PublicMessageHandler
  def initialize(msgHndl, peerID, logger)
    @msgHndl = msgHndl
    @msgHndl.setServiceHandler(self, "public")
    @netMsgHndl = @msgHndl.getServiceHandler("network")
    @peerID = peerID
    @logger = logger
  end
  
  def handleMessage(msg, con)
    case msg["head"]["action"]
    when "valueStore"
      valueStore(msg, con)
    when "valueLookup"
      valueLookup(msg, con)
    else
      @logger.info "recieved Message for unknown action of public service: "+msg["head"]["action"]
    end
  end
  
  def valueStoreRequest(msg, con)
    @logger.info "store Document: "+msg["body"].to_s
    @docManager.saveFile(msg["body"]["titleID"], msg["body"])
    if(msg["head"].has_key? "to" and msg["head"]["to"].eql? @peerID)
      @msgHndl.forward(msg)
    else
      @msgHndl.answer(msg, con, 200)
    end
  end
  
  def valueStoreResponse(msg, con)
    @msgHndl.forward(msg)
  end
  
  def valueStore(msg, con)
    if(msg["head"].has_key? "code")
      valueStoreResponse(msg, con)
    else
      valueStoreRequest(msg, con)
    end
  end
  
  def valueLookupRequest(msg, con)
    id = msg["body"]["id"].to_s
    @logger.info "recieved valueLookup Request for id: "+id
    if(@docMng.hasFile? id)
      msg["body"] = @docMng.getFile id
      @msgHndl.answer(msg, con, 200)
    else
      msg["body"] = ""
      @msgHndl.answer(msg, con, 404)
    end
  end
  
  def valueLookupResponse(msg, con)
    @msgHndl.forward(msg)
  end
  
  def valueLookup(msg, con)
    if(msg["head"].has_key? "code")
      valueLookupResponse(msg, con)
    else
      valueLookupRequest(msg, con)
    end
  end
  
  def setDocumentManager(docMng)
    @docMng = docMng
  end
end