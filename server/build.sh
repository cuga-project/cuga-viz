cd ../src   
pnpm run build
cd ../server
rm -rf ./dashboard/static
cp -r ../dist/ ./dashboard/static
cp -r ../dist/assets/ ./dashboard/assets
uv pip install -e .