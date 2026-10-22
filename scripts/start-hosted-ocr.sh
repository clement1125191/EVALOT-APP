#!/bin/sh
set -eu
node --import tsx apps/api/src/migrate.ts
exec node apps/api/dist/server.js
