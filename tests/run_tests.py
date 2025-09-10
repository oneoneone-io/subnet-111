#!/usr/bin/env python3
"""
Test runner for oneoneone subnet tests.
Runs both unit tests and integration tests with proper reporting.
"""

import sys
import os
import unittest
import asyncio
import argparse

# Add the parent directory to the path so we can import oneoneone
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from test_protocol import TestGenericSynapse
from test_integration import TestIntegration


def run_unit_tests():
    """Run unit tests using unittest"""
    print("🧪 Running Unit Tests...\n")

    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestGenericSynapse))

    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    # Return success status
    return result.wasSuccessful()


async def run_integration_tests():
    """Run integration tests"""
    print("\n🔗 Running Integration Tests...\n")

    tester = TestIntegration()
    success = await tester.run_all_tests()

    return success


def main():
    """Main test runner"""
    parser = argparse.ArgumentParser(description="Run oneoneone subnet tests")
    parser.add_argument(
        "--type",
        choices=["unit", "integration", "all"],
        default="all",
        help="Type of tests to run (default: all)",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    print("🚀 OneOneOne Subnet Test Runner")
    print("=" * 40)

    unit_success = True
    integration_success = True

    if args.type in ["unit", "all"]:
        unit_success = run_unit_tests()

    if args.type in ["integration", "all"]:
        integration_success = asyncio.run(run_integration_tests())

    # Print final summary
    print("\n" + "=" * 40)
    print("📊 Final Test Summary")
    print("=" * 40)

    if args.type in ["unit", "all"]:
        unit_status = "✅ PASSED" if unit_success else "❌ FAILED"
        print(f"Unit Tests: {unit_status}")

    if args.type in ["integration", "all"]:
        integration_status = "✅ PASSED" if integration_success else "❌ FAILED"
        print(f"Integration Tests: {integration_status}")

    overall_success = unit_success and integration_success
    overall_status = "✅ ALL PASSED" if overall_success else "❌ SOME FAILED"
    print(f"\nOverall: {overall_status}")

    if not overall_success:
        print("\n⚠️  Some tests failed. Please check the output above for details.")
        if not integration_success:
            print("   - For integration test failures, ensure Node.js miner is running")
            print("   - Check that APIFY_TOKEN is configured in node/miner/.env")

    return 0 if overall_success else 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
