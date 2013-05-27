require 'logger'
require_relative 'connectionManager'
require_relative 'connection'

class MessageHandler
  def initialize(peerID, logger)
    @peerID = peerID
    @logger = logger
    @serviceHndl = {}
  end
  
  def handleMessage(msg, con)
    if(@serviceHndl.has_key? msg["head"]["service"])
      @serviceHndl[msg["head"]["service"]].handleMessage(msg, con)
    else
      @logger.info "recieved message for unknown service: "+msg["head"]["service"]
    end
  end
  
  def buildMandatoryFields(msg)
    if(!msg["head"].has_key? "protocolVersion")
        msg["head"]["protocolVersion"] = "0.1"
    end
    if(!msg["head"].has_key? "from")
        msg["head"]["from"] = @peerID
    end
=begin
    if(!msg["head"].has_key? "refCode")
        msg["head"]["refCode"] = peerWeb.getRandomHexNumber(40)
    end
    if(!msg["head"].has_key? "date")
        msg["head"]["date"] = new Date().getTime()
    end
=end
    return msg;
  end
  
  def answer(msg, con, code)
    msg["head"]["code"] = code
    msg["head"]["to"] = msg["head"]["from"]
    msg["head"]["from"] = @peerID
    msg = buildMandatoryFields(msg)
    con.send(msg)
  end
  
  def forward(msg)
    msg = buildMandatoryFields(msg)
    return @conMng.route(msg)
  end
  
  def setServiceHandler(handler, service)
    @serviceHndl[service] = handler
  end
  
  def getServiceHandler(service)
    return @serviceHndl[service]
  end
  
  def setConnectionManager(conMng)
    @conMng = conMng
  end
end