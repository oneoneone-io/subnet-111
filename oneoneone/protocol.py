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


class GenericSynapse(bt.Synapse):
    """
    A synapse for handling data between validators and miners.
    This protocol facilitates communication for data-related tasks.

    Request Flow:
    1. Validator creates synapse with type_id and metadata
    2. Miner receives synapse and fetches data
    3. Miner populates responses field and returns synapse
    4. Validator scores the response

    Attributes:
    - type_id: The type of data to fetch
    - metadata: The metadata for the data to fetch
    """

    # Required request inputs (set by validator)
    type_id: str
    metadata: Dict[str, typing.Any]
    timeout: int

    # Response output (filled by miner)
    responses: Optional[List[Dict[str, typing.Any]]] = None

    def deserialize(self) -> List[Dict[str, typing.Any]]:
        """
        Deserialize the reviews output for processing.

        Returns:
        - List[Dict]: The deserialized responses data, empty list if None
        """
        return self.responses if self.responses is not None else []
