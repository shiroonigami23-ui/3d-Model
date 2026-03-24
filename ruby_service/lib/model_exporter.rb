require "json"

module ModelVault
  class ModelExporter
    def initialize(models)
      @models = models
    end

    def to_markdown
      lines = []
      lines << "# Model Catalog Export"
      lines << ""
      lines << "| ID | Name | Category | Size (KB) |"
      lines << "|---|---|---|---:|"
      @models.each do |m|
        lines << "| #{m['id']} | #{m['name']} | #{m['category']} | #{(m['size_bytes'].to_f / 1024.0).round(2)} |"
      end
      lines.join("\n")
    end

    def to_json
      JSON.pretty_generate(@models)
    end

    def to_csv
      out = +"id,name,category,file,path,size_bytes\n"
      @models.each do |m|
        out << [
          esc(m["id"]), esc(m["name"]), esc(m["category"]),
          esc(m["file"]), esc(m["path"]), m["size_bytes"].to_i
        ].join(",")
        out << "\n"
      end
      out
    end

    private

    def esc(value)
      "\"#{value.to_s.gsub('"', '""')}\""
    end
  end
end
