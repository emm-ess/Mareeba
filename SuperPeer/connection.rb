require 'em-websocket'
require 'json'
require 'logger'

class Connection
  attr_accessor :description, :connection
  def initialize con, logger
    @connection = con
    @logger = logger
  end
  
  def send msg
    if not msg.is_a? String
      msg = msg.to_json
    end 
    @logger.debug "peerID: "+description['ID']+" msg: "+msg
    @connection.send msg
  end
end