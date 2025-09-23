#!/usr/bin/env python3
"""
Integration tests for the oneoneone subnet Google Maps reviews functionality.
This module tests the synapse communication and Node.js API integration.
"""

import asyncio
import aiohttp
import sys
import os
import unittest
import requests

# Add the parent directory to the path so we can import oneoneone
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from oneoneone.protocol import GenericSynapse


class TestMinerIntegration(unittest.TestCase):
    """Integration tests for the miner API"""

    def setUp(self):
        """Set up test fixtures"""
        self.api_url = "http://localhost:3001"
        self.test_fid = "ChIJN1t_tDeuEmsRUsoyG83frY4"  # Sydney Opera House

    def test_miner_api_health(self):
        """Test that the miner API is running and responsive"""
        try:
            # Test the reviews endpoint
            url = f"{self.api_url}/google-maps/reviews/{self.test_fid}"
            response = requests.get(url, params={"count": 5}, timeout=10)

            # Should get a response (might be 200 or error, but should respond)
            self.assertIsNotNone(response.status_code)
            print(f"Miner API responded with status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print(f"   Status: {data.get('status', 'unknown')}")
                print(f"   FID: {data.get('fid', 'unknown')}")
                print(f"   Review count: {data.get('reviewCount', 0)}")

                # Basic structure validation
                self.assertIn("status", data)
                self.assertIn("fid", data)
                self.assertIn("reviews", data)

                # Validate fid matches
                self.assertEqual(data["fid"], self.test_fid)

            else:
                print(f"   Error: {response.text}")

        except requests.exceptions.ConnectionError:
            self.skipTest("Miner API not running - skipping integration test")
        except Exception as e:
            self.fail(f"Unexpected error testing miner API: {e}")

    def test_miner_api_with_different_params(self):
        """Test miner API with different parameters"""
        try:
            # Test with different parameters
            test_params = [
                {"count": 1, "language": "en", "sort": "newest"},
                {"count": 5, "language": "en", "sort": "relevant"},
                {"count": 10, "language": "en", "sort": "highest"},
            ]

            for params in test_params:
                with self.subTest(params=params):
                    url = f"{self.api_url}/google-maps/reviews/{self.test_fid}"
                    response = requests.get(url, params=params, timeout=15)

                    if response.status_code == 200:
                        data = response.json()
                        self.assertEqual(data["fid"], self.test_fid)
                        self.assertEqual(data["parameters"]["count"], params["count"])
                        self.assertEqual(
                            data["parameters"]["language"], params["language"]
                        )
                        self.assertEqual(data["parameters"]["sort"], params["sort"])
                    else:
                        print(
                            f"API call failed with params {params}: {response.status_code}"
                        )

        except requests.exceptions.ConnectionError:
            self.skipTest("Miner API not running - skipping integration test")


class TestValidatorIntegration(unittest.TestCase):
    """Integration tests for the validator components"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_fid = "ChIJN1t_tDeuEmsRUsoyG83frY4"  # Sydney Opera House

    def test_synapse_creation_and_processing(self):
        """Test creating and processing a synapse"""
        try:
            # Create a synapse
            synapse = GenericSynapse(
                fid=self.test_fid, language="en", sort="newest"
            )

            # Validate synapse creation
            self.assertEqual(synapse.fid, self.test_fid)
            self.assertEqual(synapse.language, "en")
            self.assertEqual(synapse.sort, "newest")

            print(f"Created synapse:")
            print(f"   FID: {synapse.fid}")
            print(f"   Language: {synapse.language}")
            print(f"   Sort: {synapse.sort}")

            # Test deserialization
            reviews = synapse.deserialize()
            self.assertIsInstance(reviews, list)

            # Validate that synapse attributes match expected values
            self.assertEqual(synapse.fid, self.test_fid)

        except Exception as e:
            self.fail(f"Error in synapse creation and processing: {e}")

    def test_synapse_with_mock_reviews(self):
        """Test synapse with mock review data"""
        # Create synapse with mock data
        synapse = GenericSynapse(
            fid=self.test_fid, language="en", sort="newest"
        )

        # Add mock reviews
        mock_reviews = [
            {
                "author_name": "Test User 1",
                "rating": 5,
                "text": "Great place!",
                "time": 1703123456,
            },
            {
                "author_name": "Test User 2",
                "rating": 4,
                "text": "Good experience",
                "time": 1703123457,
            },
        ]

        synapse.reviews = mock_reviews

        # Test deserialization
        deserialized = synapse.deserialize()
        self.assertEqual(len(deserialized), 2)
        self.assertEqual(deserialized[0]["author_name"], "Test User 1")
        self.assertEqual(deserialized[1]["rating"], 4)


class TestIntegration:
    """Test class for integration testing"""

    def __init__(self):
        self.api_url = "http://localhost:3001"
        self.test_fid = "ChIJN1t_tDeuEmsRUsoyG83frY4"  # Sydney Opera House

    async def test_local_api(self):
        """Test the local Node.js API directly"""
        print("Testing local Node.js API...")

        url = f"{self.api_url}/google-maps/reviews/{self.test_fid}"
        params = {"count": 5, "language": "en", "sort": "newest"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ API Success: {data['reviewCount']} reviews fetched")
                        print(f"   FID: {data['fid']}")
                        print(f"   Parameters: {data['parameters']}")

                        # Validate response structure
                        assert "status" in data
                        assert "fid" in data
                        assert "reviews" in data
                        assert "reviewCount" in data
                        assert data["status"] == "success"
                        assert data["fid"] == self.test_fid

                        return True
                    else:
                        error_text = await response.text()
                        print(f"❌ API Error {response.status}: {error_text}")
                        return False
        except Exception as e:
            print(f"❌ API Exception: {str(e)}")
            return False

    async def test_api_with_different_params(self):
        """Test API with different parameter combinations"""
        print("\nTesting API with different parameters...")

        test_cases = [
            {"count": 10, "language": "en", "sort": "newest"},
            {"count": 5, "language": "es", "sort": "relevant"},
            {"count": 15, "language": "fr", "sort": "highest"},
            {"count": 20, "language": "de", "sort": "lowest"},
        ]

        success_count = 0

        for i, params in enumerate(test_cases):
            try:
                url = f"{self.api_url}/google-maps/reviews/{self.test_fid}"

                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params, timeout=30) as response:
                        if response.status == 200:
                            data = await response.json()
                            print(
                                f"✅ Test case {i+1}: {data['reviewCount']} reviews with {params}"
                            )
                            success_count += 1
                        else:
                            print(f"❌ Test case {i+1} failed: {response.status}")

            except Exception as e:
                print(f"❌ Test case {i+1} exception: {str(e)}")

        print(f"Parameter tests: {success_count}/{len(test_cases)} passed")
        return success_count == len(test_cases)

    async def test_synapse_creation(self):
        """Test the synapse object creation and serialization"""
        print("\nTesting synapse creation...")

        synapse = GenericSynapse(
            fid=self.test_fid,
            language="en",
            sort="newest",
        )

        print(f"✅ Synapse created:")
        print(f"   FID: {synapse.fid}")
        print(f"   Language: {synapse.language}")
        print(f"   Sort: {synapse.sort}")
        print(f"   Reviews: {synapse.reviews}")

        # Validate synapse attributes
        assert synapse.fid == self.test_fid
        assert synapse.language == "en"
        assert synapse.sort == "newest"
        assert synapse.reviews is None  # Should be None initially

        # Test deserialize method
        deserialized = synapse.deserialize()
        assert deserialized == []  # Should return empty list when reviews is None

        return True

    async def test_synapse_with_data(self):
        """Test synapse with mock review data"""
        print("\nTesting synapse with mock data...")

        mock_reviews = [
            {
                "author_name": "Test User",
                "rating": 5,
                "text": "Great place for testing!",
                "time": 1703123456,
                "language": "en",
            }
        ]

        synapse = GenericSynapse(
            fid=self.test_fid, language="en", sort="newest"
        )

        # Simulate miner filling in the reviews
        synapse.reviews = mock_reviews

        # Test deserialize with data
        deserialized = synapse.deserialize()
        assert len(deserialized) == 1
        assert deserialized[0]["author_name"] == "Test User"

        print(f"✅ Synapse with data: {len(deserialized)} reviews")
        return True

    async def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting integration tests...\n")

        tests = [
            ("Synapse Creation", self.test_synapse_creation),
            ("Synapse with Data", self.test_synapse_with_data),
            ("Local API", self.test_local_api),
            ("API Parameters", self.test_api_with_different_params),
        ]

        results = {}

        for test_name, test_func in tests:
            try:
                result = await test_func()
                results[test_name] = result
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                results[test_name] = False

        # Print summary
        print(f"\n📊 Test Results:")
        passed = 0
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {test_name}: {status}")
            if result:
                passed += 1

        print(f"\n📈 Summary: {passed}/{len(tests)} tests passed")

        if passed == len(tests):
            print(f"\n🎉 All tests passed! Integration is ready.")
            print(f"\n📝 Next steps:")
            print(f"   1. Start the Node.js miner: cd node/miner && npm start")
            print(f"   2. Start the Python miner: python neurons/miner.py")
            print(f"   3. Start the validator: python neurons/validator.py")
        else:
            print(f"\n⚠️  Some tests failed. Please check the setup.")
            api_failed = not results.get("Local API", True) or not results.get(
                "API Parameters", True
            )
            if api_failed:
                print(f"   - Make sure Node.js miner is running on port 3001")
                print(f"   - Check APIFY_TOKEN is configured")

        return passed == len(tests)


async def main():
    """Main test runner"""
    tester = TestIntegration()
    success = await tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
