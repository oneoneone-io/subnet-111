# oneoneone - Subnet 111

**A Decentralized Protocol for Accessing User-Generated Content**

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.12-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Bittensor](https://img.shields.io/badge/bittensor-subnet%20111-orange.svg)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [System Requirements](#system-requirements)
- [Getting Started](#getting-started)
- [API & Monetization](#api--monetization)
- [Validation System](#validation-system)
- [Scoring Mechanism](#scoring-mechanism)
- [Roadmap](#roadmap)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Overview

The **oneoneone** Subnet is a decentralized AI ecosystem built on the Bittensor network that specializes in collecting, validating, and serving high-quality user-generated content from platforms across the web. Our protocol enables developers, researchers, and companies to access authentic, real-time user reviews and content at scale, enhanced by AI-powered analysis and understanding.

### Key Features

- **Decentralized Data Collection**: Network of miners scraping user-generated content from Google Maps, Yelp, and other platforms
- **AI-Enhanced Analysis**:
  - Authenticity detection for identifying spam and bot-generated content
  - Intent classification (complaints, praise, questions)
  - Emotion and sentiment analysis
  - Multi-language translation support
- **Real-time Validation**: Synthetic validation rounds every 30 minutes ensuring data quality and authenticity
- **API Monetization**: Revenue-generating API through [oneoneone.io](https://oneoneone.io) with subscription-based access
- **Profit Sharing**: Profits distributed back to network participants through buyback mechanism
- **Quality Assurance**: Advanced scoring system combining speed (30%), volume (50%), and recency (20%) with spot check validation

### What is User-Generated Content?

Our network focuses on collecting and analyzing authentic user-generated content including:
- Reviews on Google Maps, Yelp, retail websites
- Forum discussions and comments
- Social media posts and interactions
- Blog entries and user feedback
- Any authentic digital expression by real users

Each piece of content is enriched with AI-powered insights, providing deeper understanding of user sentiment, intent, and authenticity.

## Architecture

### Network Participants

- **Miners**: Collect, clean, and format data from various sources using our Node.js stack
- **Validators**: Assess data quality through synthetic challenges and organic requests
- **API Consumers**: Access structured content through our oneoneone.io platform

### How It Works

1. **Challenge Generation**: Validators issue scraping challenges (synthetic or organic)
2. **Data Collection**: Miners respond with structured, validated data within time constraints
3. **Quality Assessment**: Advanced validation checking for authenticity, completeness, and speed
4. **API Distribution**: End users access content through our monetized API platform
5. **Profit Sharing**: Network earnings distributed to participants.

## System Requirements

### Validators

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 8 GB
- **Storage**: 32 GB SSD
- **Network**: Stable internet connection
- **Stake**: Minimum stake requirement for permit validation
- **API Access**: Valid APIFY_TOKEN for data scraping

### Miners

**Minimum Requirements:**
- **CPU**: 2 cores
- **RAM**: 8 GB
- **Storage**: 32 GB SSD
- **Network**: Stable internet connection with good latency
- **API Access**: Valid APIFY_TOKEN for data scraping

### Required Software

- **Python**: 3.12+
- **Node.js**: 18+ (for the node stack)
- **npm**: Latest version
- **Conda**: For environment management

## Getting Started

### Prerequisites

Ensure you have the following installed on your system:
- Conda or Miniconda
- Node.js and npm
- Git

### Installing PM2

PM2 is required for running the subnet services. Here's how to install it:

```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload bash configuration
source ~/.bashrc
# Note: If the 'source' command doesn't work, disconnect and reconnect to your server

# Install Node.js v21 and PM2. You might want to refresh your terminal shell
nvm i 21 && npm i pm2 -g

# Verify installations
node --version  # Should show v21.x.x
pm2 --version   # Should show PM2 version
```

### 1. Clone and Setup Environment

```bash
# Clone the repository
git clone https://github.com/oneoneone-io/subnet-111.git
cd subnet-111

# Install Miniconda
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh -b
~/miniconda3/bin/conda init
source ~/.bashrc
# Note: If the 'source' command doesn't work, disconnect and reconnect to your server

# Create and activate conda environment
conda create -n subnet-111 python=3.12
conda activate subnet-111

# Install Python dependencies
pip install -r requirements.txt
pip install -e .

# Install Node.js dependencies
cd node
npm install
cd ..
```

### 2. Configuration

Create your environment configuration:

```bash
# Copy the root environment file (no editing needed)
cp .env.example .env

# Copy the node environment file based on your role
# For validators:
cp node/.env.validator.example node/.env

# For miners:
cp node/.env.miner.example node/.env

# Edit the node .env file to add your APIFY_TOKEN and PLATFORM_TOKEN (only for validators)
nano node/.env
```

**Required Configuration:**
- Root `.env`: Contains general project settings. No editing required
- Node `.env`: Contains Node.js application settings. Requires `APIFY_TOKEN` and `PLATFORM_TOKEN` (only for validators)

#### APIFY Token Setup

1. Sign up at [Apify.com](https://apify.com)
2. Subscribe to the Starter plan
3. Navigate to Settings → API & Integrations
4. Create a new token with appropriate permissions
5. Add the token to your `node/.env` file:
   ```bash
   APIFY_TOKEN=your_apify_token_here
   ```

#### Platform Token Setup
If you are a validator, please contact the subnet team and get your `PLATFORM_TOKEN`. This token will be used in the future features including the platform integration.

### 3. Register to Subnet

Before running miners or validators, you need to register your wallet to the subnet:

```bash
# Install btcli
pip install bittensor-cli

# Register to subnet 111 (replace with your wallet details)
btcli subnet register --no_prompt --wallet.name "miner" --wallet.hotkey "default" --netuid "111"
```

**Important Notes:**
- Replace `miner` with your actual wallet name
- Replace `default` with your actual hotkey name
- Registration requires TAO for subnet fees
- Each miner/validator needs a separate hotkey registration

### 4. Running the Network

You can run the network in two ways: automatically using the auto-updater (recommended) or manually. The auto-updater handles updates and restarts automatically, while manual setup gives you more control.

#### Option A: Automatic Setup (Recommended)

The auto-updater script checks for updates every 20 minutes and only restarts processes when actual code changes are detected:

```bash
# Make the auto-updater script executable
chmod +x auto-updater.sh

# Start validator with auto-updater (recommended)
pm2 start ./auto-updater.sh --name "autoupdater-validator-prod" -- validator 111 validator default 9000

# Start miner with auto-updater (recommended)
pm2 start ./auto-updater.sh --name "autoupdater-miner-prod" -- miner 111 miner default 9001

# View auto-updater logs
pm2 logs autoupdater-validator-prod
pm2 logs autoupdater-miner-prod
```

**Benefits of using the auto-updater:**
- ✅ Automatically pulls latest code changes from GitHub
- ✅ Only restarts processes when updates are detected
- ✅ Handles dependency updates (Python and Node.js)
- ✅ Prevents downtime from breaking changes
- ✅ Comprehensive logging for debugging

**Auto-updater parameters:**
```bash
./auto-updater.sh [validator|miner] [netuid] [wallet_name] [wallet_hotkey] [axon_port] [subtensor_network] [subtensor_chain_endpoint]
```

#### Option B: Manual Setup

If you prefer manual control over the processes:

##### For Miners

```bash
# Start the Node.js stack with PM2
pm2 start npm --name node-miner --cwd ./node -- run miner:start

# Start the Python miner with PM2
pm2 start "python neurons/miner.py --netuid 111 --wallet.name <your_wallet_name> --wallet.hotkey <your_hotkey_name> --logging.debug --axon.port 9001" --name miner
```

##### For Validators

```bash
# Start the Node.js stack with PM2
pm2 start npm --name node-validator --cwd ./node -- run validator:start

# Start the Python validator with PM2
pm2 start "python neurons/validator.py --netuid 111 --wallet.name <your_wallet_name> --wallet.hotkey <your_hotkey_name> --logging.debug --axon.port 9000" --name validator
```

#### Managing PM2 Processes

```bash
# View all running processes
pm2 list

# View logs
pm2 logs miner
pm2 logs validator
pm2 logs node-miner
pm2 logs node-validator

# Stop processes
pm2 stop miner validator node-miner node-validator

# Restart processes
pm2 restart miner validator node-miner node-validator

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

## API & Monetization

### oneoneone.io Platform

Access our API through [oneoneone.io](https://oneoneone.io) with the following features:

- **Subscription-based API keys** with credit billing
- **Real-time queries** with advanced filtering (source, keyword, language, sorting)
- **Developer tools and SDKs** for easy integration
- **AI tool integration** with OpenAI, LangChain, Flowise, n8n
- **MCP (Model Context Protocol) support**

### Revenue Distribution

Our transparent profit-sharing model:
- **20%**: Development team allocation (salaries, operational costs)
- **40%**: Buyback program (increases subnet value and emissions)
- **40%**: Direct distribution to network participants

```
Profit = Total Earnings - Infrastructure Costs
```

All earnings, costs, and profit distributions are made transparent to the community.

## Validation System

### Synthetic Validation (Every 20 Minutes)

Our automated quality assurance system:

1. **Challenge Generation**: Validator selects job type (e.g., Google Maps reviews, Yelp reviews)
2. **Data Collection**: Validator creates synthetic task for miners to execute
3. **Miner Selection**: Up to 50 miners randomly chosen for the challenge
4. **Response Window**: Miners have 120 seconds to complete the task
5. **Validation Process**: Comprehensive checks including spot check verification against live data

### Supported Platforms

**Google Maps Reviews**
- Location-based review scraping
- Comprehensive field validation
- Spot check verification against live data

### Validation Criteria

For each response, we validate:
- **Speed Check**: Response within timeout limit (120 seconds)
- **Structural Validation**: Proper data formatting and field completeness
- **Spot Check Verification**: Random sample verification against live platform data
- **Volume Validation**: Ensures meaningful data collection
- **Field Integrity**: Comprehensive validation of all required fields

## Scoring Mechanism

Our three-component scoring system ensures quality, efficiency, and freshness of data:

### Score Calculation

```python
def calculate_score(miner_responses, response_times, synapse_timeout):
    # Volume Score (50%) - Number of reviews returned
    volume_score = miner_review_count / max_review_count_across_miners

    # Speed Score (30%) - Processing efficiency
    speed_score = fastest_response_time / miner_response_time

    # Recency Score (20%) - Freshness of most recent review
    recency_score = (miner_most_recent_date - oldest_most_recent_date) / date_range

    # Final composite score
    final_score = (0.5 * volume_score) + (0.3 * speed_score) + (0.2 * recency_score)

    return final_score
```

### Scoring Components

**Volume Score (50%)**
- Rewards miners who return more reviews
- Normalized against the maximum review count across all miners
- Encourages comprehensive data collection

**Speed Score (30%)**
- Rewards faster response times
- Calculated as `fastest_time / miner_time`
- Promotes efficient data processing

**Recency Score (20%)**
- Rewards miners whose most recent review is newer
- Based on the freshness of the latest review returned
- Encourages up-to-date data collection

### Scoring Formula

$$
\begin{aligned}
\text{Let:} \quad &T_{\min} = \min(T_i) \text{ (fastest response time)} \\
                  &V_{\max} = \max(V_i) \text{ (highest review count)} \\
                  &D_{\max} = \max(D_i) \text{ (most recent date overall)} \\
                  &D_{\min} = \min(D_i) \text{ (oldest recent date)} \\
\\
\text{For each miner } i: \\
&\text{Volume score:} \quad V_s = \frac{V_i}{V_{\max}} \\
&\text{Speed score:} \quad T_s = \frac{T_{\min}}{T_i} \\
&\text{Recency score:} \quad R_s = \frac{D_i - D_{\min}}{D_{\max} - D_{\min}} \\
&\text{Final score:} \quad S_i = 0.5 \cdot V_s + 0.3 \cdot T_s + 0.2 \cdot R_s
\end{aligned}
$$

**Disqualification Conditions:**
- Failed validation checks (structural validation, spot check verification)
- Response time ≥ synapse timeout (120 seconds)
- Invalid or malformed data
- Spot check failures (random sample verification against live data)

### Validation Process

**Spot Check System:**
- Randomly selects 3 reviews from each miner's response
- Verifies against live Google Maps data
- Checks for exact matches of key data fields
- Ensures data authenticity and prevents fabricated responses

## Roadmap

| Phase | Milestone | Status |
|-------|-----------|---------|
| **Phase 1** (Kickoff) | Implementation of 3 core job types<br/>95%+ API success rate<br/>Network benchmarking | 🚧 In Progress |
| **Phase 2** (AI Enhancement) | LLM-powered authenticity detection<br/>Intent and sentiment analysis<br/>Translation support | 📋 Planned |
| **Phase 3** (Platform Launch) | oneoneone.io dashboard<br/>Early adopter onboarding<br/>Performance optimizations | 📋 Planned |
| **Phase 4** (Technical Expansion) | 10+ job types<br/>First paying customers<br/>Buyback system implementation | 📋 Planned |
| **Phase 5** (User Growth) | Customer base expansion<br/>15+ job types<br/>Enhanced platform features | 📋 Planned |

## Development

### Testing

```bash
# Run Python tests
pytest tests/ -v

# Run Node.js tests
cd node && npm test

# Run integration tests
cd node && npm run test:integration
```

## Contributing

We welcome contributions to the oneoneone subnet! Please read our contributing guidelines and submit pull requests for any improvements.

### Guidelines

1. Fork the repository
2. Create a feature branch
3. Make your changes with appropriate tests
4. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
The MIT License (MIT)
Copyright © 2024 oneoneone Subnet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

**Built with ❤️ for the Bittensor ecosystem**

For support, documentation, and updates, visit [oneoneone.io](https://oneoneone.io)
