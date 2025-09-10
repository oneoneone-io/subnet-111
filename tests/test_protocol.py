#!/usr/bin/env python3
"""
Unit tests for the oneoneone protocol module.
Tests the GenericSynapse class functionality.
"""

import sys
import os
import unittest

# Add the parent directory to the path so we can import oneoneone
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from oneoneone.protocol import GenericSynapse


class TestGenericSynapse(unittest.TestCase):
    """Test cases for GenericSynapse"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_fid = "ChIJN1t_tDeuEmsRUsoyG83frY4"
        self.test_reviews = [
            {
                "author_name": "John Doe",
                "rating": 5,
                "text": "Great place!",
                "time": 1234567890,
            }
        ]

    def test_synapse_creation(self):
        """Test basic synapse creation"""
        synapse = GenericSynapse(fid=self.test_fid)

        self.assertEqual(synapse.fid, self.test_fid)
        self.assertEqual(synapse.language, "en")
        self.assertEqual(synapse.sort, "newest")
        self.assertIsNone(synapse.reviews)

    def test_synapse_with_custom_params(self):
        """Test synapse creation with custom parameters"""
        synapse = GenericSynapse(
            fid=self.test_fid,
            language="es",
            sort="relevant",
        )

        self.assertEqual(synapse.fid, self.test_fid)
        self.assertEqual(synapse.language, "es")
        self.assertEqual(synapse.sort, "relevant")

    def test_synapse_serialization(self):
        """Test synapse serialization"""
        synapse = GenericSynapse(fid=self.test_fid)
        synapse.reviews = self.test_reviews

        # Test that the synapse can be serialized
        serialized = synapse.dict()
        self.assertIn("fid", serialized)
        self.assertIn("reviews", serialized)

    def test_synapse_deserialization(self):
        """Test synapse deserialization"""
        synapse = GenericSynapse(fid=self.test_fid)
        synapse.reviews = self.test_reviews

        # Test deserialization
        deserialized = synapse.deserialize()
        self.assertEqual(deserialized, self.test_reviews)

    def test_synapse_empty_reviews(self):
        """Test synapse with empty reviews"""
        synapse = GenericSynapse(fid=self.test_fid)

        # Test deserialization with no reviews
        deserialized = synapse.deserialize()
        self.assertEqual(deserialized, [])

    def test_synapse_validation(self):
        """Test synapse field validation"""
        # Test with valid parameters
        synapse = GenericSynapse(
            fid=self.test_fid, language="fr", sort="highest"
        )

        self.assertEqual(synapse.language, "fr")
        self.assertEqual(synapse.sort, "highest")

    def test_synapse_edge_cases(self):
        """Test synapse edge cases"""
        # Test with different language codes
        synapse = GenericSynapse(fid=self.test_fid, language="de")
        self.assertEqual(synapse.language, "de")

        # Test with different sort options
        synapse = GenericSynapse(fid=self.test_fid, sort="lowest")
        self.assertEqual(synapse.sort, "lowest")

    def test_synapse_string_representation(self):
        """Test synapse string representation"""
        synapse = GenericSynapse(fid=self.test_fid)
        str_repr = str(synapse)

        # Should contain the fid in string representation
        self.assertIn(self.test_fid, str_repr)

    def test_synapse_defaults(self):
        """Test synapse default values"""
        synapse = GenericSynapse(fid="test_fid")

        self.assertEqual(synapse.fid, "test_fid")
        self.assertEqual(synapse.language, "en")
        self.assertEqual(synapse.sort, "newest")
        self.assertIsNone(synapse.reviews)

    def test_synapse_custom_values(self):
        """Test synapse with custom values"""
        synapse = GenericSynapse(
            fid="custom_fid", language="es", sort="highest"
        )

        self.assertEqual(synapse.fid, "custom_fid")
        self.assertEqual(synapse.language, "es")
        self.assertEqual(synapse.sort, "highest")
        self.assertIsNone(synapse.reviews)


if __name__ == "__main__":
    unittest.main()
