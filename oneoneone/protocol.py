# The MIT License (MIT)
# Copyright © 2023 Yuma Rao
# Copyright © 2024 oneoneone

# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
# documentation files (the "Software"), to deal in the Software without restriction, including without limitation
# the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

# The above copyright notice and this permission notice shall be included in all copies or substantial portions of
# the Software.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
# THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
# THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
# DEALINGS IN THE SOFTWARE.

import typing
import bittensor as bt
from typing import List, Dict, Optional


class GoogleMapsReviewsSynapse(bt.Synapse):
    """
    A synapse for handling Google Maps reviews data between validators and miners.
    This protocol facilitates communication for Google Maps review-related tasks.

    Request Flow:
    1. Validator creates synapse with fid and parameters
    2. Miner receives synapse and fetches reviews from Google Maps
    3. Miner populates reviews field and returns synapse
    4. Validator scores the response

    Attributes:
    - fid: Google Maps place identifier (FID) to fetch reviews for    
    - language: Language code for reviews (e.g., "en", "es", "fr")
    - sort: Sort order for reviews ("newest", "relevant", "highest", "lowest")
    - timeout: Timeout for the request in seconds
    - reviews: List of review data returned by the miner (filled by miner)
    """

    # Required request inputs (set by validator)
    fid: str    
    language: str = "en"
    sort: str = "newest"
    timeout: int = 120

    # Response output (filled by miner)
    reviews: Optional[List[Dict[str, typing.Any]]] = None

    def deserialize(self) -> List[Dict[str, typing.Any]]:
        """
        Deserialize the reviews output for processing.

        Returns:
        - List[Dict]: The deserialized reviews data, empty list if None
        """
        return self.reviews if self.reviews is not None else []
