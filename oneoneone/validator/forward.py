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
import requests
import bittensor as bt
import asyncio
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from oneoneone.protocol import GenericSynapse
from oneoneone.validator.reward import get_rewards
from oneoneone.utils.uids import get_random_uids
from oneoneone.config import (
    VALIDATOR_API_TIMEOUT,
    SYNAPSE_TIMEOUT,
    SYNAPSE_WAIT_TIME,
    MAX_MINER_COUNT,
)

# Environment variables for Node.js validator API connection
VALIDATOR_NODE_HOST = os.getenv("VALIDATOR_NODE_HOST", "localhost")
VALIDATOR_NODE_PORT = int(os.getenv("VALIDATOR_NODE_PORT", 3002))


async def create_synthetic_task():
    """
    Create a synthetic validation task by calling the validator Node.js API.
    Generates a random Google Maps place for testing miners.

    Returns:
        dict: Task data including dataId and synapse parameters

    Raises:
        Exception: If synthetic task creation fails
    """
    validator_url = (
        f"http://{VALIDATOR_NODE_HOST}:{VALIDATOR_NODE_PORT}/create-synthetic-task"
    )
    bt.logging.info(f"Creating synthetic task via: {validator_url}")

    response = requests.get(validator_url, timeout=VALIDATOR_API_TIMEOUT)
    response.raise_for_status()

    task_data = response.json()
    bt.logging.info(f"Synthetic task created - Type ID: {task_data['task']['typeId']} with metadata: {task_data['task']['metadata']}")

    return task_data["task"]


async def forward(self):
    """
    The main validator forward function called every time step.
    It is responsible for querying the network and scoring the responses.

    Process:
    1. Select random miners to query
    2. Create synthetic task with a random type
    3. Query all selected miners simultaneously
    4. Measure response times and collect responses
    5. Score responses based on speed, volume, and recency
    6. Update miner scores in the network

    Args:
        self: The neuron object which contains all the necessary state for the validator.
    """
    bt.logging.debug(f"Starting forward pass - Step: {self.step}")

    # Select random miners to query (up to MAX_MINER_COUNT)
    miner_uids = get_random_uids(self, k=MAX_MINER_COUNT)
    bt.logging.debug(f"Selected {len(miner_uids)} miners: {miner_uids}")

    # Create synthetic task with a random type
    task = await create_synthetic_task()

    # Get the fields
    type_id = task["typeId"]
    metadata = task["metadata"]
    timeout = task["timeout"]

    # Store the miner UIDs for scoring
    self.current_miner_uids = miner_uids

    bt.logging.info(f"Querying miners with synthetic task: type_id={type_id}, metadata={metadata}")

    # Debug: Log axon information for transparency
    axons = [self.metagraph.axons[uid] for uid in miner_uids]
    bt.logging.info(f"About to query {len(axons)} axons:")
    for i, (uid, axon) in enumerate(zip(miner_uids, axons)):
        bt.logging.debug(
            f"  Axon {i}: UID={uid}, IP={axon.ip}, Port={axon.port}, Hotkey={axon.hotkey}"
        )

    # Track timing for each miner
    query_start_time = time.time()

    bt.logging.info(f"Starting individual dendrite queries with timeout={timeout}s...")

    # Create individual tasks for each miner to track response times
    async def query_miner(axon, uid):
        """Query a single miner and track its response time"""
        miner_start_time = time.time()
        try:
            # Query individual miner with synapse
            response = await self.dendrite(
                axons=[axon],
                synapse=GenericSynapse(
                    type_id=type_id,
                    metadata=metadata,
                    timeout=timeout,
                ),
                deserialize=True,
                timeout=timeout,
            )
            miner_end_time = time.time()
            miner_response_time = miner_end_time - miner_start_time

            # Extract the actual response (dendrite returns a list)
            actual_response = response[0] if response and len(response) > 0 else []

            return uid, actual_response, miner_response_time, None

        except asyncio.TimeoutError:
            miner_end_time = time.time()
            miner_response_time = miner_end_time - miner_start_time
            bt.logging.warning(
                f"Miner UID {uid} timed out after {miner_response_time:.2f}s"
            )
            return uid, [], timeout, "timeout"

        except Exception as e:
            miner_end_time = time.time()
            miner_response_time = miner_end_time - miner_start_time
            bt.logging.error(f"Miner UID {uid} failed with exception: {e}")
            return uid, [], miner_response_time, str(e)

    # Create tasks for all miners and execute in parallel
    tasks = [query_miner(axon, uid) for axon, uid in zip(axons, miner_uids)]

    # Wait for all tasks to complete
    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        bt.logging.info(f"All miner queries completed!")
    except Exception as e:
        bt.logging.error(f"Error in gathering miner responses: {e}")
        results = [(uid, [], timeout, str(e)) for uid in miner_uids]

    # Process results and extract responses with timing data
    responses = []
    self.miner_response_times = []

    for result in results:
        if isinstance(result, Exception):
            # Handle exceptions from gather
            bt.logging.error(f"Miner query resulted in exception: {result}")
            responses.append([])
            self.miner_response_times.append(timeout)
        else:
            uid, response, response_time, error = result
            responses.append(response)
            self.miner_response_times.append(response_time)

            if error:
                bt.logging.warning(f"Miner UID {uid} had error: {error}")

    # Calculate total query time
    query_end_time = time.time()
    total_query_time = query_end_time - query_start_time

    # Log the results in detail
    bt.logging.info(
        f"Query complete - Type ID: {type_id}, Miners queried: {len(miner_uids)}, Total time: {total_query_time:.2f}s"
    )

    # Log detailed response information
    for i, (uid, response, response_time) in enumerate(
        zip(miner_uids, responses, self.miner_response_times)
    ):
        if response and len(response) > 0:
            bt.logging.info(
                f"Miner UID {uid} returned {len(response)} responses in {response_time:.2f}s"
            )
        else:
            bt.logging.warning(
                f"Miner UID {uid} returned no responses or failed (time: {response_time:.2f}s)"
            )

    # Score the responses using Node.js validator API (includes timing information)
    bt.logging.info("Scoring responses via Node.js validator endpoint...")
    rewards = get_rewards(
        self,
        type_id=type_id,
        metadata=metadata,
        responses=responses,
        response_times=self.miner_response_times,
    )

    bt.logging.info(
        f"Scoring complete - Mean: {rewards.mean():.4f}, Std: {rewards.std():.4f}"
    )
    bt.logging.debug(f"Individual scores: {[f'{r:.4f}' for r in rewards]}")
    bt.logging.debug(
        f"Scores by UID: {dict(zip([int(uid) for uid in miner_uids], [f'{r:.4f}' for r in rewards]))}"
    )

    # Update the global scores with new rewards
    self.update_scores(rewards, miner_uids)

    # Wait before next validation round
    time.sleep(SYNAPSE_WAIT_TIME)
