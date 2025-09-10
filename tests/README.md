# Tests

This directory contains the test suite for the oneoneone subnet Google Maps reviews functionality.

## Test Structure

```
tests/
├── __init__.py              # Package initialization
├── README.md               # This file
├── run_tests.py            # Main test runner
├── test_protocol.py        # Unit tests for protocol/synapse
└── test_integration.py     # Integration tests for API
```

## Test Types

### Unit Tests (`test_protocol.py`)
- Tests the `GenericSynapse` class in isolation
- Validates synapse creation, serialization, and deserialization
- Tests various parameter combinations
- No external dependencies required

### Integration Tests (`test_integration.py`)
- Tests the full integration between miner and Node.js API
- Validates API connectivity and response structure
- Tests different parameter combinations with real API calls
- Requires Node.js miner to be running on port 3001

## Running Tests

### Run All Tests
```bash
python tests/run_tests.py
```

### Run Only Unit Tests
```bash
python tests/run_tests.py --type unit
```

### Run Only Integration Tests
```bash
python tests/run_tests.py --type integration
```

### Run Individual Test Files
```bash
# Unit tests only
python tests/test_protocol.py

# Integration tests only
python tests/test_integration.py
```

## Prerequisites

### For Unit Tests
- Python 3.7+
- oneoneone package installed/importable

### For Integration Tests
- All unit test prerequisites
- Node.js miner running on port 3001
- Valid APIFY_TOKEN configured in `node/miner/.env`
- `aiohttp` package installed

## Test Coverage

### Protocol Tests
- ✅ Synapse creation with default values
- ✅ Synapse creation with custom values
- ✅ Deserialize method with no data
- ✅ Deserialize method with data
- ✅ Attribute mutability
- ✅ Various parameter combinations
- ✅ String representation

### Integration Tests
- ✅ Local API connectivity
- ✅ API response structure validation
- ✅ Multiple parameter combinations
- ✅ Error handling
- ✅ Synapse data flow

## Example Output

```
🚀 OneOneOne Subnet Test Runner
========================================
🧪 Running Unit Tests...

test_deserialize_with_empty_reviews ... ok
test_deserialize_with_no_reviews ... ok
test_deserialize_with_reviews ... ok
test_synapse_attributes_are_mutable ... ok
test_synapse_creation_with_custom_values ... ok
test_synapse_creation_with_defaults ... ok
test_synapse_string_representation ... ok
test_synapse_with_various_count_values ... ok
test_synapse_with_various_languages ... ok
test_synapse_with_various_sort_options ... ok

----------------------------------------------------------------------
Ran 10 tests in 0.002s

OK

🔗 Running Integration Tests...

🚀 Starting integration tests...

Testing synapse creation...
✅ Synapse created:
   Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4
   Count: 10
   Language: en
   Sort: newest
   Reviews: None

Testing synapse with mock data...
✅ Synapse with data: 1 reviews

Testing local Node.js API...
✅ API Success: 5 reviews fetched
   Place ID: ChIJN1t_tDeuEmsRUsoyG83frY4
   Parameters: {'count': 5, 'language': 'en', 'sort': 'newest'}

Testing API with different parameters...
✅ Test case 1: 10 reviews with {'count': 10, 'language': 'en', 'sort': 'newest'}
✅ Test case 2: 5 reviews with {'count': 5, 'language': 'es', 'sort': 'relevant'}
✅ Test case 3: 15 reviews with {'count': 15, 'language': 'fr', 'sort': 'highest'}
✅ Test case 4: 20 reviews with {'count': 20, 'language': 'de', 'sort': 'lowest'}
Parameter tests: 4/4 passed

📊 Test Results:
   Synapse Creation: ✅ PASS
   Synapse with Data: ✅ PASS
   Local API: ✅ PASS
   API Parameters: ✅ PASS

📈 Summary: 4/4 tests passed

🎉 All tests passed! Integration is ready.

========================================
📊 Final Test Summary
========================================
Unit Tests: ✅ PASSED
Integration Tests: ✅ PASSED

Overall: ✅ ALL PASSED
```

## Adding New Tests

### Adding Unit Tests
1. Add new test methods to `TestGenericSynapse` class
2. Follow naming convention: `test_<functionality>`
3. Use `self.assertEqual()`, `self.assertTrue()`, etc. for assertions

### Adding Integration Tests
1. Add new test methods to `TestIntegration` class
2. Add the test to the `tests` list in `run_all_tests()`
3. Use async/await for API calls
4. Handle exceptions gracefully

## Troubleshooting

### Unit Tests Failing
- Check that oneoneone package is importable
- Verify Python path includes parent directory

### Integration Tests Failing
- Ensure Node.js miner is running: `cd node/miner && npm start`
- Check APIFY_TOKEN is set in `node/miner/.env`
- Verify port 3001 is not blocked by firewall
- Check internet connectivity for Apify API calls
