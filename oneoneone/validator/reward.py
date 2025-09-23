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

import os
import json
import numpy as np
import requests
from typing import List, Dict, Any
import bittensor as bt
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from oneoneone.config import VALIDATOR_API_TIMEOUT, SYNAPSE_TIMEOUT

# Environment variables for Node.js validator API
VALIDATOR_NODE_HOST = os.getenv("VALIDATOR_NODE_HOST", "localhost")
VALIDATOR_NODE_PORT = int(os.getenv("VALIDATOR_NODE_PORT", 3002))


def get_rewards(
    self,
    type_id: str,
    metadata: Dict[str, Any],
    responses: List[List[Dict[str, Any]]],
    response_times: List[float] = None,
) -> np.ndarray:
    """
    Calculate rewards for miner responses by calling the Node.js validator scoring endpoint.

    Scoring is based on:
    - Speed Score (30%): How fast the response was delivered
    - Volume Score (50%): How many reviews were returned
    - Recency Score (20%): How recent the reviews are

    Miners that fail spot check or validation receive zero score.

    Args:
        self: The validator instance
        type_id: The type of data that was queried
        metadata: The metadata for the data that was queried
        responses: A list of responses from miners (list of review dictionaries)
        response_times: A list of response times in seconds for each miner

    Returns:
        np.ndarray: An array of rewards (0.0 to 1.0) for each miner response
    """
    try:
        # Build request to Node.js scoring endpoint
        validator_url = (
            f"http://{VALIDATOR_NODE_HOST}:{VALIDATOR_NODE_PORT}/score-responses"
        )

        bt.logging.info(f"Calling scoring endpoint: {validator_url}")
        bt.logging.debug(f"Scoring {len(responses)} responses for type_id: {type_id}")

        # If response times not provided, use default values
        if response_times is None:
            response_times = [SYNAPSE_TIMEOUT] * len(responses)  # Default to max time

        # Prepare payload for scoring API
        payload = {
            "typeId": type_id,
            "metadata": metadata,
            "responses": responses,
            "responseTimes": response_times,  # Pass timing information
            "synapseTimeout": SYNAPSE_TIMEOUT,  # Pass the timeout configuration
            "minerUIDs": [
                int(uid) for uid in self.current_miner_uids
            ],  # Convert numpy types to Python ints
        }

        # Log payload size for debugging
        payload_size = len(json.dumps(payload).encode("utf-8"))
        bt.logging.debug(f"Payload size: {payload_size / 1024:.2f} KB")

        # Make HTTP request to scoring endpoint
        response = requests.post(
            validator_url, json=payload, timeout=VALIDATOR_API_TIMEOUT
        )
        response.raise_for_status()

        result = response.json()

        # Check if scoring was successful
        if result.get("status") != "success":
            bt.logging.error(f"Scoring endpoint returned error: {result}")
            return np.zeros(len(responses))

        # Extract scores and statistics
        scores = result["scores"]
        statistics = result["statistics"]

        bt.logging.info(
            f"Scoring complete - Mean: {statistics['mean']:.4f}, "
            f"Count: {statistics['count']}, "
            f"Min: {statistics['min']:.4f}, "
            f"Max: {statistics['max']:.4f}"
        )

        # Log detailed scoring breakdown if available
        detailed_results = result.get("detailedResults", [])
        if detailed_results:
            for detail in detailed_results:
                if detail.get("passedValidation"):
                    bt.logging.debug(
                        f"Miner UID {detail['minerUID']}: "
                        f"Score={detail['score']:.4f}, "
                        f"Speed={detail['components']['speedScore']:.4f}, "
                        f"Volume={detail['components']['volumeScore']:.4f}, "
                        f"Recency={detail['components']['recencyScore']:.4f}"
                    )
                else:
                    bt.logging.debug(
                        f"Miner UID {detail['minerUID']}: "
                        f"Failed validation - {detail.get('validationError', 'Unknown error')}"
                    )

        return np.array(scores)

    except requests.exceptions.RequestException as e:
        bt.logging.error(f"Failed to call scoring endpoint: {e}")
        bt.logging.warning("Falling back to zero scores for all responses")
        return np.zeros(len(responses))
    except Exception as e:
        bt.logging.error(f"Unexpected error during scoring: {e}")
        bt.logging.warning("Falling back to zero scores for all responses")
        return np.zeros(len(responses))
