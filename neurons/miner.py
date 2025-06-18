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
import time
import typing
import bittensor as bt
from typing import List, Dict
import aiohttp
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import oneoneone components
import oneoneone
from oneoneone.base.miner import BaseMinerNeuron
from oneoneone.config import SYNAPSE_TIMEOUT, VALIDATOR_MIN_STAKE

# Environment variables for Node.js miner API connection
MINER_NODE_HOST = os.getenv("MINER_NODE_HOST", "localhost")
MINER_NODE_PORT = int(os.getenv("MINER_NODE_PORT", 3001))


class Miner(BaseMinerNeuron):
    """
    Miner neuron for the oneoneone subnet.
    This miner handles Google Maps reviews requests from validators.
    """

    def __init__(self, config=None):
        super(Miner, self).__init__(config=config)
        # Build local API URL for Node.js miner service
        self.local_api_url = f"http://{MINER_NODE_HOST}:{MINER_NODE_PORT}"
        bt.logging.info(f"Miner initialized with netuid: {self.config.netuid}")
        bt.logging.info(f"Local API URL: {self.local_api_url}")

    async def forward(
        self, synapse: oneoneone.protocol.GoogleMapsReviewsSynapse
    ) -> oneoneone.protocol.GoogleMapsReviewsSynapse:
        """
        Process incoming Google Maps reviews requests from validators.
        Forwards the request to local Node.js API and returns the reviews data.

        Args:
            synapse: The synapse object containing the request details

        Returns:
            The synapse object with reviews data filled in
        """
        bt.logging.debug(
            f"Received request - fid: {synapse.fid}, placeid: {synapse.placeid}, language: {synapse.language}, sort: {synapse.sort}, timeout: {synapse.timeout}"
        )

        try:
            # Call local Node.js API using fid endpoint
            url = f"{self.local_api_url}/google-maps/reviews/{synapse.fid}"
            params = {
                # Count is fixed at 200 in the Node.js layer
                "language": synapse.language,
                "sort": synapse.sort,
                "timeout": synapse.timeout,  # Pass timeout to Node.js miner
            }

            # Make async HTTP request with timeout from synapse
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, params=params, timeout=synapse.timeout
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        synapse.reviews = data.get("reviews", [])
                        bt.logging.info(
                            f"Successfully fetched {len(synapse.reviews)} reviews for fid: {synapse.fid}"
                        )
                    else:
                        error_text = await response.text()
                        bt.logging.error(f"API error {response.status}: {error_text}")
                        synapse.reviews = []

        except asyncio.TimeoutError:
            bt.logging.error(f"Timeout calling local API for fid: {synapse.fid}")
            synapse.reviews = []
        except Exception as e:
            bt.logging.error(f"Error calling local API: {str(e)}")
            synapse.reviews = []

        return synapse

    async def blacklist(
        self, synapse: oneoneone.protocol.GoogleMapsReviewsSynapse
    ) -> typing.Tuple[bool, str]:
        """
        Determines whether an incoming request should be blacklisted.
        Checks for registered hotkeys and validator permits.

        Args:
            synapse: The synapse object to check

        Returns:
            Tuple of (should_blacklist, reason)
        """
        if synapse.dendrite is None or synapse.dendrite.hotkey is None:
            bt.logging.warning("Received a request without a dendrite or hotkey.")
            return True, "Missing dendrite or hotkey"

        # Check if hotkey is registered in the metagraph
        uid = self.metagraph.hotkeys.index(synapse.dendrite.hotkey)
        if (
            not self.config.blacklist.allow_non_registered
            and synapse.dendrite.hotkey not in self.metagraph.hotkeys
        ):
            bt.logging.trace(
                f"Blacklisting un-registered hotkey {synapse.dendrite.hotkey}"
            )
            return True, "Unrecognized hotkey"

        # Only allow validators if configured to enforce validator permits
        if self.config.blacklist.force_validator_permit:
            if not self.metagraph.validator_permit[uid]:
                bt.logging.warning(
                    f"Blacklisting non-validator hotkey {synapse.dendrite.hotkey}"
                )
                return True, "Non-validator hotkey"

        # Check if validator has minimum required stake
        caller_stake = self.metagraph.total_stake[uid]
        bt.logging.debug(f"Validator neuron total stake: {caller_stake}")

        if caller_stake < float(VALIDATOR_MIN_STAKE):
            bt.logging.warning(
                f"Blacklisting hotkey: {synapse.dendrite.hotkey} with insufficient stake, minimum stake required: {VALIDATOR_MIN_STAKE}, current stake: {caller_stake}"
            )
            return True, "Insufficient validator stake"

        bt.logging.trace(
            f"Not blacklisting recognized hotkey {synapse.dendrite.hotkey}"
        )
        return False, "Hotkey recognized!"

    async def priority(
        self, synapse: oneoneone.protocol.GoogleMapsReviewsSynapse
    ) -> float:
        """
        Determines the priority of incoming requests based on stake.
        Higher stake holders get higher priority in processing queue.

        Args:
            synapse: The synapse object

        Returns:
            Priority score (higher = process first)
        """
        if synapse.dendrite is None or synapse.dendrite.hotkey is None:
            bt.logging.warning("Received a request without a dendrite or hotkey.")
            return 0.0

        # Use stake amount as priority score
        caller_uid = self.metagraph.hotkeys.index(synapse.dendrite.hotkey)
        priority = float(self.metagraph.S[caller_uid])

        bt.logging.trace(
            f"Prioritizing {synapse.dendrite.hotkey} with value: {priority}"
        )
        return priority


# Main execution loop
if __name__ == "__main__":
    bt.logging.info("Starting oneoneone miner...")
    with Miner() as miner:
        bt.logging.success(f"Miner started successfully on uid: {miner.uid}")
        while True:
            bt.logging.info(f"Miner running... {time.time()}")
            time.sleep(30)  # Reduced frequency for cleaner logs
