echo "Running ruff check..."
if ! uv run ruff check; then
    echo "❌ Ruff check failed!"
    exit 1
fi

echo "Running ruff format..."
if ! uv run ruff format --check; then
    echo "❌ Ruff format check failed!"
    exit 1
fi