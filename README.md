# ProModel Studio 3D

[![Android Release](https://github.com/shiroonigami23-ui/3d-Model/actions/workflows/android-release.yml/badge.svg)](https://github.com/shiroonigami23-ui/3d-Model/actions/workflows/android-release.yml)

Web-first 3D model studio with:
- Browser viewer/editor (`index.html`, `app.js`, `style.css`)
- Large GLB model vault (`assets/models`)
- Ruby catalog service (`ruby_service/`)
- Android companion app (`android-app/`)

## Ruby-Rich Layer

This repo now includes a substantial Ruby backend/catalog toolkit:
- `ruby_service/app.rb` (Sinatra API)
- `ruby_service/lib/model_catalog.rb` (model indexing, grouping, scoring, stats)
- `ruby_service/bin/reindex.rb` (catalog build utility)

### Ruby API Endpoints
- `GET /health`
- `GET /api/models`
- `GET /api/models/search?q=<query>`
- `GET /api/models/:id`
- `POST /api/reindex`

## Android APK

The Android app wraps the live viewer and is built from `android-app/`.

Local build:
```bash
cd android-app
./gradlew assembleRelease
```

Release artifact:
`android-app/app/build/outputs/apk/release/app-release-unsigned.apk`

## Live Web

https://shiroonigami23-ui.github.io/3d-Model/
