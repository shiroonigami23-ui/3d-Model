require "json"
require "pathname"

module ModelVault
  class Catalog
    attr_reader :models

    def initialize(root_dir:)
      @root_dir = Pathname.new(root_dir)
      @models = []
    end

    def scan!
      models_dir = @root_dir.join("assets", "models")
      raise "models directory not found: #{models_dir}" unless models_dir.exist?

      @models = models_dir.glob("*.glb").sort.map do |path|
        build_record(path)
      end
    end

    def grouped
      models.group_by { |m| m["category"] }
    end

    def search(query:, max: 20)
      q = query.to_s.strip.downcase
      return models.first(max) if q.empty?

      scored = models.map do |model|
        score = 0
        score += 3 if model["name"].downcase.start_with?(q)
        score += 2 if model["name"].downcase.include?(q)
        score += 1 if model["category"].downcase.include?(q)
        [model, score]
      end

      scored
        .select { |_, score| score > 0 }
        .sort_by { |model, score| [-score, model["name"]] }
        .first(max)
        .map(&:first)
    end

    def stats
      total_size = models.sum { |m| m["size_bytes"] }
      {
        "count" => models.length,
        "total_size_bytes" => total_size,
        "average_size_bytes" => (models.empty? ? 0 : (total_size.to_f / models.length).round(2)),
        "categories" => grouped.transform_values(&:length)
      }
    end

    def to_json(*)
      { "models" => models, "stats" => stats }.to_json
    end

    private

    def build_record(path)
      base = path.basename(".glb").to_s
      {
        "id" => normalize_id(base),
        "name" => humanize(base),
        "category" => infer_category(base),
        "file" => path.basename.to_s,
        "path" => "assets/models/#{path.basename}",
        "size_bytes" => path.size
      }
    end

    def normalize_id(name)
      name.gsub(/[^a-zA-Z0-9]+/, "-").downcase.gsub(/^-+|-+$/, "")
    end

    def humanize(name)
      name
        .gsub(/([a-z])([A-Z])/, "\\1 \\2")
        .gsub(/[_-]/, " ")
        .split
        .map(&:capitalize)
        .join(" ")
    end

    def infer_category(base)
      down = base.downcase
      return "space" if down.match?(/rocket|ufo|astronaut|ion/)
      return "animals" if down.match?(/fox|horse|fish|parrot|duck|stork|flamingo|shark|mosquito/)
      return "vehicles" if down.match?(/car|truck/)
      return "people" if down.match?(/man|soldier|armstrong/)
      return "objects" if down.match?(/camera|helmet|lantern|bottle|chair|sofa/)
      "general"
    end
  end
end
