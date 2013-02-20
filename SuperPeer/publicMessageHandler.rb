require 'logger'
require_relative 'connectionManager'
require_relative 'connection'

class PublicMessageHandler
  def initialize(conMan, docMan, logger)
    @conManager = conMan
    @docManager = docMan
    @logger = logger
  end
  
  def handle(msg, peer)
    if msg["head"].has_key? "code"
      #response
      @logger.info "response recieved"
    else 
      #request
      handleRequest(msg, peer)
    end
  end
  
  def handleRequest(msg, peer)
    case msg["head"]["action"]
    when "valueStore"
      handleValueStore(msg, peer)
    when "valueLookup"
      handleValueLookup(msg, peer)
    else
      @logger.info "recieved request for unknown action in public service: "+msg["head"]["action"]
    end
  end
  
  def handleValueStore(msg, peer)
    @logger.info "store Document: "+msg["body"].to_s
    @docManager.saveFile(msg["body"]["titleID"], msg["body"])
    msg["body"] = ""
    msg["head"]["to"] = msg["head"]["from"]
    msg["head"]["code"] = 200
    peer.send msg
  end
  
  def handleValueLookup(msg, peer)
    id = msg["body"]["id"].to_s
    @logger.debug "recieved valueLookup for id: "+id
    if(@docManager.hasFile? id)
      msg["body"] = @docManager.getFile id
      msg["head"]["to"] = msg["head"]["from"]
      msg["head"]["code"] = 200
      @logger.info "send Document: "+msg["body"].to_s
      peer.send msg
    else
      msg["body"] = ""
      msg["head"]["to"] = msg["head"]["from"]
      msg["head"]["code"] = 404
      @logger.debug "document id: "+id+" not found"
      peer.send msg
      # routeMessage(msg, peer)
    end
  end
end