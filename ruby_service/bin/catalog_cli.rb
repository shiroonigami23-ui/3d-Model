#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require_relative "../lib/model_catalog"
require_relative "../lib/model_validator"
require_relative "../lib/model_ranker"
require_relative "../lib/model_exporter"

root = File.expand_path("../..", __dir__)
catalog = ModelVault::Catalog.new(root_dir: root)
catalog.scan!

cmd = ARGV[0].to_s

case cmd
when "stats"
  puts JSON.pretty_generate(catalog.stats)
when "validate"
  validator = ModelVault::ModelValidator.new
  errors = validator.validate_all(catalog.models)
  if errors.empty?
    puts "OK: all models valid"
  else
    puts JSON.pretty_generate(errors)
    exit 1
  end
when "top-size"
  limit = (ARGV[1] || "10").to_i
  ranker = ModelVault::ModelRanker.new(catalog.models)
  puts JSON.pretty_generate(ranker.top_by_size(limit: limit))
when "top-name"
  limit = (ARGV[1] || "10").to_i
  ranker = ModelVault::ModelRanker.new(catalog.models)
  puts JSON.pretty_generate(ranker.top_by_name_score(limit: limit))
when "export-md"
  exporter = ModelVault::ModelExporter.new(catalog.models)
  File.write(File.join(root, "ruby_service", "catalog.md"), exporter.to_markdown)
  puts "Wrote ruby_service/catalog.md"
when "export-csv"
  exporter = ModelVault::ModelExporter.new(catalog.models)
  File.write(File.join(root, "ruby_service", "catalog.csv"), exporter.to_csv)
  puts "Wrote ruby_service/catalog.csv"
else
  puts <<~HELP
    Usage:
      ruby ruby_service/bin/catalog_cli.rb stats
      ruby ruby_service/bin/catalog_cli.rb validate
      ruby ruby_service/bin/catalog_cli.rb top-size [N]
      ruby ruby_service/bin/catalog_cli.rb top-name [N]
      ruby ruby_service/bin/catalog_cli.rb export-md
      ruby ruby_service/bin/catalog_cli.rb export-csv
  HELP
end
