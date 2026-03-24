module ModelVault
  class ModelValidator
    REQUIRED_KEYS = %w[id name category file path size_bytes].freeze

    def validate(model)
      missing = REQUIRED_KEYS.reject { |k| model.key?(k) }
      return [false, "missing keys: #{missing.join(', ')}"] unless missing.empty?

      return [false, "id must be non-empty"] if model["id"].to_s.strip.empty?
      return [false, "name must be non-empty"] if model["name"].to_s.strip.empty?
      return [false, "size must be positive"] unless model["size_bytes"].to_i > 0

      [true, "ok"]
    end

    def validate_all(models)
      errors = []
      models.each_with_index do |m, i|
        ok, msg = validate(m)
        errors << { "index" => i, "id" => m["id"], "error" => msg } unless ok
      end
      errors
    end
  end
end
