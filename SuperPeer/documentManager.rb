require 'json'
require 'logger'

class DocumentManager 
  def initialize logger
    @documents = Array.new
    @logger = logger
    if File.directory? "documents"
      tempDocs = Dir.glob "documents/*.pwd"
      tempDocs.each do |docPath|
        if docPath.end_with? ".pwd"
          @documents.push docPath[10,40]
        end
      end
    else
      Dir.mkdir "documents"
    end
  end
  
  def hasFile? id
    @logger.debug @documents.to_s
    return @documents.include? id
  end
  
  def getFile id
    content = nil
    if self.hasFile? id
      file = nil
      begin
        file = File.new "documents/"+id+".pwd"
        content = file.read
        content = JSON.parse! content
      rescue => error
        @logger.error "Error while reading File: "+error.backtrace
      ensure
        file.close
      end
    end
    return content
  end
  
  def saveFile id, content
    file = nil
    begin
      file = File.new("documents/"+id+".pwd", "w")
      json = JSON.generate content
      file.write json
      @documents.push id
    rescue => error
      @logger.error "Error while writing to File: "+error.backtrace
    ensure
      file.close
    end
  end
end