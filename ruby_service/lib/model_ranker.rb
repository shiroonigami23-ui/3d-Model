module ModelVault
  class ModelRanker
    def initialize(models)
      @models = models
    end

    def top_by_size(limit: 20)
      @models
        .sort_by { |m| -m["size_bytes"].to_i }
        .first(limit)
    end

    def top_by_name_score(limit: 20)
      @models
        .map { |m| [m, score_name(m["name"])] }
        .sort_by { |m, score| [-score, m["name"]] }
        .first(limit)
        .map(&:first)
    end

    private

    def score_name(name)
      n = name.to_s.downcase
      score = 0
      score += 5 if n.include?("test")
      score += 4 if n.include?("dragon") || n.include?("robot")
      score += 3 if n.include?("rocket") || n.include?("ufo")
      score += 2 if n.include?("helmet") || n.include?("camera")
      score += 1 if n.length > 10
      score
    end
  end
end
