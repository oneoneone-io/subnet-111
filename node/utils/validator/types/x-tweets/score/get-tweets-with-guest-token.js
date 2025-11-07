import retryable from '#modules/retryable/index.js';
import logger from '#modules/logger/index.js';

/**
 * Generate guest token headers for Twitter API
 * @returns {Promise<Object>} Headers with Authorization and X-Guest-Token
 */
async function generateGuestTokenHeaders() {
  const bearer = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const response = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
    method: "POST",
    headers: { "Authorization": `Bearer ${bearer}` }
  });
  const json = await response.json();
  return {
    "Authorization": `Bearer ${bearer}`,
    "X-Guest-Token": json.guest_token
  };
}

/**
 * Fetch tweet using Twitter guest token API
 * @param {string} tweetId - Tweet ID to fetch
 * @param {Object} headers - Headers with guest token
 * @returns {Promise<Object>} Tweet data
 */
async function fetchTweetWithGuestToken(tweetId, headers) {
  const variables = {
    tweetId,
    includePromotedContent: true,
    withBirdwatchNotes: true,
    withCommunity: true,
    withDownvotePerspective: true,
    withReactionsMetadata: true,
    withReactionsPerspective: true,
    withSuperFollowsTweetFields: true,
    withSuperFollowsUserFields: true,
    withVoice: true
  };

  const features = {
    freedom_of_speech_not_reach_fetch_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    interactive_text_enabled: true,
    longform_notetweets_consumption_enabled: true,
    longform_notetweets_richtext_consumption_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    responsive_web_enhance_cards_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_text_conversations_enabled: true,
    responsive_web_twitter_blue_verified_badge_is_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_awards_web_tipping_enabled: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    verified_phone_label_enabled: true,
    vibe_api_enabled: true,
    view_counts_everywhere_api_enabled: true
  };

  const url = `https://api.twitter.com/graphql/ncDeACNGIApPMaqGVuF_rw/TweetResultByRestId?variables=${encodeURI(JSON.stringify(variables))}&features=${encodeURI(JSON.stringify(features))}`;
  const response = await fetch(url, { method: 'GET', headers });
  return response.json();
}

/**
 * Parse guest token API response to match Desearch format
 * @param {Object} guestData - Response from guest token API
 * @returns {Object} Parsed data matching Desearch format
 */
function parseGuestTokenResponse(guestData) {
  const result = guestData?.data?.tweetResult?.result;
  if (!result) return;

  const legacy = result.legacy;
  const user = result.core?.user_results?.result?.legacy;

  if (!legacy || !user) return;

  return {
    id: result.rest_id,
    text: legacy.full_text,
    created_at: legacy.created_at,
    user: {
      id: result.core.user_results.result.rest_id,
      username: user.screen_name
    },
    entities: {
      hashtags: legacy.entities?.hashtags || []
    }
  };
}

/**
 * Get verification tweets using Twitter guest token API
 * @param {Array} tweetIds - Array of tweet IDs to fetch
 * @returns {Promise<Array>} Array of tweets from Twitter guest token API
 */
async function getTweetsWithGuestToken(tweetIds){
  // Generate guest token once for all requests
  const headers = await generateGuestTokenHeaders();

  const results = [];
  // Make API calls using guest token
  for(const tweetId of tweetIds){
    // Wait for 1 second to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const result = await retryable(async () => {
        const guestData = await fetchTweetWithGuestToken(tweetId, headers);
        const parsed = parseGuestTokenResponse(guestData);
        if (!parsed) {
          throw new Error('Failed to parse guest token response');
        }
        return parsed;
      }, 3);

      results.push(result);
    } catch (error) {
      logger.warning(`X Tweets - Error fetching tweet ${tweetId} with guest token after retries:`, error.message);
      return;
    }
  }

  return results;
}
export default getTweetsWithGuestToken;
