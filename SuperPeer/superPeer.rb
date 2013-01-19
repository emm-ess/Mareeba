#!/usr/bin/env ruby
require 'optparse'
require 'em-websocket'
require 'json'

options = {}

optparse = OptionParser.new do |opts|
  opts.banner = "Usage: superPeer.rb --host HOSTIP --port PORT"
  
  opts.on('-i', '--host HOSTIP', 'IP of host') do |host|
    options[:host] = host
  end

  opts.on('-p', '--port PORT', Integer, 'port which will be used') do |port|
    options[:port] = port
  end

  options[:debug] = false
  opts.on('-d', '--debug', 'show all messages of em-websockets') do
    options[:debug] = true
  end

  opts.on('-h', '--help', 'Display this screen') do
    puts opts
    exit
  end
end

# check mandatory parameter
# taken from http://stackoverflow.com/questions/1541294/how-do-you-specify-a-required-switch-not-argument-with-ruby-optionparser
begin
  optparse.parse!
  mandatory = [:host, :port]
  missing = mandatory.select{ |param| options[param].nil? }
  if not missing.empty?
    puts "Missing options: #{missing.join(', ')}"
    puts optparse
    exit
  end
rescue OptionParser::InvalidOption, OptionParser::MissingArgument
  puts $!.to_s
  puts optparse
  exit
end

@id = SecureRandom.hex 20


EventMachine.run {
  @peerDescr = {
    :ID => @id,
    :ws => "ws://"+options[:host]+":"+options[:port].to_s
  }
  @connectedPeers = {}
  @newlyConnectedPeers = Array.new

  EventMachine::WebSocket.start(:host => options[:host], :port => options[:port], :debug => options[:debug]) do |ws|

    ws.onopen {
      msg = {:head => {:service => "network", :action => "peerDescription", :from => @id}, :body => {:peerDescription => @peerDescr}}
      msg = JSON.generate msg
      puts "new peer connected, send identity-msg: "+msg
      ws.send(msg)
      @newlyConnectedPeers.push ws
      puts ""
      puts ""
    }

    ws.onmessage { |msg|
      
      puts "msg recieved: "+msg
      msg = JSON.parse! msg
      if msg["head"].has_key?("code")
        #response
      else 
        #request
        if msg["head"]["action"] == "peerDescription"
          @newlyConnectedPeers.delete ws
          @connectedPeers[msg["head"]["from"]] = ws
          msg["head"]["code"] = 200
          msg = JSON.generate msg
          ws.send msg
          puts "response to peerDescription send"
        end
      end
      puts ""
      puts ""
    }

    ws.onclose {
      puts "connection closed"
      key = @connectedPeers.key ws
      if key != nil
        @connectedPeers.delete key
      end
      @newlyConnectedPeers.delete ws
      puts ""
      puts ""
    }
    
    ws.onerror { |error|
      puts error
    }

  end

  puts "SuperPeer started with ID: "+@id
  puts "on Host: "+options[:host]
  puts "on Port: "+options[:port].to_s
}