require "json"
require "sinatra/base"
require "sinatra/json"
require_relative "lib/model_catalog"

module ModelVault
  class App < Sinatra::Base
    configure do
      set :root, File.expand_path("..", __dir__)
      set :bind, "0.0.0.0"
      set :port, (ENV["PORT"] || "4567").to_i
      set :catalog, Catalog.new(root_dir: settings.root)
      settings.catalog.scan!
    end

    before do
      content_type :json
    end

    get "/health" do
      json(
        ok: true,
        service: "3d-model-ruby-catalog",
        model_count: settings.catalog.models.length
      )
    end

    get "/api/models" do
      limit = params.fetch("limit", "100").to_i
      limit = 1 if limit < 1
      limit = 500 if limit > 500
      json(models: settings.catalog.models.first(limit), stats: settings.catalog.stats)
    end

    get "/api/models/search" do
      query = params.fetch("q", "")
      limit = params.fetch("limit", "20").to_i
      limit = 1 if limit < 1
      limit = 100 if limit > 100
      json(query: query, results: settings.catalog.search(query: query, max: limit))
    end

    get "/api/models/:id" do
      id = params["id"]
      model = settings.catalog.models.find { |m| m["id"] == id }
      halt 404, json(error: "model_not_found", id: id) unless model
      json(model: model)
    end

    post "/api/reindex" do
      settings.catalog.scan!
      json(ok: true, model_count: settings.catalog.models.length, stats: settings.catalog.stats)
    end

    not_found do
      json(error: "not_found", path: request.path)
    end
  end
end

if $PROGRAM_NAME == __FILE__
  ModelVault::App.run!
end
