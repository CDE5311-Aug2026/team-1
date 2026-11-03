#!/bin/sh
# Rebuilds public/ui1: version A of the user study, the app exactly as at commit 6fc0d8c (PR #6), served from /ui1.
# Only scripts/ui1.patch is applied: the /ui1 router base, usage labelled "-A", and the shared start screen.
# Run from intentai-web/. Needs node_modules installed (the dependencies match that commit).
set -e
REPO=$(git rev-parse --show-toplevel)
TMP=$(mktemp -d)
git -C "$REPO" worktree add -q --detach "$TMP/ui1" 6fc0d8c57794c6c42f16ea1ac145d6949f9bbe20
git -C "$TMP/ui1" apply "$PWD/scripts/ui1.patch"
ln -s "$PWD/node_modules" "$TMP/ui1/intentai-web/node_modules"
(cd "$TMP/ui1/intentai-web" && npx vite build --base /ui1/ --outDir "$TMP/dist" --emptyOutDir)
rm -rf public/ui1 && mkdir -p public/ui1
cp "$TMP/dist/index.html" public/ui1/ && cp -R "$TMP/dist/assets" public/ui1/
git -C "$REPO" worktree remove --force "$TMP/ui1"
echo "public/ui1 rebuilt"
