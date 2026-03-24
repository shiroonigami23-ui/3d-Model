#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "time"
require_relative "../lib/model_catalog"

root = File.expand_path("../..", __dir__)
out_path = File.join(root, "ruby_service", "catalog.json")

catalog = ModelVault::Catalog.new(root_dir: root)
catalog.scan!

payload = JSON.pretty_generate(
  {
    generated_at: Time.now.utc.iso8601,
    stats: catalog.stats,
    models: catalog.models
  }
)

File.write(out_path, payload)
puts "Wrote #{out_path} with #{catalog.models.length} models."
