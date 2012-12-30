require 'em-websocket'
require 'json'

EventMachine.run {
  @id = SecureRandom.hex 20
  @connectedPeers = Array.new
  @newlyConnectedPeers = Array.new

  EventMachine::WebSocket.start(:host => "192.168.15.205", :port => 8080, :debug => false) do |ws|

    ws.onopen {
      msg = {"head" => {"service" => "network", "action" => "peerIdentity", "from" => @id}, "body" => {}}
      msg = JSON.generate msg
      puts "new peer connected, send identity-msg: "+msg
      ws.send(msg)
      @newlyConnectedPeers.push ws
    }

    ws.onmessage { |msg|
      # just for the prototype react with 200 ok for every message
      @newlyConnectedPeers.each{ |x| x.send msg }
      puts "msg recieved: "+msg
      JSON.parse! msg
    }

    ws.onclose {
      @connectedPeers.delete ws
    }
    
    ws.onerror { |error|
      puts error
    }

  end

  puts "SuperPeer started with ID: "+@id
}