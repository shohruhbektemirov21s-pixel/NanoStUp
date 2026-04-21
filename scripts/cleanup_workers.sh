#!/bin/bash
# Safety script to prevent uncontrolled "antigravity" process spawning

MAX_WORKERS=5
PROCESS_NAME="antigravity"

# Count current processes (excluding the grep itself and the script)
COUNT=$(pgrep -f "$PROCESS_NAME" | wc -l)

echo "[$(date)] Checking $PROCESS_NAME processes. Current count: $COUNT"

if [ "$COUNT" -gt "$MAX_WORKERS" ]; then
    echo "Warning: Excessive $PROCESS_NAME processes detected ($COUNT). Cleaning up..."
    # Keep the oldest 5, kill the rest
    pgrep -f "$PROCESS_NAME" | sort -n | tail -n +$((MAX_WORKERS + 1)) | xargs -r kill -9
    echo "Cleanup complete."
else
    echo "Process count within safe limits."
fi
