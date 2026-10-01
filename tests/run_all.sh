#!/usr/bin/env bash
# Lance tous les tests de SwimTimes. Python avec Playwright : variable PYTHON (défaut : python3).
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
failed=0

run() {
    printf '%-38s ' "$1"
    if output=$("${@:2}" 2>&1); then
        echo "$output" | grep -E '✅' | tail -1
    else
        echo "❌ ÉCHEC"
        echo "$output" | grep -vE '^\s+✓' | tail -15 | sed 's/^/    /'
        failed=1
    fi
}

run test_us001_stockage.js node test_us001_stockage.js
for test in test_*.py audit_*.py; do
    run "$test" "$PYTHON" "$test"
done

exit $failed
