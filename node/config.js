export default {
  VALIDATOR: {
    // Synapse timeout configuration
    SYNAPSE_TIMEOUT: 120,        // Timeout for synapse requests in seconds

    GOOGLE_MAPS_REVIEWS: {
      // Spot check configuration
      SPOT_CHECK_COUNT: 3,         // Number of reviews to spot check for validation

      // Synthetic task creation
      MIN_REVIEWS_REQUIRED: 20,    // Minimum number of reviews required for a place to be eligible

      // Apify actor names
      APIFY_ACTORS: {
        SEARCH: 'agents/google-maps-search',
        SPOT_CHECK: 'compass/Google-Maps-Reviews-Scraper'
      },

      // Apify actor parameters
      APIFY_SEARCH_MAX_ITEMS: 80,

      // Synapse configurations
      // Parameters used in synapse queries for different task types
      REVIEWS_SYNAPSE_PARAMS: {
        language: 'en',
        sort: 'newest',
        timeout: 120
      },

      // Place types to search for
      PLACE_TYPES: [
        "restaurant",
        "cafe",
        "hospital",
        "hotel",
        "museum",
        "park",
        "shopping mall",
        "gym",
        "library",
        "pharmacy",
        "gas station",
        "supermarket",
        "bank",
        "movie theater",
        "bar"
      ]
    }
  },
  MINER: {
    GOOGLE_MAPS_REVIEWS: {
      // Miner review count - how many reviews miners should fetch
      REVIEW_COUNT: 100,

      // Apify actor names
      APIFY_ACTORS: {
        GOOGLE_MAPS_REVIEWS: 'agents/google-maps-reviews'
      },
    }
  },
};
